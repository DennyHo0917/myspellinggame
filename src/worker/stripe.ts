import Stripe from "stripe";
import { HttpError, resolvePlan } from "./domain";

export interface StripeEnv {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string;
  STRIPE_PRICE_YEARLY: string;
  STRIPE_PARENT_PRICE_MONTHLY: string;
  STRIPE_PARENT_PRICE_YEARLY: string;
  STRIPE_TEACHER_PRICE_MONTHLY: string;
  STRIPE_TEACHER_PRICE_YEARLY: string;
}

const CHECKOUT_SESSION_DURATION_SECONDS = 35 * 60;

type SubscriptionAccess = {
  status: string;
  current_period_end: string | null;
  stripe_price_id: string | null;
};

type CheckoutOptions = {
  now?: Date;
  locale?: string;
  plan?: "parent" | "teacher";
  createSession?: (
    params: Stripe.Checkout.SessionCreateParams,
    options: Stripe.RequestOptions,
  ) => Promise<Pick<Stripe.Checkout.Session, "id" | "url" | "expires_at">>;
  expireSession?: (sessionId: string) => Promise<unknown>;
};

type PortalOptions = {
  locale?: string;
  createSession?: (
    params: Stripe.BillingPortal.SessionCreateParams,
  ) => Promise<Pick<Stripe.BillingPortal.Session, "url">>;
};

const STRIPE_LOCALE_PATHS = {
  en: "",
  es: "/es",
  "pt-BR": "/pt-br",
  fr: "/fr",
  id: "/id",
  zh: "/zh",
} as const;

type StripeLocale = keyof typeof STRIPE_LOCALE_PATHS;

type CheckoutPlan = "parent" | "teacher" | "legacy";

function stripeLocale(value?: string): StripeLocale {
  return value && Object.hasOwn(STRIPE_LOCALE_PATHS, value)
    ? (value as StripeLocale)
    : "en";
}

function checkoutPrice(
  env: StripeEnv,
  plan: CheckoutPlan,
  interval: "month" | "year",
) {
  if (plan === "parent")
    return interval === "month"
      ? env.STRIPE_PARENT_PRICE_MONTHLY
      : env.STRIPE_PARENT_PRICE_YEARLY;
  if (plan === "teacher")
    return interval === "month"
      ? env.STRIPE_TEACHER_PRICE_MONTHLY
      : env.STRIPE_TEACHER_PRICE_YEARLY;
  return interval === "month"
    ? env.STRIPE_PRICE_MONTHLY
    : env.STRIPE_PRICE_YEARLY;
}

function configuredPricePlan(priceId: string, env: StripeEnv) {
  if (
    priceId === env.STRIPE_PARENT_PRICE_MONTHLY ||
    priceId === env.STRIPE_PARENT_PRICE_YEARLY
  )
    return "parent";
  if (
    priceId === env.STRIPE_TEACHER_PRICE_MONTHLY ||
    priceId === env.STRIPE_TEACHER_PRICE_YEARLY
  )
    return "teacher";
  if (
    priceId === env.STRIPE_PRICE_MONTHLY ||
    priceId === env.STRIPE_PRICE_YEARLY
  )
    return "legacy";
  return null;
}

export function hasActiveSubscription(
  subscription: SubscriptionAccess | null,
  env: StripeEnv,
  now = new Date(),
) {
  return Boolean(
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    (!subscription.current_period_end ||
      subscription.current_period_end > now.toISOString()) &&
    subscription.stripe_price_id &&
    configuredPricePlan(subscription.stripe_price_id, env),
  );
}

function stripe(env: StripeEnv) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function objectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value)
    return String(value.id);
  return null;
}

function unixToIso(value: unknown): string | null {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;
}

function subscriptionPeriodEnd(
  subscription: Stripe.Subscription,
): string | null {
  const legacy = (subscription as unknown as { current_period_end?: number })
    .current_period_end;
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  return unixToIso(legacy ?? itemEnd);
}

