import { test, expect } from "@playwright/test";
import { PLAN_LIMITS } from "../src/worker/domain.ts";

async function mock(page, { signedIn = true, plan = "free" } = {}) {
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/me")
      return route.fulfill({
        status: signedIn ? 200 : 401,
        json: signedIn
          ? {
              user: { id: "buyer", name: "Buyer" },
              plan,
              limits: PLAN_LIMITS[plan],
            }
          : {},
      });
    if (path === "/api/config")
      return route.fulfill({ json: { googleAuthConfigured: true } });
    if (path === "/api/auth/sign-in/social") {
      signedIn = true;
      return route.fulfill({
        json: { url: route.request().postDataJSON().callbackURL },
      });
    }
    if (path === "/api/assignments")
      return route.fulfill({
        json: {
          assignments: [],
          learners: [],
          usage: {
            limits: PLAN_LIMITS[plan],
            monthlyAttempts: 1,
            trackingTrialUsed: true,
            lockedResultCount: 2,
          },
        },
      });
    return route.fulfill({ json: {} });
  });
}

test("pricing purchase resumes after login exactly once; failure requires retry and can be cancelled", async ({
  page,
}) => {
  await mock(page, { signedIn: false });
  let calls = 0;
  await page.route("**/api/billing/checkout", (route) => {
    calls++;
    expect(route.request().postDataJSON()).toMatchObject({
      plan: "parent",
      interval: "year",
    });
    return route.fulfill({
      status: calls === 1 ? 401 : 503,
      json: {
        error: calls === 1 ? "sign_in_required" : "billing_not_configured",
      },
    });
  });
  await page.goto("/pricing");
  await page.locator('[data-plan-choice="parent"]').click();
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page.locator(".checkout-retry-notice")).toBeVisible();
  expect(calls).toBe(2);
  await expect(page.locator(".pending-checkout-notice")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".checkout-retry-notice")).toBeVisible();
  expect(calls).toBe(2);
  await page
    .locator(".checkout-retry-notice")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingPendingCheckout"),
    ),
  ).toBeNull();
});

for (const scenario of ["expired", "selection-only", "paid"])
  test(`${scenario} intent never automatically opens checkout`, async ({
    page,
  }) => {
    await mock(page, { plan: scenario === "paid" ? "parent" : "free" });
    let calls = 0;
    await page.route("**/api/billing/checkout", (route) => {
      calls++;
      return route.fulfill({ status: 503, json: {} });
    });
    await page.goto("/");
    await page.evaluate(
      (s) =>
        sessionStorage.setItem(
          "mySpellingPendingCheckout",
          JSON.stringify({
            plan: "teacher",
            interval: "month",
            auto: s !== "selection-only",
            at: Date.now() - (s === "expired" ? 16 * 60 * 1000 : 0),
          }),
        ),
      scenario,
    );
    await page.goto("/workspace?lang=en");
    await expect(page.locator(".workspace-loading")).toHaveCount(0);
    expect(calls).toBe(0);
    if (scenario !== "selection-only")
      expect(
        await page.evaluate(() =>
          sessionStorage.getItem("mySpellingPendingCheckout"),
        ),
      ).toBeNull();
  });

test("tracking gate emits a lock event and uses a specific direct annual CTA", async ({
  page,
}) => {
  await mock(page);
  let request;
  await page.route("**/api/billing/checkout", (route) => {
    request = route.request().postDataJSON();
    return route.fulfill({
      status: 503,
      json: { error: "billing_not_configured" },
    });
  });
  await page.goto("/workspace/assignments/new?lang=en&tracking=1");
  await page
    .getByRole("button", { name: "Upgrade to keep tracking", exact: true })
    .click();
  await expect(page.locator(".checkout-retry-notice")).toBeVisible();
  expect(request).toMatchObject({ plan: "parent", interval: "year" });
  const events = await page.evaluate(() =>
    window.dataLayer.map((e) => Array.from(e)).filter((e) => e[0] === "event"),
  );
  expect(
    events.filter(
      (e) =>
        e[1] === "locked_feature_attempted" &&
        e[2].feature === "tracking_trial_used",
    ),
  ).toHaveLength(1);
  expect(events.find((e) => e[1] === "upgrade_cta_clicked")[2]).toMatchObject({
    plan: "parent",
    billing_interval: "year",
    transport_type: "beacon",
  });
});

test("fresh login intent opens the returned checkout URL without a confirmation card", async ({
  page,
}) => {
  await mock(page);
  let calls = 0;
  await page.route("**/api/billing/checkout", (route) => {
    calls++;
    return route.fulfill({ json: { url: "/pricing?checkout_test=1" } });
  });
  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem(
      "mySpellingPendingCheckout",
      JSON.stringify({
        plan: "parent",
        interval: "year",
        auto: true,
        at: Date.now(),
      }),
    ),
  );
  await page.goto("/workspace?lang=en");
  await expect(page).toHaveURL(/checkout_test=1/);
  expect(calls).toBe(1);
  await page.goto("/workspace?lang=en");
  await expect(page.locator(".workspace-loading")).toHaveCount(0);
  expect(calls).toBe(1);
});

for (const lang of ["en", "es", "pt-br", "fr", "id", "zh"])
  test(`${lang} tracking upgrade buttons fit mobile and open annual checkout`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mock(page);
    let request;
    await page.route("**/api/billing/checkout", (route) => {
      request = route.request().postDataJSON();
      return route.fulfill({
        status: 503,
        json: { error: "billing_not_configured" },
      });
    });
    await page.goto(`/workspace?lang=${lang}`);
    const button = page.locator(".free-tracking-card .paywall-primary");
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: `test-results/tracking-upgrade-${lang}.png`,
    });
    await button.click();
    await expect(page.locator(".checkout-retry-notice")).toBeVisible();
    expect(request).toMatchObject({ plan: "parent", interval: "year" });
  });
