import { env as workerBindings } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import type Stripe from "stripe";

import { HttpError, masteryStatus, monthStart } from "../src/worker/domain";
import {
  restrictTeacherAuthCallback,
  safeTeacherCallbackURL,
} from "../src/worker/auth";
import { handleRequest, type Env } from "../src/worker/index";
import {
  createCheckout,
  createPortal,
  processStripeEvent,
} from "../src/worker/stripe";

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

async function createSavedList(
  title: string,
  teacher: Teacher = teacherA,
  words: string[] = ["apple", "banana"],
) {
  const response = await call(
    "/api/saved-lists",
    { method: "POST", body: JSON.stringify({ title, words }) },
    teacher,
  );
  return { response, body: (await response.json()) as Record<string, unknown> };
}

async function createLearner(name: string, teacher: Teacher = teacherA) {
  const response = await call(
    "/api/learners",
    { method: "POST", body: JSON.stringify({ name }) },
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

describe("teacher auth callback", () => {
  it("allows only same-origin teacher paths", () => {
    const origin = "https://example.test";
    expect(
      safeTeacherCallbackURL("/teacher/assignments/new?lang=en", origin),
    ).toBe("/teacher/assignments/new?lang=en");
    expect(safeTeacherCallbackURL("https://evil.test/teacher", origin)).toBe(
      "/teacher",
    );
    expect(safeTeacherCallbackURL("/teacher-redirect", origin)).toBe(
      "/teacher",
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
          callbackURL: "https://evil.test/teacher",
        }),
      },
    );
    const sanitized = await restrictTeacherAuthCallback(request);
    await expect(sanitized.json()).resolves.toMatchObject({
      provider: "google",
      callbackURL: "/teacher",
    });
  });
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

  it("keeps public nickname submissions independent from saved learner quotas", async () => {
    const created = await createAssignment();
    const publicId = String(created.body.publicId);
    const assignment = await publicWords(publicId);
    for (let index = 0; index < 4; index += 1) {
      expect((await createLearner(`Learner ${index}`)).response.status).toBe(
        index < 3 ? 201 : 403,
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
    ).toBe(3);
  });
});

