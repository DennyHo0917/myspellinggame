import { env as workerBindings } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import type Stripe from "stripe";

import {
  calculateReviewState,
  HttpError,
  masteryStatus,
  monthStart,
  parseWordList,
  PLAN_LIMITS,
  enforcePlanWordLimit,
  planWordLimit,
  resolvePlan,
} from "../src/worker/domain";
import {
  restrictTeacherAuthCallback,
  safeTeacherCallbackURL,
} from "../src/worker/auth";
import { handleRequest, scheduled, type Env } from "../src/worker/index";
import {
  cancelCheckout,
  changeSubscriptionPlan,
  createCheckout,
  createPortal,
  processStripeEvent,
} from "../src/worker/stripe";
import { CHASE_PASSAGES } from "../src/worker/chase";

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

function testWords(count: number) {
  return Array.from(
    { length: count },
    (_, index) =>
      `word${String.fromCharCode(97 + Math.floor(index / 26))}${String.fromCharCode(97 + (index % 26))}`,
  );
}
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
    STRIPE_PARENT_PRICE_MONTHLY: "price_parent_monthly",
    STRIPE_PARENT_PRICE_YEARLY: "price_parent_yearly",
    STRIPE_TEACHER_PRICE_MONTHLY: "price_teacher_monthly",
    STRIPE_TEACHER_PRICE_YEARLY: "price_teacher_yearly",
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
  overrides: { pinGenerator?: () => string } = {},
) {
  try {
    return await handleRequest(request(path, init), env, {
      getSession: sessionFor(teacher),
      ...overrides,
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
  plan: "free" | "parent" | "teacher" | "plus" | "pro";
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

async function createSavedList(
  title: string,
  teacher: Teacher = teacherA,
  words: unknown = ["apple", "banana"],
  exampleSentences?: unknown,
) {
  const response = await call(
    "/api/saved-lists",
    {
      method: "POST",
      body: JSON.stringify({ title, words, exampleSentences }),
    },
    teacher,
  );
  return { response, body: (await response.json()) as Record<string, unknown> };
}

async function createLearner(
  name: string,
  teacher: Teacher = teacherA,
  pinGenerator?: () => string,
  avatar?: string,
) {
  const response = await call(
    "/api/learners",
    { method: "POST", body: JSON.stringify({ name, avatar }) },
    teacher,
    testEnv(),
    { pinGenerator },
  );
  return { response, body: (await response.json()) as Record<string, unknown> };
}

async function publicWords(publicId: string, learnerPublicId?: string) {
  const response = await call(
    `/api/public/assignments/${publicId}${learnerPublicId ? `?learner=${encodeURIComponent(learnerPublicId)}` : ""}`,
    {},
    null,
  );
  return (await response.json()) as {
    words: Array<{
      id: string;
      word: string;
      example_sentence: string | null;
    }>;
    [key: string]: unknown;
  };
}

async function submit(
  publicId: string,
  words: Array<{ id: string; word: string }>,
  options: {
    attemptId?: string;
    nickname?: string;
    learnerPublicId?: string;
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
        ...(options.learnerPublicId
          ? { learnerPublicId: options.learnerPublicId }
          : { nickname: options.nickname ?? "Student 01" }),
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

async function start(
  publicId: string,
  options: {
    attemptId?: string;
    nickname?: string;
    learnerPublicId?: string;
  } = {},
) {
  return call(
    `/api/public/assignments/${publicId}/start`,
    {
      method: "POST",
      body: JSON.stringify(
        options.learnerPublicId
          ? {
              learnerPublicId: options.learnerPublicId,
              ...(options.attemptId ? { attemptId: options.attemptId } : {}),
            }
          : {
              nickname: options.nickname ?? "Student 01",
              ...(options.attemptId ? { attemptId: options.attemptId } : {}),
            },
      ),
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

describe("teacher auth callback", () => {
  it("starts Microsoft sign-in when Microsoft is the only configured provider", async () => {
    const env = testEnv({
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      MICROSOFT_CLIENT_ID: "microsoft-test",
      MICROSOFT_CLIENT_SECRET: "microsoft-test-secret",
    });
    const config = await call("/api/config", {}, null, env);
    await expect(config.json()).resolves.toMatchObject({
      googleAuthConfigured: false,
      microsoftAuthConfigured: true,
    });

    const response = await call(
      "/api/auth/sign-in/social",
      {
        method: "POST",
        body: JSON.stringify({
          provider: "microsoft",
          callbackURL: "/workspace?lang=en",
        }),
      },
      null,
      env,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      redirect: true,
      url: expect.stringContaining(
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      ),
    });
  });

  it("allows only same-origin teacher paths", () => {
    const origin = "https://example.test";
    expect(
      safeTeacherCallbackURL("/workspace/assignments/new?lang=en", origin),
    ).toBe("/workspace/assignments/new?lang=en");
    expect(
      safeTeacherCallbackURL("/teacher/assignments/new?lang=en", origin),
    ).toBe("/workspace/assignments/new?lang=en");
    expect(safeTeacherCallbackURL("/teacher", origin)).toBe("/workspace");
    expect(safeTeacherCallbackURL("https://evil.test/workspace", origin)).toBe(
      "/workspace",
    );
    expect(safeTeacherCallbackURL("/workspace-redirect", origin)).toBe(
      "/workspace",
    );
  });

  it("sanitizes the social sign-in request before auth handles it", async () => {
    const request = new Request(
      "https://example.test/api/auth/sign-in/social",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "https://evil.test/workspace",
        }),
      },
    );
    const sanitized = await restrictTeacherAuthCallback(request);
    await expect(sanitized.json()).resolves.toMatchObject({
      provider: "google",
      callbackURL: "/workspace",
    });
  });
});

describe("Typing Chase passages", () => {
  it("keeps every fixed passage between 200 and 300 words", () => {
    for (const passage of CHASE_PASSAGES) {
      const count = passage.text.trim().split(/\s+/).length;
      expect(count).toBeGreaterThanOrEqual(200);
      expect(count).toBeLessThanOrEqual(300);
    }
  });

  it("requires login and returns the current plan with a random passage", async () => {
    const anonymous = await call("/api/chase/passage", {}, null);
    expect(anonymous.status).toBe(401);

    const free = await call("/api/chase/passage");
    expect(free.status).toBe(200);
    await expect(free.json()).resolves.toMatchObject({
      plan: "free",
      passage: { title: expect.any(String), text: expect.any(String) },
    });

    await insertSubscription({ plan: "parent", status: "active" });
    const paid = await call("/api/chase/passage");
    await expect(paid.json()).resolves.toMatchObject({ plan: "parent" });
  });
});

describe("teacher authorization and quotas", () => {
  it("serves the workspace route and redirects the legacy teacher route", async () => {
    const fetched: string[] = [];
    const env = testEnv({
      ASSETS: {
        fetch: async (assetRequest: Request) => {
          fetched.push(new URL(assetRequest.url).pathname);
          return new Response("workspace shell");
        },
      } as Fetcher,
    });
    const workspace = await call("/workspace?lang=zh", {}, null, env);
    expect(workspace.status).toBe(200);
    await expect(workspace.text()).resolves.toBe("workspace shell");
    expect(fetched).toEqual(["/src/pages/teacher.html"]);

    const legacy = await call("/teacher/assignments?lang=zh", {}, null, env);
    expect(legacy.status).toBe(308);
    expect(legacy.headers.get("location")).toBe(
      "https://example.test/workspace/assignments?lang=zh",
    );
  });

  it("keeps the Free, Parent, and Teacher limits centralized", () => {
    expect(PLAN_LIMITS.free).toEqual({
      activeAssignments: 1,
      monthlyAttempts: 8,
      savedLists: 1,
      learnerProfiles: 1,
      historyDays: 14,
      retentionDays: 14,
      smartReview: false,
      csvExport: false,
      missedWordStats: false,
      sentenceLibrary: false,
    });
    const paidLimits = {
      monthlyAttempts: null,
      savedLists: null,
      historyDays: 365,
      retentionDays: 365,
      smartReview: true,
      sentenceLibrary: true,
    };
    expect(PLAN_LIMITS.parent).toEqual({
      ...paidLimits,
      activeAssignments: 3,
      learnerProfiles: 5,
      csvExport: false,
      missedWordStats: false,
    });
    expect(PLAN_LIMITS.teacher).toEqual({
      ...paidLimits,
      activeAssignments: 5,
      learnerProfiles: 40,
      csvExport: true,
      missedWordStats: true,
    });
  });

  it("enforces 30-word Free and 40-word paid limits", () => {
    expect(planWordLimit("free")).toBe(30);
    expect(planWordLimit("parent")).toBe(40);
    expect(planWordLimit("teacher")).toBe(40);
    expect(() =>
      enforcePlanWordLimit(Array.from({ length: 30 }), "free"),
    ).not.toThrow();
    expect(() =>
      enforcePlanWordLimit(Array.from({ length: 31 }), "free"),
    ).toThrow(HttpError);
    expect(() =>
      enforcePlanWordLimit(Array.from({ length: 40 }), "parent"),
    ).not.toThrow();
    expect(() =>
      enforcePlanWordLimit(Array.from({ length: 41 }), "teacher"),
    ).toThrow(HttpError);
    expect(parseWordList(testWords(80))).toHaveLength(80);
    expect(() => parseWordList(testWords(81))).toThrowError(
      expect.objectContaining({ code: "invalid_words" }),
    );
  });

  it("resolves canonical plans and legacy Plus/Pro values", () => {
    expect(resolvePlan("free", null, false)).toBe("free");
    expect(resolvePlan("parent", null, true)).toBe("parent");
    expect(resolvePlan("teacher", null, true)).toBe("teacher");
    expect(resolvePlan("plus", "family", true)).toBe("parent");
    expect(resolvePlan("pro", "teacher", true)).toBe("teacher");
    expect(resolvePlan("pro", null, true)).toBe("teacher");
    expect(resolvePlan("teacher", "teacher", false)).toBe("free");
    expect(resolvePlan("free", null, false, "parent")).toBe("parent");
  });

  it.each([
    ["parent", null, "parent"],
    ["teacher", null, "teacher"],
    ["plus", "family", "parent"],
    ["pro", "teacher", "teacher"],
  ] as const)(
    "resolves an active %s subscription as %s",
    async (storedPlan, workspaceType, expected) => {
      if (workspaceType)
        await bindings.DB.prepare(
          "UPDATE user SET workspace_type = ? WHERE id = ?",
        )
          .bind(workspaceType, teacherA.id)
          .run();
      await insertSubscription({ plan: storedPlan, status: "active" });
      const me = (await (await call("/api/me")).json()) as { plan: string };
      expect(me.plan).toBe(expected);
    },
  );

  it("resolves a user without paid access as Free", async () => {
    const me = (await (await call("/api/me")).json()) as { plan: string };
    expect(me.plan).toBe("free");
  });

  it.each(["parent", "teacher"] as const)(
    "returns cancelAtPeriodEnd for %s subscriptions",
    async (plan) => {
      await insertSubscription({ plan, status: "active" });
      const current = (await (await call("/api/me")).json()) as {
        plan: string;
        cancelAtPeriodEnd: boolean;
      };
      expect(current).toMatchObject({
        plan,
        cancelAtPeriodEnd: false,
      });

      await bindings.DB.prepare(
        "UPDATE subscriptions SET cancel_at_period_end = 1 WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .run();
      const scheduled = (await (await call("/api/me")).json()) as {
        plan: string;
        cancelAtPeriodEnd: boolean;
      };
      expect(scheduled).toMatchObject({
        plan,
        cancelAtPeriodEnd: true,
      });
    },
  );

  it("enforces word limits on assignment writes", async () => {
    const freeBoundary = await createAssignment(teacherA, {
      words: testWords(30),
    });
    expect(freeBoundary.response.status).toBe(201);
    const free = await createAssignment(teacherA, { words: testWords(31) });
    expect(free.response.status).toBe(403);
    expect(free.body.error).toBe("word_limit");
  });

  it.each(["parent", "teacher"] as const)(
    "enforces the 40-word %s assignment limit",
    async (plan) => {
      await insertSubscription({ plan, status: "active" });
      expect(
        (await createAssignment(teacherA, { words: testWords(40) })).response
          .status,
      ).toBe(201);
      const limited = await createAssignment(teacherA, {
        words: testWords(41),
      });
      expect(limited.response.status).toBe(403);
      expect(limited.body.error).toBe("word_limit");
    },
  );

  it("cleans expired attempts and cascades their attempt items", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const words = await publicWords(publicId);
    const expired = (await (await submit(publicId, words.words)).json()) as {
      id: string;
    };
    const retained = (await (await submit(publicId, words.words)).json()) as {
      id: string;
    };
    await bindings.DB.batch([
      bindings.DB.prepare(
        "UPDATE attempts SET retention_expires_at = ? WHERE id = ?",
      ).bind("2000-01-01T00:00:00.000Z", expired.id),
      bindings.DB.prepare(
        "UPDATE attempts SET retention_expires_at = ? WHERE id = ?",
      ).bind("2999-01-01T00:00:00.000Z", retained.id),
    ]);
    const beforeItems = await bindings.DB.prepare(
      "SELECT COUNT(*) AS count FROM attempt_items WHERE attempt_id = ?",
    )
      .bind(expired.id)
      .first<{ count: number }>();
    expect(Number(beforeItems?.count)).toBeGreaterThan(0);

    await scheduled({} as ScheduledController, testEnv());
    await scheduled({} as ScheduledController, testEnv());

    await expect(
      bindings.DB.prepare("SELECT id FROM attempts WHERE id = ?")
        .bind(expired.id)
        .first(),
    ).resolves.toBeNull();
    await expect(
      bindings.DB.prepare("SELECT id FROM attempts WHERE id = ?")
        .bind(retained.id)
        .first(),
    ).resolves.toBeTruthy();
    await expect(
      bindings.DB.prepare("SELECT id FROM assignments WHERE id = ?")
        .bind(created.body.id)
        .first(),
    ).resolves.toBeTruthy();
    await expect(
      bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM attempt_items WHERE attempt_id = ?",
      )
        .bind(expired.id)
        .first("count"),
    ).resolves.toBe(0);
  });

  it("enforces word limits on assignment updates", async () => {
    const created = await createAssignment();
    const rejected = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Too long", words: testWords(31) }),
    });
    expect(rejected.status).toBe(403);
    expect(((await rejected.json()) as { error: string }).error).toBe(
      "word_limit",
    );
    const unchanged = await publicWords(String(created.body.publicId));
    expect(unchanged.words).toHaveLength(2);
  });

  it("keeps a legacy over-limit assignment readable after Free downgrade", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const created = await createAssignment(teacherA, { words: testWords(40) });
    expect(created.response.status).toBe(201);
    await bindings.DB.prepare(
      "UPDATE subscriptions SET status = 'canceled', stripe_price_id = NULL WHERE user_id = ?",
    )
      .bind(teacherA.id)
      .run();
    const detail = await call(`/api/assignments/${created.body.id}`);
    expect(detail.status).toBe(200);
    expect(((await detail.json()) as { words: unknown[] }).words).toHaveLength(
      40,
    );
  });

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
    const second = await createAssignment(teacherA, { title: "Two" });
    expect(second.response.status).toBe(403);
    expect(second.body.error).toBe("active_assignment_limit");
  });

  it.each([
    ["parent", 3],
    ["teacher", 5],
  ] as const)(
    "enforces the %s active-assignment limit",
    async (plan, limit) => {
      await insertSubscription({ plan, status: "active" });
      for (let index = 1; index <= limit; index += 1) {
        expect(
          (await createAssignment(teacherA, { title: `Assignment ${index}` }))
            .response.status,
        ).toBe(201);
      }
      const limited = await createAssignment(teacherA, {
        title: `Assignment ${limit + 1}`,
      });
      expect(limited.response.status).toBe(403);
      expect(limited.body.error).toBe("active_assignment_limit");
    },
  );

  it("stores optional example sentences and returns null for old-style words", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const created = await createAssignment(teacherA, {
      words: ["because", "friend"],
      exampleSentences: ["I stayed inside because it was raining.", ""],
    });
    expect(created.response.status).toBe(201);
    const assignment = await publicWords(String(created.body.publicId));
    expect(assignment.words).toMatchObject([
      {
        word: "because",
        example_sentence: "I stayed inside because it was raining.",
      },
      { word: "friend", example_sentence: null },
    ]);

    const legacy = await createAssignment(teacherA, {
      title: "Legacy words",
      words: ["beautiful"],
    });
    const legacyAssignment = await publicWords(String(legacy.body.publicId));
    expect(legacyAssignment.words[0]).toMatchObject({
      word: "beautiful",
      example_sentence: null,
    });
  });

  it("rejects example sentences over 300 characters", async () => {
    const created = await createAssignment(teacherA, {
      words: ["because"],
      exampleSentences: ["x".repeat(301)],
    });
    expect(created.response.status).toBe(400);
    expect(created.body.error).toBe("invalid_example_sentence");
  });

  it("edits example sentences before attempts and preserves them in teacher detail", async () => {
    const created = await createAssignment(teacherA, {
      words: ["because", "friend"],
    });
    const updated = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Updated assignment",
        words: ["because", "friend"],
        exampleSentences: ["I stayed inside because it was raining.", ""],
      }),
    });
    expect(updated.status).toBe(200);
    const detail = (await updated.json()) as {
      title: string;
      words: Array<{ word: string; example_sentence: string | null }>;
    };
    expect(detail.title).toBe("Updated assignment");
    expect(detail.words).toMatchObject([
      {
        word: "because",
        example_sentence: "I stayed inside because it was raining.",
      },
      { word: "friend", example_sentence: null },
    ]);
  });

  it("does not replace assignment words after a student attempt exists", async () => {
    const created = await createAssignment();
    const learner = await createLearner("Alice");
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    expect((await submit(publicId, assignment.words)).status).toBe(201);
    const detailResponse = await call(`/api/assignments/${created.body.id}`);
    expect(
      ((await detailResponse.json()) as { hasAttempts: boolean }).hasAttempts,
    ).toBe(true);
    const updated = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Changed",
        words: ["cherry"],
        exampleSentences: ["I ate a cherry."],
        learnerIds: [learner.body.id],
      }),
    });
    expect(updated.status).toBe(409);
    expect(((await updated.json()) as { error: string }).error).toBe(
      "assignment_has_results",
    );
    const unchanged = await publicWords(publicId);
    expect(unchanged.words.map((word) => word.word)).toEqual([
      "apple",
      "banana",
    ]);
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM assignment_learners WHERE assignment_id = ?",
      )
        .bind(created.body.id)
        .first("count"),
    ).toBe(0);
  });

  it("does not lock assignment content for incomplete attempts", async () => {
    const created = await createAssignment(teacherA, {
      words: ["apple", "banana"],
      exampleSentences: ["An apple.", "A banana."],
      mode: "typing",
    });
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    expect(
      (
        await submit(publicId, assignment.words, {
          answers: ["wrong", "banana"],
          completed: false,
        })
      ).status,
    ).toBe(201);

    const detailBefore = (await (
      await call(`/api/assignments/${created.body.id}`, {}, teacherA)
    ).json()) as { hasAttempts: boolean };
    expect(detailBefore.hasAttempts).toBe(false);

    const updated = await call(
      `/api/assignments/${created.body.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          words: ["cherry"],
          exampleSentences: ["A cherry."],
          mode: "dictation",
        }),
      },
      teacherA,
    );
    expect(updated.status).toBe(200);
    expect(
      (
        (await updated.json()) as {
          words: Array<{ word: string; example_sentence: string | null }>;
        }
      ).words,
    ).toMatchObject([{ word: "cherry", example_sentence: "A cherry." }]);
  });

  it("allows metadata and learner updates after attempts without changing words or mode", async () => {
    const created = await createAssignment();
    const learner = await createLearner("Alice");
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    expect((await submit(publicId, assignment.words)).status).toBe(201);
    const updated = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "After attempt",
        expiresAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        maxAttempts: 5,
        learnerIds: [learner.body.id],
      }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      title: "After attempt",
      max_attempts: 5,
      assignedLearners: [
        {
          id: learner.body.id,
          public_id: learner.body.public_id,
          name: "Alice",
        },
      ],
    });
  });

  it("does not change assignment mode after a student attempt exists", async () => {
    const created = await createAssignment();
    const learner = await createLearner("Alice");
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    expect((await submit(publicId, assignment.words)).status).toBe(201);

    const updated = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ mode: "typing", learnerIds: [learner.body.id] }),
    });
    expect(updated.status).toBe(409);
    expect(((await updated.json()) as { error: string }).error).toBe(
      "assignment_has_results",
    );
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM assignment_learners WHERE assignment_id = ?",
      )
        .bind(created.body.id)
        .first("count"),
    ).toBe(0);
  });

  it("keeps the existing-result lock ahead of the plan word limit", async () => {
    const created = await createAssignment();
    const assignment = await publicWords(String(created.body.publicId));
    expect(
      (await submit(String(created.body.publicId), assignment.words)).status,
    ).toBe(201);
    const updated = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ words: testWords(31) }),
    });
    expect(updated.status).toBe(409);
    expect(((await updated.json()) as { error: string }).error).toBe(
      "assignment_has_results",
    );
  });

  it("enforces the free monthly submission limit on the server", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    const now = new Date().toISOString();
    const statements = Array.from({ length: 7 }, () =>
      bindings.DB.prepare(
        `INSERT INTO monthly_submission_usage (attempt_id, user_id, month_key, created_at)
         VALUES (?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), teacherA.id, monthStart(), now),
    );
    await bindings.DB.batch(statements);

    expect((await submit(publicId, assignment.words)).status).toBe(201);
    const limited = await submit(publicId, assignment.words);
    expect(limited.status).toBe(403);
    expect(((await limited.json()) as Record<string, unknown>).error).toBe(
      "monthly_submission_limit",
    );
  });

  it.each(["parent", "teacher"] as const)(
    "keeps %s monthly submissions unlimited",
    async (plan) => {
      await insertSubscription({ plan, status: "active" });
      const created = await createAssignment();
      const publicId = String(created.body.publicId);
      const assignment = await publicWords(publicId);
      const now = new Date().toISOString();
      await bindings.DB.batch(
        Array.from({ length: 8 }, () =>
          bindings.DB.prepare(
            `INSERT INTO monthly_submission_usage (attempt_id, user_id, month_key, created_at)
             VALUES (?, ?, ?, ?)`,
          ).bind(crypto.randomUUID(), teacherA.id, monthStart(), now),
        ),
      );
      expect((await submit(publicId, assignment.words)).status).toBe(201);
    },
  );

  it("keeps public nickname submissions independent from saved learner quotas", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    for (let index = 0; index < 2; index += 1) {
      expect((await createLearner(`Learner ${index}`)).response.status).toBe(
        index < 1 ? 201 : 403,
      );
    }
    const response = await submit(publicId, assignment.words, {
      nickname: "Untracked learner",
    });
    expect(response.status).toBe(201);
    expect(
      await bindings.DB.prepare("SELECT COUNT(*) AS count FROM learners").first(
        "count",
      ),
    ).toBe(1);
  });
});

