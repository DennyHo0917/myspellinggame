import { env as workerBindings } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { HttpError } from "../src/worker/domain";
import { handleRequest, type Env } from "../src/worker/index";

type TestBindings = { DB: D1Database; TEST_MIGRATIONS: D1Migration[] };
type User = { id: string; name: string; email: string };

const bindings = workerBindings as unknown as TestBindings;
const admin = { id: "admin", name: "Admin", email: "admin@example.test" };
const member = { id: "member", name: "Member", email: "member@example.test" };

function testEnv(overrides: Partial<Env> = {}): Env {
  const allow = { limit: async () => ({ success: true }) };
  return {
    DB: bindings.DB,
    ASSETS: { fetch } as Fetcher,
    CREATE_LIMITER: allow,
    SUBMIT_LIMITER: allow,
    BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long",
    BETTER_AUTH_URL: "https://example.test",
    GOOGLE_CLIENT_ID: "google-test",
    GOOGLE_CLIENT_SECRET: "google-test-secret",
    STRIPE_SECRET_KEY: "sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    STRIPE_PRICE_MONTHLY: "price_monthly",
    STRIPE_PRICE_YEARLY: "price_yearly",
    STRIPE_PARENT_PRICE_MONTHLY: "price_parent_monthly",
    STRIPE_PARENT_PRICE_YEARLY: "price_parent_yearly",
    STRIPE_TEACHER_PRICE_MONTHLY: "price_teacher_monthly",
    STRIPE_TEACHER_PRICE_YEARLY: "price_teacher_yearly",
    ADMIN_EMAIL: admin.email,
    ...overrides,
  };
}

async function call(
  path: string,
  user: User | null = admin,
  env = testEnv(),
  method = "GET",
) {
  try {
    return await handleRequest(
      new Request(`https://example.test${path}`, { method }),
      env,
      {
        getSession: async () =>
          user
            ? ({ user, session: { id: `session-${user.id}` } } as never)
            : null,
      },
    );
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json({ error: error.code }, { status: error.status });
    throw error;
  }
}

async function insertUser(user: User, createdAt = new Date().toISOString()) {
  await bindings.DB.prepare(
    `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
  )
    .bind(user.id, user.name, user.email, createdAt, createdAt)
    .run();
}

async function insertAccount(
  userId: string,
  providerId: string,
  suffix = providerId,
) {
  const now = new Date().toISOString();
  await bindings.DB.prepare(
    `INSERT INTO account (
       id, issuer, accountId, providerId, userId, accessToken, refreshToken,
       idToken, createdAt, updatedAt
     ) VALUES (?, ?, ?, ?, ?, 'secret-access', 'secret-refresh', 'secret-id', ?, ?)`,
  )
    .bind(
      `${userId}-${suffix}`,
      providerId,
      `${userId}-${suffix}`,
      providerId,
      userId,
      now,
      now,
    )
    .run();
}

async function insertSubscription(
  userId: string,
  status: string,
  interval: "month" | "year",
  periodEnd: string,
  priceId: string,
  trialUsedAt: string | null = null,
) {
  await bindings.DB.prepare(
    `INSERT INTO subscriptions (
       user_id, plan, status, billing_interval, stripe_price_id,
       current_period_end, trial_used_at, updated_at
     ) VALUES (?, 'pro', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      userId,
      status,
      interval,
      priceId,
      periodEnd,
      trialUsedAt,
      new Date().toISOString(),
    )
    .run();
}

beforeEach(async () => {
  await reset();
  await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS);
  await insertUser(admin);
  await insertUser(member);
});

