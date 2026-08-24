import { env as workerBindings } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import type Stripe from "stripe";

import { HttpError, monthStart } from "../src/worker/domain";
import { handleRequest, type Env } from "../src/worker/index";
import { createCheckout, processStripeEvent } from "../src/worker/stripe";

type TestBindings = {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
};

type Teacher = { id: string; name: string; email: string };

const bindings = workerBindings as unknown as TestBindings;
const teacherA: Teacher = {
  id: "teacher-a",
  name: "Teacher A",
  email: "a@example.test",
};
const teacherB: Teacher = {
  id: "teacher-b",
  name: "Teacher B",
  email: "b@example.test",
};

function testEnv(overrides: Partial<Env> = {}): Env {
  const allow = { limit: async () => ({ success: true }) };
  return {
    DB: bindings.DB,
    ASSETS: { fetch: (request: Request) => fetch(request) } as Fetcher,
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
    ...overrides,
  };
}

function sessionFor(teacher: Teacher | null) {
  return async () =>
    teacher
      ? ({
          user: teacher,
          session: { id: `session-${teacher.id}`, userId: teacher.id },
        } as never)
      : null;
}

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (init.method && init.method !== "GET")
    headers.set("origin", "https://example.test");
  return new Request(`https://example.test${path}`, { ...init, headers });
}