describe("saved lists and learner profiles", () => {
  it("enforces the Free saved-list word limit", async () => {
    const freeBoundary = await createSavedList(
      "Free boundary",
      teacherA,
      testWords(30),
    );
    expect(freeBoundary.response.status).toBe(201);
    const freeRejected = await createSavedList(
      "Free too long",
      teacherA,
      testWords(31),
    );
    expect(freeRejected.response.status).toBe(403);
    expect(freeRejected.body.error).toBe("word_limit");
  });

  it.each(["parent", "teacher"] as const)(
    "enforces the 40-word %s saved-list limit",
    async (plan) => {
      await insertSubscription({ plan, status: "active" });
      expect(
        (await createSavedList("Boundary", teacherA, testWords(40))).response
          .status,
      ).toBe(201);
      const limited = await createSavedList(
        "Too long",
        teacherA,
        testWords(41),
      );
      expect(limited.response.status).toBe(403);
      expect(limited.body.error).toBe("word_limit");
    },
  );

  it("rejects over-limit saved-list updates without changing the list", async () => {
    const saved = await createSavedList("Editable list");
    const rejected = await call(`/api/saved-lists/${saved.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Too long", words: testWords(31) }),
    });
    expect(rejected.status).toBe(403);
    expect(((await rejected.json()) as { error: string }).error).toBe(
      "word_limit",
    );
    const unchanged = await call(`/api/saved-lists/${saved.body.id}`);
    expect(((await unchanged.json()) as { words: unknown[] }).words).toEqual([
      "apple",
      "banana",
    ]);
  });

  it("enforces the Free saved-list limit", async () => {
    expect((await createSavedList("One")).response.status).toBe(201);
    const limited = await createSavedList("Two");
    expect(limited.response.status).toBe(403);
    expect(limited.body.error).toBe("saved_list_limit");
  });

  it.each(["parent", "teacher"] as const)(
    "keeps %s saved lists unlimited",
    async (plan) => {
      await insertSubscription({ plan, status: "active" });
      expect((await createSavedList("One")).response.status).toBe(201);
      expect((await createSavedList("Two")).response.status).toBe(201);
    },
  );

  it("enforces the one-profile Free limit", async () => {
    expect((await createLearner("Learner 01")).response.status).toBe(201);
    const limited = await createLearner("Learner 02");
    expect(limited.response.status).toBe(403);
    expect(limited.body.error).toBe("learner_limit");
  });

  it("stores built-in and uploaded learner avatars and rejects invalid paths", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const builtIn = await createLearner(
      "Built in",
      teacherA,
      undefined,
      "/images/avatars/avatar-23.jpg",
    );
    expect(builtIn.body.avatar).toBe("/images/avatars/avatar-23.jpg");

    const uploadedValue = "data:image/jpeg;base64,/9j/2Q==";
    const uploaded = await createLearner(
      "Uploaded",
      teacherA,
      undefined,
      uploadedValue,
    );
    expect(uploaded.body.avatar).toBe(uploadedValue);

    const invalid = await createLearner(
      "Invalid",
      teacherA,
      undefined,
      "/images/avatars/avatar-99.jpg",
    );
    expect(invalid.response.status).toBe(400);
    expect(invalid.body.error).toBe("invalid_avatar");
  });

  it.each([
    ["parent", 5],
    ["teacher", 40],
  ] as const)("enforces the %s learner limit", async (plan, limit) => {
    await insertSubscription({ plan, status: "active" });
    const now = new Date().toISOString();
    const statements = Array.from({ length: limit }, (_, index) =>
      bindings.DB.prepare(
        `INSERT INTO learners (
             id, owner_user_id, name, name_key, archived, created_at, updated_at
           ) VALUES (?, ?, ?, ?, 0, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        teacherA.id,
        `Learner ${index}`,
        `learner ${index}`,
        now,
        now,
      ),
    );
    await bindings.DB.batch(statements);
    const limited = await createLearner(`Learner ${limit + 1}`);
    expect(limited.response.status).toBe(403);
    expect(limited.body.error).toBe("learner_limit");
  });

  it.each(["free", "parent", "teacher"] as const)(
    "counts only active %s learners for usage and creation",
    async (plan) => {
      if (plan !== "free") await insertSubscription({ plan, status: "active" });
      const now = new Date().toISOString();
      await bindings.DB.prepare(
        `INSERT INTO learners (
             id, owner_user_id, name, name_key, archived, created_at, updated_at
           ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          teacherA.id,
          `${plan} archived`,
          `${plan} archived`,
          now,
          now,
        )
        .run();

      const me = (await (await call("/api/me")).json()) as {
        learnerProfiles: number;
      };
      expect(me.learnerProfiles).toBe(0);
      expect((await createLearner(`${plan} active`)).response.status).toBe(201);
    },
  );

  it.each([
    ["free", 1],
    ["parent", 5],
    ["teacher", 40],
  ] as const)(
    "blocks restoring an archived %s learner when active limit is full",
    async (plan, limit) => {
      if (plan !== "free") await insertSubscription({ plan, status: "active" });
      const now = new Date().toISOString();
      const activeStatements = Array.from({ length: limit }, (_, index) =>
        bindings.DB.prepare(
          `INSERT INTO learners (
               id, owner_user_id, name, name_key, archived, created_at, updated_at
             ) VALUES (?, ?, ?, ?, 0, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          teacherA.id,
          `${plan} active ${index}`,
          `${plan} active ${index}`,
          now,
          now,
        ),
      );
      await bindings.DB.batch(activeStatements);
      const archivedId = crypto.randomUUID();
      await bindings.DB.prepare(
        `INSERT INTO learners (
             id, owner_user_id, name, name_key, archived, created_at, updated_at
           ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
      )
        .bind(
          archivedId,
          teacherA.id,
          `${plan} archived`,
          `${plan} archived`,
          now,
          now,
        )
        .run();

      const restored = await call(`/api/learners/${archivedId}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: false }),
      });
      expect(restored.status).toBe(403);
      expect(((await restored.json()) as { error: string }).error).toBe(
        "learner_limit",
      );
      const row = await bindings.DB.prepare(
        "SELECT archived FROM learners WHERE id = ?",
      )
        .bind(archivedId)
        .first<{ archived: number }>();
      expect(row?.archived).toBe(1);
    },
  );

  it("keeps saved lists and learner profiles private to their owner", async () => {
    const savedList = await createSavedList("Private list");
    const learner = await createLearner("Learner 01");
    expect(
      (await call(`/api/saved-lists/${savedList.body.id}`, {}, teacherB))
        .status,
    ).toBe(404);
    expect(
      (await call(`/api/learners/${learner.body.id}`, {}, teacherB)).status,
    ).toBe(404);
    const archived = (await (
      await call(`/api/learners/${learner.body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Learner 02", archived: true }),
      })
    ).json()) as { name: string; archived: number };
    expect(archived).toMatchObject({ name: "Learner 02", archived: 1 });
    const restored = (await (
      await call(`/api/learners/${learner.body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: false }),
      })
    ).json()) as { archived: number };
    expect(restored.archived).toBe(0);
  });

  it("copies list words into an assignment snapshot", async () => {
    const savedList = await createSavedList("Week one");
    const assignment = await createAssignment(teacherA, {
      title: savedList.body.title,
      words: savedList.body.words,
    });
    expect(assignment.response.status).toBe(201);
    expect(
      (
        await call(`/api/saved-lists/${savedList.body.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: "Changed",
            words: ["cherry", "grape"],
          }),
        })
      ).status,
    ).toBe(200);
    const detail = (await (
      await call(`/api/assignments/${assignment.body.id}`)
    ).json()) as { words: Array<{ word: string }> };
    expect(detail.words.map((word) => word.word)).toEqual(["apple", "banana"]);
    expect(
      (
        await call(`/api/saved-lists/${savedList.body.id}`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
    expect((await call(`/api/saved-lists/${savedList.body.id}`)).status).toBe(
      404,
    );
  });

  it("keeps example sentences through saved-list reuse, copy, and edit", async () => {
    const sentence = "My friend helped me with my homework.";
    const savedList = await createSavedList(
      "Sentence list",
      teacherA,
      ["friend", "beautiful"],
      [sentence, ""],
    );
    expect(savedList.response.status).toBe(201);
    expect(savedList.body.word_details).toEqual([
      { word: "friend", example_sentence: sentence },
      { word: "beautiful", example_sentence: null },
    ]);

    const assignment = await createAssignment(teacherA, {
      title: savedList.body.title,
      words: savedList.body.word_details,
    });
    const publicAssignment = await publicWords(
      String(assignment.body.publicId),
    );
    expect(publicAssignment.words).toMatchObject([
      { word: "friend", example_sentence: sentence },
      { word: "beautiful", example_sentence: null },
    ]);

    const updated = (await (
      await call(`/api/saved-lists/${savedList.body.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: "Updated sentence list",
          words: ["friend", "beautiful"],
          exampleSentences: ["A friend waited for me.", ""],
        }),
      })
    ).json()) as { word_details: Array<Record<string, unknown>> };
    expect(updated.word_details[0]).toMatchObject({
      word: "friend",
      example_sentence: "A friend waited for me.",
    });
    expect(publicAssignment.words[0].example_sentence).toBe(sentence);
  });

  it("retains over-limit data after downgrade but blocks new records", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    for (const title of ["One", "Two", "Three", "Four"]) {
      expect((await createSavedList(title)).response.status).toBe(201);
    }
    await bindings.DB.prepare(
      "UPDATE subscriptions SET status = 'inactive' WHERE user_id = ?",
    )
      .bind(teacherA.id)
      .run();

    const dashboard = (await (await call("/api/assignments")).json()) as {
      savedLists: unknown[];
      usage: { savedLists: number };
    };
    expect(dashboard.savedLists).toHaveLength(4);
    expect(dashboard.usage.savedLists).toBe(4);
    expect((await createSavedList("Five")).response.status).toBe(403);
  });

  it("does not guess a learner from a matching nickname", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    expect(
      (
        await submit(publicId, assignment.words, {
          nickname: "  Learner   01 ",
        })
      ).status,
    ).toBe(201);
    await createLearner("learner 01");
    const learnerB = await createLearner("Learner 01", teacherB);
    const linked = await bindings.DB.prepare(
      "SELECT learner_id FROM attempts WHERE assignment_id = ?",
    )
      .bind(created.body.id)
      .first("learner_id");
    expect(linked).toBeNull();
    expect(linked).not.toBe(learnerB.body.id);
  });

  it.each([
    ["a", "invalid_nickname"],
    ["x".repeat(33), "invalid_nickname"],
    ["student@example.com", "personal_info_not_allowed"],
    ["http://example.com", "personal_info_not_allowed"],
    ["HTTPS://example.com", "personal_info_not_allowed"],
  ] as const)(
    "rejects invalid public nickname %s before start and submit",
    async (nickname, error) => {
      const created = await createAssignment();
      const publicId = String(created.body.publicId);
      const assignment = await publicWords(publicId);

      const started = await start(publicId, { nickname });
      expect(started.status).toBe(400);
      expect(((await started.json()) as { error: string }).error).toBe(error);

      const submitted = await submit(publicId, assignment.words, { nickname });
      expect(submitted.status).toBe(400);
      expect(((await submitted.json()) as { error: string }).error).toBe(error);
    },
  );

  it("allows duplicate learner names with distinct public identities", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const first = await createLearner("Emily");
    const second = await createLearner("Emily");
    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
    expect(first.body.public_id).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(second.body.public_id).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(first.body.public_id).not.toBe(second.body.public_id);
  });

  it("keeps a learner public ID and internal key stable when renamed", async () => {
    const learner = await createLearner("Emily");
    const before = await bindings.DB.prepare(
      "SELECT public_id, name_key FROM learners WHERE id = ?",
    )
      .bind(learner.body.id)
      .first<{ public_id: string; name_key: string }>();
    const renamed = (await (
      await call(`/api/learners/${learner.body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Emma" }),
      })
    ).json()) as Record<string, unknown>;
    expect(renamed.public_id).toBe(before?.public_id);
    expect(renamed.name_key).toBe(before?.name_key);
  });

  it("isolates duplicate-name magic learners and rejects cross-owner tokens", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const avatar = "/images/avatars/avatar-08.jpg";
    const learnerA = await createLearner("Emily", teacherA, undefined, avatar);
    const learnerB = await createLearner("Emily", teacherA, undefined, avatar);
    const assignment = await createAssignment(teacherA);
    const publicId = String(assignment.body.publicId);
    const tokenA = String(learnerA.body.public_id);
    const tokenB = String(learnerB.body.public_id);
    const words = await publicWords(publicId);

    for (const token of [tokenA, tokenB]) {
      const response = await call(
        `/api/public/assignments/${publicId}?learner=${token}`,
        {},
        null,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toMatchObject({ learner: { name: "Emily", avatar } });
    }
    const generic = await submit(publicId, words.words, { nickname: "Emily" });
    expect(generic.status).toBe(201);
    for (const token of [tokenA, tokenB]) {
      expect(
        (
          await submit(publicId, words.words, {
            learnerPublicId: token,
            answers: ["wrong", "banana"],
          })
        ).status,
      ).toBe(201);
    }
    const rows = await bindings.DB.prepare(
      `SELECT learner_id, nickname_key, attempt_number
       FROM attempts WHERE assignment_id = ? ORDER BY nickname_key`,
    )
      .bind(assignment.body.id)
      .all<{
        learner_id: string | null;
        nickname_key: string;
        attempt_number: number;
      }>();
    expect(rows.results).toHaveLength(3);
    expect(rows.results.filter((row) => row.learner_id === null)).toHaveLength(
      1,
    );
    expect(
      rows.results.filter((row) => row.learner_id === learnerA.body.id)[0],
    ).toMatchObject({
      nickname_key: `learner:${learnerA.body.id}`,
      attempt_number: 1,
    });
    expect(
      rows.results.filter((row) => row.learner_id === learnerB.body.id)[0],
    ).toMatchObject({
      nickname_key: `learner:${learnerB.body.id}`,
      attempt_number: 1,
    });

    const otherTeacherAssignment = await createAssignment(teacherB);
    expect(
      (
        await call(
          `/api/public/assignments/${otherTeacherAssignment.body.publicId}?learner=${tokenA}`,
          {},
          null,
        )
      ).status,
    ).toBe(404);

    const publicLearner = await call(
      `/api/public/learners/${tokenA}`,
      {},
      null,
    );
    const publicBody = (await publicLearner.json()) as Record<string, unknown>;
    expect(publicBody).toMatchObject({ learner: { name: "Emily" } });
    expect(publicBody).not.toHaveProperty("owner_user_id");
    expect(publicBody).not.toHaveProperty("learner.id");
    expect(publicBody).not.toHaveProperty("teacher");

    await call(`/api/learners/${learnerA.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: true }),
    });
    expect(
      (await call(`/api/public/learners/${tokenA}`, {}, null)).status,
    ).toBe(404);
    expect(
      (
        await call(
          `/api/public/assignments/${publicId}?learner=${tokenA}`,
          {},
          null,
        )
      ).status,
    ).toBe(404);
    expect(
      (await call(`/api/public/learners/${"0".repeat(24)}`, {}, null)).status,
    ).toBe(404);
  });
});

