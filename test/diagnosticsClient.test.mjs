import { test } from "node:test";
import assert from "node:assert/strict";
let sequence = 0;
const A = "a".repeat(24),
  B = "b".repeat(24),
  C = "c".repeat(24);
const receipt = (trace, expires = Date.now() + 3600000) => ({
  trace,
  ticket: `${trace}.${expires}.${"d".repeat(64)}`,
});
const response = (value) =>
  new Response("{}", {
    headers: {
      "X-Diagnostic-Id": value.trace,
      "X-Diagnostic-Ticket": value.ticket,
    },
  });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function sandbox(fn, initial = null) {
  const keys = ["window", "navigator", "location", "sessionStorage", "fetch"];
  const descriptors = Object.fromEntries(
    keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  const storage = new Map(
    initial ? [["mySpellingDiagnosticContext", JSON.stringify(initial)]] : [],
  );
  const requests = [];
  const bootstrap = deferred(),
    business = deferred();
  let firstBusiness = true;
  Object.defineProperties(globalThis, {
    window: { value: { addEventListener() {} }, configurable: true },
    navigator: {
      value: { doNotTrack: "0", globalPrivacyControl: false },
      configurable: true,
    },
    location: {
      value: {
        origin: "https://example.test",
        pathname: "/a/abcdefghijklmnopqrstuvwx",
      },
      configurable: true,
    },
    sessionStorage: {
      value: {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      },
      configurable: true,
    },
    fetch: {
      value: async (path, options) => {
        requests.push({ path, options });
        if (path === "/api/diagnostics/context") return bootstrap.promise;
        if (path === "/api/diagnostics/events")
          return new Response("{}", { status: 500 });
        if (firstBusiness) {
          firstBusiness = false;
          return business.promise;
        }
        return response(receipt(C));
      },
      configurable: true,
    },
  });
  try {
    const mod = await import(`../src/js/diagnostics.mjs?case=${sequence++}`);
    await fn({ mod, bootstrap, business, requests, storage });
  } finally {
    for (const key of keys) {
      if (descriptors[key])
        Object.defineProperty(globalThis, key, descriptors[key]);
      else delete globalThis[key];
    }
  }
}
for (const order of ["bootstrap-first", "business-first"])
  test(`first business receipt wins ${order} race and subsequent PIN/start/report share it`, async () => {
    await sandbox(async ({ mod, bootstrap, business, requests }) => {
      mod.installDiagnostics();
      const ready = mod.diagnosticsReady();
      const work = mod.diagnosticFetch(
        "/api/public/assignments/abcdefghijklmnopqrstuvwx",
      );
      if (order === "bootstrap-first") {
        bootstrap.resolve(Response.json(receipt(A)));
        await ready;
        assert.equal(mod.diagnosticId(), A);
        business.resolve(response(receipt(B)));
        await work;
      } else {
        business.resolve(response(receipt(B)));
        await work;
        bootstrap.resolve(Response.json(receipt(A)));
        await ready;
      }
      assert.equal(mod.diagnosticId(), B);
      mod.reportDiagnostic("js_error");
      assert.equal(
        requests.find((r) => r.path === "/api/diagnostics/events").options
          .headers["X-Diagnostic-Id"],
        B,
      );
      await mod.diagnosticFetch("/api/public/join/classroom123");
      assert.equal(
        new Headers(requests.at(-1).options.headers).get("X-Diagnostic-Id"),
        B,
      );
    });
  });
test("expired in-memory ticket is removed before request and replacement drives browser reports", async () => {
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  try {
    await sandbox(
      async ({ mod, business, requests, storage }) => {
        mod.installDiagnostics();
        assert.equal(mod.diagnosticId(), A);
        now += 86400001;
        const work = mod.diagnosticFetch(
          "/api/public/assignments/abcdefghijklmnopqrstuvwx/start",
        );
        assert.equal(
          new Headers(requests.at(-1).options.headers).has(
            "X-Diagnostic-Ticket",
          ),
          false,
        );
        assert.equal(storage.has("mySpellingDiagnosticContext"), false);
        business.resolve(response(receipt(C)));
        await work;
        assert.equal(mod.diagnosticId(), C);
        mod.reportDiagnostic("js_error");
        assert.equal(
          requests.find((r) => r.path === "/api/diagnostics/events").options
            .headers["X-Diagnostic-Id"],
          C,
        );
      },
      receipt(A, now + 1000),
    );
  } finally {
    Date.now = originalNow;
  }
});
test("server receipt replaces the ticket used by the request even when client clock says it is fresh", async () => {
  await sandbox(async ({ mod, business, requests }) => {
    mod.installDiagnostics();
    const work = mod.diagnosticFetch("/api/public/join/classroom123");
    business.resolve(response(receipt(C)));
    await work;
    assert.equal(mod.diagnosticId(), C);
    mod.reportDiagnostic("popup_blocked");
    assert.equal(requests.at(-1).options.headers["X-Diagnostic-Id"], C);
  }, receipt(A));
});
