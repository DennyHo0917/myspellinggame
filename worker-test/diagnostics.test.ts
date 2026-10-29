import { env as bindings } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest, type Env } from "../src/worker/index";
import { HttpError } from "../src/worker/domain";
import {
  diagnosticContext,
  clientDiagnostic,
  recordDiagnostic,
  pruneDiagnostics,
  DIAGNOSTIC_VERSION,
} from "../src/worker/diagnostics";
const db = (bindings as unknown as { DB: D1Database }).DB;
const pub = "abcdefghijklmnopqrstuvwx";
const assignment = "88888888-8888-4888-8888-888888888888";
function environment(overrides: Partial<Env> = {}): Env {
  return {
    DB: db,
    BETTER_AUTH_SECRET: "diagnostics-local-test-secret-long",
    SUBMIT_LIMITER: { limit: async () => ({ success: true }) },
    CREATE_LIMITER: { limit: async () => ({ success: true }) },
    ADMIN_EMAIL: "owner@example.test",
    ASSETS: { fetch: async () => new Response("ok") } as unknown as Fetcher,
    ...overrides,
  } as Env;
}
function req(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(
    `https://example.test${path}`,
    body === undefined
      ? { headers }
      : {
          method: "POST",
          headers: {
            origin: "https://example.test",
            "content-type": "application/json",
            ...headers,
          },
          body: JSON.stringify(body),
        },
  );
}
function session(id: string | null = "owner") {
  return async () =>
    id
      ? ({
          user: {
            id,
            name: "fictional",
            email: id === "owner" ? "owner@example.test" : "other@example.test",
          },
          session: { id: "local", userId: id },
        } as never)
      : null;
}
async function call(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
  id: string | null = "owner",
  env = environment(),
) {
  try {
    return await handleRequest(req(path, body, headers), env, {
      getSession: session(id),
    });
  } catch (e) {
    if (e instanceof HttpError)
      return Response.json({ error: e.code }, { status: e.status });
    throw e;
  }
}
async function context() {
  const response = await call("/api/diagnostics/context", {});
  const c = (await response.json()) as { trace: string; ticket: string };
  return { "X-Diagnostic-Id": c.trace, "X-Diagnostic-Ticket": c.ticket };
}
async function rows() {
  return (
    await db
      .prepare("SELECT * FROM diagnostic_events ORDER BY occurred_at,event_id")
      .all()
  ).results;
}
beforeEach(async () => {
  await reset();
  await applyD1Migrations(
    db,
    (bindings as unknown as { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS,
  );
  await db
    .prepare(
      "INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,workspace_type,admin_plan,class_public_id) VALUES ('owner','Test adult','owner@example.test',1,?,?, 'teacher','teacher','classroom123')",
    )
    .bind(new Date().toISOString(), new Date().toISOString())
    .run();
  await db
    .prepare(
      "INSERT INTO assignments(id,public_id,owner_user_id,title,mode,status,max_attempts,created_at,expires_at) VALUES(?,?, 'owner','Test assignment','typing','published',3,?,?)",
    )
    .bind(
      assignment,
      pub,
      new Date().toISOString(),
      new Date(Date.now() + 86400000).toISOString(),
    )
    .run();
  await db
    .prepare(
      "INSERT INTO assignment_words(id,assignment_id,position,word) VALUES('word-a',?,0,'apple')",
    )
    .bind(assignment)
    .run();
});
describe("private minimal diagnostics", () => {
  it("signs expiring IDs; unsigned, modified and oversized receipts cannot report", async () => {
    const headers = await context();
    expect(headers["X-Diagnostic-Id"]).toMatch(/^[a-f0-9]{24}$/);
    const body = {
      eventId: "a".repeat(24),
      event: "js_error",
      route: "/a/:id",
    };
    expect((await call("/api/diagnostics/events", body)).status).toBe(403);
    expect(
      (
        await call("/api/diagnostics/events", body, {
          ...headers,
          "X-Diagnostic-Ticket": headers["X-Diagnostic-Ticket"] + "x",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call("/api/diagnostics/events", body, {
          ...headers,
          "X-Diagnostic-Ticket": "a".repeat(200),
        })
      ).status,
    ).toBe(403);
    expect(await rows()).toHaveLength(0);
  });
  it("filters secrets/free text/URLs and rejects forged server events/routes", async () => {
    const headers = await context();
    const body = {
      eventId: "a".repeat(24),
      event: "js_error",
      route: "/a/:id",
      message: "Student Alice PIN 1842 token secret",
      stack: "https://example.test/a/token?learner=secret",
      name: "Alice",
      pin: "1842",
      owner: "forged",
      code: "Alice",
      version: "email@example.test",
    };
    expect((await call("/api/diagnostics/events", body, headers)).status).toBe(
      200,
    );
    const data = await rows();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      source: "client",
      error_code: "js_exception",
      owner_user_id: null,
      assignment_id: null,
      release_version: DIAGNOSTIC_VERSION,
    });
    expect(JSON.stringify(data)).not.toMatch(
      /Alice|1842|secret|https|email@|forged/,
    );
    expect(
      (
        await call(
          "/api/diagnostics/events",
          { ...body, event: "result_submit" },
          headers,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(
          "/api/diagnostics/events",
          { ...body, route: "/a/secret?pin=1842" },
          headers,
        )
      ).status,
    ).toBe(400);
    expect(() =>
      clientDiagnostic(
        { ...body, eventId: "x".repeat(500) },
        headers["X-Diagnostic-Id"],
      ),
    ).toThrow();
    expect(
      (
        await call(
          "/api/diagnostics/events",
          { ...body, message: "x".repeat(2000) },
          headers,
        )
      ).status,
    ).toBe(413);
  });
  it("deduplicates retries and limits trace minute volume", async () => {
    const headers = await context();
    const body = {
      eventId: "a".repeat(24),
      event: "popup_blocked",
      route: "/workspace/assignments/:id",
    };
    await call("/api/diagnostics/events", body, headers);
    await call("/api/diagnostics/events", body, headers);
    expect(await rows()).toHaveLength(1);
    for (let i = 0; i < 25; i++)
      await call(
        "/api/diagnostics/events",
        { ...body, eventId: i.toString(16).padStart(24, "0") },
        headers,
      );
    expect(await rows()).toHaveLength(20);
  });
  it("enforces same origin, anonymous intake rate limit and privacy signals", async () => {
    const headers = await context();
    const body = {
      eventId: "a".repeat(24),
      event: "network_error",
      route: "/a/:id",
    };
    expect(
      (
        await call("/api/diagnostics/events", body, {
          ...headers,
          origin: "https://evil.test",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          "/api/diagnostics/events",
          body,
          headers,
          null,
          environment({
            SUBMIT_LIMITER: { limit: async () => ({ success: false }) },
          }),
        )
      ).status,
    ).toBe(429);
    await call("/api/diagnostics/events", body, { ...headers, DNT: "1" });
    await call(
      `/api/public/assignments/${pub}`,
      undefined,
      { ...headers, "X-Diagnostic-Disabled": "1" },
      null,
    );
    expect(await rows()).toHaveLength(0);
  });
  it("correlates genuine entry, PIN failure and share generation; preserves lifecycle click count", async () => {
    const headers = await context();
    await call(`/api/public/assignments/${pub}`, undefined, headers, null);
    await call(
      "/api/public/join/classroom123",
      { pin: "1842", assignmentPublicId: pub },
      headers,
      null,
    );
    await call(
      `/api/assignments/${assignment}/share`,
      { channel: "google_classroom", clickId: crypto.randomUUID() },
      headers,
    );
    const data = await rows();
    expect(data).toHaveLength(3);
    expect(
      data.every((row) => row.trace_id === headers["X-Diagnostic-Id"]),
    ).toBe(true);
    expect(data.find((row) => row.event_name === "pin")).toMatchObject({
      error_code: "invalid_join",
      http_status: 401,
    });
    expect(data.find((row) => row.event_name === "share_link")).toMatchObject({
      error_code: "ok",
      http_status: 200,
      assignment_id: assignment,
    });
    expect(
      (
        await db
          .prepare(
            "SELECT COUNT(*) AS count FROM lifecycle_events WHERE event_name='assignment_share_clicked'",
          )
          .first<{ count: number }>()
      )?.count,
    ).toBe(1);
    expect(JSON.stringify(data)).not.toContain("1842");
  });
  it("records closed/invalid/unauthorized controlled errors without recording request bodies", async () => {
    const headers = await context();
    await db
      .prepare("UPDATE assignments SET status='closed' WHERE id=?")
      .bind(assignment)
      .run();
    await call(`/api/public/assignments/${pub}`, undefined, headers, null);
    await call(
      `/api/assignments/${assignment}/share`,
      { channel: "google_classroom", clickId: crypto.randomUUID() },
      headers,
      null,
    );
    const data = await rows();
    expect(data.some((r) => r.error_code === "assignment_closed")).toBe(true);
    expect(data.some((r) => r.error_code === "sign_in_required")).toBe(true);
  });
  it("guards administrator summary and trace search; prunes expired records", async () => {
    const headers = await context();
    await call(
      "/api/diagnostics/events",
      { eventId: "a".repeat(24), event: "request_timeout", route: "/a/:id" },
      headers,
    );
    expect(
      (await call("/api/admin/diagnostics", undefined, {}, null)).status,
    ).toBe(401);
    expect(
      (await call("/api/admin/diagnostics", undefined, {}, "other")).status,
    ).toBe(403);
    const summary = (await (
      await call(`/api/admin/diagnostics?trace=${headers["X-Diagnostic-Id"]}`)
    ).json()) as { recent: unknown[]; summary: unknown[] };
    expect(summary.recent).toHaveLength(1);
    expect(summary.summary).toHaveLength(1);
    expect(
      (await call("/api/admin/diagnostics?trace=invalid-email@test")).status,
    ).toBe(400);
    await db
      .prepare(
        "UPDATE diagnostic_events SET occurred_at='2000-01-01T00:00:00.000Z'",
      )
      .run();
    await pruneDiagnostics(db);
    expect(await rows()).toHaveLength(0);
  });
  it("broken diagnostic storage does not fail a real share operation", async () => {
    const headers = await context();
    await db.prepare("DROP TABLE diagnostic_events").run();
    const result = await call(
      `/api/assignments/${assignment}/share`,
      { channel: "copy_link", clickId: crypto.randomUUID() },
      headers,
    );
    expect(result.status).toBe(200);
  });
  it("hung diagnostic insert never blocks the business response with waitUntil", async () => {
    const headers = await context();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => (release = resolve));
    const wrapped = {
      prepare(sql: string) {
        const statement = db.prepare(sql);
        if (sql.includes("INSERT OR IGNORE INTO diagnostic_events")) {
          return {
            bind() {
              return {
                run: async () => {
                  await blocked;
                  return {};
                },
              };
            },
          };
        }
        return statement;
      },
    } as unknown as D1Database;
    const tasks: Promise<unknown>[] = [];
    const response = await handleRequest(
      req(
        `/api/assignments/${assignment}/share`,
        { channel: "copy_link", clickId: crypto.randomUUID() },
        headers,
      ),
      environment({ DB: wrapped }),
      { getSession: session() },
      {
        waitUntil(task) {
          tasks.push(task);
        },
      },
    );
    expect(response.status).toBe(200);
    expect(tasks).toHaveLength(1);
    release();
    await Promise.all(tasks);
  });
  it("unknown codes collapse; opt-out context is empty; expiry cannot extend beyond a day", async () => {
    expect(
      await diagnosticContext(
        req("/api/diagnostics/context", {}, { "Sec-GPC": "1" }),
        environment(),
      ),
    ).toBeNull();
    await recordDiagnostic(
      environment(),
      {
        eventId: "b".repeat(24),
        trace: "c".repeat(24),
        source: "server",
        event: "entry",
        route: "/a/:id",
        code: "PIN 1234 Alice",
        status: 500,
      },
      req("/api/diagnostics/events", {}),
    );
    expect((await rows())[0].error_code).toBe("other_error");
  });
});