async function ownerFromStripeObject(
  db: D1Database,
  value: { metadata?: Stripe.Metadata; customer?: unknown; id?: string },
) {
  const metadataOwner = value.metadata?.owner_user_id;
  if (metadataOwner) return metadataOwner;
  const customerId = objectId(value.customer);
  const row = await db
    .prepare(
      `SELECT user_id FROM subscriptions
       WHERE stripe_customer_id = ? OR stripe_subscription_id = ?`,
    )
    .bind(customerId, value.id ?? null)
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

async function clearCheckoutLock(
  db: D1Database,
  session: Stripe.Checkout.Session,
) {
  const ownerUserId =
    session.client_reference_id || session.metadata?.owner_user_id;
  if (!ownerUserId) return;
  await db
    .prepare(
      "DELETE FROM checkout_locks WHERE user_id = ? AND stripe_session_id = ?",
    )
    .bind(ownerUserId, session.id)
    .run();
}

export async function createCheckout(
  env: StripeEnv,
  db: D1Database,
  user: { id: string; email: string },
  interval: "month" | "year",
  origin: string,
  options: CheckoutOptions = {},
) {
  const plan = options.plan ?? "teacher";
  const price = checkoutPrice(env, plan, interval);
  if (!price)
    throw new HttpError(
      503,
      "billing_not_configured",
      "Billing is not configured yet.",
    );
  const subscription = await db
    .prepare(
      `SELECT status, current_period_end, stripe_price_id, stripe_customer_id,
              stripe_subscription_id
       FROM subscriptions WHERE user_id = ?`,
    )
    .bind(user.id)
    .first<{
      status: string;
      current_period_end: string | null;
      stripe_price_id: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
    }>();
  const now = options.now ?? new Date();
  if (hasActiveSubscription(subscription ?? null, env, now)) {
    throw new HttpError(
      409,
      "already_subscribed",
      "This teacher already has an active subscription.",
    );
  }
  const nowIso = now.toISOString();
  let stripeClient: Stripe | null = null;
  const checkoutSessions = () => {
    stripeClient ??= stripe(env);
    return stripeClient.checkout.sessions;
  };
  const createSession =
    options.createSession ??
    ((params, requestOptions) =>
      checkoutSessions().create(params, requestOptions));
  const expireSession =
    options.expireSession ??
    ((sessionId) => checkoutSessions().expire(sessionId));
  const expireCheckoutSession = async (sessionId: string) => {
    try {
      await expireSession(sessionId);
    } catch {
      throw new HttpError(
        502,
        "checkout_unavailable",
        "The previous Stripe Checkout could not be closed safely.",
      );
    }
  };
  const existingLock = await db
    .prepare(
      `SELECT interval, stripe_session_id, session_url, expires_at FROM checkout_locks
       WHERE user_id = ? AND expires_at > ?`,
    )
    .bind(user.id, nowIso)
    .first<{
      interval: "month" | "year";
      stripe_session_id: string | null;
      session_url: string | null;
      expires_at: string;
    }>();
  if (existingLock) {
    if (existingLock.interval === interval && existingLock.session_url)
      return { url: existingLock.session_url };
    if (existingLock.interval === interval)
      throw new HttpError(
        409,
        "checkout_pending",
        "A subscription checkout is already being created.",
      );
    if (existingLock.stripe_session_id)
      await expireCheckoutSession(existingLock.stripe_session_id);
  }
  const token = crypto.randomUUID();
  const sessionExpiresAt =
    Math.floor(now.getTime() / 1000) + CHECKOUT_SESSION_DURATION_SECONDS;
  const expiresAt = new Date(sessionExpiresAt * 1000).toISOString();
  const claim = await db
    .prepare(
      `INSERT INTO checkout_locks (user_id, token, interval, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         token = excluded.token, interval = excluded.interval,
         stripe_session_id = NULL, session_url = NULL,
         expires_at = excluded.expires_at,
         created_at = excluded.created_at
       WHERE checkout_locks.expires_at <= ?
          OR checkout_locks.interval <> excluded.interval`,
    )
    .bind(user.id, token, interval, expiresAt, nowIso, nowIso)
    .run();
  if (!claim.meta.changes) {
    const pending = await db
      .prepare(
        `SELECT interval, session_url FROM checkout_locks
         WHERE user_id = ? AND expires_at > ?`,
      )
      .bind(user.id, nowIso)
      .first<{ interval: "month" | "year"; session_url: string | null }>();
    if (pending?.interval === interval && pending.session_url)
      return { url: pending.session_url };
    throw new HttpError(
      409,
      "checkout_pending",
      "A subscription checkout is already being created.",
    );
  }
  try {
    const locale = stripeLocale(options.locale);
    const session = await createSession(
      {
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        success_url: `${origin}/teacher?lang=${locale}&checkout=success&interval=${interval}&plan=${plan}`,
        cancel_url: `${origin}${STRIPE_LOCALE_PATHS[locale]}/pricing?checkout=cancelled`,
        client_reference_id: user.id,
        customer: subscription?.stripe_customer_id || undefined,
        customer_email: subscription?.stripe_customer_id
          ? undefined
          : user.email,
        payment_method_collection: "always",
        metadata: {
          owner_user_id: user.id,
          plan,
          billing_interval: interval,
        },
        subscription_data: {
          metadata: {
            owner_user_id: user.id,
            plan,
            billing_interval: interval,
          },
        },
        allow_promotion_codes: true,
        expires_at: sessionExpiresAt,
      },
      { idempotencyKey: `checkout-${token}` },
    );
    if (!session.url)
      throw new HttpError(
        502,
        "checkout_unavailable",
        "Stripe did not return a Checkout URL.",
      );
    const update = await db
      .prepare(
        `UPDATE checkout_locks
         SET stripe_session_id = ?, session_url = ?, expires_at = ?
         WHERE user_id = ? AND token = ?`,
      )
      .bind(
        session.id,
        session.url,
        new Date(session.expires_at * 1000).toISOString(),
        user.id,
        token,
      )
      .run();
    if (!update.meta.changes) {
      await expireCheckoutSession(session.id);
      throw new HttpError(
        409,
        "checkout_pending",
        "A newer subscription checkout is already being prepared.",
      );
    }
    return session;
  } catch (error) {
    await db
      .prepare("DELETE FROM checkout_locks WHERE user_id = ? AND token = ?")
      .bind(user.id, token)
      .run();
    throw error;
  }
}

export async function createPortal(
  env: StripeEnv,
  db: D1Database,
  userId: string,
  origin: string,
  options: PortalOptions = {},
) {
  const subscription = await db
    .prepare("SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<{ stripe_customer_id: string | null }>();
  if (!subscription?.stripe_customer_id) {
    throw new HttpError(
      409,
      "no_billing_account",
      "No Stripe billing account exists for this teacher.",
    );
  }
  const locale = stripeLocale(options.locale);
  const createSession =
    options.createSession ??
    ((params) => stripe(env).billingPortal.sessions.create(params));
  return createSession({
    customer: subscription.stripe_customer_id,
    return_url: `${origin}/teacher?lang=${locale}`,
  });
}

async function applySubscription(
  db: D1Database,
  subscription: Stripe.Subscription,
  env: StripeEnv,
) {
  const ownerUserId = await ownerFromStripeObject(db, subscription);
  if (!ownerUserId) return;
  const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
  const configuredPlan = configuredPricePlan(priceId, env);
  const active =
    configuredPlan &&
    (subscription.status === "active" || subscription.status === "trialing");
  const existing = await db
    .prepare(
      `SELECT s.plan, u.workspace_type FROM user u
       LEFT JOIN subscriptions s ON s.user_id = u.id WHERE u.id = ?`,
    )
    .bind(ownerUserId)
    .first<{ plan: string | null; workspace_type: string | null }>();
  const plan =
    active && configuredPlan === "parent"
      ? "parent"
      : active && configuredPlan === "teacher"
        ? "teacher"
        : resolvePlan(
            existing?.plan,
            existing?.workspace_type,
            Boolean(active),
          );
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO subscriptions (
         user_id, plan, status, billing_interval, stripe_customer_id,
         stripe_subscription_id, stripe_price_id, current_period_end,
         cancel_at_period_end, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         plan = excluded.plan,
         status = excluded.status,
         billing_interval = excluded.billing_interval,
         stripe_customer_id = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         stripe_price_id = excluded.stripe_price_id,
         current_period_end = excluded.current_period_end,
         cancel_at_period_end = excluded.cancel_at_period_end,
         updated_at = excluded.updated_at`,
    )
    .bind(
      ownerUserId,
      plan,
      subscription.status,
      interval === "year" ? "year" : "month",
      objectId(subscription.customer),
      subscription.id,
      priceId,
      subscriptionPeriodEnd(subscription),
      subscription.cancel_at_period_end ? 1 : 0,
      now,
    )
    .run();
}

async function applyCheckout(
  db: D1Database,
  session: Stripe.Checkout.Session,
  env: StripeEnv,
) {
  const ownerUserId =
    session.client_reference_id || session.metadata?.owner_user_id;
  if (!ownerUserId) return;
  const now = new Date().toISOString();
  const metadataPlan = session.metadata?.plan;
  const plan =
    metadataPlan === "parent" || metadataPlan === "teacher"
      ? metadataPlan
      : "free";
  const pricePlan =
    metadataPlan === "parent"
      ? "parent"
      : metadataPlan === "teacher"
        ? "teacher"
        : "legacy";
  await db
    .prepare(
      `INSERT INTO subscriptions (
         user_id, plan, status, billing_interval, stripe_customer_id,
         stripe_subscription_id, stripe_price_id, current_period_end,
         cancel_at_period_end, updated_at
       ) VALUES (?, ?, 'pending', ?, ?, ?, ?, NULL, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         plan = excluded.plan,
         billing_interval = excluded.billing_interval,
         stripe_customer_id = COALESCE(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
         stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id),
         stripe_price_id = COALESCE(excluded.stripe_price_id, subscriptions.stripe_price_id),
         updated_at = excluded.updated_at`,
    )
    .bind(
      ownerUserId,
      plan,
      session.metadata?.billing_interval === "year" ? "year" : "month",
      objectId(session.customer),
      objectId(session.subscription),
      checkoutPrice(
        env,
        pricePlan,
        session.metadata?.billing_interval === "year" ? "year" : "month",
      ),
      now,
    )
    .run();
  await clearCheckoutLock(db, session);
}

async function applyInvoiceStatus(
  db: D1Database,
  invoice: Stripe.Invoice,
  status: string,
  env: StripeEnv,
) {
  const dynamicInvoice = invoice as unknown as {
    subscription?: unknown;
    parent?: { subscription_details?: { subscription?: unknown } };
  };
  const subscriptionId = objectId(
    dynamicInvoice.subscription ??
      dynamicInvoice.parent?.subscription_details?.subscription,
  );
  const customerId = objectId(invoice.customer);
  if (!subscriptionId && !customerId) return;
  await db
    .prepare(
      `UPDATE subscriptions SET status = ?,
       plan = CASE
         WHEN ? = 'active' AND stripe_price_id IN (?, ?) THEN 'parent'
         WHEN ? = 'active' AND stripe_price_id IN (?, ?) THEN 'teacher'
         WHEN ? = 'active' AND stripe_price_id IN (?, ?) THEN
         CASE WHEN plan IN ('parent', 'teacher') THEN plan
              WHEN (SELECT workspace_type FROM user WHERE id = subscriptions.user_id) = 'teacher'
              THEN 'teacher' ELSE 'parent' END
         ELSE 'free' END,
       updated_at = ? WHERE stripe_subscription_id = ? OR stripe_customer_id = ?`,
    )
    .bind(
      status,
      status,
      env.STRIPE_PARENT_PRICE_MONTHLY || "",
      env.STRIPE_PARENT_PRICE_YEARLY || "",
      status,
      env.STRIPE_TEACHER_PRICE_MONTHLY || "",
      env.STRIPE_TEACHER_PRICE_YEARLY || "",
      status,
      env.STRIPE_PRICE_MONTHLY,
      env.STRIPE_PRICE_YEARLY,
      new Date().toISOString(),
      subscriptionId,
      customerId,
    )
    .run();
}

export async function applyStripeEvent(
  db: D1Database,
  event: Stripe.Event,
  env: StripeEnv,
) {
  switch (event.type) {
    case "checkout.session.completed":
      await applyCheckout(
        db,
        event.data.object as Stripe.Checkout.Session,
        env,
      );
      break;
    case "checkout.session.expired":
      await clearCheckoutLock(db, event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(
        db,
        event.data.object as Stripe.Subscription,
        env,
      );
      break;
    case "invoice.payment_succeeded":
      if (Number((event.data.object as Stripe.Invoice).amount_paid) <= 0) break;
      await applyInvoiceStatus(
        db,
        event.data.object as Stripe.Invoice,
        "active",
        env,
      );
      break;
    case "invoice.payment_failed":
      await applyInvoiceStatus(
        db,
        event.data.object as Stripe.Invoice,
        "past_due",
        env,
      );
      break;
  }
}

export async function processStripeEvent(
  db: D1Database,
  event: Stripe.Event,
  env: StripeEnv,
) {
  const now = new Date();
  await db
    .prepare(
      `INSERT OR IGNORE INTO stripe_events (event_id, event_type, created_at)
       VALUES (?, ?, ?)`,
    )
    .bind(event.id, event.type, now.toISOString())
    .run();
  const stale = new Date(now.getTime() - 5 * 60_000).toISOString();
  const claim = await db
    .prepare(
      `UPDATE stripe_events SET processing_at = ?
       WHERE event_id = ? AND processed_at IS NULL
       AND (processing_at IS NULL OR processing_at < ?)`,
    )
    .bind(now.toISOString(), event.id, stale)
    .run();
  if (!claim.meta.changes) return false;
  try {
    await applyStripeEvent(db, event, env);
    await db
      .prepare(
        "UPDATE stripe_events SET processed_at = ?, processing_at = NULL WHERE event_id = ?",
      )
      .bind(new Date().toISOString(), event.id)
      .run();
    return true;
  } catch (error) {
    await db
      .prepare(
        "UPDATE stripe_events SET processing_at = NULL WHERE event_id = ?",
      )
      .bind(event.id)
      .run();
    throw error;
  }
}

export async function verifyAndProcessWebhook(
  env: StripeEnv,
  db: D1Database,
  request: Request,
) {
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    throw new HttpError(400, "missing_signature", "Missing Stripe signature.");
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe(env).webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new HttpError(400, "invalid_signature", "Invalid Stripe signature.");
  }
  return processStripeEvent(db, event, env);
}
