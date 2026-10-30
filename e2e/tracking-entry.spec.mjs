import { test, expect } from "@playwright/test";
import { PLAN_LIMITS } from "../src/worker/domain.ts";
import { productMessages } from "../src/js/productLocale.mjs";

const child = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Alice",
  public_id: "abcdefghijklmnopqrstuvwx",
  archived: 0,
};
const assignmentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const publicId = "zyxwvutsrqponmlkjihgfedcb";
const events = (page, name) =>
  page.evaluate(
    (name) =>
      (window.dataLayer || [])
        .map((e) => Array.from(e))
        .filter((e) => e[0] === "event" && e[1] === name)
        .map((e) => e[2]),
    name,
  );

for (const locale of ["en", "es", "pt-BR", "fr", "id", "zh"]) {
  test(`${locale} result enters child-bound practice without assignment settings`, async ({
    page,
  }) => {
    const copy = productMessages(locale);
    const prefix = locale === "en" ? "" : `/${locale.toLowerCase()}`;
    await page.addInitScript(
      (locale) => localStorage.setItem("mySpellingGameManualLocale", locale),
      locale,
    );
    let posted;
    await page.route("**/api/me", (route) =>
      route.fulfill({
        json: {
          user: { id: "parent", name: "Parent" },
          plan: "parent",
          limits: PLAN_LIMITS.parent,
        },
      }),
    );
    await page.route("**/api/assignments", (route) => {
      if (route.request().method() === "POST") {
        posted = route.request().postDataJSON();
        return route.fulfill({ json: { id: assignmentId, publicId } });
      }
      return route.fulfill({
        json: {
          assignments: [],
          learners: [child],
          usage: { monthlyAttempts: 0, limits: PLAN_LIMITS.parent },
        },
      });
    });
    await page.route(`**/api/public/assignments/${publicId}*`, (route) =>
      route.fulfill({
        json: {
          title: "Alice practice",
          mode: "typing",
          status: "published",
          max_attempts: 10,
          learner: child,
          words: [{ id: "word-one", word: "apple", position: 0 }],
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      }),
    );
    await page.goto(`${prefix}/`);
    await page.locator("#custom-word-list").fill("apple\nbanana");
    await page
      .locator("#custom-example-sentences")
      .fill("An apple.\nA banana.");
    await page
      .locator('input[name="practice-mode"][value="typing"]')
      .check({ force: true });
    await page.locator("#start-practice-btn").click();
    await page.evaluate(() => {
      window.gameState.spellingWordsProcessed = 2;
      window.gameState.missedWordList = ["banana"];
      window.endGame();
    });
    await expect
      .poll(
        async () => (await events(page, "tracking_cta_viewed"))[0]?.signed_in,
      )
      .toBe(true);
    await expect(page.locator(".result-conversion small")).toContainText(
      copy.trackingExplanation,
    );
    await page
      .getByRole("button", { name: copy.trackNextPractice, exact: true })
      .click();
    await expect(page).toHaveURL(/tracking=1/);
    await expect(page.locator("#tracking-learner")).toHaveValue(child.id);
    await expect(page.locator("#tracking-name-field")).toBeHidden();
    await expect(page.locator("#tracking-words")).toHaveValue("apple\nbanana");
    await expect(page.locator("#assignment-deadline")).toHaveCount(0);
    await page.setViewportSize({ width: 360, height: 850 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const cta = page.getByRole("button", {
      name: copy.trackNextPractice,
      exact: true,
    });
    expect(await cta.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/tracking-${locale}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.reload();
    await expect(page.locator("#tracking-sentences")).toHaveValue(
      "An apple.\nA banana.",
    );
    await page
      .getByRole("button", { name: copy.trackNextPractice, exact: true })
      .click();
    await expect.poll(() => posted?.learnerIds).toEqual([child.id]);
    expect(posted).toMatchObject({
      words: "apple\nbanana",
      exampleSentences: "An apple.\nA banana.",
      mode: "typing",
      tracking: true,
      entryPoint: "practice_result",
    });
    await expect(page).toHaveURL(
      new RegExp(`/a/${publicId}\\?learner=${child.public_id}`),
    );
  });
}

test("new child is retained when assignment creation fails, and used free trial has an upgrade path", async ({
  page,
}) => {
  let creates = 0;
  let assignmentCalls = 0;
  let used = false;
  let roster = [];
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "free", name: "Free" },
        plan: "free",
        limits: PLAN_LIMITS.free,
      },
    }),
  );
  await page.route("**/api/assignments", (route) => {
    if (route.request().method() === "POST") {
      assignmentCalls++;
      return route.fulfill({ status: 500, json: { error: "internal_error" } });
    }
    return route.fulfill({
      json: {
        learners: roster,
        assignments: [],
        usage: { limits: PLAN_LIMITS.free, trackingTrialUsed: used },
      },
    });
  });
  await page.route("**/api/learners", (route) => {
    creates++;
    roster = [child];
    return route.fulfill({ json: child });
  });
  await page.goto("/workspace/assignments/new?lang=en&tracking=1");
  await page.locator("#tracking-name").fill("Alice");
  await page.locator("#tracking-words").fill("apple");
  await page
    .getByRole("button", { name: "Start tracked practice", exact: true })
    .click();
  await expect.poll(() => assignmentCalls).toBe(1);
  await expect(page.locator("#tracking-learner")).toHaveValue(child.id);
  await page.reload();
  await page
    .getByRole("button", { name: "Start tracked practice", exact: true })
    .click();
  await expect.poll(() => assignmentCalls).toBe(2);
  expect(creates).toBe(1);
  used = true;
  await page.reload();
  await expect(page.locator(".tracking-practice-card")).toContainText(
    productMessages("en").trackingTrialUsed,
  );
  await expect(
    page.getByRole("button", { name: "Upgrade to keep tracking" }),
  ).toBeVisible();
  await expect(page.locator("#tracking-words")).toHaveCount(0);
});