describe("read-only admin dashboard", () => {
  it("fails closed and enforces admin authentication on every Admin API", async () => {
    expect((await call("/api/admin/stats", null)).status).toBe(401);
    expect((await call("/api/admin/stats", member)).status).toBe(403);
    expect((await call("/api/admin/stats")).status).toBe(200);
    expect(
      (
        await call(
          "/api/admin/stats",
          admin,
          testEnv({ ADMIN_EMAIL: undefined }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await call("/api/admin/users", admin, testEnv(), "POST")).status,
    ).toBe(405);
  });

  it("returns the required stats using the existing active subscription rules", async () => {
    const now = Date.now();
    await bindings.DB.prepare("DELETE FROM user").run();
    const trial = {
      id: "trial",
      name: "Trial User",
      email: "trial@example.test",
    };
    const expired = {
      id: "expired",
      name: "Expired",
      email: "expired@example.test",
    };
    const free = { id: "free", name: "Free", email: "free@example.test" };
    await insertUser(admin, new Date(now - 60_000).toISOString());
    await insertUser(trial, new Date(now - 2 * 86_400_000).toISOString());
    await insertUser(expired, new Date(now - 8 * 86_400_000).toISOString());
    await insertUser(free, new Date(now - 120_000).toISOString());
    await insertAccount(admin.id, "google", "google-1");
    await insertAccount(admin.id, "google", "google-2");
    await insertAccount(trial.id, "google");
    await insertAccount(free.id, "microsoft");
    await insertSubscription(
      admin.id,
      "active",
      "month",
      new Date(now + 86_400_000).toISOString(),
      "price_monthly",
    );
    await insertSubscription(
      trial.id,
      "trialing",
      "year",
      new Date(now + 86_400_000).toISOString(),
      "price_yearly",
      new Date(now).toISOString(),
    );
    await insertSubscription(
      expired.id,
      "active",
      "month",
      new Date(now - 1_000).toISOString(),
      "price_monthly",
    );

    const response = await call("/api/admin/stats");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      totalUsers: 4,
      googleUsers: 2,
      microsoftUsers: 1,
      proUsers: 2,
      activePaidUsers: 1,
      monthlyUsers: 1,
      yearlyUsers: 1,
      todayUsers: 2,
      last7DaysUsers: 3,
    });
  });

  it("paginates and searches users without duplicate rows or sensitive tokens", async () => {
    await insertAccount(admin.id, "google");
    await insertAccount(admin.id, "github");
    for (let index = 0; index < 52; index += 1) {
      await insertUser({
        id: `user-${String(index).padStart(2, "0")}`,
        name: index === 17 ? "Searchable Name" : `User ${index}`,
        email:
          index === 23 ? "target@example.test" : `user${index}@example.test`,
      });
    }

    const first = (await (await call("/api/admin/users?page=1")).json()) as {
      users: Array<Record<string, unknown>>;
      total: number;
      pageSize: number;
    };
    expect(first.total).toBe(54);
    expect(first.pageSize).toBe(50);
    expect(first.users).toHaveLength(50);
    expect(JSON.stringify(first)).not.toMatch(
      /accessToken|refreshToken|idToken|secret-access/,
    );

    const multipleAccounts = (await (
      await call("/api/admin/users?q=admin%40example.test")
    ).json()) as { users: Array<{ id: string; loginProvider: string }> };
    expect(multipleAccounts.users).toHaveLength(1);
    expect(multipleAccounts.users[0].id).toBe(admin.id);
    expect(multipleAccounts.users[0].loginProvider.split(",").sort()).toEqual([
      "github",
      "google",
    ]);

    const second = (await (await call("/api/admin/users?page=2")).json()) as {
      users: unknown[];
    };
    expect(second.users).toHaveLength(4);
    const email = (await (
      await call("/api/admin/users?q=target%40example.test")
    ).json()) as { users: Array<{ email: string }> };
    expect(email.users.map((user) => user.email)).toEqual([
      "target@example.test",
    ]);
    const name = (await (
      await call("/api/admin/users?q=searchable%20name")
    ).json()) as { users: Array<{ name: string }> };
    expect(name.users.map((user) => user.name)).toEqual(["Searchable Name"]);
    const id = (await (await call("/api/admin/users?q=user-17")).json()) as {
      users: Array<{ id: string }>;
    };
    expect(id.users.map((user) => user.id)).toEqual(["user-17"]);
    expect((await call("/api/admin/users?page=0")).status).toBe(400);
  });
});
