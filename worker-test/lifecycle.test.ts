import { env as workerBindings } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { handleRequest, type Env } from "../src/worker/index";

type TestBindings = {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
};

type User = { id: string; name: string; email: string };

const bindings = workerBindings as unknown as TestBindings;
const user: User = {
  id: "lifecycle-user",
  name: "Lifecycle User",
  email: "lifecycle@example.test",
};
const attemptId = "00000000-0000-4000-8000-000000000001";

function env(): Env {
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
  };
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
  signedIn = true,
  runtime = env(),
) {
  return handleRequest(request(path, init), runtime, {
    getSession: async () =>
      signedIn
        ? ({
            user,
            session: { id: "lifecycle-session", userId: user.id },
          } as never)
        : null,
  });
}

async function insertUser() {
  const now = new Date().toISOString();
  await bindings.DB.prepare(
    `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
  )
    .bind(user.id, user.name, user.email, now, now)
    .run();
}

describe("lifecycle events", () => {
  beforeEach(async () => {
    await reset();
    await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS);
    await insertUser();
  });

  it("captures signup context once and keeps the first attribution", async () => {
    const first = await call("/api/lifecycle/signup", {
      method: "POST",
      body: JSON.stringify({
        source: "practice_result",
        intent: "ignored-by-server",
        provider: "google",
      }),
    });
    expect(first.status).toBe(200);

    const second = await call("/api/lifecycle/signup", {
      method: "POST",
      body: JSON.stringify({ source: "workspace", provider: "microsoft" }),
    });
    expect(second.status).toBe(200);

    const saved = await bindings.DB.prepare(
      "SELECT signup_source, signup_intent FROM user WHERE id = ?",
    )
      .bind(user.id)
      .first<{ signup_source: string; signup_intent: string }>();
    expect(saved).toEqual({
      signup_source: "practice_result",
      signup_intent: "continue_from_practice",
    });
    const events = await bindings.DB.prepare(
      `SELECT event_name, event_key, properties_json
       FROM lifecycle_events WHERE user_id = ? ORDER BY occurred_at`,
    )
      .bind(user.id)
      .all<{
        event_name: string;
        event_key: string;
        properties_json: string;
      }>();
    expect(events.results).toHaveLength(1);
    expect(events.results[0].event_name).toBe("signup_context_captured");
    expect(events.results[0].event_key).toBe("signup");
    expect(JSON.parse(events.results[0].properties_json)).toMatchObject({
      source: "practice_result",
      intent: "continue_from_practice",
      provider: "google",
    });
  });

  it("records registered-owner actions and student results", async () => {
    const savedList = await call("/api/saved-lists", {
      method: "POST",
      body: JSON.stringify({ title: "Week one", words: ["apple", "banana"] }),
    });
    expect(savedList.status).toBe(201);
    const learner = await call("/api/learners", {
      method: "POST",
      body: JSON.stringify({ name: "Alex" }),
    });
    expect(learner.status).toBe(201);
    const assignment = await call("/api/assignments", {
      method: "POST",
      body: JSON.stringify({
        title: "Week one",
        words: ["apple", "banana"],
        mode: "dictation",
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    });
    expect(assignment.status).toBe(201);
    const assignmentBody = (await assignment.json()) as {
      publicId: string;
    };

    const started = await call(
      `/api/public/assignments/${assignmentBody.publicId}/start`,
      {
        method: "POST",
        body: JSON.stringify({
          nickname: "Alex",
          attemptId,
        }),
      },
      false,
    );
    expect(started.status).toBe(200);
    const publicAssignment = await call(
      `/api/public/assignments/${assignmentBody.publicId}`,
      {},
      false,
    );
    const publicBody = (await publicAssignment.json()) as {
      words: Array<{ id: string; word: string }>;
    };
    const submitted = await call(
      `/api/public/assignments/${assignmentBody.publicId}/attempts`,
      {
        method: "POST",
        body: JSON.stringify({
          nickname: "Alex",
          attemptId,
          answers: publicBody.words.map((word) => ({
            wordId: word.id,
            answer: word.word,
          })),
          durationSeconds: 30,
        }),
      },
      false,
    );
    expect(submitted.status).toBe(201);

    const events = await bindings.DB.prepare(
      "SELECT event_name FROM lifecycle_events WHERE user_id = ? ORDER BY event_name",
    )
      .bind(user.id)
      .all<{ event_name: string }>();
    expect(events.results.map((event) => event.event_name)).toEqual([
      "assignment_created",
      "assignment_result_received",
      "assignment_started",
      "learner_created",
      "saved_list_created",
    ]);
  });
});
