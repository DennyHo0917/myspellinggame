import { betterAuth } from "better-auth";
import { startFeatureTrialIfMissing } from "./featureTrial";
import { recordLifecycleEvent } from "./lifecycle";

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  ENVIRONMENT?: string;
}

export function safeTeacherCallbackURL(value: unknown, origin: string) {
  try {
    const callback = new URL(
      typeof value === "string" ? value : "/workspace",
      origin,
    );
    if (
      callback.origin === origin &&
      (/^\/(?:workspace|teacher)(?:\/|$)/.test(callback.pathname) ||
        callback.pathname === "/admin")
    ) {
      const pathname = callback.pathname.replace(
        /^\/teacher(?=\/|$)/,
        "/workspace",
      );
      return `${pathname}${callback.search}`;
    }
  } catch {}
  return "/workspace";
}

export async function restrictTeacherAuthCallback(request: Request) {
  const url = new URL(request.url);
  if (
    request.method !== "POST" ||
    url.pathname !== "/api/auth/sign-in/social"
  ) {
    return request;
  }
  const body = (await request
    .clone()
    .json()
    .catch(() => null)) as Record<string, unknown> | null;
  if (!body) return request;
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request, {
    headers,
    body: JSON.stringify({
      ...body,
      callbackURL: safeTeacherCallbackURL(body.callbackURL, url.origin),
    }),
  });
}

export function createAuth(env: AuthEnv, request: Request) {
  const origin = new URL(request.url).origin;
  const baseURL = env.BETTER_AUTH_URL || origin;
  const secure = new URL(baseURL).protocol === "https:";

  return betterAuth({
    appName: "My Spelling Game",
    baseURL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [origin, baseURL],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              prompt: "select_account" as const,
              overrideUserInfoOnSignIn: true,
            },
          }
        : {}),
      ...(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET
        ? {
            microsoft: {
              clientId: env.MICROSOFT_CLIENT_ID,
              clientSecret: env.MICROSOFT_CLIENT_SECRET,
              prompt: "select_account" as const,
              overrideUserInfoOnSignIn: true,
              profilePhotoSize: 48 as const,
            },
          }
        : {}),
    },
    advanced: {
      useSecureCookies: secure,
      ipAddress: { disableIpTracking: true },
      defaultCookieAttributes: {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
      },
      database: { joins: true },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              const created = new Date(user.createdAt);
              await startFeatureTrialIfMissing(
                env.DB,
                user.id,
                Number.isNaN(created.getTime())
                  ? new Date().toISOString()
                  : created.toISOString(),
              );
            } catch (error) {
              console.error("Failed to start feature trial", error);
            }
            await recordLifecycleEvent(env.DB, user.id, "signup_created", {
              email_verified: Boolean(user.emailVerified),
            });
          },
        },
      },
      session: {
        create: {
          before: async (session) => ({
            data: { ...session, ipAddress: null, userAgent: null },
          }),
          after: async (session) => {
            try {
              const now = new Date().toISOString();
              await env.DB.prepare(
                "UPDATE user SET last_login_at = ?, last_active_at = ? WHERE id = ?",
              )
                .bind(now, now, session.userId)
                .run();
              await recordLifecycleEvent(
                env.DB,
                session.userId,
                "login",
                {
                  session_id: session.id,
                },
                `session:${session.id}`,
              );
            } catch (error) {
              console.error("Failed to record last login time", error);
            }
          },
        },
      },
    },
  });
}

export async function getTeacherSession(env: AuthEnv, request: Request) {
  if (!env.BETTER_AUTH_SECRET) {
    return null;
  }
  try {
    const session = await createAuth(env, request).api.getSession({
      headers: request.headers,
    });
    if (session?.user?.id) {
      return session;
    }
  } catch (err) {
    console.error("createAuth.api.getSession error:", err);
  }

  try {
    const cookieHeader = request.headers.get("cookie") || "";
    if (!cookieHeader) return null;
    const match = cookieHeader.match(
      /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/,
    );
    if (!match) return null;
    const rawVal = decodeURIComponent(match[1]);
    const token = rawVal.split(".")[0];
    if (!token) return null;

    const row = await env.DB.prepare(
      `SELECT s.id AS session_id, s.expiresAt, s.token, s.createdAt AS session_createdAt, s.updatedAt AS session_updatedAt,
              u.id AS user_id, u.name, u.email, u.emailVerified, u.image, u.createdAt AS user_createdAt, u.updatedAt AS user_updatedAt
       FROM session s
       JOIN user u ON u.id = s.userId
       WHERE s.token = ? AND datetime(s.expiresAt) > datetime('now')`,
    )
      .bind(token)
      .first<{
        session_id: string;
        expiresAt: string;
        token: string;
        session_createdAt: string;
        session_updatedAt: string;
        user_id: string;
        name: string;
        email: string;
        emailVerified: number | boolean;
        image: string | null;
        user_createdAt: string;
        user_updatedAt: string;
      }>();

    if (!row) return null;

    return {
      session: {
        id: row.session_id,
        userId: row.user_id,
        expiresAt: new Date(row.expiresAt),
        token: row.token,
        createdAt: new Date(row.session_createdAt),
        updatedAt: new Date(row.session_updatedAt),
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: row.user_id,
        name: row.name,
        email: row.email,
        emailVerified: Boolean(row.emailVerified),
        image: row.image ?? null,
        createdAt: new Date(row.user_createdAt),
        updatedAt: new Date(row.user_updatedAt),
      },
    } as unknown as Awaited<
      ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>
    >;
  } catch (err) {
    console.error("Fallback getTeacherSession error:", err);
    return null;
  }
}
