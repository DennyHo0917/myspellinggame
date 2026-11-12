import { test, expect } from "./fixtures.mjs";

async function mockAccount(page, account) {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: account ? 200 : 401,
      json: account || { error: "sign_in_required" },
    }),
  );
}

const freeAccount = {
  user: { id: "buyer", name: "Buyer" },
  plan: "free",
};

test("a prefilled plan checks out once from the pricing button and not on load", async ({
  page,
}) => {
  let calls = 0;
  let body;
  await mockAccount(page, freeAccount);
  await page.route("**/api/billing/checkout", (route) => {
    calls += 1;
    body = route.request().postDataJSON();
    return route.fulfill({
      status: calls === 1 ? 500 : 200,
      json:
        calls === 1
          ? { error: "billing_not_configured" }
          : { url: "/pricing?checkout=started" },
    });
  });
  await page.goto("/pricing?plan=parent&interval=month");
  await expect(page.locator('[data-plan-choice="parent"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-option="month"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("[data-checkout-cta]")).toBeEnabled();
  expect(calls).toBe(0);
  await page.locator('[data-plan-choice="parent"]').click();
  expect(calls).toBe(0);
  await page.locator("[data-checkout-cta]").click();
  await expect(page.locator(".checkout-retry-notice")).toBeVisible();
  await expect(page.locator('[data-plan-choice="parent"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(calls).toBe(1);
  expect(body).toEqual({ plan: "parent", interval: "month", locale: "en" });
  const names = await page.evaluate(() =>
    window.dataLayer
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === "event")
      .map((entry) => entry[1]),
  );
  expect(names).toEqual(
    expect.arrayContaining([
      "upgrade_viewed",
      "upgrade_clicked",
      "checkout_attempted",
      "checkout_failed",
    ]),
  );
  expect(names).not.toContain("checkout_started");
  await page.getByRole("button", { name: "Try checkout again" }).click();
  await expect(page).toHaveURL(/checkout=started/);
  expect(calls).toBe(2);
});

test("a plan without an interval stays on the monthly Chinese Teacher checkout", async ({
  page,
}) => {
  const bodies = [];
  await page.addInitScript(() =>
    localStorage.setItem("mySpellingGameManualLocale", "zh"),
  );
  await mockAccount(page, freeAccount);
  await page.route("**/api/billing/checkout", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { url: "/zh/pricing?checkout=started" } });
  });
  await page.goto("/zh/pricing?plan=teacher");
  await expect(page.locator('[data-plan-choice="teacher"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-option="month"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("[data-checkout-cta]").click();
  expect(bodies).toEqual([
    { plan: "teacher", interval: "month", locale: "zh" },
  ]);
});

test("a direct pricing visit can choose a plan before checkout", async ({
  page,
}) => {
  const bodies = [];
  await mockAccount(page, freeAccount);
  await page.route("**/api/billing/checkout", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { url: "/pricing?checkout=started" } });
  });
  await page.goto("/pricing");
  await expect(page.locator('[data-plan-option="month"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-choice="parent"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(bodies).toEqual([]);
  await page.locator('[data-plan-choice="teacher"]').click();
  expect(bodies).toEqual([]);
  await page.locator("[data-checkout-cta]").click();
  expect(bodies).toEqual([
    { plan: "teacher", interval: "month", locale: "en" },
  ]);
});

test("signed-out checkout returns to the same pricing selection before Stripe", async ({
  page,
}) => {
  let signedIn = false;
  let calls = 0;
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { googleAuthConfigured: true } }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: signedIn ? freeAccount : { error: "sign_in_required" },
    }),
  );
  await page.route("**/api/auth/sign-in/social", (route) => {
    signedIn = true;
    return route.fulfill({
      json: { url: route.request().postDataJSON().callbackURL },
    });
  });
  await page.route("**/api/billing/checkout", (route) => {
    calls += 1;
    expect(route.request().postDataJSON()).toEqual({
      plan: "parent",
      interval: "month",
      locale: "en",
    });
    return route.fulfill({ json: { url: "/pricing?checkout=started" } });
  });
  await page.goto("/pricing?plan=parent&interval=month");
  await page.locator("[data-checkout-cta]").click();
  await expect(page).toHaveURL(/\/workspace\?lang=en#teacher-sign-in$/);
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(/\/pricing\?plan=parent&interval=month$/);
  await expect(page.locator("[data-checkout-cta]")).toBeEnabled();
  expect(calls).toBe(0);
  await page.locator("[data-checkout-cta]").click();
  await expect(page).toHaveURL(/checkout=started/);
  expect(calls).toBe(1);
});

