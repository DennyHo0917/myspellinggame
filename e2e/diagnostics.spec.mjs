import { expect, test } from "./fixtures.mjs";
const id = "12345678-1234-4234-8234-123456789012";
const pub = "abcdefghijklmnopqrstuvwx";
const learner = "zyxwvutsrqponmlkjihgfedc";
const trace = "a".repeat(24);
const words = [{ id, word: "apple", position: 0 }];
const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
async function diagnostics(page, { fail = false } = {}) {
  const reports = [];
  await page.route("**/api/diagnostics/context", (r) =>
    json(r, {
      trace,
      ticket: `${trace}.${Date.now() + 3600000}.${"b".repeat(64)}`,
    }),
  );
  await page.route("**/api/diagnostics/events", (r) => {
    reports.push({
      body: r.request().postDataJSON(),
      headers: r.request().headers(),
    });
    return fail ? r.abort() : json(r, { ok: true });
  });
  return reports;
}
async function workspace(page) {
  await page.route("**/api/me", (r) =>
    json(r, {
      user: { id: "adult", name: "Test adult" },
      plan: "teacher",
      classPublicId: "classroom123",
    }),
  );
  await page.route("**/api/lifecycle/**", (r) => json(r, { ok: true }));
  await page.route("**/api/assignments", (r) =>
    json(r, { assignments: [], learners: [] }),
  );
  await page.route(`**/api/assignments/${id}`, (r) =>
    json(r, {
      id,
      public_id: pub,
      title: "Test share",
      mode: "typing",
      status: "published",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      words,
      attempts: [],
      assignedLearners: [],
      summary: { students: 0, attempts: 0, averageAccuracy: 0 },
      sharePath: `/a/${pub}`,
    }),
  );
}
async function player(page, { failSubmit = false } = {}) {
  const requests = [];
  let failures = 0;
  await page.route("**/api/public/assignments/**", (r) => {
    const path = new URL(r.request().url()).pathname;
    requests.push({ path, headers: r.request().headers() });
    if (path.endsWith("/entry")) return json(r, { ok: true });
    if (path.endsWith("/start")) return json(r, { ok: true });
    if (path.endsWith("/attempts")) {
      if (failSubmit && failures++ === 0)
        return json(r, { error: "internal_error" }, 500);
      return json(
        r,
        {
          accuracy: 100,
          correct_count: 1,
          incorrect_count: 0,
          missedWords: [],
        },
        201,
      );
    }
    return json(r, {
      title: "Test practice",
      mode: "typing",
      words,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      learner: { name: "Fictional student" },
    });
  });
  return requests;
}
test("popup blocker and share API failure are distinct; diagnostic failure never blocks UI", async ({
  page,
}) => {
  const reports = await diagnostics(page, { fail: true });
  await workspace(page);
  let shareHeaders;
  await page.route(`**/api/assignments/${id}/share`, (r) => {
    shareHeaders = r.request().headers();
    return json(r, { error: "assignment_closed" }, 410);
  });
  await page.addInitScript(() => (window.open = () => null));
  await page.goto(`/workspace/assignments/${id}?lang=en`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            sessionStorage.getItem("mySpellingDiagnosticContext") || "null",
          )?.trace,
      ),
    )
    .toBe(trace);
  await page.getByRole("button", { name: "Share to Google Classroom" }).click();
  await expect(
    page.getByText("This assignment is closed.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Share to Google Classroom" }),
  ).toBeEnabled();
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0].body).toMatchObject({
    event: "popup_blocked",
    route: "/workspace/assignments/:id",
  });
  expect(shareHeaders["x-diagnostic-id"]).toBe(trace);
  expect(JSON.stringify(reports)).not.toContain("Fictional");
});
test("PIN -> entry -> start -> failed submit -> retry retains safe diagnostic correlation", async ({
  page,
}) => {
  const reports = await diagnostics(page);
  const requests = await player(page, { failSubmit: true });
  let pinHeaders;
  await page.route("**/api/public/join/classroom123", (r) => {
    pinHeaders = r.request().headers();
    return json(r, { learnerPublicId: learner, assignmentPublicId: pub });
  });
  await page.goto(
    `/join/classroom123?assignment=${pub}&lang=en&channel=google_classroom`,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            sessionStorage.getItem("mySpellingDiagnosticContext") || "null",
          )?.trace,
      ),
    )
    .toBe(trace);
  await page.locator("#pin").fill("1842");
  await page.getByRole("button", { name: "Start assignment" }).click();
  await page.waitForURL(`**/a/${pub}?**`);
  await page.getByRole("button", { name: "Start assignment" }).click();
  await page.locator(".answer-form input").fill("apple");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(
    page.getByRole("heading", { name: "Your result" }),
  ).toBeVisible();
  expect(pinHeaders["x-diagnostic-id"]).toBe(trace);
  for (const r of requests) expect(r.headers["x-diagnostic-id"]).toBe(trace);
  expect(JSON.stringify(reports)).not.toMatch(/1842|Fictional|zyxw/);
});
test("request timeout recovers PIN button and reports only controlled event", async ({
  page,
}) => {
  const reports = await diagnostics(page);
  await page.addInitScript(() => {
    const original = window.setTimeout;
    window.setTimeout = (fn, delay, ...args) =>
      original(fn, delay === 20000 ? 30 : delay, ...args);
  });
  await page.route(
    "**/api/public/join/classroom123",
    () => new Promise(() => {}),
  );
  await page.goto(`/join/classroom123?assignment=${pub}&lang=en`);
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("mySpellingDiagnosticContext"),
      ),
    )
    .not.toBeNull();
  await page.locator("#pin").fill("1842");
  await page.getByRole("button", { name: "Start assignment" }).click();
  await expect(
    page.getByRole("button", { name: "Start assignment" }),
  ).toBeEnabled();
  await expect
    .poll(() => reports.some((r) => r.body.event === "request_timeout"))
    .toBe(true);
  expect(JSON.stringify(reports)).not.toMatch(/1842|assignment=|learner=/);
});
test("JS exception/rejection strips all original text and deduplicates the page error", async ({
  page,
}) => {
  const reports = await diagnostics(page);
  await player(page);
  await page.goto(`/a/${pub}?learner=${learner}&lang=en`);
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("mySpellingDiagnosticContext"),
      ),
    )
    .not.toBeNull();
  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "Alice email@example.test PIN 1842",
        error: new Error("learner=secret"),
      }),
    );
    window.dispatchEvent(new Event("unhandledrejection"));
  });
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0].body).toMatchObject({ event: "js_error", route: "/a/:id" });
  expect(Object.keys(reports[0].body).sort()).toEqual([
    "event",
    "eventId",
    "route",
    "version",
  ]);
  expect(JSON.stringify(reports)).not.toMatch(/Alice|email@|1842|secret|zyxw/);
  await expect(
    page.getByRole("button", { name: "Start assignment" }),
  ).toBeEnabled();
});
test("DNT opt-out suppresses bootstrap/client reports and marks workflow opt-out", async ({
  page,
}) => {
  const reports = await diagnostics(page);
  const requests = await player(page);
  let bootstraps = 0;
  await page.route("**/api/diagnostics/context", (r) => {
    bootstraps++;
    return json(r, {});
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "doNotTrack", {
      value: "1",
      configurable: true,
    }),
  );
  await page.goto(`/a/${pub}?learner=${learner}&lang=en`);
  await page.getByRole("button", { name: "Start assignment" }).click();
  await expect(page.locator(".answer-form input")).toBeVisible();
  expect(bootstraps).toBe(0);
  expect(reports).toHaveLength(0);
  for (const r of requests)
    expect(r.headers["x-diagnostic-disabled"]).toBe("1");
});
test("hung diagnostic bootstrap never delays PIN or practice", async ({
  page,
}) => {
  await page.route("**/api/diagnostics/context", () => new Promise(() => {}));
  await page.route("**/api/diagnostics/events", () => new Promise(() => {}));
  await player(page);
  await page.route("**/api/public/join/classroom123", (r) =>
    json(r, { learnerPublicId: learner, assignmentPublicId: pub }),
  );
  await page.goto(`/join/classroom123?assignment=${pub}&lang=en`);
  await page.locator("#pin").fill("1842");
  await page.getByRole("button", { name: "Start assignment" }).click();
  await page.waitForURL(`**/a/${pub}?**`);
  await page.getByRole("button", { name: "Start assignment" }).click();
  await expect(page.locator(".answer-form input")).toBeVisible();
});

