import { test, expect } from "./fixtures.mjs";
import { productMessages } from "../src/js/productLocale.mjs";
import { PLAN_LIMITS } from "../src/worker/domain.ts";

const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const publicId = "abcdefghijklmnopqrstuvwx";
const me = {
  user: { id: "adult", name: "Adult" },
  plan: "free",
  limits: PLAN_LIMITS.free,
  photoImportTrialsUsed: 0,
};
const usage = {
  trackingTrialUsed: false,
  monthlyAttempts: 0,
  limits: PLAN_LIMITS.free,
};

for (const locale of ["en", "es", "pt-BR", "fr", "id", "zh"]) {
  test(`${locale} shared tracking creates a nickname link without binding a student`, async ({
    page,
  }) => {
    const copy = productMessages(locale);
    let body;
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) =>
            sessionStorage.setItem("copiedPractice", value),
        },
      });
    });
    await page.addInitScript(
      (locale) => localStorage.setItem("mySpellingGameManualLocale", locale),
      locale,
    );
    await page.route("**/api/me", (route) => route.fulfill({ json: me }));
    await page.route("**/api/assignments", (route) => {
      if (route.request().method() === "POST") {
        body = route.request().postDataJSON();
        return route.fulfill({ json: { id, publicId } });
      }
      return route.fulfill({ json: { assignments: [], learners: [], usage } });
    });
    await page.route(`**/api/assignments/${id}`, (route) =>
      route.fulfill({
        json: {
          id,
          public_id: publicId,
          title: copy.sharedTrackingTitle,
          mode: "dictation",
          status: "published",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          max_attempts: 10,
          words: [{ id: "word", word: "apple" }],
          assignedLearners: [],
          attempts: [],
          summary: { students: 0, attempts: 0, averageAccuracy: 0 },
          missedWordStats: null,
        },
      }),
    );
    await page.route(`**/api/assignments/${id}/share`, (route) =>
      route.fulfill({ json: { path: `/a/${publicId}` } }),
    );
    const prefix = locale === "en" ? "" : `/${locale.toLowerCase()}`;
    await page.goto(`${prefix}/`);
    await page.locator("#custom-word-list").fill("apple\nbanana");
    await page.locator("#copy-practice-link-btn").click();
    await page.locator(".practice-share-option-primary").click();
    await expect(page.locator("h1")).toContainText(copy.sharedTrackingTitle);
    await expect(page.locator("#tracking-learner")).toBeHidden();
    await expect(page.locator("#tracking-name")).toBeHidden();
    await expect(page.locator("#tracking-words")).toHaveValue("apple\nbanana");
    await page.reload();
    await expect(page.locator("h1")).toContainText(copy.sharedTrackingTitle);
    await page.setViewportSize({ width: 360, height: 850 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/share-tracking-${locale}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: copy.sharedTrackingCreate, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/workspace/assignments/${id}\\?`));
    expect(body).toMatchObject({
      learnerIds: [],
      tracking: true,
      trackingAudience: "shared",
      entryPoint: "copy_track",
      words: "apple\nbanana",
    });
    const link = page.locator(`a[href*="/a/${publicId}"]`).first();
    await expect(link).toBeVisible();
    expect(await link.getAttribute("href")).not.toContain("learner=");
    await page
      .getByRole("button", { name: copy.freeCopyLink, exact: true })
      .click();
    const copied = await page.evaluate(() =>
      sessionStorage.getItem("copiedPractice"),
    );
    expect(copied).toContain(`/a/${publicId}?`);
    expect(copied).not.toContain("learner=");
  });

  test(`${locale} local missed words preview Smart Review before sign-in`, async ({
    page,
  }) => {
    const copy = productMessages(locale);
    const keepCta = {
      en: "Sign in free",
      es: "Entrar gratis",
      "pt-BR": "Entrar grátis",
      fr: "Se connecter",
      id: "Masuk gratis",
      zh: "免费登录",
    }[locale];
    let signedIn = false;
    await page.addInitScript((locale) => {
      localStorage.setItem("mySpellingGameManualLocale", locale);
      localStorage.setItem("mySpellingLastMissedWords", '["banana"]');
    }, locale);
    await page.route("**/api/me", (route) =>
      route.fulfill(signedIn ? { json: me } : { status: 401, json: {} }),
    );
    await page.route("**/api/config", (route) =>
      route.fulfill({ json: { googleAuthConfigured: true } }),
    );
    await page.route("**/api/auth/sign-in/social", async (route) => {
      const body = route.request().postDataJSON();
      expect(body.callbackURL).not.toContain("review=1");
      signedIn = true;
      await route.fulfill({
        json: { url: `http://127.0.0.1:5173${body.callbackURL}` },
      });
    });
    await page.route("**/api/assignments", (route) =>
      route.fulfill({ json: { assignments: [], learners: [], usage } }),
    );
    const prefix = locale === "en" ? "" : `/${locale.toLowerCase()}`;
    await page.goto(`${prefix}/`);
    await expect(page.locator(".smart-review-preview")).toHaveCount(0);
    await page.locator(".last-missed-smart-btn").click();
    const preview = page.locator(".smart-review-preview");
    await expect(preview).toBeVisible();
    await expect(page).not.toHaveURL(/review=1/);
    await expect(page.locator("#custom-word-list")).toHaveValue(/because/);
    await expect(preview).not.toContainText("banana");
    await page.locator(".smart-review-answer").fill("nope");
    await page.locator(".smart-review-check").click();
    await expect(preview.locator(".smart-review-feedback")).toContainText(
      "banana",
    );
    const primary = preview.locator(".paywall-primary");
    await expect(primary).toHaveText(keepCta);
    await expect(primary).toHaveAttribute(
      "href",
      `/workspace?lang=${locale}#teacher-sign-in`,
    );
    await expect(
      preview.locator('a[href*="/pricing"]').first(),
    ).toHaveAttribute("href", `${prefix}/pricing?plan=parent&interval=month`);
    await page.setViewportSize({ width: 360, height: 850 });
    await primary.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/smart-review-preview-${locale}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await primary.click();
    await page.locator(".social-sign-in").first().click();
    await expect(preview).toBeVisible();
    await expect(page).not.toHaveURL(/smart_review=1/);
    await expect(preview.locator(".paywall-primary")).toHaveText(
      copy.unlockSmartReview,
    );
    await expect(preview.locator(".paywall-primary")).toHaveAttribute(
      "href",
      `${prefix}/pricing?plan=parent&interval=month`,
    );
    await expect(page.locator("#custom-word-list")).toHaveValue(/because/);
    expect(
      await page.evaluate(() => sessionStorage.getItem("pendingSmartReview")),
    ).toContain("banana");
  });
}

