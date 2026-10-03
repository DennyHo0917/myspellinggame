import { acquisitionAllowed } from "./adultAcquisition.mjs";
const KEY = "mySpellingDiagnosticContext";
const ID = /^[a-f0-9]{24}$/;
const VERSION = "2026-10-02.classroom-diagnostics-v1";
let context = null;
let authority = null;
let installed = false;
let bootstrap = null;
let queued = [];
let count = 0;
const randomId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 24);
export function diagnosticRoute() {
  if (/^\/join\//.test(location.pathname)) return "/join/:id";
  if (/^\/a\//.test(location.pathname)) return "/a/:id";
  if (/^\/workspace\/assignments\/[^/]+$/.test(location.pathname))
    return "/workspace/assignments/:id";
  return "/workspace";
}
function fresh(value) {
  return (
    ID.test(value?.trace) &&
    typeof value.ticket === "string" &&
    value.ticket.length <= 160 &&
    value.ticket.split(".")[0] === value.trace &&
    Number(value.ticket.split(".")[1]) > Date.now()
  );
}
function expireContext() {
  if (context && !fresh(context)) {
    context = null;
    authority = null;
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
  }
}
function readContext() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (fresh(value)) {
      context = value;
      authority = "business";
    } else sessionStorage.removeItem(KEY);
  } catch {}
}
function adopt(value, source, requestedTrace = null) {
  expireContext();
  if (!acquisitionAllowed() || !fresh(value)) return;
  if (source === "bootstrap" && context) return;
  // The first actual workflow response supersedes a concurrent bootstrap receipt.
  // Later in-flight responses cannot overwrite a chain already chosen by another business response.
  if (
    source === "business" &&
    authority === "business" &&
    context &&
    requestedTrace !== context.trace
  )
    return;
  context = { trace: value.trace, ticket: value.ticket };
  authority = source;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(context));
  } catch {}
  const pending = queued;
  queued = [];
  for (const event of pending) send(event);
}
function startBootstrap() {
  if (bootstrap || !acquisitionAllowed()) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  bootstrap = fetch("/api/diagnostics/context", {
    method: "POST",
    credentials: "same-origin",
    referrerPolicy: "no-referrer",
    headers: { "content-type": "application/json" },
    body: "{}",
    signal: controller.signal,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((value) => {
      if (value) adopt(value, "bootstrap");
    })
    .catch(() => null)
    .finally(() => {
      clearTimeout(timer);
      bootstrap = null;
    });
}

function headers() {
  return context
    ? {
        "X-Diagnostic-Id": context.trace,
        "X-Diagnostic-Ticket": context.ticket,
      }
    : {};
}
function send(event) {
  expireContext();
  if (!acquisitionAllowed() || !context) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  void fetch("/api/diagnostics/events", {
    method: "POST",
    credentials: "same-origin",
    referrerPolicy: "no-referrer",
    headers: { "content-type": "application/json", ...headers() },
    body: JSON.stringify(event),
    signal: controller.signal,
  })
    .catch(() => null)
    .finally(() => clearTimeout(timer));
}
export function reportDiagnostic(event, route = diagnosticRoute()) {
  expireContext();
  if (!acquisitionAllowed() || count >= 20) return;
  if (
    ![
      "popup_blocked",
      "network_error",
      "request_timeout",
      "js_error",
      "invalid_response",
    ].includes(event)
  )
    return;
  count++;
  const value = {
    eventId: randomId(),
    event,
    route,
    version: VERSION,
  };
  if (context) send(value);
  else if (queued.length < 10) {
    queued.push(value);
    startBootstrap();
  }
}
export function installDiagnostics() {
  if (installed || !acquisitionAllowed()) return;
  installed = true;
  readContext();
  let reported = false;
  const exception = () => {
    if (!reported) {
      reported = true;
      reportDiagnostic("js_error");
    }
  };
  window.addEventListener("error", exception);
  window.addEventListener("unhandledrejection", exception);
  if (!context) startBootstrap();
}
export async function diagnosticFetch(path, options = {}, timeoutMs = 20000) {
  expireContext();
  const requestedTrace = context?.trace || null;
  const allowed = acquisitionAllowed();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const requestHeaders = new Headers(options.headers);
  if (allowed) {
    for (const [key, value] of Object.entries(headers()))
      requestHeaders.set(key, value);
    requestHeaders.set("X-Diagnostic-Event", randomId());
  } else requestHeaders.set("X-Diagnostic-Disabled", "1");
  try {
    const response = await fetch(path, {
      ...options,
      headers: requestHeaders,
      signal: controller.signal,
    });
    // Bootstrap is never awaited by any business operation. Preserve the original chain if it wins the race.
    if (allowed)
      adopt(
        {
          trace: response.headers.get("X-Diagnostic-Id"),
          ticket: response.headers.get("X-Diagnostic-Ticket"),
        },
        "business",
        requestedTrace,
      );
    return response;
  } catch (error) {
    const pathname = new URL(path, location.origin).pathname;
    const route = /^\/api\/public\/join\//.test(pathname)
      ? "/api/public/join/:id"
      : /\/share$/.test(pathname)
        ? "/api/assignments/:id/share"
        : /\/start$/.test(pathname)
          ? "/api/public/assignments/:id/start"
          : /\/attempts$/.test(pathname)
            ? "/api/public/assignments/:id/attempts"
            : "/api/public/assignments/:id";
    reportDiagnostic(timedOut ? "request_timeout" : "network_error", route);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export function diagnosticId() {
  return context?.trace || null;
}
export function diagnosticsReady() {
  return bootstrap || Promise.resolve();
}