describe("saved lists and learner profiles", () => {
  it("enforces Free saved-list limits and leaves Pro lists unlimited", async () => {
    for (const title of ["One", "Two", "Three"]) {
      expect((await createSavedList(title)).response.status).toBe(201);
    }
    const limited = await createSavedList("Four");
    expect(limited.response.status).toBe(403);
    expect(limited.body.error).toBe("saved_list_limit");

    await insertSubscription({ plan: "pro", status: "active" });
    expect((await createSavedList("Four")).response.status).toBe(201);
  });

  it("enforces the 150-profile Pro limit", async () => {
    await insertSubscription({ plan: "pro", status: "active" });
    const now = new Date().toISOString();
    const statements = Array.from({ length: 150 }, (_, index) =>
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
    await bindings.DB.batch(statements.slice(0, 100));
    await bindings.DB.batch(statements.slice(100));
    const limited = await createLearner("Learner 151");
    expect(limited.response.status).toBe(403);
    expect(limited.body.error).toBe("learner_limit");
  });

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

  it("retains over-limit data after downgrade but blocks new records", async () => {
    await insertSubscription({ plan: "pro", status: "active" });
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

  it("normalizes nickname matching without crossing owners", async () => {
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
    const learnerA = await createLearner("learner 01");
    const learnerB = await createLearner("Learner 01", teacherB);
    const linked = await bindings.DB.prepare(
      "SELECT learner_id FROM attempts WHERE assignment_id = ?",
    )
      .bind(created.body.id)
      .first("learner_id");
    expect(linked).toBe(learnerA.body.id);
    expect(linked).not.toBe(learnerB.body.id);
  });
});

describe("cross-assignment mastery", () => {
  it("uses the last three results and keeps earlier misses until corrected", () => {
    expect(masteryStatus([true])).toBe("learning");
    expect(masteryStatus([false, true, true])).toBe("needs_review");
    expect(masteryStatus([false, true, true, true])).toBe("mastered");
  });

  it("aggregates completed attempts and builds a focused Pro review", async () => {
    await insertSubscription({ plan: "pro", status: "active" });
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
            nickname: "Learner 01",
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
      nickname: "learner 01",
    });
    const learner = await createLearner("Learner 01");
    const detail = (await (
      await call(`/api/learners/${learner.body.id}`)
    ).json()) as {
      summary: { completedAttempts: number };
      words: Array<{ word: string; status: string }>;
    };
    expect(detail.summary.completedAttempts).toBe(5);
    expect(detail.words).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ word: "apple", status: "mastered" }),
        expect.objectContaining({ word: "banana", status: "needs_review" }),
        expect.objectContaining({ word: "cherry", status: "learning" }),
      ]),
    );
    const review = (await (
      await call(`/api/learners/${learner.body.id}/review`, {
        method: "POST",
        body: "{}",
      })
    ).json()) as { words: string[] };
    expect(review.words).toEqual(["banana"]);
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

  it("shows 30 days on Free, 365 days on Pro, and locks smart review", async () => {
    const learner = await createLearner("Learner 01");
    const created = await createAssignment();
    const words = await publicWords(String(created.body.publicId));
    await submit(String(created.body.publicId), words.words, {
      nickname: "Learner 01",
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
    expect(free.historyDays).toBe(30);
    expect(free.words).toHaveLength(0);
    expect(
      (
        await call(`/api/learners/${learner.body.id}/review`, {
          method: "POST",
          body: "{}",
        })
      ).status,
    ).toBe(403);

    await insertSubscription({ plan: "pro", status: "active" });
    const pro = (await (
      await call(`/api/learners/${learner.body.id}`)
    ).json()) as { historyDays: number; words: unknown[] };
    expect(pro.historyDays).toBe(365);
    expect(pro.words).toHaveLength(2);
  });
});

describe("assignment attempts", () => {
  it("expires Free results after 30 days and Pro results after 365 days", async () => {
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
    expect(await retentionDays(freeAttempt.id)).toBe(30);

    await insertSubscription({ plan: "pro", status: "active" });
    const proAssignment = await createAssignment(teacherA, {
      title: "Pro retention",
    });
    const proWords = await publicWords(String(proAssignment.body.publicId));
    const proAttempt = (await (
      await submit(String(proAssignment.body.publicId), proWords.words)
    ).json()) as { id: string };
    expect(await retentionDays(proAttempt.id)).toBe(365);
  });

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
  const createSession = async (
    params: Stripe.Checkout.SessionCreateParams,
  ) => ({
    id: "cs_test",
    url: "https://checkout.test/session",
    expires_at: params.expires_at!,
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
        `https://example.test/teacher?lang=${expected}&checkout=success&interval=month`,
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
    await insertSubscription({ plan: "pro", status: "active" });
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

    expect(returnUrl).toBe(`https://example.test/teacher?lang=${expected}`);
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
    ).resolves.toMatchObject({ url: "https://checkout.test/session" });
  });

  it("creates one Session for concurrent requests and reuses its URL", async () => {
    let calls = 0;
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
        { now, createSession: delayedSession },
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
          metadata: { owner_user_id: teacherA.id, billing_interval: "month" },
        },
      },
    }) as unknown as Stripe.Event;

  async function createTestCheckout(id: string, now: Date) {
    return createCheckout(
      testEnv(),
      bindings.DB,
      teacherA,
      "month",
      "https://example.test",
      {
        now,
        createSession: async (params) => ({
          id,
          url: `https://checkout.test/${id}`,
          expires_at: params.expires_at!,
        }),
      },
    );
  }

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
      await createTestCheckout("cs_new", new Date(now.getTime() + 36 * 60_000));

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