test("Admin diagnostic summary and trace lookup remain read-only", async ({
  page,
}) => {
  await page.route("**/api/admin/stats", (r) =>
    json(r, {
      totalUsers: 1,
      proUsers: 1,
      todayUsers: 1,
      last7DaysUsers: 1,
      googleUsers: 1,
      microsoftUsers: 0,
      monthlyUsers: 1,
      yearlyUsers: 0,
    }),
  );
  await page.route("**/api/admin/users?**", (r) =>
    json(r, { users: [], total: 0, page: 1, pageSize: 20 }),
  );
  const lookups = [];
  await page.route("**/api/admin/diagnostics**", (r) => {
    lookups.push({ method: r.request().method(), url: r.request().url() });
    return json(r, {
      retentionDays: 7,
      summary: [
        {
          source: "server",
          event_name: "pin",
          error_code: "invalid_join",
          http_status: 401,
          release_version: "test-version",
          count: 1,
          last_seen: "2026-10-02T00:00:00Z",
        },
      ],
      recent: [
        {
          occurred_at: "2026-10-02T00:00:00Z",
          trace_id: trace,
          source: "server",
          event_name: "pin",
          route_template: "/join/:id",
          error_code: "invalid_join",
          http_status: 401,
          release_version: "test-version",
        },
      ],
    });
  });
  await page.goto("/admin");
  await expect(page.locator("#admin-diagnostics")).toBeVisible();
  await page.locator("#admin-diagnostic-search button").click();
  await expect(page.locator("#admin-diagnostic-summary")).toContainText(
    "invalid_join",
  );
  await page.locator("#admin-diagnostic-trace").fill(trace);
  await page.locator("#admin-diagnostic-search button").click();
  await expect.poll(() => lookups.length).toBe(2);
  expect(lookups.every((r) => r.method === "GET")).toBe(true);
  expect(lookups[1].url).toContain(`trace=${trace}`);
  await page.screenshot({
    path: "C:/Users/Denny/Documents/Codex/2026-10-02/task-2/diagnostics-admin.png",
    fullPage: true,
  });
});
