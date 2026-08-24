import Stripe from "stripe";
import { HttpError } from "./domain";

export interface StripeEnv {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string;
  STRIPE_PRICE_YEARLY: string;
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

export async function createCheckout(
  env: StripeEnv,
  db: D1Database,
  user: { id: string; email: string },
  interval: "month" | "year",
  origin: string,
) {
  const price =
    interval === "month" ? env.STRIPE_PRICE_MONTHLY : env.STRIPE_PRICE_YEARLY;
  if (!price)
    throw new HttpError(
      503,
      "billing_not_configured",
      "Billing is not configured yet.",
    );
  const subscription = await db
    .prepare(
      "SELECT plan, status, stripe_customer_id FROM subscriptions WHERE user_id = ?",
    )
    .bind(user.id)
    .first<{
      plan: "free" | "pro";
      status: string;
      stripe_customer_id: string | null;
    }>();
  if (
    subscription?.plan === "pro" ||
    subscription?.status === "active" ||
    subscription?.status === "trialing"
  ) {
    throw new HttpError(
      409,
      "already_subscribed",
      "This teacher already has an active subscription.",
    );
  }
  const client = stripe(env);
  return client.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/teacher?checkout=success&interval=${interval}`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    client_reference_id: user.id,
    customer: subscription?.stripe_customer_id || undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : user.email,
    metadata: { owner_user_id: user.id, billing_interval: interval },
    subscription_data: {
      metadata: { owner_user_id: user.id, billing_interval: interval },
    },
    allow_promotion_codes: true,
  });
}

export async function createPortal(
  env: StripeEnv,
  db: D1Database,
  userId: string,
  origin: string,
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
  return stripe(env).billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${origin}/teacher`,
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
  const configuredPrice =
    priceId === env.STRIPE_PRICE_MONTHLY || priceId === env.STRIPE_PRICE_YEARLY;
  const active =
    configuredPrice &&
    (subscription.status === "active" || subscription.status === "trialing");
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
      active ? "pro" : "free",
      subscription.status,
      interval === "year" ? "year" : "month",
      objectId(subscription.customer),
      subscription.id,
      priceId,
      subscriptionPeriodEnd(subscription),
      subscription.cancel_at_period_end ? 1 : 0,
      new Date().toISOString(),
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
  await db
    .prepare(
      `INSERT INTO subscriptions (
         user_id, plan, status, billing_interval, stripe_customer_id,
         stripe_subscription_id, stripe_price_id, current_period_end,
         cancel_at_period_end, updated_at
       ) VALUES (?, 'free', 'pending', ?, ?, ?, ?, NULL, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         billing_interval = excluded.billing_interval,
         stripe_customer_id = COALESCE(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
         stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id),
         stripe_price_id = COALESCE(excluded.stripe_price_id, subscriptions.stripe_price_id),
         updated_at = excluded.updated_at`,
    )
    .bind(
      ownerUserId,
      session.metadata?.billing_interval === "year" ? "year" : "month",
      objectId(session.customer),
      objectId(session.subscription),
      session.metadata?.billing_interval === "year"
        ? env.STRIPE_PRICE_YEARLY
        : env.STRIPE_PRICE_MONTHLY,
      new Date().toISOString(),
    )
    .run();
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
       plan = CASE WHEN ? = 'active' AND stripe_price_id IN (?, ?) THEN 'pro' ELSE 'free' END,
       updated_at = ? WHERE stripe_subscription_id = ? OR stripe_customer_id = ?`,
    )
    .bind(
      status,
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
