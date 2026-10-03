import { HttpError } from "./domain";

export const DIAGNOSTIC_VERSION = "2026-10-02.classroom-diagnostics-v1";
export const DIAGNOSTIC_CODES = new Set([
  "ok",
  "internal_error",
  "assignment_not_found",
  "assignment_closed",
  "assignment_expired",
  "learner_not_found",
  "learner_required",
  "invalid_join",
  "sign_in_required",
  "class_share_unavailable",
  "rate_limited",
  "invalid_origin",
  "attempt_limit",
  "monthly_submission_limit",
  "student_limit",
  "attempt_conflict",
  "invalid_nickname",
  "personal_info_not_allowed",
  "invalid_answers",
  "invalid_duration",
  "invalid_attempt_id",
  "invalid_share_channel",
  "body_too_large",
  "invalid_json",
  "json_required",
  "network_error",
  "request_timeout",
  "js_exception",
  "invalid_response",
  "popup_blocked",
  "other_error",
]);
const CLIENT_EVENTS = new Set([
  "popup_blocked",
  "network_error",
  "request_timeout",
  "js_error",
  "invalid_response",
]);
const ROUTES = new Set([
  "/api/public/join/:id",
  "/api/assignments/:id/share",
  "/api/public/assignments/:id/start",
  "/api/public/assignments/:id/attempts",
  "/api/public/assignments/:id",
  "/workspace",
  "/workspace/assignments/:id",
  "/join/:id",
  "/a/:id",
]);
const ID = /^[a-f0-9]{24}$/;
type DiagEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  SUBMIT_LIMITER: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
};
type Context = { trace: string; ticket: string };
export type DiagnosticRow = {
  eventId: string;
  trace: string;
  source: "server" | "client";
  event: string;
  route: string;
  code: string;
  status: number;
  owner?: string | null;
  assignment?: string | null;
};
export function diagnosticAllowed(request: Request) {
  return (
    request.headers.get("DNT") !== "1" &&
    request.headers.get("Sec-GPC") !== "1" &&
    request.headers.get("X-Diagnostic-Disabled") !== "1"
  );
}
export function diagnosticOperation(path: string) {
  if (/^\/api\/assignments\/[0-9a-f-]{36}\/share$/i.test(path))
    return { event: "share_link", route: "/workspace/assignments/:id" };
  if (/^\/api\/public\/join\/[A-Za-z0-9_-]{8,24}$/.test(path))
    return { event: "pin", route: "/join/:id" };
  const match = path.match(
    /^\/api\/public\/assignments\/[A-Za-z0-9_-]{24}(?:\/(entry|start|attempts))?$/,
  );
  if (match?.[1] === "entry") return null; // lifecycle already records this intake; diagnose the actual GET once.
  return match
    ? {
        event:
          match[1] === "start"
            ? "practice_start"
            : match[1] === "attempts"
              ? "result_submit"
              : "entry",
        route: "/a/:id",
      }
    : null;
}
async function signingKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`diagnostics:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function signature(value: string, secret: string) {
  const buffer = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function diagnosticContext(
  request: Request,
  env: DiagEnv,
): Promise<Context | null> {
  if (!diagnosticAllowed(request) || !env.BETTER_AUTH_SECRET) return null;
  const ticket = request.headers.get("X-Diagnostic-Ticket") || "";
  const trace = request.headers.get("X-Diagnostic-Id") || "";
  if (ticket.length <= 160 && ID.test(trace)) {
    const parts = ticket.split(".");
    const expires = Number(parts[1]);
    if (
      parts.length === 3 &&
      parts[0] === trace &&
      /^[a-f0-9]{64}$/.test(parts[2]) &&
      expires > Date.now() &&
      expires <= Date.now() + 86400000
    ) {
      const bytes = new Uint8Array(
        parts[2].match(/../g)!.map((hex) => parseInt(hex, 16)),
      );
      if (
        await crypto.subtle.verify(
          "HMAC",
          await signingKey(env.BETTER_AUTH_SECRET),
          bytes,
          new TextEncoder().encode(`${trace}.${expires}`),
        )
      )
        return { trace, ticket };
    }
  }
  const next = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
  const value = `${next}.${Date.now() + 86400000}`;
  return {
    trace: next,
    ticket: `${value}.${await signature(value, env.BETTER_AUTH_SECRET)}`,
  };
}
export async function verifiedClientContext(request: Request, env: DiagEnv) {
  const context = await diagnosticContext(request, env);
  if (!context || context.ticket !== request.headers.get("X-Diagnostic-Ticket"))
    throw new HttpError(
      403,
      "invalid_diagnostic_ticket",
      "Invalid diagnostic ticket.",
    );
  return context;
}
export async function recordDiagnostic(
  env: DiagEnv,
  row: DiagnosticRow,
  request: Request,
) {
  try {
    if (!diagnosticAllowed(request)) return;
    const allowed = await env.SUBMIT_LIMITER.limit({
      key: `diagnostic:${request.headers.get("CF-Connecting-IP") || "unknown"}`,
    });
    if (!allowed.success) return;
    const now = new Date().toISOString();
    // Fixed quotas apply to both trusted server observations and unverified browser reports.
    await env.DB.prepare(
      `INSERT OR IGNORE INTO diagnostic_events
      (event_id,trace_id,source,event_name,route_template,error_code,http_status,owner_user_id,assignment_id,occurred_at,release_version)
      SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE
      (SELECT COUNT(*) FROM diagnostic_events WHERE trace_id=? AND occurred_at>=?)<20 AND
      (SELECT COUNT(*) FROM diagnostic_events WHERE trace_id=?)<100 AND
      (SELECT COUNT(*) FROM diagnostic_events WHERE occurred_at>=?)<10000 AND
      (SELECT COUNT(*) FROM diagnostic_events)<70000`,
    )
      .bind(
        row.eventId,
        row.trace,
        row.source,
        row.event,
        row.route,
        DIAGNOSTIC_CODES.has(row.code) ? row.code : "other_error",
        row.status,
        row.owner || null,
        row.assignment || null,
        now,
        DIAGNOSTIC_VERSION,
        row.trace,
        new Date(Date.now() - 60000).toISOString(),
        row.trace,
        now.slice(0, 10),
      )
      .run();
  } catch {
    /* Do not log raw errors or affect the business response. */
  }
}
export function clientDiagnostic(
  body: Record<string, unknown>,
  trace: string,
): DiagnosticRow {
  if (
    !ID.test(String(body.eventId)) ||
    !CLIENT_EVENTS.has(String(body.event)) ||
    !ROUTES.has(String(body.route))
  )
    throw new HttpError(
      400,
      "invalid_diagnostic",
      "Invalid diagnostic fields.",
    );
  const event = String(body.event);
  const code = event === "js_error" ? "js_exception" : event;
  return {
    eventId: String(body.eventId),
    trace,
    source: "client",
    event,
    route: String(body.route),
    code,
    status: 0,
  };
}
export async function diagnosticSummary(db: D1Database, trace: string | null) {
  if (trace !== null && !ID.test(trace))
    throw new HttpError(400, "invalid_diagnostic", "Invalid diagnostic ID.");
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const summary = await db
    .prepare(
      `SELECT source,event_name,error_code,http_status,release_version,COUNT(*) AS count,MAX(occurred_at) AS last_seen
    FROM diagnostic_events WHERE occurred_at>=? AND (? IS NULL OR trace_id=?) GROUP BY source,event_name,error_code,http_status,release_version ORDER BY count DESC LIMIT 100`,
    )
    .bind(since, trace, trace)
    .all();
  const recent =
    trace === null
      ? await db
          .prepare(
            "SELECT * FROM diagnostic_events WHERE occurred_at>=? ORDER BY occurred_at DESC LIMIT 50",
          )
          .bind(since)
          .all()
      : await db
          .prepare(
            "SELECT * FROM diagnostic_events WHERE trace_id=? AND occurred_at>=? ORDER BY occurred_at,event_id LIMIT 100",
          )
          .bind(trace, since)
          .all();
  return {
    retentionDays: 7,
    version: DIAGNOSTIC_VERSION,
    summary: summary.results,
    recent: recent.results,
  };
}
export async function pruneDiagnostics(db: D1Database) {
  try {
    await db
      .prepare("DELETE FROM diagnostic_events WHERE occurred_at<?")
      .bind(new Date(Date.now() - 7 * 86400000).toISOString())
      .run();
  } catch {
    /* diagnostics storage is optional */
  }
}