test("empty photo previews do not use a trial and accepted previews use server counts", async ({
  page,
}) => {
  let accepts = 0;
  await page.addInitScript(() => {
    window.Tesseract = {
      recognize: async () => ({ data: { text: "apple banana" } }),
    };
  });
  await page.route("**/api/me", (route) => route.fulfill({ json: me }));
  await page.route("**/api/photo-import/accept", (route) => {
    accepts++;
    return route.fulfill({ json: { used: 3, limit: 3 } });
  });
  await page.goto("/");
  await page.locator("#photo-import-input").setInputFiles({
    name: "words.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  const input = page.locator("#photo-import-review-words");
  await input.fill("");
  await page.locator(".photo-import-review-actions button").first().click();
  expect(accepts).toBe(0);
  await expect(input).toBeVisible();
  await input.fill("apple\nbanana");
  await page.locator(".photo-import-review-actions button").first().click();
  await expect(page.locator("#custom-word-list")).toHaveValue("apple\nbanana");
  expect(accepts).toBe(1);
  await page.locator("#photo-import-input").setInputFiles({
    name: "words.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await expect(
    page.locator(".photo-import-notice .paywall-primary"),
  ).toBeVisible();
  await expect(page.locator("#custom-word-list")).toHaveValue("apple\nbanana");
  expect(accepts).toBe(1);
});

test("pricing choices wait for their click handlers before becoming usable", async ({
  page,
}) => {
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/src/js/pricingApp.mjs", async (route) => {
    await ready;
    await route.continue();
  });
  await page.route("**/api/me", (route) => route.fulfill({ json: me }));
  await page.goto("/pricing", { waitUntil: "commit" });
  const choice = page.locator('[data-plan-choice="parent"]');
  await expect(choice).toBeDisabled();
  release();
  await expect(choice).toBeEnabled();
});
