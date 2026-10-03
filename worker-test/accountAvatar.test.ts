import { env as workerBindings } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, expect, it, vi } from "vitest";
import {
  createAuth,
  getTeacherSession,
  type AuthEnv,
} from "../src/worker/auth";
import { handleRequest, type Env } from "../src/worker/index";

const bindings = workerBindings as unknown as {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
};
const authEnv: AuthEnv = {
  DB: bindings.DB,
  BETTER_AUTH_SECRET: "avatar-test-secret-at-least-32-characters",
  BETTER_AUTH_URL: "https://example.test",
  GOOGLE_CLIENT_ID: "google-test",
  GOOGLE_CLIENT_SECRET: "google-test-secret",
  MICROSOFT_CLIENT_ID: "microsoft-test",
  MICROSOFT_CLIENT_SECRET: "microsoft-test-secret",
};

beforeEach(async () => {
  await reset();
  await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS);
});

for (const provider of ["google", "microsoft"] as const) {
  it(`${provider} login persists and refreshes the provider avatar exposed by /api/me`, async () => {
    const auth = createAuth(authEnv, new Request("https://example.test"));
    const context = await auth.$context;
    const social = context.socialProviders.find(
      (item) => item.id === provider,
    )!;
    let image =
      provider === "google"
        ? "https://lh3.googleusercontent.com/test-avatar"
        : "data:image/jpeg;base64, /9j/2Q==";
    // Stub the external OAuth boundary; exercise the real callback, D1 and session.
    social.accountIssuer = `urn:test:${provider}`;
    social.accountSubject = () => "avatar-account";
    vi.spyOn(social, "validateAuthorizationCode").mockResolvedValue({
      accessToken: "test-access-token",
      scopes: ["openid", "profile", "email"],
    });
    vi.spyOn(social, "getUserInfo").mockImplementation(async () => ({
      user: {
        name: "Avatar User",
        email: "avatar@example.test",
        emailVerified: true,
        image,
      },
      data: {},
    }));
    const login = async () => {
      const start = await auth.handler(
        new Request("https://example.test/api/auth/sign-in/social", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://example.test",
          },
          body: JSON.stringify({
            provider,
            callbackURL: "/workspace",
            disableRedirect: true,
          }),
        }),
      );
      expect(start.status).toBe(200);
      const { url } = (await start.json()) as { url: string };
      const state = new URL(url).searchParams.get("state")!;
      const cookie = start.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const callback = await auth.handler(
        new Request(
          `https://example.test/api/auth/callback/${provider}?code=test-code&state=${encodeURIComponent(state)}`,
          { headers: { cookie } },
        ),
      );
      expect(callback.headers.get("location")).toBe("/workspace");
      const sessionCookie = callback.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const meRequest = new Request("https://example.test/api/me", {
        headers: { cookie: sessionCookie },
      });
      const session = await getTeacherSession(authEnv, meRequest);
      expect(session?.user.image).toBe(image);
      const response = await handleRequest(meRequest, authEnv as Env);
      expect(response.status).toBe(200);
      const me = (await response.json()) as {
        user: { id: string; image: string };
      };
      expect(me.user.image).toBe(image);
      return me.user.id;
    };
    const userId = await login();
    image =
      provider === "google"
        ? "https://lh3.googleusercontent.com/updated-avatar"
        : "data:image/jpeg;base64, /9j/3Q==";
    expect(await login()).toBe(userId);
    const stored = await bindings.DB.prepare(
      "SELECT image FROM user WHERE id = ?",
    )
      .bind(userId)
      .first<{ image: string }>();
    expect(stored?.image).toBe(image);
  });
}
