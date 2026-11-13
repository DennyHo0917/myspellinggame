import { env as workerBindings } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { handleRequest, type Env } from "../src/worker/index";
import { HttpError } from "../src/worker/domain";

type TestBindings = {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
};

const bindings = workerBindings as unknown as TestBindings;

function testEnv(): Env {
  const allow = { limit: async () => ({ success: true }) };
  return {
    DB: bindings.DB,
    ASSETS: { fetch: (req: Request) => fetch(req) } as Fetcher,
    CREATE_LIMITER: allow,
    SUBMIT_LIMITER: allow,
    BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long",
    BETTER_AUTH_URL: "https://example.test",
    RESEND_API_KEY: "re_replace_me", // Dev mode will log OTP
    ENVIRONMENT: "development",
  };
}

async function call(path: string, init: RequestInit = {}, runtime = testEnv()) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (init.method && init.method !== "GET") {
    headers.set("origin", "https://example.test");
  }
  const req = new Request(`https://example.test${path}`, { ...init, headers });
  try {
    return await handleRequest(req, runtime);
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

describe("email registration & authentication", () => {
  beforeEach(async () => {
    await reset();
    await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS);
  });

  it("sends a verification code and stores it in verification table", async () => {
    const res = await call("/api/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email: "teacher@example.com" }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean };
    expect(json.success).toBe(true);

    const record = await bindings.DB.prepare(
      "SELECT value, expiresAt FROM verification WHERE identifier = ?",
    )
      .bind("email-otp:teacher@example.com")
      .first<{ value: string; expiresAt: string }>();

    expect(record).not.toBeNull();
    expect(record?.value).toMatch(/^\d{6}$/);
  });

  it("rejects registration with invalid verification code", async () => {
    // Send code first
    await call("/api/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email: "teacher@example.com" }),
    });

    const res = await call("/api/auth/email/register", {
      method: "POST",
      body: JSON.stringify({
        email: "teacher@example.com",
        code: "000000",
        password: "password123",
      }),
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("invalid_code");
  });

  it("rejects registration with short password (< 8 chars)", async () => {
    const res = await call("/api/auth/email/register", {
      method: "POST",
      body: JSON.stringify({
        email: "teacher@example.com",
        code: "123456",
        password: "short",
      }),
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("invalid_password");
  });

  it("successfully registers user, creates session cookie, and allows workspace access", async () => {
    // 1. Send code
    await call("/api/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email: "newuser@example.com" }),
    });

    const record = await bindings.DB.prepare(
      "SELECT value FROM verification WHERE identifier = ?",
    )
      .bind("email-otp:newuser@example.com")
      .first<{ value: string }>();
    const code = record!.value;

    // 2. Register
    const regRes = await call("/api/auth/email/register", {
      method: "POST",
      body: JSON.stringify({
        email: "newuser@example.com",
        code,
        password: "securePassword123",
        name: "Test Teacher",
      }),
    });

    expect(regRes.status).toBe(200);
    const setCookie = regRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("better-auth.session_token=");

    // Verify user in database
    const userRow = await bindings.DB.prepare(
      "SELECT * FROM user WHERE email = ?",
    )
      .bind("newuser@example.com")
      .first<{
        id: string;
        emailVerified: number;
        feature_trial_started_at: string;
      }>();
    expect(userRow).not.toBeNull();
    expect(userRow?.emailVerified).toBe(1);
    expect(userRow?.feature_trial_started_at).toBeTruthy();

    // Verify credential account in account table
    const accountRow = await bindings.DB.prepare(
      "SELECT * FROM account WHERE userId = ? AND providerId = 'credential'",
    )
      .bind(userRow!.id)
      .first<{ password: string }>();
    expect(accountRow).not.toBeNull();
    expect(accountRow?.password).toContain(":");

    // 3. Prevent duplicate registration
    await call("/api/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email: "newuser@example.com" }),
    });
    const dupRes = await call("/api/auth/email/register", {
      method: "POST",
      body: JSON.stringify({
        email: "newuser@example.com",
        code: "123456",
        password: "securePassword123",
      }),
    });
    expect(dupRes.status).toBe(400);
    const dupJson = (await dupRes.json()) as { error: string };
    expect(dupJson.error).toBe("user_already_exists");
  });

  it("authenticates via password sign-in", async () => {
    // Register first
    await call("/api/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email: "login@example.com" }),
    });
    const record = await bindings.DB.prepare(
      "SELECT value FROM verification WHERE identifier = ?",
    )
      .bind("email-otp:login@example.com")
      .first<{ value: string }>();
    await call("/api/auth/email/register", {
      method: "POST",
      body: JSON.stringify({
        email: "login@example.com",
        code: record!.value,
        password: "mySecretPassword123",
      }),
    });

    // Wrong password fails
    const failRes = await call("/api/auth/email/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: "login@example.com",
        password: "wrongPassword",
      }),
    });
    expect(failRes.status).toBe(400);

    // Correct password succeeds
    const successRes = await call("/api/auth/email/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: "login@example.com",
        password: "mySecretPassword123",
      }),
    });
    expect(successRes.status).toBe(200);
    const setCookie = successRes.headers.get("set-cookie");
    expect(setCookie).toContain("better-auth.session_token=");
  });

  it("authenticates via email verification code sign-in", async () => {
    // Send code
    await call("/api/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email: "codelogin@example.com" }),
    });
    const record = await bindings.DB.prepare(
      "SELECT value FROM verification WHERE identifier = ?",
    )
      .bind("email-otp:codelogin@example.com")
      .first<{ value: string }>();

    // Sign in with code
    const res = await call("/api/auth/email/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: "codelogin@example.com",
        code: record!.value,
      }),
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("better-auth.session_token=");

    // Verify user was created
    const user = await bindings.DB.prepare("SELECT * FROM user WHERE email = ?")
      .bind("codelogin@example.com")
      .first<{ emailVerified: number }>();
    expect(user?.emailVerified).toBe(1);
  });

  it("resets password using verification code", async () => {
    // Register
    await call("/api/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email: "resetme@example.com" }),
    });
    const record = await bindings.DB.prepare(
      "SELECT value FROM verification WHERE identifier = ?",
    )
      .bind("email-otp:resetme@example.com")
      .first<{ value: string }>();
    await call("/api/auth/email/register", {
      method: "POST",
      body: JSON.stringify({
        email: "resetme@example.com",
        code: record!.value,
        password: "initialPassword123",
      }),
    });

    // Request reset code
    await call("/api/auth/email/send-code", {
      method: "POST",
      body: JSON.stringify({ email: "resetme@example.com" }),
    });
    const resetRecord = await bindings.DB.prepare(
      "SELECT value FROM verification WHERE identifier = ?",
    )
      .bind("email-otp:resetme@example.com")
      .first<{ value: string }>();

    // Reset password
    const resetRes = await call("/api/auth/email/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: "resetme@example.com",
        code: resetRecord!.value,
        password: "newBrandNewPassword123",
      }),
    });
    expect(resetRes.status).toBe(200);

    // Old password no longer works
    const oldLogin = await call("/api/auth/email/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: "resetme@example.com",
        password: "initialPassword123",
      }),
    });
    expect(oldLogin.status).toBe(400);

    // New password works
    const newLogin = await call("/api/auth/email/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: "resetme@example.com",
        password: "newBrandNewPassword123",
      }),
    });
    expect(newLogin.status).toBe(200);
  });
});
