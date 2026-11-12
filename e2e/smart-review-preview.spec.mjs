import { test, expect } from "./fixtures.mjs";
import { PLAN_LIMITS } from "../src/worker/domain.ts";
import { productMessages } from "../src/js/productLocale.mjs";

const events = (page, name) =>
  page.evaluate(
    (name) =>
      (window.dataLayer || [])
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event" && entry[1] === name)
        .map((entry) => entry[2]),
    name,
  );

test("paid Smart Review still opens the saved review flow", async ({
  page,
}) => {
  const copy = productMessages("en");
  await page.addInitScript(() => {
    localStorage.setItem("mySpellingLastMissedWords", '["banana"]');
  });
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "parent", name: "Parent" },
        plan: "parent",
        limits: PLAN_LIMITS.parent,
      },
    }),
  );
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      json: {
        assignments: [],
        learners: [],
        usage: { trackingTrialUsed: false, monthlyAttempts: 0 },
      },
    }),
  );
  await page.goto("/");
  await page.locator(".last-missed-smart-btn").click();
  await expect(page).toHaveURL(/review=1/);
  await expect(page.locator(".smart-review-preview")).toHaveCount(0);
  await expect(page.locator(".review-entry-card h1")).toHaveText(
    copy.reviewEntryTitle,
  );
  await page
    .getByRole("button", { name: copy.trackNextPractice, exact: true })
    .click();
  await expect(page.locator("#tracking-words")).toHaveValue("banana");
});

test("signed-in free users preview one review card before pricing", async ({
  page,
}) => {
  let reviews = 0;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "free-user", name: "Free" },
        plan: "free",
        workspaceType: "family",
        limits: PLAN_LIMITS.free,
      },
    }),
  );
  await page.route("**/api/learners/*/review", (route) => {
    reviews += 1;
    return route.fulfill({
      status: 403,
      json: { error: "smart_review_required" },
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem("mySpellingLastMissedWords", '["banana","apple"]');
  });
  await page.goto("/");
  await page.locator("#custom-word-list").fill("elephant");
  await page.locator(".last-missed-smart-btn").click();
  const preview = page.locator(".smart-review-preview");
  await expect(preview).toBeVisible();
  await expect(preview).not.toContainText("banana");
  await expect(preview.locator(".word-chip")).toHaveText("apple");
  await expect(preview.locator(".paywall-primary")).toHaveAttribute(
    "href",
    "/pricing?plan=parent&interval=month",
  );
  await expect(preview.locator(".paywall-primary")).toHaveText(
    "Unlock Smart Review",
  );
  await expect(preview.getByRole("link", { name: "Sign in free" })).toHaveCount(
    0,
  );
  await page.locator(".smart-review-answer").fill("banana");
  await page.locator(".smart-review-check").click();
  await expect(preview.locator(".smart-review-reveal")).toHaveText("banana");
  await expect(page.locator("#custom-word-list")).toHaveValue("elephant");
  expect(reviews).toBe(0);
  expect(await events(page, "smart_review_previewed")).toEqual([
    { locale: "en", current_plan: "free", outcome: "paywall" },
  ]);
  const locked = await events(page, "locked_feature_attempted");
  expect(JSON.stringify(locked)).not.toContain("banana");
  await preview.locator(".paywall-primary").click();
  await expect(page).toHaveURL(/\/pricing\?plan=parent&interval=month/);
  await expect(page.locator('[data-plan-option="month"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-choice="parent"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(reviews).toBe(0);
});

test("cancelled Smart Review checkout restores the preview and wall", async ({
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
  await page.addInitScript(() => {
    localStorage.setItem("mySpellingLastMissedWords", '["banana"]');
  });
  await page.goto("/");
  await page.locator("#custom-word-list").fill("elephant");
  await page.locator(".last-missed-smart-btn").click();
  await expect(page.locator(".smart-review-preview")).toBeVisible();
  await page.locator(".smart-review-preview .paywall-primary").click();
  await page.locator("[data-checkout-cta]").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#custom-word-list")).toHaveValue("elephant");
  await expect(page.locator(".upgrade-return-notice")).toHaveCount(0);
  await expect(page.locator(".smart-review-preview")).toBeVisible();
  await expect(
    page.locator(".smart-review-preview .paywall-primary"),
  ).toHaveAttribute("href", "/pricing?plan=parent&interval=month");
  await page.locator(".smart-review-answer").fill("nope");
  await page.locator(".smart-review-check").click();
  await expect(page.locator(".smart-review-feedback")).toContainText("banana");
});

test("workspace Smart Review previews due words before an assignment is created", async ({
  page,
}) => {
  const learnerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  let reviews = 0;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "free-user", name: "Free" },
        plan: "free",
        limits: PLAN_LIMITS.free,
      },
    }),
  );
  await page.route(`**/api/learners/${learnerId}/review`, (route) => {
    reviews += 1;
    return route.fulfill({
      status: 403,
      json: { error: "smart_review_required" },
    });
  });
  await page.route(`**/api/learners/${learnerId}`, (route) =>
    route.fulfill({
      json: {
        learner: { id: learnerId, name: "Mina", archived: false },
        historyDays: 14,
        smartReview: false,
        summary: {
          completedAttempts: 2,
          accuracy: 50,
          mastered: 1,
          learning: 0,
          needsReview: 1,
        },
        words: [
          {
            word: "apple",
            status: "mastered",
            incorrectCount: 1,
            correctCount: 4,
            lastIncorrectAt: "2026-10-01T00:00:00.000Z",
            lastResult: "correct",
            lastPracticedAt: "2026-11-02T00:00:00.000Z",
          },
          {
            word: "banana",
            status: "needs_review",
            incorrectCount: 2,
            correctCount: 0,
            lastIncorrectAt: "2026-11-01T00:00:00.000Z",
            lastResult: "incorrect",
            lastPracticedAt: "2026-11-01T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.route("**/api/billing/checkout", (route) =>
    route.fulfill({ json: { url: "/pricing?checkout=cancelled" } }),
  );
  await page.route("**/api/billing/checkout/cancel", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.goto(`/workspace/learners/${learnerId}?lang=en`);
  const review = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Smart missed-word review" }),
  });
  await expect(review.locator(".smart-review-preview")).toHaveCount(0);
  await review
    .getByRole("button", { name: "Create review assignment", exact: true })
    .click();
  const preview = review.locator(".smart-review-preview");
  await expect(preview).toBeVisible();
  await expect(page).not.toHaveURL(/assignments\/new/);
  await expect(preview.locator(".word-chip")).toHaveCount(0);
  await page.locator(".smart-review-answer").fill("nope");
  await page.locator(".smart-review-check").click();
  await expect(preview.locator(".smart-review-reveal")).toHaveText("banana");
  await expect(preview).not.toContainText("apple");
  await expect(preview.locator(".paywall-primary")).toHaveText(
    "Unlock Smart Review",
  );
  await expect(preview.locator(".paywall-primary")).toHaveAttribute(
    "href",
    "/pricing?plan=parent&interval=month",
  );
  expect(reviews).toBe(0);
  expect(
    JSON.stringify(await events(page, "smart_review_previewed")),
  ).not.toContain("banana");
  await preview.locator(".paywall-primary").click();
  await page.locator("[data-checkout-cta]").click();
  await expect(page).toHaveURL(new RegExp(`/workspace/learners/${learnerId}`));
  await expect(page.locator(".smart-review-preview")).toBeVisible();
  await expect(
    page.locator(".smart-review-preview .paywall-primary"),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/assignments\/new/);
  expect(reviews).toBe(0);
});
