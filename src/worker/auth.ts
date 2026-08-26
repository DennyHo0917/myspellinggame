import { betterAuth } from "better-auth";

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
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
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
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
      session: {
        create: {
          before: async (session) => ({
            data: { ...session, ipAddress: null, userAgent: null },
          }),
        },
      },
    },
  });
}

export async function getTeacherSession(env: AuthEnv, request: Request) {
  if (
    !env.BETTER_AUTH_SECRET ||
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET
  ) {
    return null;
  }
  return createAuth(env, request).api.getSession({ headers: request.headers });
}
