import { test, expect } from "@playwright/test";
import { PLAN_LIMITS } from "../src/worker/domain.ts";
import { productMessages } from "../src/js/productLocale.mjs";

for (const locale of ["en", "es", "pt-br", "fr", "id", "zh"]) {
  test(`${locale} photo checkout restores original words and feature`, async ({
    page,
  }) => {
    await page.addInitScript(
      (locale) => localStorage.setItem("mySpellingGameManualLocale", locale),
      locale,
    );
    let plan = "free";
    const prefix = locale === "en" ? "" : `/${locale}`;
    await page.route("**/api/me", (route) =>
      route.fulfill({
        json: {
          user: { id: "buyer", name: "Buyer" },
          plan,
          limits: PLAN_LIMITS[plan],
        },
      }),
    );
    await page.route("**/api/billing/checkout", (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        plan: "parent",
        interval: "year",
      });
      plan = "parent";
      return route.fulfill({
        json: { url: `/workspace?lang=${locale}&checkout=success&plan=parent` },
      });
    });
    await page.goto(`${prefix}/`);
    await page.locator("#custom-word-list").fill("elephant\ngiraffe");
    await page
      .locator("#custom-example-sentences")
      .fill("An elephant walks.\nA giraffe eats.");
    await page
      .locator('input[name="practice-mode"][value="typing"]')
      .check({ force: true });
    await page.locator("#photo-import-btn").click();
    await page.locator(".photo-import-notice .paywall-primary").click();
    await page.locator('[data-plan-choice="parent"]').click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/$`));
    await expect(page.locator(".upgrade-return-notice")).toBeVisible();
    await expect(page.locator("#custom-word-list")).toHaveValue(
      "elephant\ngiraffe",
    );
    await expect(page.locator("#custom-example-sentences")).toHaveValue(
      "An elephant walks.\nA giraffe eats.",
    );
    await expect(
      page.locator('input[name="practice-mode"][value="typing"]'),
    ).toBeChecked();
    const chooser = page.waitForEvent("filechooser");
    await page.locator("#photo-import-btn").click();
    await chooser;
  });
}

test("free workspace is a single trial with a linked child and a free practice exit", async ({
  page,
}) => {
  const learnerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  let used = false;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "free", name: "Free" },
        plan: "free",
        limits: PLAN_LIMITS.free,
      },
    }),
  );
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      json: {
        assignments: [],
        savedLists: [],
        learners: [{ id: learnerId, name: "Alice", archived: 0 }],
        usage: {
          limits: PLAN_LIMITS.free,
          trackingTrialUsed: used,
          monthlyAttempts: used ? 1 : 0,
        },
      },
    }),
  );
  await page.goto("/workspace?lang=en");
  await expect(
    page.getByRole("heading", { name: "Free tracking trial" }),
  ).toBeVisible();
  await expect(
    page.locator('.workspace-sidebar-link[data-section="progress"]'),
  ).toHaveCount(0);
  await page
    .locator(".free-tracking-card")
    .getByRole("button", { name: "Start tracked practice" })
    .click();
  await expect(page.locator("#tracking-learner")).toHaveValue(learnerId);
  // A used trial has an upgrade action while ordinary practice remains accessible.
  used = true;
  await page
    .locator('.workspace-sidebar-link[data-section="overview"]')
    .click();
  await expect(page.locator(".free-tracking-card")).toBeVisible();
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/workspace?lang=en");
  await expect(page.locator(".free-tracking-card")).toContainText(
    productMessages("en").submissionLimitReached,
  );
  await expect(
    page
      .locator(".free-tracking-card")
      .getByRole("link", { name: "Practice", exact: true }),
  ).toHaveAttribute("href", "/");
  await expect(
    page
      .locator(".free-tracking-card")
      .getByRole("button", { name: "Upgrade to keep tracking", exact: true }),
  ).toBeVisible();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/free-tracking-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});

for (const archived of [false, true]) {
  test(`smart review preserves child identity, archived=${archived}`, async ({
    page,
  }) => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const json = (route, body) => route.fulfill({ json: body });
    await page.route("**/api/me", (route) =>
      json(route, {
        user: { id: "parent", name: "Parent" },
        plan: "parent",
        limits: PLAN_LIMITS.parent,
      }),
    );
    await page.route("**/api/assignments", (route) =>
      json(route, {
        assignments: [],
        learners: [{ id, name: "Alice", archived: Number(archived) }],
      }),
    );
    await page.route(`**/api/learners/${id}`, (route) =>
      json(route, {
        learner: { id, name: "Alice", archived: false },
        smartReview: true,
        historyDays: 365,
        summary: {
          completedAttempts: 1,
          accuracy: 0,
          mastered: 0,
          learning: 0,
          needsReview: 1,
        },
        words: [],
      }),
    );
    await page.route(`**/api/learners/${id}/review`, (route) =>
      json(route, { words: ["elephant"] }),
    );
    await page.goto(`/workspace/learners/${id}?lang=en`);
    await page
      .getByRole("button", { name: "Create review assignment", exact: true })
      .click();
    await expect(page.locator("#assignment-words")).toHaveValue("elephant");
    await expect(
      page.locator('input[name="learnerTarget"][value="selected"]'),
    ).toBeChecked();
    if (archived) {
      await expect(page.getByRole("alert")).toContainText(
        "no longer available",
      );
      await expect(
        page.getByRole("button", { name: "Create and publish", exact: true }),
      ).toBeDisabled();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Create and publish", exact: true }),
      ).toBeDisabled();
    } else {
      await expect(
        page.locator(`input[name="learnerId"][value="${id}"]`),
      ).toBeChecked();
    }
  });
}

test("cancelled photo checkout restores draft without claiming paid access", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "buyer", name: "Buyer" },
        plan: "free",
        limits: PLAN_LIMITS.free,
      },
    }),
  );
  await page.route("**/api/billing/checkout", (route) =>
    route.fulfill({ json: { url: "/pricing?checkout=cancelled" } }),
  );
  await page.route("**/api/billing/checkout/cancel", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.goto("/");
  await page.locator("#custom-word-list").fill("elephant");
  await page.locator("#photo-import-btn").click();
  await page.locator(".photo-import-notice .paywall-primary").click();
  await page.locator('[data-plan-choice="parent"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#custom-word-list")).toHaveValue("elephant");
  await expect(page.locator(".upgrade-return-notice")).toHaveCount(0);
  await page.locator("#photo-import-btn").click();
  await expect(
    page.locator(".photo-import-notice .paywall-primary"),
  ).toBeVisible();
});