test("photo use event fires on accepted words, not just the file picker", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.Tesseract = {
      recognize: async () => ({ data: { text: "apple banana" } }),
    };
    sessionStorage.setItem(
      "mySpellingActivatedFeature",
      JSON.stringify({
        feature: "photo_import",
        userId: "paid",
        at: Date.now(),
      }),
    );
  });
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: { id: "paid" }, plan: "parent" } }),
  );
  await page.goto("/");
  await page.locator("#photo-import-input").setInputFiles({
    name: "words.png",
    mimeType: "image/png",
    buffer: Buffer.from("mock OCR image"),
  });
  await expect(page.locator("#photo-import-review-words")).toHaveValue(
    "apple\nbanana",
  );
  expect(await events(page, "premium_feature_used")).toEqual([]);
  await page.locator(".photo-import-review-actions button").first().click();
  expect(await events(page, "premium_feature_used")).toEqual([
    {
      feature: "photo_import",
      current_plan: "parent",
      word_count: 2,
      after_upgrade: true,
    },
  ]);
});

test("anonymous result survives login and paid activation returns to blocked tracking draft", async ({
  page,
}) => {
  let signedIn = false;
  let plan = "free";
  let callback;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: signedIn
        ? {
            user: { id: "buyer", name: "Buyer" },
            plan,
            limits: PLAN_LIMITS[plan],
          }
        : {},
    }),
  );
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { googleAuthConfigured: true } }),
  );
  await page.route("**/api/auth/sign-in/social", (route) => {
    callback = route.request().postDataJSON().callbackURL;
    signedIn = true;
    return route.fulfill({ json: { url: callback } });
  });
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      json: {
        assignments: [],
        learners: [child],
        usage: {
          limits: PLAN_LIMITS[plan],
          trackingTrialUsed: plan === "free",
        },
      },
    }),
  );
  await page.route("**/api/billing/checkout", (route) => {
    plan = "parent";
    return route.fulfill({
      json: { url: "/workspace?lang=en&checkout=success&plan=parent" },
    });
  });
  await page.goto("/");
  await page.locator("#custom-word-list").fill("elephant\ngiraffe");
  await page.evaluate(() => window.openTeacherAssignment("practice_result"));
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page.locator(".tracking-practice-card")).toContainText(
    productMessages("en").trackingTrialUsed,
  );
  expect(callback).toContain("tracking=1");
  await page
    .getByRole("button", { name: "Upgrade to keep tracking", exact: true })
    .click();
  await expect(page).toHaveURL(/tracking=1/);
  await expect(page.locator("#tracking-words")).toHaveValue(
    "elephant\ngiraffe",
  );
  await expect(page.locator("#tracking-learner")).toHaveValue(child.id);
});