describe("assignment learner binding and class join", () => {
  it("lets Parent assign one assignment to multiple children", async () => {
    await insertSubscription({ plan: "parent", status: "active" });
    const alice = await createLearner("Alice");
    const bob = await createLearner("Bob");
    const created = await createAssignment(teacherA, {
      learnerIds: [alice.body.id, bob.body.id],
    });
    expect(created.response.status).toBe(201);
    const detail = (await (
      await call(`/api/assignments/${created.body.id}`)
    ).json()) as {
      assignedLearners: Array<{
        id: string;
        public_id: string;
        name: string;
      }>;
    };
    expect(detail.assignedLearners).toHaveLength(2);
    expect(detail.assignedLearners).toEqual(
      expect.arrayContaining([
        {
          id: alice.body.id,
          public_id: alice.body.public_id,
          name: "Alice",
        },
        { id: bob.body.id, public_id: bob.body.public_id, name: "Bob" },
      ]),
    );
  });

  it("binds owned learners, filters learner home, and attributes submissions", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const learnerA = await createLearner("Alice");
    const learnerB = await createLearner("Bob");
    const created = await createAssignment(teacherA, {
      learnerIds: [learnerA.body.id, learnerA.body.id],
    });
    expect(created.response.status).toBe(201);

    const detail = (await (
      await call(`/api/assignments/${created.body.id}`)
    ).json()) as {
      assignedLearners: Array<{
        id: string;
        public_id: string;
        name: string;
      }>;
    };
    expect(detail.assignedLearners).toEqual([
      {
        id: learnerA.body.id,
        public_id: learnerA.body.public_id,
        name: "Alice",
      },
    ]);

    const homeA = (await (
      await call(`/api/public/learners/${learnerA.body.public_id}`, {}, null)
    ).json()) as { assignments: Array<{ public_id: string }> };
    const homeB = (await (
      await call(`/api/public/learners/${learnerB.body.public_id}`, {}, null)
    ).json()) as { assignments: Array<{ public_id: string }> };
    expect(homeA.assignments.map((item) => item.public_id)).toContain(
      created.body.publicId,
    );
    expect(homeB.assignments).toHaveLength(0);

    const words = await publicWords(
      String(created.body.publicId),
      String(learnerA.body.public_id),
    );
    expect(
      (
        await submit(String(created.body.publicId), words.words, {
          learnerPublicId: String(learnerA.body.public_id),
        })
      ).status,
    ).toBe(201);
    const attempt = await bindings.DB.prepare(
      "SELECT learner_id FROM attempts WHERE assignment_id = ?",
    )
      .bind(created.body.id)
      .first<{ learner_id: string }>();
    expect(attempt?.learner_id).toBe(learnerA.body.id);
  });

  it("requires learner identity for assigned work and keeps link-only work anonymous", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const learner = await createLearner("Alice");
    const otherLearner = await createLearner("Bob");
    const assigned = await createAssignment(teacherA, {
      learnerIds: [learner.body.id],
      maxAttempts: 1,
    });
    const assignedPublicId = String(assigned.body.publicId);
    const missingLearner = await call(
      `/api/public/assignments/${assignedPublicId}`,
      {},
      null,
    );
    expect(missingLearner.status).toBe(403);
    expect(((await missingLearner.json()) as { error: string }).error).toBe(
      "learner_required",
    );
    const wrongLearner = await call(
      `/api/public/assignments/${assignedPublicId}?learner=${encodeURIComponent(String(otherLearner.body.public_id))}`,
      {},
      null,
    );
    expect(wrongLearner.status).toBe(404);
    expect(((await wrongLearner.json()) as { error: string }).error).toBe(
      "learner_not_found",
    );

    const anonymousSubmit = await submit(assignedPublicId, [], {
      nickname: "Student 01",
    });
    expect(anonymousSubmit.status).toBe(403);
    expect(((await anonymousSubmit.json()) as { error: string }).error).toBe(
      "learner_required",
    );

    const assignedWords = await publicWords(
      assignedPublicId,
      String(learner.body.public_id),
    );
    expect(assignedWords.learner).toMatchObject({ name: "Alice" });
    expect(
      (
        await start(assignedPublicId, {
          learnerPublicId: String(learner.body.public_id),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await submit(assignedPublicId, assignedWords.words, {
          learnerPublicId: String(learner.body.public_id),
        })
      ).status,
    ).toBe(201);
    const learnerAttemptLimit = await start(assignedPublicId, {
      learnerPublicId: String(learner.body.public_id),
    });
    expect(learnerAttemptLimit.status).toBe(403);
    expect(
      ((await learnerAttemptLimit.json()) as { error: string }).error,
    ).toBe("attempt_limit");

    const linkOnly = await createAssignment(teacherA, { title: "Link only" });
    const linkOnlyPublicId = String(linkOnly.body.publicId);
    const linkOnlyWords = await publicWords(linkOnlyPublicId);
    expect(
      (
        await submit(linkOnlyPublicId, linkOnlyWords.words, {
          nickname: "Guest",
        })
      ).status,
    ).toBe(201);
  });

  it("rejects cross-owner learner bindings", async () => {
    const foreign = await createLearner("Foreign", teacherB);
    const created = await createAssignment(teacherA, {
      learnerIds: [foreign.body.id],
    });
    expect(created.response.status).toBe(403);
    expect(created.body.error).toBe("learner_forbidden");
  });

  it("combines assignment field updates with learner reassignment", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const first = await createLearner("Alice");
    const second = await createLearner("Bob");
    const created = await createAssignment(teacherA, {
      learnerIds: [first.body.id],
    });

    const updated = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Updated assignment",
        words: ["cherry"],
        mode: "typing",
        maxAttempts: 5,
        learnerIds: [second.body.id],
      }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      title: "Updated assignment",
      mode: "typing",
      max_attempts: 5,
      words: [expect.objectContaining({ word: "cherry" })],
      assignedLearners: [
        {
          id: second.body.id,
          public_id: second.body.public_id,
          name: "Bob",
        },
      ],
    });
  });

  it("supports reassigning learners", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const first = await createLearner("Alice");
    const second = await createLearner("Bob");
    const created = await createAssignment(teacherA, {
      learnerIds: [first.body.id],
    });

    const reassigned = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ learnerIds: [second.body.id] }),
    });
    expect(reassigned.status).toBe(200);
    expect(
      ((await reassigned.json()) as { assignedLearners: unknown[] })
        .assignedLearners,
    ).toEqual([
      {
        id: second.body.id,
        public_id: second.body.public_id,
        name: "Bob",
      },
    ]);
  });

  it("supports clearing all learner assignments", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const learner = await createLearner("Alice");
    const created = await createAssignment(teacherA, {
      learnerIds: [learner.body.id],
    });

    const cleared = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ learnerIds: [] }),
    });
    expect(cleared.status).toBe(200);
    expect(
      ((await cleared.json()) as { assignedLearners: unknown[] })
        .assignedLearners,
    ).toEqual([]);
  });

  it("rejects reassignment to another user's or archived learner", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const owned = await createLearner("Owned");
    const foreign = await createLearner("Foreign", teacherB);
    const created = await createAssignment(teacherA, {
      learnerIds: [owned.body.id],
    });

    const crossOwner = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "Must not be saved",
        learnerIds: [foreign.body.id],
      }),
    });
    expect(crossOwner.status).toBe(403);
    expect(((await crossOwner.json()) as { error: string }).error).toBe(
      "learner_forbidden",
    );
    expect(
      await bindings.DB.prepare("SELECT title FROM assignments WHERE id = ?")
        .bind(created.body.id)
        .first("title"),
    ).toBe("Week one");

    await call(`/api/learners/${owned.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: true }),
    });
    const archived = await call(`/api/assignments/${created.body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ learnerIds: [owned.body.id] }),
    });
    expect(archived.status).toBe(403);
    expect(((await archived.json()) as { error: string }).error).toBe(
      "learner_forbidden",
    );
  });

  it("keeps Teacher-only PIN and Class Join unavailable to Parent plans", async () => {
    await bindings.DB.prepare(
      "UPDATE user SET workspace_type = 'teacher', class_public_id = 'legacyClass1' WHERE id = ?",
    )
      .bind(teacherA.id)
      .run();
    await insertSubscription({ plan: "parent", status: "active" });
    const learner = await createLearner("Alice");
    expect(learner.body).not.toHaveProperty("join_pin");
    expect(learner.body).not.toHaveProperty("join_pin_hash");

    const me = (await (await call("/api/me")).json()) as {
      plan: string;
      classPublicId: string | null;
    };
    expect(me).toMatchObject({ plan: "parent", classPublicId: null });
    const roster = (await (await call("/api/assignments")).json()) as {
      learners: Array<Record<string, unknown>>;
    };
    expect(roster.learners[0]).not.toHaveProperty("join_pin");
    expect(roster.learners[0]).not.toHaveProperty("join_pin_hash");

    const storedPin = await bindings.DB.prepare(
      "SELECT join_pin FROM learners WHERE id = ?",
    )
      .bind(learner.body.id)
      .first<string>("join_pin");
    const joined = await call(
      "/api/public/join/legacyClass1",
      { method: "POST", body: JSON.stringify({ pin: storedPin }) },
      null,
    );
    expect(joined.status).toBe(401);
    expect(await joined.json()).toEqual(
      expect.objectContaining({ error: "invalid_join" }),
    );
  });

  it("uses the Teacher plan for class join and keeps PINs out of public responses", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const learner = await createLearner("Alice");
    const me = (await (await call("/api/me")).json()) as {
      plan: string;
      workspaceType: string | null;
      classPublicId: string;
    };
    expect(me.plan).toBe("teacher");
    expect(me.classPublicId).toMatch(/^[A-Za-z0-9_-]{8,24}$/);
    expect(learner.body.join_pin).toMatch(/^\d{4}$/);

    const roster = (await (await call("/api/assignments")).json()) as {
      learners: Array<Record<string, unknown>>;
    };
    expect(roster.learners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: learner.body.id,
          join_pin: learner.body.join_pin,
        }),
      ]),
    );
    const otherRoster = (await (
      await call("/api/assignments", {}, teacherB)
    ).json()) as { learners: Array<Record<string, unknown>> };
    expect(otherRoster.learners).toHaveLength(0);

    const publicHome = (await (
      await call(`/api/public/learners/${learner.body.public_id}`, {}, null)
    ).json()) as Record<string, unknown>;
    expect(JSON.stringify(publicHome)).not.toContain("join_pin");
    expect(JSON.stringify(publicHome)).not.toContain(
      String(learner.body.join_pin),
    );

    const joined = await call(
      `/api/public/join/${me.classPublicId}`,
      { method: "POST", body: JSON.stringify({ pin: learner.body.join_pin }) },
      null,
    );
    expect(joined.status).toBe(200);
    expect(await joined.json()).toEqual({
      learnerPublicId: learner.body.public_id,
    });
    const wrongPin = learner.body.join_pin === "0000" ? "0001" : "0000";
    const wrong = await call(
      `/api/public/join/${me.classPublicId}`,
      { method: "POST", body: JSON.stringify({ pin: wrongPin }) },
      null,
    );
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual(
      expect.objectContaining({ error: "invalid_join" }),
    );
  });

  it("rate limits class join by class and client IP", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    await createLearner("Alice");
    const me = (await (await call("/api/me")).json()) as {
      classPublicId: string;
    };
    let key = "";
    const limitedEnv = testEnv({
      CREATE_LIMITER: {
        limit: async (input) => {
          key = input.key;
          return { success: false };
        },
      },
    });
    const response = await call(
      `/api/public/join/${me.classPublicId}`,
      {
        method: "POST",
        headers: { "CF-Connecting-IP": "203.0.113.10" },
        body: JSON.stringify({ pin: "1234" }),
      },
      null,
      limitedEnv,
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: "rate_limited" }),
    );
    expect(key).toBe(`join:${me.classPublicId}:203.0.113.10`);
  });

  it("retries a colliding PIN when creating a learner", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    expect(
      (await createLearner("Alice", teacherA, () => "1234")).response.status,
    ).toBe(201);
    const pins = ["1234", "5678"];
    const learner = await createLearner("Bob", teacherA, () => pins.shift()!);
    expect(learner.response.status).toBe(201);
    expect(learner.body.join_pin).toBe("5678");
  });
});