async function call(
  path: string,
  init: RequestInit = {},
  teacher: Teacher | null = teacherA,
  env: Env = testEnv(),
) {
  try {
    return await handleRequest(request(path, init), env, {
      getSession: sessionFor(teacher),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    throw error;
  }
}

async function insertTeacher(teacher: Teacher) {
  const now = new Date().toISOString();
  await bindings.DB.prepare(
    `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
  )
    .bind(teacher.id, teacher.name, teacher.email, now, now)
    .run();
}

async function insertSubscription({
  plan,
  status,
  priceId = "price_monthly",
  currentPeriodEnd = null,
}: {
  plan: "free" | "pro";
  status: string;
  priceId?: string;
  currentPeriodEnd?: string | null;
}) {
  await bindings.DB.prepare(
    `INSERT INTO subscriptions (
       user_id, plan, status, stripe_price_id, current_period_end, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      teacherA.id,
      plan,
      status,
      priceId,
      currentPeriodEnd,
      new Date().toISOString(),
    )
    .run();
}

async function createAssignment(
  teacher: Teacher = teacherA,
  overrides: Record<string, unknown> = {},
) {
  const response = await call(
    "/api/assignments",
    {
      method: "POST",
      body: JSON.stringify({
        title: "Week one",
        words: ["apple", "banana"],
        mode: "dictation",
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        ...overrides,
      }),
    },
    teacher,
  );
  return { response, body: (await response.json()) as Record<string, unknown> };
}

async function publicWords(publicId: string) {
  const response = await call(`/api/public/assignments/${publicId}`, {}, null);
  return (await response.json()) as {
    words: Array<{ id: string; word: string }>;
    [key: string]: unknown;
  };
}

async function submit(
  publicId: string,
  words: Array<{ id: string; word: string }>,
  options: {
    attemptId?: string;
    nickname?: string;
    answers?: string[];
    completed?: boolean;
  } = {},
) {
  return call(
    `/api/public/assignments/${publicId}/attempts`,
    {
      method: "POST",
      body: JSON.stringify({
        attemptId: options.attemptId ?? crypto.randomUUID(),
        nickname: options.nickname ?? "Student 01",
        durationSeconds: 42,
        answers: words.map((word, index) => ({
          wordId: word.id,
          answer: options.answers?.[index] ?? word.word,
        })),
        score: 999,
        accuracy: 100,
        completed: options.completed,
      }),
    },
    null,
  );
}

beforeEach(async () => {
  await reset();
  await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS);
  await insertTeacher(teacherA);
  await insertTeacher(teacherB);
});

describe("teacher authorization and quotas", () => {
  it("rejects an unauthenticated teacher request", async () => {
    const response = await call("/api/assignments", {}, null);
    expect(response.status).toBe(401);
  });

  it("prevents teacher A from reading teacher B resources", async () => {
    const created = await createAssignment(teacherA);
    const response = await call(
      `/api/assignments/${created.body.id}`,
      {},
      teacherB,
    );
    expect(response.status).toBe(404);
  });

  it("enforces the free active-assignment limit on the server", async () => {
    expect(
      (await createAssignment(teacherA, { title: "One" })).response.status,
    ).toBe(201);
    expect(
      (await createAssignment(teacherA, { title: "Two" })).response.status,
    ).toBe(201);
    const third = await createAssignment(teacherA, { title: "Three" });
    expect(third.response.status).toBe(403);
    expect(third.body.error).toBe("active_assignment_limit");
  });

  it("enforces the free monthly submission limit on the server", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    const now = new Date().toISOString();
    const statements = Array.from({ length: 30 }, () =>
      bindings.DB.prepare(
        `INSERT INTO monthly_submission_usage (attempt_id, user_id, month_key, created_at)
         VALUES (?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), teacherA.id, monthStart(), now),
    );
    await bindings.DB.batch(statements);

    const response = await submit(publicId, assignment.words);
    expect(response.status).toBe(403);
    expect(((await response.json()) as Record<string, unknown>).error).toBe(
      "monthly_submission_limit",
    );
  });

  it("describes student_limit as the teacher account nickname quota", async () => {
    const created = await createAssignment();
    const id = String(created.body.id);
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    const now = new Date().toISOString();
    await bindings.DB.batch(
      Array.from({ length: 30 }, (_, index) =>
        bindings.DB.prepare(
          `INSERT INTO attempts (
             id, assignment_id, nickname, nickname_key, attempt_number, score,
             correct_count, incorrect_count, accuracy, duration_seconds,
             completed_at, retention_expires_at, status
           ) VALUES (?, ?, ?, ?, NULL, 0, 0, 0, 0, 1, ?, ?, 'incomplete')`,
        ).bind(
          crypto.randomUUID(),
          id,
          `Student ${index}`,
          `student ${index}`,
          now,
          new Date(Date.now() + 86_400_000).toISOString(),
        ),
      ),
    );

    const response = await submit(publicId, assignment.words, {
      nickname: "Student 31",
      completed: false,
    });
    const body = (await response.json()) as {
      error: string;
      message: string;
    };
    expect(response.status).toBe(403);
    expect(body.error).toBe("student_limit");
    expect(body.message).toContain(
      "teacher account’s saved distinct student nickname limit",
    );
  });
});

describe("assignment attempts", () => {
  it("records an unfinished attempt when a student returns to the assignment start", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    const response = await call(
      `/api/public/assignments/${publicId}/attempts`,
      {
        method: "POST",
        body: JSON.stringify({
          attemptId: crypto.randomUUID(),
          nickname: "Student 01",
          durationSeconds: 12,
          answers: [{ wordId: assignment.words[0].id, answer: "apple" }],
          completed: false,
        }),
      },
      null,
    );
    expect(response.status).toBe(201);
    expect(((await response.json()) as Record<string, unknown>).status).toBe(
      "incomplete",
    );

    const detail = await call(`/api/assignments/${created.body.id}`);
    const body = (await detail.json()) as {
      attempts: Array<{ status: string }>;
    };
    expect(body.attempts[0].status).toBe("incomplete");
  });

  it("does not count incomplete records toward attempt numbers or limits", async () => {
    const created = await createAssignment(teacherA, { maxAttempts: 1 });
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);

    expect(
      (await submit(publicId, assignment.words, { completed: false })).status,
    ).toBe(201);
    const completed = await submit(publicId, assignment.words);
    expect(completed.status).toBe(201);
    expect(
      ((await completed.json()) as { attempt_number: number }).attempt_number,
    ).toBe(1);
    expect((await submit(publicId, assignment.words)).status).toBe(403);

    const detail = (await (
      await call(`/api/assignments/${created.body.id}`)
    ).json()) as {
      attempts: Array<{ status: string; attempt_number: number | null }>;
      summary: { attempts: number };
    };
    expect(detail.summary.attempts).toBe(1);
    expect(detail.attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "incomplete", attempt_number: null }),
        expect.objectContaining({ status: "completed", attempt_number: 1 }),
      ]),
    );
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM monthly_submission_usage",
      ).first("count"),
    ).toBe(1);
  });

  it("replaces an older incomplete record for the same assignment and nickname", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();

    expect(
      (
        await submit(publicId, assignment.words, {
          attemptId: firstId,
          completed: false,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await submit(publicId, assignment.words, {
          attemptId: secondId,
          answers: ["wrong", "banana"],
          completed: false,
        })
      ).status,
    ).toBe(201);

    const incomplete = await bindings.DB.prepare(
      `SELECT id, attempt_number FROM attempts
       WHERE assignment_id = ? AND nickname_key = ? AND status = 'incomplete'`,
    )
      .bind(created.body.id, "student 01")
      .all<{ id: string; attempt_number: number | null }>();
    expect(incomplete.results).toEqual([
      { id: secondId, attempt_number: null },
    ]);
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM attempt_items",
      ).first("count"),
    ).toBe(2);
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM monthly_submission_usage",
      ).first("count"),
    ).toBe(0);
  });

  it("uses MAX attempt number after a teacher deletes a non-final result", async () => {
    const created = await createAssignment(teacherA, { maxAttempts: 2 });
    const id = String(created.body.id);
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    const first = (await (await submit(publicId, assignment.words)).json()) as {
      id: string;
      attempt_number: number;
    };
    const second = (await (
      await submit(publicId, assignment.words)
    ).json()) as { attempt_number: number };

    expect([first.attempt_number, second.attempt_number]).toEqual([1, 2]);
    expect(
      (
        await call(`/api/assignments/${id}/attempts/${first.id}`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
    const third = await submit(publicId, assignment.words);
    expect(third.status).toBe(201);
    expect(
      ((await third.json()) as { attempt_number: number }).attempt_number,
    ).toBe(3);
  });

  it("rate-limits only by the assignment public ID", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const keys: string[] = [];
    const response = await call(
      `/api/public/assignments/${publicId}/attempts`,
      { method: "POST", body: "{}" },
      null,
      testEnv({
        SUBMIT_LIMITER: {
          limit: async ({ key }) => {
            keys.push(key);
            return { success: false };
          },
        },
      }),
    );

    expect(response.status).toBe(429);
    expect(keys).toEqual([`submit:${publicId}`]);
  });

  it.each(["dictation", "typing"] as const)(
    "completes and reports a %s assignment",
    async (mode) => {
      const created = await createAssignment(teacherA, { mode });
      const publicId = String(created.body.publicId);
      const assignment = await publicWords(publicId);
      const response = await submit(publicId, assignment.words, {
        answers: ["apple", "wrong"],
      });
      const result = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(201);
      expect(result.score).toBe(1);
      expect(result.correct_count).toBe(1);
      expect(result.incorrect_count).toBe(1);
      expect(result.accuracy).toBe(50);
      expect(result.missedWords).toEqual(["banana"]);

      const detailResponse = await call(
        `/api/assignments/${created.body.id}`,
        {},
        teacherA,
      );
      const detail = (await detailResponse.json()) as {
        attempts: Array<{ accuracy: number; missed_words: string[] }>;
      };
      expect(detail.attempts).toHaveLength(1);
      expect(detail.attempts[0]).toMatchObject({
        accuracy: 50,
        missed_words: ["banana"],
      });
    },
  );

  it("uses the attempt ID idempotently and exposes no class results publicly", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    const attemptId = crypto.randomUUID();

    const first = await submit(publicId, assignment.words, { attemptId });
    const second = await submit(publicId, assignment.words, { attemptId });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(
      await bindings.DB.prepare("SELECT COUNT(*) AS count FROM attempts").first(
        "count",
      ),
    ).toBe(1);

    const publicResponse = await call(
      `/api/public/assignments/${publicId}`,
      {},
      null,
    );
    const publicBody = (await publicResponse.json()) as Record<string, unknown>;
    expect(publicBody).not.toHaveProperty("attempts");
    expect(publicBody).not.toHaveProperty("owner_user_id");
    expect(publicBody).not.toHaveProperty("id");
  });

  it("rejects closed and expired assignments", async () => {
    const closed = await createAssignment(teacherA, { title: "Closed" });
    const closedId = String(closed.body.id);
    const closedPublicId = String(closed.body.publicId);
    const closedWords = (await publicWords(closedPublicId)).words;
    await call(
      `/api/assignments/${closedId}`,
      { method: "PATCH", body: JSON.stringify({ status: "closed" }) },
      teacherA,
    );
    expect((await submit(closedPublicId, closedWords)).status).toBe(410);

    const expired = await createAssignment(teacherA, { title: "Expired" });
    const expiredPublicId = String(expired.body.publicId);
    await bindings.DB.prepare(
      "UPDATE assignments SET expires_at = ? WHERE id = ?",
    )
      .bind(new Date(Date.now() - 1000).toISOString(), expired.body.id)
      .run();
    const response = await call(
      `/api/public/assignments/${expiredPublicId}`,
      {},
      null,
    );
    expect(response.status).toBe(410);
    expect(((await response.json()) as Record<string, unknown>).error).toBe(
      "assignment_expired",
    );
  });

  it("stores hostile-looking titles and nicknames only as inert text", async () => {
    const title = "<img src=x onerror=globalThis.pwned=1>";
    const nickname = "<script>alert(1)</script>";
    const created = await createAssignment(teacherA, { title });
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    expect(assignment.title).toBe(title);
    const response = await submit(publicId, assignment.words, { nickname });
    expect(response.status).toBe(201);
    expect(
      await bindings.DB.prepare("SELECT nickname FROM attempts").first(
        "nickname",
      ),
    ).toBe(nickname);
  });

  it("cascades student results when the teacher deletes an assignment", async () => {
    const created = await createAssignment();
    const id = String(created.body.id);
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    await submit(publicId, assignment.words);

    expect(
      (await call(`/api/assignments/${id}`, { method: "DELETE" })).status,
    ).toBe(204);
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM assignments",
      ).first("count"),
    ).toBe(0);
    expect(
      await bindings.DB.prepare("SELECT COUNT(*) AS count FROM attempts").first(
        "count",
      ),
    ).toBe(0);
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM attempt_items",
      ).first("count"),
    ).toBe(0);
  });

  it("keeps CSV and class-wide missed-word statistics behind the Pro plan", async () => {
    const created = await createAssignment();
    const id = String(created.body.id);
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    await submit(publicId, assignment.words, { answers: ["apple", "wrong"] });

    expect((await call(`/api/assignments/${id}/export.csv`)).status).toBe(403);
    const freeDetail = (await (
      await call(`/api/assignments/${id}`)
    ).json()) as Record<string, unknown>;
    expect(freeDetail.missedWordStats).toBeNull();

    await bindings.DB.prepare(
      `INSERT INTO subscriptions (
         user_id, plan, status, billing_interval, stripe_price_id,
         current_period_end, cancel_at_period_end, updated_at
       ) VALUES (?, 'pro', 'active', 'month', 'price_monthly', ?, 0, ?)`,
    )
      .bind(
        teacherA.id,
        new Date(Date.now() + 86_400_000).toISOString(),
        new Date().toISOString(),
      )
      .run();

    const exportResponse = await call(`/api/assignments/${id}/export.csv`);
    expect(exportResponse.status).toBe(200);
    expect(await exportResponse.text()).toContain("Student 01");
    const proDetail = (await (await call(`/api/assignments/${id}`)).json()) as {
      missedWordStats: Array<{ word: string; misses: number }>;
    };
    expect(proDetail.missedWordStats).toEqual([{ word: "banana", misses: 1 }]);
  });
});

describe("Stripe checkout", () => {
  const now = new Date();
  const future = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();
  const expired = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  const createSession = async () => ({ url: "https://checkout.test/session" });

  it.each([
    ["pro", "inactive", "price_monthly", future],
    ["pro", "canceled", "price_monthly", future],
    ["pro", "active", "price_monthly", expired],
    ["free", "active", "price_unknown", future],
  ] as const)(
    "allows Checkout for an ineffective %s/%s subscription",
    async (plan, status, priceId, currentPeriodEnd) => {
      await insertSubscription({
        plan,
        status,
        priceId,
        currentPeriodEnd,
      });

      await expect(
        createCheckout(
          testEnv(),
          bindings.DB,
          teacherA,
          "month",
          "https://example.test",
          { now, createSession },
        ),
      ).resolves.toEqual({ url: "https://checkout.test/session" });
    },
  );

  it.each([
    ["pro", "active"],
    ["free", "trialing"],
  ] as const)(
    "rejects Checkout for an effective %s/%s configured subscription",
    async (plan, status) => {
      await insertSubscription({
        plan,
        status,
        currentPeriodEnd: future,
      });
      expect(
        ((await (await call("/api/me")).json()) as { plan: string }).plan,
      ).toBe("pro");

      await expect(
        createCheckout(
          testEnv(),
          bindings.DB,
          teacherA,
          "month",
          "https://example.test",
          { now, createSession },
        ),
      ).rejects.toMatchObject({ status: 409, code: "already_subscribed" });
    },
  );

  it("keeps an active unknown price on Free while allowing upgrade", async () => {
    await insertSubscription({
      plan: "free",
      status: "active",
      priceId: "price_unknown",
      currentPeriodEnd: future,
    });
    const me = (await (await call("/api/me")).json()) as { plan: string };
    expect(me.plan).toBe("free");
    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        { now, createSession },
      ),
    ).resolves.toEqual({ url: "https://checkout.test/session" });
  });

  it("creates one Session for concurrent requests and reuses its URL", async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const delayedSession = async () => {
      calls += 1;
      await gate;
      return { url: "https://checkout.test/shared" };
    };
    const checkout = () =>
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        { now, createSession: delayedSession },
      );

    const first = checkout();
    while (!calls) await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(checkout()).rejects.toMatchObject({
      status: 409,
      code: "checkout_pending",
    });
    release?.();
    await expect(first).resolves.toEqual({
      url: "https://checkout.test/shared",
    });
    await expect(checkout()).resolves.toEqual({
      url: "https://checkout.test/shared",
    });
    expect(calls).toBe(1);
  });
});

describe("Stripe event processing", () => {
  it("processes a repeated webhook event only once", async () => {
    const event = {
      id: "evt_repeat",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          client_reference_id: teacherA.id,
          customer: "cus_test",
          subscription: "sub_test",
          metadata: { owner_user_id: teacherA.id, billing_interval: "month" },
        },
      },
    } as unknown as Stripe.Event;

    expect(await processStripeEvent(bindings.DB, event, testEnv())).toBe(true);
    expect(await processStripeEvent(bindings.DB, event, testEnv())).toBe(false);
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM stripe_events",
      ).first("count"),
    ).toBe(1);
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM subscriptions",
      ).first("count"),
    ).toBe(1);
    expect(
      await bindings.DB.prepare(
        "SELECT stripe_price_id FROM subscriptions",
      ).first("stripe_price_id"),
    ).toBe("price_monthly");
  });

  it("does not grant Pro for an unconfigured Stripe price", async () => {
    const subscriptionEvent = {
      id: "evt_unknown_price",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_unknown",
          customer: "cus_unknown",
          status: "active",
          cancel_at_period_end: false,
          metadata: { owner_user_id: teacherA.id },
          items: {
            data: [
              {
                current_period_end: Math.floor(Date.now() / 1000) + 86_400,
                price: {
                  id: "price_not_configured",
                  recurring: { interval: "month" },
                },
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event;
    const invoiceEvent = {
      id: "evt_unknown_price_paid",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_unknown",
          customer: "cus_unknown",
          subscription: "sub_unknown",
        },
      },
    } as unknown as Stripe.Event;

    await processStripeEvent(bindings.DB, subscriptionEvent, testEnv());
    await processStripeEvent(bindings.DB, invoiceEvent, testEnv());
    const row = await bindings.DB.prepare(
      "SELECT plan, status FROM subscriptions WHERE user_id = ?",
    )
      .bind(teacherA.id)
      .first<{ plan: string; status: string }>();
    expect(row).toEqual({ plan: "free", status: "active" });
  });
});
