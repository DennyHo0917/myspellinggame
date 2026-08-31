import { betterAuth } from "better-auth";
import { sendWelcomeEmail } from "./email";

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
}

export function safeTeacherCallbackURL(value: unknown, origin: string) {
  try {
    const callback = new URL(
      typeof value === "string" ? value : "/teacher",
      origin,
    );
    if (
      callback.origin === origin &&
      (/^\/teacher(?:\/|$)/.test(callback.pathname) ||
        callback.pathname === "/admin")
    ) {
      return `${callback.pathname}${callback.search}`;
    }
  } catch {}
  return "/teacher";
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
    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              prompt: "select_account" as const,
            },
          }
        : {}),
      ...(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET
        ? {
            microsoft: {
              clientId: env.MICROSOFT_CLIENT_ID,
              clientSecret: env.MICROSOFT_CLIENT_SECRET,
              prompt: "select_account" as const,
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
          after: async (user, context) => {
            if (!env.RESEND_API_KEY) return;
            try {
              await sendWelcomeEmail(
                env.RESEND_API_KEY,
                user.email,
                context?.headers?.get("accept-language"),
              );
            } catch (error) {
              console.error("Welcome email failed", error);
            }
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
  if (
    !env.BETTER_AUTH_SECRET ||
    !(
      (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) ||
      (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET)
    )
  ) {
    return null;
  }
  return createAuth(env, request).api.getSession({ headers: request.headers });
}