describe("cross-assignment mastery", () => {
  const result = (correct: boolean, day: number) => ({
    correct,
    practicedAt: `2026-08-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  });

  it("requires three consecutive correct results across two UTC days", () => {
    expect(masteryStatus([result(true, 27)])).toBe("learning");
    expect(
      masteryStatus([result(true, 27), result(true, 27), result(true, 27)]),
    ).toBe("learning");
    expect(
      masteryStatus([result(true, 26), result(true, 26), result(true, 27)]),
    ).toBe("mastered");
    expect(
      masteryStatus([result(true, 26), result(true, 27), result(false, 27)]),
    ).toBe("needs_review");
  });

  it("tracks recovery and resets evidence after a new miss", () => {
    expect(masteryStatus([result(false, 26), result(true, 26)])).toBe(
      "learning",
    );
    expect(
      masteryStatus([result(false, 26), result(true, 26), result(true, 26)]),
    ).toBe("learning");
    expect(
      masteryStatus([
        result(false, 26),
        result(true, 26),
        result(true, 26),
        result(true, 27),
      ]),
    ).toBe("mastered");
    expect(
      masteryStatus([
        result(false, 26),
        result(true, 26),
        result(true, 27),
        result(true, 27),
        result(false, 28),
      ]),
    ).toBe("needs_review");
  });

  it("includes mastery review counts only for workspace overview requests", async () => {
    const learner = await createLearner("Learner 01");
    const created = await createAssignment();
    const words = await publicWords(String(created.body.publicId));
    await submit(String(created.body.publicId), words.words, {
      learnerPublicId: String(learner.body.public_id),
      answers: ["wrong", "banana"],
    });

    const regular = (await (await call("/api/assignments")).json()) as {
      learners: Array<Record<string, unknown>>;
    };
    expect(regular.learners[0]).not.toHaveProperty("needs_review_count");

    const overview = (await (
      await call("/api/assignments", {
        headers: { "x-workspace-review-counts": "1" },
      })
    ).json()) as {
      learners: Array<Record<string, unknown>>;
      missedWords: Array<{ word: string; misses: number }>;
    };
    expect(overview.learners[0]).toMatchObject({
      needs_review_count: 1,
      mastery: { mastered: 0, learning: 1, needsReview: 1 },
      missed_words: [{ word: "apple", misses: 1 }],
    });
    expect(overview.missedWords).toEqual([{ word: "apple", misses: 1 }]);
  });

  it("aggregates completed attempts and builds a focused Teacher review", async () => {
    await insertSubscription({ plan: "teacher", status: "active" });
    const learner = await createLearner("Learner 01");
    const learnerPublicId = String(learner.body.public_id);
    const first = await createAssignment(teacherA, {
      words: ["apple", "banana"],
      maxAttempts: 4,
    });
    const firstWords = await publicWords(String(first.body.publicId));
    for (const answers of [
      ["wrong", "banana"],
      ["apple", "banana"],
      ["apple", "wrong"],
      ["apple", "banana"],
    ]) {
      expect(
        (
          await submit(String(first.body.publicId), firstWords.words, {
            learnerPublicId,
            answers,
          })
        ).status,
      ).toBe(201);
    }
    const second = await createAssignment(teacherA, {
      title: "Second",
      words: ["cherry", "grape"],
    });
    const secondWords = await publicWords(String(second.body.publicId));
    await submit(String(second.body.publicId), secondWords.words, {
      learnerPublicId,
    });
    const detail = (await (
      await call(`/api/learners/${learner.body.id}`)
    ).json()) as {
      summary: { completedAttempts: number };
      words: Array<{
        word: string;
        status: string;
        consecutiveCorrect: number;
        practiceDays: number;
        crossDayConfirmed: boolean;
      }>;
    };
    expect(detail.summary.completedAttempts).toBe(5);
    expect(detail.words).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          word: "apple",
          status: "learning",
          consecutiveCorrect: 3,
          practiceDays: 1,
          crossDayConfirmed: false,
        }),
        expect.objectContaining({ word: "banana", status: "learning" }),
        expect.objectContaining({ word: "cherry", status: "learning" }),
      ]),
    );
    const review = (await (
      await call(`/api/learners/${learner.body.id}/review`, {
        method: "POST",
        body: "{}",
      })
    ).json()) as { words: string[] };
    expect(review.words).toEqual(expect.arrayContaining(["apple", "banana"]));
    const assignmentReview = (await (
      await call(`/api/assignments/${first.body.id}/review`, {
        method: "POST",
        body: "{}",
      })
    ).json()) as { words: string[] };
    expect(assignmentReview.words).toEqual(
      expect.arrayContaining(["apple", "banana"]),
    );
  });

  it.each(["parent", "teacher"] as const)(
    "shows 14 days on Free, 365 days on %s, and locks Free smart review",
    async (plan) => {
      const learner = await createLearner("Learner 01");
      const learnerPublicId = String(learner.body.public_id);
      const created = await createAssignment();
      const words = await publicWords(String(created.body.publicId));
      await submit(String(created.body.publicId), words.words, {
        learnerPublicId,
        answers: ["wrong", "banana"],
      });
      const oldDate = new Date(Date.now() - 45 * 86_400_000).toISOString();
      await bindings.DB.prepare(
        "UPDATE attempts SET completed_at = ? WHERE learner_id = ?",
      )
        .bind(oldDate, learner.body.id)
        .run();

      const free = (await (
        await call(`/api/learners/${learner.body.id}`)
      ).json()) as { historyDays: number; words: unknown[] };
      expect(free.historyDays).toBe(14);
      expect(free.words).toHaveLength(0);
      const freeWorkspace = (await (
        await call("/api/assignments", {
          headers: { "x-workspace-review-counts": "1" },
        })
      ).json()) as {
        learners: Array<Record<string, unknown>>;
        missedWords: Array<{ word: string; misses: number }>;
      };
      expect(freeWorkspace.learners[0]).toMatchObject({
        mastery: { mastered: 0, learning: 0, needsReview: 0 },
      });
      expect(freeWorkspace.missedWords).toEqual([]);
      const reviewResponse = await call(
        `/api/learners/${learner.body.id}/review`,
        { method: "POST", body: "{}" },
      );
      expect(reviewResponse.status).toBe(403);
      expect(await reviewResponse.json()).toMatchObject({
        error: "smart_review_required",
        message: "Smart Review is included in Parent and Teacher Plans.",
      });

      await insertSubscription({ plan, status: "active" });
      const paid = (await (
        await call(`/api/learners/${learner.body.id}`)
      ).json()) as { historyDays: number; words: unknown[] };
      expect(paid.historyDays).toBe(365);
      expect(paid.words).toHaveLength(2);
      const paidWorkspace = (await (
        await call("/api/assignments", {
          headers: { "x-workspace-review-counts": "1" },
        })
      ).json()) as {
        learners: Array<Record<string, unknown>>;
        missedWords: Array<{ word: string; misses: number }>;
      };
      expect(paidWorkspace.learners[0]).toMatchObject({
        mastery: { mastered: 0, learning: 1, needsReview: 1 },
      });
      expect(paidWorkspace.missedWords).toEqual([{ word: "apple", misses: 1 }]);
      expect(
        (
          await call(`/api/learners/${learner.body.id}/review`, {
            method: "POST",
            body: "{}",
          })
        ).status,
      ).toBe(200);
    },
  );
});

describe("today's review state", () => {
  const now = new Date("2026-08-27T00:00:00.000Z");
  const result = (correct: boolean, daysAgo: number) => ({
    correct,
    practicedAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  });

  it("returns due states after a miss", () => {
    expect(calculateReviewState([result(false, 0)], now)?.due).toBe(true);
    expect(
      calculateReviewState([result(false, 0), result(true, 0)], now)?.due,
    ).toBe(false);
    expect(
      calculateReviewState([result(false, 2), result(true, 2)], now)?.due,
    ).toBe(true);
    expect(
      calculateReviewState(
        [result(false, 1), result(true, 1), result(true, 1)],
        now,
      )?.due,
    ).toBe(false);
    expect(
      calculateReviewState(
        [result(false, 1), result(true, 1), result(true, 1)],
        now,
      )?.due,
    ).toBe(false);
    expect(
      calculateReviewState(
        [result(false, 4), result(true, 4), result(true, 4), result(true, 4)],
        now,
      ),
    ).toEqual(
      expect.objectContaining({
        due: true,
        dueAt: "2026-08-26T00:00:00.000Z",
      }),
    );
    expect(
      calculateReviewState(
        [result(false, 4), result(true, 4), result(true, 4), result(true, 3)],
        now,
      ),
    ).toBeNull();
  });

  it("ignores words that were never missed", () => {
    expect(
      calculateReviewState([result(true, 0), result(true, 0)], now),
    ).toBeNull();
  });

  it("hides words from Free and returns them to Teacher", async () => {
    const learner = await createLearner("Learner 01");
    const assignment = await createAssignment(teacherA, {
      words: ["because"],
      exampleSentences: ["I stayed inside because it was raining."],
    });
    const words = await publicWords(String(assignment.body.publicId));
    await submit(String(assignment.body.publicId), words.words, {
      learnerPublicId: String(learner.body.public_id),
      answers: ["wrong"],
    });

    const free = (await (
      await call(`/api/learners/${learner.body.id}`)
    ).json()) as {
      todaysReview: { count: number; words: null };
    };
    expect(free.todaysReview).toEqual({ count: 1, words: null });

    await insertSubscription({ plan: "teacher", status: "active" });
    const teacher = (await (
      await call(`/api/learners/${learner.body.id}`)
    ).json()) as {
      todaysReview: {
        count: number;
        words: Array<{ word: string; exampleSentence: string | null }>;
      };
    };
    expect(teacher.todaysReview.count).toBe(1);
    expect(teacher.todaysReview.words).toEqual([
      expect.objectContaining({
        word: "because",
        exampleSentence: "I stayed inside because it was raining.",
      }),
    ]);
  });

  it("does not count incomplete attempts", async () => {
    const learner = await createLearner("Learner 01");
    const assignment = await createAssignment(teacherA, { words: ["because"] });
    const words = await publicWords(String(assignment.body.publicId));
    await submit(String(assignment.body.publicId), words.words, {
      learnerPublicId: String(learner.body.public_id),
      answers: ["wrong"],
      completed: false,
    });
    const detail = (await (
      await call(`/api/learners/${learner.body.id}`)
    ).json()) as { todaysReview: { count: number } };
    expect(detail.todaysReview.count).toBe(0);
  });
});

describe("assignment attempts", () => {
  it("checks attempt and monthly limits before starting public work", async () => {
    const attemptLimited = await createAssignment(teacherA, {
      maxAttempts: 1,
    });
    const attemptLimitedPublicId = String(attemptLimited.body.publicId);
    const attemptLimitedWords = await publicWords(attemptLimitedPublicId);
    expect(
      (await submit(attemptLimitedPublicId, attemptLimitedWords.words)).status,
    ).toBe(201);
    const attemptLimitResponse = await start(attemptLimitedPublicId);
    expect(attemptLimitResponse.status).toBe(403);
    expect(
      ((await attemptLimitResponse.json()) as { error: string }).error,
    ).toBe("attempt_limit");
    await call(
      `/api/assignments/${attemptLimited.body.id}`,
      { method: "PATCH", body: JSON.stringify({ status: "closed" }) },
      teacherA,
    );

    const monthlyLimited = await createAssignment(teacherA, {
      title: "Monthly limit",
    });
    expect((await start(String(monthlyLimited.body.publicId))).status).toBe(
      200,
    );
    const now = new Date().toISOString();
    await bindings.DB.batch(
      Array.from({ length: 8 }, () =>
        bindings.DB.prepare(
          `INSERT INTO monthly_submission_usage (attempt_id, user_id, month_key, created_at)
           VALUES (?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), teacherA.id, monthStart(), now),
      ),
    );
    const monthlyLimitResponse = await start(
      String(monthlyLimited.body.publicId),
    );
    expect(monthlyLimitResponse.status).toBe(403);
    expect(
      ((await monthlyLimitResponse.json()) as { error: string }).error,
    ).toBe("monthly_submission_limit");
  });

  it("checks the monthly limit again when submitting after a successful start", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    const now = new Date().toISOString();
    await bindings.DB.batch(
      Array.from({ length: 7 }, () =>
        bindings.DB.prepare(
          `INSERT INTO monthly_submission_usage (attempt_id, user_id, month_key, created_at)
           VALUES (?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), teacherA.id, monthStart(), now),
      ),
    );
    const attemptId = crypto.randomUUID();
    expect(
      (
        await start(publicId, {
          attemptId,
          nickname: "Reserved student",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await submit(publicId, assignment.words, {
          nickname: "Other student 1",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await submit(publicId, assignment.words, {
          attemptId,
          nickname: "Reserved student",
        })
      ).status,
    ).toBe(403);
  });

  it.each(["parent", "teacher"] as const)(
    "expires Free results after 14 days and %s results after 365 days",
    async (plan) => {
      const retentionDays = async (attemptId: string) => {
        const row = await bindings.DB.prepare(
          "SELECT completed_at, retention_expires_at FROM attempts WHERE id = ?",
        )
          .bind(attemptId)
          .first<{ completed_at: string; retention_expires_at: string }>();
        return (
          (new Date(row!.retention_expires_at).getTime() -
            new Date(row!.completed_at).getTime()) /
          86_400_000
        );
      };

      const freeAssignment = await createAssignment();
      const freeWords = await publicWords(String(freeAssignment.body.publicId));
      const freeAttempt = (await (
        await submit(String(freeAssignment.body.publicId), freeWords.words)
      ).json()) as { id: string };
      expect(await retentionDays(freeAttempt.id)).toBe(14);

      await insertSubscription({ plan, status: "active" });
      const paidAssignment = await createAssignment(teacherA, {
        title: "Paid retention",
      });
      const paidWords = await publicWords(String(paidAssignment.body.publicId));
      const paidAttempt = (await (
        await submit(String(paidAssignment.body.publicId), paidWords.words)
      ).json()) as { id: string };
      expect(await retentionDays(paidAttempt.id)).toBe(365);
    },
  );

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

  it("keeps rejecting attempt durations over two hours", async () => {
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
          durationSeconds: 7201,
          answers: assignment.words.map((word) => ({
            wordId: word.id,
            answer: word.word,
          })),
        }),
      },
      null,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_duration" });
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

  it("keeps CSV and class-wide missed-word statistics Teacher-only", async () => {
    const created = await createAssignment();
    const id = String(created.body.id);
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    await submit(publicId, assignment.words, { answers: ["apple", "wrong"] });

    const freeExport = await call(`/api/assignments/${id}/export.csv`);
    expect(freeExport.status).toBe(403);
    expect(await freeExport.json()).toMatchObject({
      error: "pro_required",
      message: "CSV export is included in the Teacher Plan.",
    });
    const freeSentenceLibrary = await call("/api/sentence-library/match", {
      method: "POST",
      body: JSON.stringify({ words: ["apple"] }),
    });
    expect(freeSentenceLibrary.status).toBe(403);
    expect(await freeSentenceLibrary.json()).toMatchObject({
      error: "sentence_library_required",
      message: "Sentence library is included in Parent and Teacher Plans.",
    });
    const freeDetail = (await (
      await call(`/api/assignments/${id}`)
    ).json()) as Record<string, unknown>;
    expect(freeDetail.missedWordStats).toBeNull();

    await bindings.DB.prepare(
      `INSERT INTO subscriptions (
         user_id, plan, status, billing_interval, stripe_price_id,
         current_period_end, cancel_at_period_end, updated_at
       ) VALUES (?, 'parent', 'active', 'month', 'price_monthly', ?, 0, ?)`,
    )
      .bind(
        teacherA.id,
        new Date(Date.now() + 86_400_000).toISOString(),
        new Date().toISOString(),
      )
      .run();

    const parentExport = await call(`/api/assignments/${id}/export.csv`);
    expect(parentExport.status).toBe(403);
    expect(await parentExport.json()).toMatchObject({
      error: "pro_required",
      message: "CSV export is included in the Teacher Plan.",
    });
    const parentDetail = (await (
      await call(`/api/assignments/${id}`)
    ).json()) as Record<string, unknown>;
    expect(parentDetail.missedWordStats).toBeNull();

    await bindings.DB.prepare(
      "UPDATE subscriptions SET plan = 'teacher' WHERE user_id = ?",
    )
      .bind(teacherA.id)
      .run();

    const exportResponse = await call(`/api/assignments/${id}/export.csv`);
    expect(exportResponse.status).toBe(200);
    expect(await exportResponse.text()).toContain("Student 01");
    const teacherDetail = (await (
      await call(`/api/assignments/${id}`)
    ).json()) as {
      missedWordStats: Array<{ word: string; misses: number }>;
    };
    expect(teacherDetail.missedWordStats).toEqual([
      { word: "banana", misses: 1 },
    ]);
  });
});

describe("Stripe checkout", () => {
  const now = new Date();
  const future = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();
  const expired = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  const createSession = async (
    params: Stripe.Checkout.SessionCreateParams,
  ) => ({
    id: "cs_test",
    url: "https://checkout.test/session",
    expires_at: params.expires_at!,
  });

  it.each([
    ["month", "price_teacher_monthly"],
    ["year", "price_teacher_yearly"],
  ] as const)(
    "creates Teacher %s Checkout with the configured Price and explicit plan metadata",
    async (interval, priceId) => {
      let sent: Stripe.Checkout.SessionCreateParams | null = null;
      await createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        interval,
        "https://example.test",
        {
          now,
          createSession: async (params) => {
            sent = params;
            return createSession(params);
          },
        },
      );

      expect(sent).toMatchObject({
        mode: "subscription",
        payment_method_collection: "always",
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { plan: "teacher" },
        subscription_data: {
          metadata: { plan: "teacher" },
        },
      });
      const params = sent as unknown as Stripe.Checkout.SessionCreateParams;
      expect(params.subscription_data?.trial_period_days).toBeUndefined();
      expect(params.metadata).not.toHaveProperty("trial_granted");
    },
  );

  it.each([
    ["month", "price_parent_monthly"],
    ["year", "price_parent_yearly"],
  ] as const)(
    "creates Parent %s Checkout with the configured Price and explicit plan metadata",
    async (interval, priceId) => {
      let sent: Stripe.Checkout.SessionCreateParams | null = null;
      await createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        interval,
        "https://example.test",
        {
          now,
          plan: "parent",
          createSession: async (params) => {
            sent = params;
            return createSession(params);
          },
        },
      );

      expect(sent).toMatchObject({
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `https://example.test/workspace?lang=en&checkout=success&interval=${interval}&plan=parent`,
        metadata: { plan: "parent", billing_interval: interval },
        subscription_data: {
          metadata: { plan: "parent", billing_interval: interval },
        },
      });
      const params = sent as unknown as Stripe.Checkout.SessionCreateParams;
      expect(params.subscription_data?.trial_period_days).toBeUndefined();
      expect(params.metadata).not.toHaveProperty("trial_granted");
    },
  );

  it("reuses duplicate Parent Checkout and safely replaces it when the interval changes", async () => {
    const prices: string[] = [];
    const expiredSessions: string[] = [];
    let calls = 0;
    const options = {
      now,
      plan: "parent" as const,
      createSession: async (params: Stripe.Checkout.SessionCreateParams) => {
        calls += 1;
        prices.push(String(params.line_items?.[0]?.price));
        return {
          id: `cs_parent_${calls}`,
          url: `https://checkout.test/parent/${calls}`,
          expires_at: params.expires_at!,
        };
      },
      expireSession: async (id: string) => {
        expiredSessions.push(id);
      },
    };

    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        options,
      ),
    ).resolves.toMatchObject({ id: "cs_parent_1" });
    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        options,
      ),
    ).resolves.toEqual({ url: "https://checkout.test/parent/1" });
    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "year",
        "https://example.test",
        options,
      ),
    ).resolves.toMatchObject({ id: "cs_parent_2" });

    expect(prices).toEqual(["price_parent_monthly", "price_parent_yearly"]);
    expect(expiredSessions).toEqual(["cs_parent_1"]);
  });

  it("reuses duplicate Teacher Checkout and safely replaces it when the interval changes", async () => {
    const prices: string[] = [];
    const expiredSessions: string[] = [];
    let calls = 0;
    const options = {
      now,
      plan: "teacher" as const,
      createSession: async (params: Stripe.Checkout.SessionCreateParams) => {
        calls += 1;
        prices.push(String(params.line_items?.[0]?.price));
        return {
          id: `cs_teacher_${calls}`,
          url: `https://checkout.test/workspace/${calls}`,
          expires_at: params.expires_at!,
        };
      },
      expireSession: async (id: string) => {
        expiredSessions.push(id);
      },
    };

    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        options,
      ),
    ).resolves.toMatchObject({ id: "cs_teacher_1" });
    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        options,
      ),
    ).resolves.toEqual({ url: "https://checkout.test/workspace/1" });
    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "year",
        "https://example.test",
        options,
      ),
    ).resolves.toMatchObject({ id: "cs_teacher_2" });

    expect(prices).toEqual(["price_teacher_monthly", "price_teacher_yearly"]);
    expect(expiredSessions).toEqual(["cs_teacher_1"]);
  });

  it.each([
    [
      "parent",
      "teacher",
      "month",
      "price_parent_monthly",
      "price_teacher_monthly",
    ],
    [
      "teacher",
      "parent",
      "month",
      "price_teacher_monthly",
      "price_parent_monthly",
    ],
    [
      "parent",
      "teacher",
      "year",
      "price_parent_yearly",
      "price_teacher_yearly",
    ],
    [
      "teacher",
      "parent",
      "year",
      "price_teacher_yearly",
      "price_parent_yearly",
    ],
  ] as const)(
    "replaces an active %s Checkout with %s for the same %s interval",
    async (firstPlan, secondPlan, interval, firstPrice, secondPrice) => {
      const prices: string[] = [];
      const expired: string[] = [];
      let calls = 0;
      const checkout = (plan: "parent" | "teacher") =>
        createCheckout(
          testEnv(),
          bindings.DB,
          teacherA,
          interval,
          "https://example.test",
          {
            now,
            plan,
            createSession: async (params) => {
              calls += 1;
              prices.push(String(params.line_items?.[0]?.price));
              return {
                id: `cs_${calls}`,
                url: `https://checkout.test/${calls}`,
                expires_at: params.expires_at!,
              };
            },
            expireSession: async (id) => {
              expired.push(id);
            },
          },
        );

      await expect(checkout(firstPlan)).resolves.toMatchObject({ id: "cs_1" });
      await expect(checkout(secondPlan)).resolves.toMatchObject({ id: "cs_2" });
      expect(prices).toEqual([firstPrice, secondPrice]);
      expect(expired).toEqual(["cs_1"]);
      await expect(
        bindings.DB.prepare(
          `SELECT plan, interval, stripe_session_id FROM checkout_locks
           WHERE user_id = ?`,
        )
          .bind(teacherA.id)
          .first(),
      ).resolves.toEqual({
        plan: secondPlan,
        interval,
        stripe_session_id: "cs_2",
      });
    },
  );

  it("safely replaces a pre-migration Checkout lock without a plan", async () => {
    await bindings.DB.prepare(
      `INSERT INTO checkout_locks (
         user_id, token, interval, stripe_session_id, session_url,
         expires_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        teacherA.id,
        "legacy-token",
        "month",
        "cs_legacy",
        "https://checkout.test/legacy",
        new Date(now.getTime() + 30 * 60_000).toISOString(),
        now.toISOString(),
      )
      .run();
    const expired: string[] = [];

    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        {
          now,
          plan: "parent",
          createSession: async (params) => ({
            id: "cs_parent",
            url: "https://checkout.test/parent",
            expires_at: params.expires_at!,
          }),
          expireSession: async (id) => {
            expired.push(id);
          },
        },
      ),
    ).resolves.toMatchObject({ id: "cs_parent" });
    expect(expired).toEqual(["cs_legacy"]);
    await expect(
      bindings.DB.prepare(
        `SELECT plan, interval, stripe_session_id FROM checkout_locks
         WHERE user_id = ?`,
      )
        .bind(teacherA.id)
        .first(),
    ).resolves.toEqual({
      plan: "parent",
      interval: "month",
      stripe_session_id: "cs_parent",
    });
  });

  it("creates a normal paid Checkout regardless of historical trial state", async () => {
    await insertSubscription({ plan: "free", status: "inactive" });
    await bindings.DB.prepare(
      "UPDATE subscriptions SET trial_used_at = ? WHERE user_id = ?",
    )
      .bind(now.toISOString(), teacherA.id)
      .run();
    let sent: Stripe.Checkout.SessionCreateParams | null = null;

    await createCheckout(
      testEnv(),
      bindings.DB,
      teacherA,
      "year",
      "https://example.test",
      {
        now,
        createSession: async (params) => {
          sent = params;
          return createSession(params);
        },
      },
    );

    const params = sent as unknown as Stripe.Checkout.SessionCreateParams;
    expect(params.payment_method_collection).toBe("always");
    expect(params.subscription_data?.trial_period_days).toBeUndefined();
    expect(params.metadata?.trial_granted).toBeUndefined();
  });

  it.each([
    ["en", "en", "/pricing"],
    ["es", "es", "/es/pricing"],
    ["pt-BR", "pt-BR", "/pt-br/pricing"],
    ["fr", "fr", "/fr/pricing"],
    ["id", "id", "/id/pricing"],
    ["zh", "zh", "/zh/pricing"],
    ["teacher", "en", "/pricing"],
    [undefined, "en", "/pricing"],
  ])(
    "uses only a supported checkout locale and cancel URL for %s",
    async (locale, expected, pricingPath) => {
      let successUrl = "";
      let cancelUrl = "";
      await createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        {
          now,
          locale,
          createSession: async (params) => {
            successUrl = params.success_url ?? "";
            cancelUrl = params.cancel_url ?? "";
            return createSession(params);
          },
        },
      );

      expect(successUrl).toBe(
        `https://example.test/workspace?lang=${expected}&checkout=success&interval=month&plan=teacher`,
      );
      expect(cancelUrl).toBe(
        `https://example.test${pricingPath}?checkout=cancelled`,
      );
    },
  );

  it.each([
    ["en", "en"],
    ["es", "es"],
    ["pt-BR", "pt-BR"],
    ["fr", "fr"],
    ["id", "id"],
    ["zh", "zh"],
    ["teacher", "en"],
    [undefined, "en"],
  ])("uses only a supported Portal locale for %s", async (locale, expected) => {
    await insertSubscription({ plan: "teacher", status: "active" });
    await bindings.DB.prepare(
      "UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?",
    )
      .bind("cus_test", teacherA.id)
      .run();
    let returnUrl = "";

    await createPortal(
      testEnv(),
      bindings.DB,
      teacherA.id,
      "https://example.test",
      {
        locale,
        createSession: async (params) => {
          returnUrl = params.return_url ?? "";
          return { url: "https://billing.test/session" };
        },
      },
    );

    expect(returnUrl).toBe(`https://example.test/workspace?lang=${expected}`);
  });

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
      ).resolves.toMatchObject({ url: "https://checkout.test/session" });
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
      ).toBe("teacher");

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
    ).resolves.toMatchObject({ url: "https://checkout.test/session" });
  });

  it("creates one Session for concurrent requests and reuses its URL", async () => {
    let calls = 0;
    let expireCalls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const delayedSession = async (
      params: Stripe.Checkout.SessionCreateParams,
    ) => {
      calls += 1;
      await gate;
      return {
        id: "cs_shared",
        url: "https://checkout.test/shared",
        expires_at: params.expires_at!,
      };
    };
    const checkout = () =>
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        {
          now,
          createSession: delayedSession,
          expireSession: async () => {
            expireCalls += 1;
          },
        },
      );

    const first = checkout();
    while (!calls) await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(checkout()).rejects.toMatchObject({
      status: 409,
      code: "checkout_pending",
    });
    release?.();
    await expect(first).resolves.toMatchObject({
      url: "https://checkout.test/shared",
    });
    await expect(checkout()).resolves.toEqual({
      url: "https://checkout.test/shared",
    });
    expect(calls).toBe(1);
    expect(expireCalls).toBe(0);
  });

  it.each([
    ["year", "month", "price_teacher_yearly", "price_teacher_monthly"],
    ["month", "year", "price_teacher_monthly", "price_teacher_yearly"],
  ] as const)(
    "replaces an active %s lock when switching to %s",
    async (firstInterval, secondInterval, firstPrice, secondPrice) => {
      const prices: string[] = [];
      const expired: string[] = [];
      let calls = 0;
      const createUniqueSession = async (
        params: Stripe.Checkout.SessionCreateParams,
      ) => {
        calls += 1;
        prices.push(String(params.line_items?.[0]?.price));
        return {
          id: `cs_${calls}`,
          url: `https://checkout.test/${calls}`,
          expires_at: params.expires_at!,
        };
      };

      await createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        firstInterval,
        "https://example.test",
        {
          now,
          createSession: createUniqueSession,
          expireSession: async (id) => {
            expired.push(id);
          },
        },
      );
      await expect(
        createCheckout(
          testEnv(),
          bindings.DB,
          teacherA,
          secondInterval,
          "https://example.test",
          {
            now,
            createSession: createUniqueSession,
            expireSession: async (id) => {
              expired.push(id);
            },
          },
        ),
      ).resolves.toMatchObject({ id: "cs_2" });
      expect(prices).toEqual([firstPrice, secondPrice]);
      expect(expired).toEqual(["cs_1"]);
      await expect(
        bindings.DB.prepare(
          "SELECT interval, stripe_session_id FROM checkout_locks WHERE user_id = ?",
        )
          .bind(teacherA.id)
          .first(),
      ).resolves.toEqual({
        interval: secondInterval,
        stripe_session_id: "cs_2",
      });
    },
  );

  it.each([false, true])(
    "never returns a stale Session after a token race (expire failure: %s)",
    async (expireFails) => {
      let markStarted!: () => void;
      let releaseFirst!: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      const expired: string[] = [];
      const createRacingSession = async (
        params: Stripe.Checkout.SessionCreateParams,
      ) => {
        const first = params.line_items?.[0]?.price === "price_teacher_monthly";
        if (first) {
          markStarted();
          await gate;
        }
        return {
          id: first ? "cs_stale" : "cs_current",
          url: `https://checkout.test/${first ? "stale" : "current"}`,
          expires_at: params.expires_at!,
        };
      };
      const options = {
        now,
        createSession: createRacingSession,
        expireSession: async (id: string) => {
          expired.push(id);
          if (expireFails) throw new Error("Stripe unavailable");
        },
      };

      const first = createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        options,
      );
      await started;
      await expect(
        createCheckout(
          testEnv(),
          bindings.DB,
          teacherA,
          "year",
          "https://example.test",
          options,
        ),
      ).resolves.toMatchObject({ id: "cs_current" });
      const staleResult = expect(first).rejects.toMatchObject({
        code: expireFails ? "checkout_unavailable" : "checkout_pending",
      });
      releaseFirst();
      await staleResult;
      expect(expired).toEqual(["cs_stale"]);
      await expect(
        bindings.DB.prepare(
          "SELECT interval, stripe_session_id FROM checkout_locks WHERE user_id = ?",
        )
          .bind(teacherA.id)
          .first(),
      ).resolves.toEqual({
        interval: "year",
        stripe_session_id: "cs_current",
      });
    },
  );

  it("does not create a replacement when expiring the existing Session fails", async () => {
    let createCalls = 0;
    const createUniqueSession = async (
      params: Stripe.Checkout.SessionCreateParams,
    ) => {
      createCalls += 1;
      return {
        id: `cs_${createCalls}`,
        url: `https://checkout.test/${createCalls}`,
        expires_at: params.expires_at!,
      };
    };
    const expired: string[] = [];
    const options = {
      now,
      createSession: createUniqueSession,
      expireSession: async (id: string) => {
        expired.push(id);
        throw new Error("Stripe unavailable");
      },
    };

    await createCheckout(
      testEnv(),
      bindings.DB,
      teacherA,
      "month",
      "https://example.test",
      options,
    );
    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "year",
        "https://example.test",
        options,
      ),
    ).rejects.toMatchObject({ code: "checkout_unavailable" });
    expect(expired).toEqual(["cs_1"]);
    expect(createCalls).toBe(1);
    await expect(
      bindings.DB.prepare(
        "SELECT interval, stripe_session_id FROM checkout_locks WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .first(),
    ).resolves.toEqual({ interval: "month", stripe_session_id: "cs_1" });
  });

  it("stores the exact expiration sent to Stripe", async () => {
    let sentExpiresAt = 0;
    await createCheckout(
      testEnv(),
      bindings.DB,
      teacherA,
      "month",
      "https://example.test",
      {
        now,
        createSession: async (params) => {
          sentExpiresAt = params.expires_at!;
          return {
            id: "cs_expiration",
            url: "https://checkout.test/expiration",
            expires_at: sentExpiresAt,
          };
        },
      },
    );

    const lock = await bindings.DB.prepare(
      `SELECT stripe_session_id, expires_at FROM checkout_locks
       WHERE user_id = ?`,
    )
      .bind(teacherA.id)
      .first<{ stripe_session_id: string; expires_at: string }>();
    expect(sentExpiresAt).toBe(Math.floor(now.getTime() / 1000) + 35 * 60);
    expect(lock).toEqual({
      stripe_session_id: "cs_expiration",
      expires_at: new Date(sentExpiresAt * 1000).toISOString(),
    });
  });

  it("keeps more than 30 minutes at the Stripe call after setup delay", async () => {
    const checkoutStartedAt = new Date(Date.now() - 4 * 60_000);
    let remainingSeconds = 0;
    await createCheckout(
      testEnv(),
      bindings.DB,
      teacherA,
      "month",
      "https://example.test",
      {
        now: checkoutStartedAt,
        createSession: async (params) => {
          remainingSeconds = params.expires_at! - Math.floor(Date.now() / 1000);
          return {
            id: "cs_delayed",
            url: "https://checkout.test/delayed",
            expires_at: params.expires_at!,
          };
        },
      },
    );

    expect(remainingSeconds).toBeGreaterThan(30 * 60);
  });

  it("releases the lock when Session creation fails", async () => {
    await expect(
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        {
          now,
          createSession: async () => {
            throw new Error("Stripe unavailable");
          },
        },
      ),
    ).rejects.toThrow("Stripe unavailable");
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM checkout_locks",
      ).first("count"),
    ).toBe(0);
  });

  it("creates a new Session after the previous Session expires", async () => {
    let calls = 0;
    const createUniqueSession = async (
      params: Stripe.Checkout.SessionCreateParams,
    ) => {
      calls += 1;
      return {
        id: `cs_${calls}`,
        url: `https://checkout.test/${calls}`,
        expires_at: params.expires_at!,
      };
    };
    const checkout = (requestTime: Date) =>
      createCheckout(
        testEnv(),
        bindings.DB,
        teacherA,
        "month",
        "https://example.test",
        { now: requestTime, createSession: createUniqueSession },
      );

    await expect(checkout(now)).resolves.toMatchObject({ id: "cs_1" });
    await expect(
      checkout(new Date(now.getTime() + 36 * 60_000)),
    ).resolves.toMatchObject({ id: "cs_2" });
    expect(calls).toBe(2);
  });

  it("invoices the prorated difference before applying a Parent to Teacher change", async () => {
    await insertSubscription({
      plan: "parent",
      status: "active",
      priceId: "price_parent_monthly",
      currentPeriodEnd: future,
    });
    await bindings.DB.prepare(
      `UPDATE subscriptions
       SET stripe_customer_id = 'cus_test', stripe_subscription_id = 'sub_test'
       WHERE user_id = ?`,
    )
      .bind(teacherA.id)
      .run();
    let sent: Stripe.SubscriptionUpdateParams | null = null;

    await expect(
      changeSubscriptionPlan(
        testEnv(),
        bindings.DB,
        teacherA.id,
        "teacher",
        "month",
        "https://example.test",
        {
          retrieveSubscription: async () =>
            ({
              id: "sub_test",
              items: {
                data: [
                  {
                    id: "si_test",
                    price: { id: "price_parent_monthly" },
                  },
                ],
              },
            }) as unknown as Stripe.Subscription,
          updateSubscription: async (_id, params) => {
            sent = params;
            return {
              id: "sub_test",
              pending_update: { expires_at: 1 },
              latest_invoice: {
                id: "in_change",
                status: "open",
                hosted_invoice_url: "https://invoice.test/pay",
              },
            } as unknown as Stripe.Subscription;
          },
        },
      ),
    ).resolves.toEqual({ url: "https://invoice.test/pay" });

    expect(sent).toMatchObject({
      items: [{ id: "si_test", price: "price_teacher_monthly" }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    });
    await expect(
      bindings.DB.prepare(
        "SELECT plan, status, stripe_price_id FROM subscriptions WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .first(),
    ).resolves.toEqual({
      plan: "parent",
      status: "active",
      stripe_price_id: "price_parent_monthly",
    });
  });

  it("keeps Teacher active and schedules Parent for the current period end", async () => {
    await insertSubscription({
      plan: "teacher",
      status: "active",
      priceId: "price_teacher_monthly",
      currentPeriodEnd: future,
    });
    await bindings.DB.prepare(
      `UPDATE subscriptions
       SET stripe_customer_id = 'cus_test', stripe_subscription_id = 'sub_test'
       WHERE user_id = ?`,
    )
      .bind(teacherA.id)
      .run();
    const periodEnd = Math.floor(new Date(future).getTime() / 1000);
    let scheduleParams: Stripe.SubscriptionScheduleUpdateParams | null = null;
    let immediateUpdates = 0;

    await expect(
      changeSubscriptionPlan(
        testEnv(),
        bindings.DB,
        teacherA.id,
        "parent",
        "year",
        "https://example.test",
        {
          retrieveSubscription: async () =>
            ({
              id: "sub_test",
              schedule: null,
              items: {
                data: [
                  {
                    id: "si_test",
                    current_period_end: periodEnd,
                    quantity: 1,
                    price: { id: "price_teacher_monthly" },
                  },
                ],
              },
            }) as unknown as Stripe.Subscription,
          createSchedule: async (params) => {
            expect(params).toEqual({ from_subscription: "sub_test" });
            return {
              id: "sub_sched",
              current_phase: {
                start_date: periodEnd - 2_592_000,
                end_date: periodEnd,
              },
              phases: [
                {
                  start_date: periodEnd - 2_592_000,
                  end_date: periodEnd,
                  discounts: [],
                  items: [],
                },
              ],
            } as unknown as Stripe.SubscriptionSchedule;
          },
          updateSchedule: async (_id, params) => {
            scheduleParams = params;
            return { id: "sub_sched" } as Stripe.SubscriptionSchedule;
          },
          updateSubscription: async () => {
            immediateUpdates += 1;
            throw new Error("unexpected immediate update");
          },
        },
      ),
    ).resolves.toEqual({
      scheduled: true,
      effectiveAt: new Date(periodEnd * 1000).toISOString(),
    });

    expect(immediateUpdates).toBe(0);
    expect(scheduleParams).toMatchObject({
      end_behavior: "release",
      proration_behavior: "none",
      phases: [
        {
          end_date: periodEnd,
          items: [{ price: "price_teacher_monthly", quantity: 1 }],
          proration_behavior: "none",
        },
        {
          start_date: periodEnd,
          duration: { interval: "year", interval_count: 1 },
          items: [{ price: "price_parent_yearly", quantity: 1 }],
          proration_behavior: "none",
        },
      ],
    });
    await expect(
      bindings.DB.prepare(
        "SELECT plan, status, stripe_price_id FROM subscriptions WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .first(),
    ).resolves.toEqual({
      plan: "teacher",
      status: "active",
      stripe_price_id: "price_teacher_monthly",
    });
  });
});

describe("Stripe event processing", () => {
  const checkoutEvent = (
    id: string,
    type: "checkout.session.expired" | "checkout.session.completed",
  ) =>
    ({
      id: `evt_${type}_${id}`,
      type,
      data: {
        object: {
          id,
          client_reference_id: teacherA.id,
          customer: "cus_test",
          subscription: "sub_test",
          metadata: {
            owner_user_id: teacherA.id,
            billing_interval: "month",
          },
        },
      },
    }) as unknown as Stripe.Event;

  async function createTestCheckout(
    id: string,
    now: Date,
    interval: "month" | "year" = "month",
  ) {
    return createCheckout(
      testEnv(),
      bindings.DB,
      teacherA,
      interval,
      "https://example.test",
      {
        now,
        createSession: async (params) => ({
          id,
          url: `https://checkout.test/${id}`,
          expires_at: params.expires_at!,
        }),
        expireSession: async () => {},
      },
    );
  }

  const subscriptionEvent = (
    eventId: string,
    status: string,
    interval: "month" | "year" = "month",
    plan: "parent" | "teacher" = "teacher",
  ) =>
    ({
      id: eventId,
      type:
        status === "canceled"
          ? "customer.subscription.deleted"
          : "customer.subscription.updated",
      data: {
        object: {
          id: "sub_trial",
          customer: "cus_trial",
          status,
          cancel_at_period_end: status === "canceled",
          metadata: { owner_user_id: teacherA.id, plan },
          items: {
            data: [
              {
                current_period_end: Math.floor(Date.now() / 1000) + 86_400,
                price: {
                  id:
                    plan === "parent"
                      ? interval === "year"
                        ? "price_parent_yearly"
                        : "price_parent_monthly"
                      : interval === "year"
                        ? "price_teacher_yearly"
                        : "price_teacher_monthly",
                  recurring: { interval },
                },
              },
            ],
          },
        },
      },
    }) as unknown as Stripe.Event;

  it.each(["month", "year"] as const)(
    "activates Parent from the configured %s subscription Price",
    async (interval) => {
      await processStripeEvent(
        bindings.DB,
        subscriptionEvent(
          `evt_parent_${interval}`,
          "active",
          interval,
          "parent",
        ),
        testEnv(),
      );

      await expect(
        bindings.DB.prepare(
          "SELECT plan, status, billing_interval, stripe_price_id FROM subscriptions WHERE user_id = ?",
        )
          .bind(teacherA.id)
          .first(),
      ).resolves.toEqual({
        plan: "parent",
        status: "active",
        billing_interval: interval,
        stripe_price_id:
          interval === "year" ? "price_parent_yearly" : "price_parent_monthly",
      });
    },
  );

  it.each(["month", "year"] as const)(
    "activates Teacher from the configured %s subscription Price",
    async (interval) => {
      await processStripeEvent(
        bindings.DB,
        subscriptionEvent(`evt_teacher_${interval}`, "active", interval),
        testEnv(),
      );
      await expect(
        bindings.DB.prepare(
          "SELECT plan, status, billing_interval, stripe_price_id FROM subscriptions WHERE user_id = ?",
        )
          .bind(teacherA.id)
          .first(),
      ).resolves.toEqual({
        plan: "teacher",
        status: "active",
        billing_interval: interval,
        stripe_price_id:
          interval === "year"
            ? "price_teacher_yearly"
            : "price_teacher_monthly",
      });
    },
  );

  it("does not consume a trial when Checkout expires", async () => {
    await createTestCheckout("cs_expired", new Date());
    expect(
      await bindings.DB.prepare(
        "SELECT status FROM payment_orders WHERE id = 'cs_expired'",
      ).first("status"),
    ).toBe("pending");
    await processStripeEvent(
      bindings.DB,
      checkoutEvent("cs_expired", "checkout.session.expired"),
      testEnv(),
    );

    expect(
      await bindings.DB.prepare(
        "SELECT trial_used_at FROM subscriptions WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .first("trial_used_at"),
    ).toBeNull();
    expect(
      await bindings.DB.prepare(
        "SELECT status FROM payment_orders WHERE id = 'cs_expired'",
      ).first("status"),
    ).toBe("expired");
  });

  it("does not create trial state when Checkout completes", async () => {
    await createTestCheckout("cs_trial", new Date());
    await processStripeEvent(
      bindings.DB,
      checkoutEvent("cs_trial", "checkout.session.completed"),
      testEnv(),
    );
    expect(
      await bindings.DB.prepare(
        "SELECT trial_used_at FROM subscriptions WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .first("trial_used_at"),
    ).toBeNull();
    expect(
      await bindings.DB.prepare(
        "SELECT status FROM payment_orders WHERE id = 'cs_trial'",
      ).first("status"),
    ).toBe("completed");
    await bindings.DB.prepare(
      "UPDATE subscriptions SET status = 'canceled', plan = 'free' WHERE user_id = ?",
    )
      .bind(teacherA.id)
      .run();
    let sent: Stripe.Checkout.SessionCreateParams | null = null;

    await createCheckout(
      testEnv(),
      bindings.DB,
      teacherA,
      "year",
      "https://example.test",
      {
        createSession: async (params) => {
          sent = params;
          return {
            id: "cs_year",
            url: "https://checkout.test/year",
            expires_at: params.expires_at!,
          };
        },
      },
    );

    const params = sent as unknown as Stripe.Checkout.SessionCreateParams;
    expect(params.subscription_data?.trial_period_days).toBeUndefined();
    expect(params.metadata?.trial_granted).toBeUndefined();
  });

  it("keeps a canceled Checkout in the order log", async () => {
    await createTestCheckout("cs_canceled", new Date());
    const expired: string[] = [];
    await cancelCheckout(testEnv(), bindings.DB, teacherA.id, async (id) =>
      expired.push(id),
    );
    expect(expired).toEqual(["cs_canceled"]);
    expect(
      await bindings.DB.prepare(
        "SELECT status FROM payment_orders WHERE id = 'cs_canceled'",
      ).first("status"),
    ).toBe("canceled");
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) AS count FROM checkout_locks",
      ).first("count"),
    ).toBe(0);
    await processStripeEvent(
      bindings.DB,
      checkoutEvent("cs_canceled", "checkout.session.expired"),
      testEnv(),
    );
    expect(
      await bindings.DB.prepare(
        "SELECT status FROM payment_orders WHERE id = 'cs_canceled'",
      ).first("status"),
    ).toBe("canceled");
  });

  it("keeps historical trialing access without exposing trial state", async () => {
    const historicalTrialUsedAt = new Date().toISOString();
    await insertSubscription({
      plan: "teacher",
      status: "trialing",
      priceId: "price_teacher_monthly",
      currentPeriodEnd: new Date(Date.now() + 86_400_000).toISOString(),
    });
    await bindings.DB.prepare(
      "UPDATE subscriptions SET trial_used_at = ? WHERE user_id = ?",
    )
      .bind(historicalTrialUsedAt, teacherA.id)
      .run();
    await processStripeEvent(
      bindings.DB,
      subscriptionEvent("evt_trialing", "trialing"),
      testEnv(),
    );
    const usedAt = await bindings.DB.prepare(
      "SELECT trial_used_at FROM subscriptions WHERE user_id = ?",
    )
      .bind(teacherA.id)
      .first<string>("trial_used_at");
    const me = (await (await call("/api/me")).json()) as {
      plan: string;
      subscriptionStatus: string;
    };
    expect(me).toMatchObject({
      plan: "teacher",
      subscriptionStatus: "trialing",
    });
    expect(me).not.toHaveProperty("trialEligible");
    expect(me).not.toHaveProperty("trialEndsAt");

    await processStripeEvent(
      bindings.DB,
      subscriptionEvent("evt_trial_canceled", "canceled"),
      testEnv(),
    );
    await processStripeEvent(
      bindings.DB,
      {
        id: "evt_trial_failed",
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "in_failed",
            customer: "cus_trial",
            subscription: "sub_trial",
          },
        },
      } as unknown as Stripe.Event,
      testEnv(),
    );
    const row = await bindings.DB.prepare(
      "SELECT plan, status, trial_used_at FROM subscriptions WHERE user_id = ?",
    )
      .bind(teacherA.id)
      .first<{ plan: string; status: string; trial_used_at: string }>();
    expect(row).toEqual({
      plan: "free",
      status: "past_due",
      trial_used_at: usedAt,
    });
  });

  it("keeps historical $0 invoices from activating a subscription", async () => {
    await processStripeEvent(
      bindings.DB,
      subscriptionEvent("evt_invoice_trialing", "trialing"),
      testEnv(),
    );
    const invoice = (id: string, amountPaid: number) =>
      ({
        id,
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: `in_${id}`,
            amount_paid: amountPaid,
            customer: "cus_trial",
            subscription: "sub_trial",
          },
        },
      }) as unknown as Stripe.Event;

    await processStripeEvent(bindings.DB, invoice("zero", 0), testEnv());
    expect(
      await bindings.DB.prepare(
        "SELECT status FROM subscriptions WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .first("status"),
    ).toBe("trialing");

    await processStripeEvent(bindings.DB, invoice("paid", 599), testEnv());
    expect(
      await bindings.DB.prepare(
        "SELECT plan, status FROM subscriptions WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .first(),
    ).toEqual({ plan: "teacher", status: "active" });
  });

  it("keeps the current plan active when a prorated plan-change payment fails", async () => {
    await insertSubscription({
      plan: "parent",
      status: "active",
      priceId: "price_parent_monthly",
      currentPeriodEnd: new Date(Date.now() + 86_400_000).toISOString(),
    });
    await bindings.DB.prepare(
      `UPDATE subscriptions
       SET stripe_customer_id = 'cus_test', stripe_subscription_id = 'sub_test'
       WHERE user_id = ?`,
    )
      .bind(teacherA.id)
      .run();

    await processStripeEvent(
      bindings.DB,
      {
        id: "evt_plan_change_failed",
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "in_plan_change_failed",
            customer: "cus_test",
            subscription: "sub_test",
            billing_reason: "subscription_update",
          },
        },
      } as unknown as Stripe.Event,
      testEnv(),
    );

    await expect(
      bindings.DB.prepare(
        "SELECT plan, status, stripe_price_id FROM subscriptions WHERE user_id = ?",
      )
        .bind(teacherA.id)
        .first(),
    ).resolves.toEqual({
      plan: "parent",
      status: "active",
      stripe_price_id: "price_parent_monthly",
    });
  });

  it.each(["checkout.session.expired", "checkout.session.completed"] as const)(
    "clears the matching lock for %s",
    async (eventType) => {
      const now = new Date();
      await createTestCheckout("cs_current", now);
      await processStripeEvent(
        bindings.DB,
        checkoutEvent("cs_current", eventType),
        testEnv(),
      );
      expect(
        await bindings.DB.prepare(
          "SELECT COUNT(*) AS count FROM checkout_locks",
        ).first("count"),
      ).toBe(0);
    },
  );

  it.each(["checkout.session.expired", "checkout.session.completed"] as const)(
    "does not clear a newer lock for an old %s",
    async (eventType) => {
      const now = new Date();
      await createTestCheckout("cs_old", now);
      await createTestCheckout("cs_new", now, "year");

      await processStripeEvent(
        bindings.DB,
        checkoutEvent("cs_old", eventType),
        testEnv(),
      );
      expect(
        await bindings.DB.prepare(
          "SELECT stripe_session_id FROM checkout_locks WHERE user_id = ?",
        )
          .bind(teacherA.id)
          .first("stripe_session_id"),
      ).toBe("cs_new");
    },
  );

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