test("cancelled and stored checkout keep the plan selected without starting Stripe", async ({
  page,
}) => {
  let calls = 0;
  await mockAccount(page, freeAccount);
  await page.route("**/api/billing/checkout", () => {
    calls += 1;
  });
  await page.route("**/api/billing/checkout/cancel", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/pricing?checkout=cancelled&plan=teacher&interval=year");
  await expect(page.locator('[data-plan-choice="teacher"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-option="year"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("[data-checkout-cta]")).toBeEnabled();
  expect(calls).toBe(0);

  await page.addInitScript(() => {
    sessionStorage.setItem(
      "mySpellingPendingCheckout",
      JSON.stringify({
        plan: "parent",
        interval: "month",
        auto: true,
        at: Date.now(),
      }),
    );
    sessionStorage.setItem("pendingCheckoutPlan", "parent");
    sessionStorage.setItem("pendingCheckoutInterval", "month");
  });
  await page.goto("/pricing?checkout=cancelled");
  await expect(page.locator('[data-plan-choice="parent"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-option="month"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(calls).toBe(0);
});

test("a stored auto checkout on the pricing page does not open Stripe", async ({
  page,
}) => {
  let calls = 0;
  await mockAccount(page, freeAccount);
  await page.route("**/api/billing/checkout", () => {
    calls += 1;
  });
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "mySpellingPendingCheckout",
      JSON.stringify({
        plan: "teacher",
        interval: "year",
        auto: true,
        at: Date.now(),
      }),
    );
  });
  await page.goto("/pricing");
  await expect(page.locator('[data-plan-choice="teacher"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-option="year"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(calls).toBe(0);
});

test("the current paid plan cannot check out again until a different plan is chosen", async ({
  page,
}) => {
  let body;
  page.on("dialog", (dialog) => dialog.accept());
  await mockAccount(page, {
    user: { id: "buyer", name: "Buyer" },
    plan: "parent",
    billingInterval: "month",
  });
  await page.route("**/api/billing/change-plan", (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ json: { url: "/pricing?plan-change=1" } });
  });
  await page.goto("/pricing");
  await expect(page.locator("[data-checkout-cta]")).toBeDisabled();
  await page.locator('[data-plan-choice="teacher"]').click();
  await expect(page.locator("[data-checkout-cta]")).toBeEnabled();
  await page.locator("[data-checkout-cta]").click();
  await expect(page).toHaveURL(/plan-change=1/);
  expect(body).toEqual({ plan: "teacher", interval: "month", locale: "en" });
});

for (const [path, label] of [
  ["/pricing?plan=parent&interval=month", "Continue to secure checkout"],
  ["/zh/pricing?plan=parent&interval=month", "继续前往安全结账"],
  ["/fr/pricing?plan=parent&interval=month", "Continuer le paiement"],
]) {
  test(`${path} checkout button stays on one line`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const locale = path.startsWith("/zh/")
      ? "zh"
      : path.startsWith("/fr/")
        ? "fr"
        : "en";
    await page.addInitScript(
      (locale) => localStorage.setItem("mySpellingGameManualLocale", locale),
      locale,
    );
    await mockAccount(page, freeAccount);
    await page.goto(path);
    const cta = page.locator("[data-checkout-cta]");
    await expect(cta).toHaveText(label);
    await expect(cta).toBeEnabled();
    expect(
      await cta.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    expect(
      await cta.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getClientRects().length;
      }),
    ).toBe(1);
  });
}
