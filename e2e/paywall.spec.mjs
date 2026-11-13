import { test, expect } from "@playwright/test";

const photoFile = {
  name: "words.png",
  mimeType: "image/png",
  buffer: Buffer.from("preview"),
};
const events = (page, name) =>
  page.evaluate(
    (name) =>
      (window.dataLayer || [])
        .map((e) => Array.from(e))
        .filter((e) => e[0] === "event" && e[1] === name)
        .map((e) => e[2]),
    name,
  );
async function mockAccount(page, account = null) {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: account ? 200 : 401,
      json: account || { error: "sign_in_required" },
    }),
  );
}
async function installPhotoOcr(page, text = "apple banana") {
  await page.addInitScript((extracted) => {
    window.Tesseract = {
      recognize: async () => ({ data: { text: extracted } }),
    };
  }, text);
}
async function previewPhoto(page) {
  const chooser = page.waitForEvent("filechooser");
  await page.locator("#photo-import-btn").click();
  await (await chooser).setFiles(photoFile);
  await expect(page.locator("#photo-import-review-words")).toBeVisible();
}
for (const locale of ["en", "es", "pt-br", "fr", "id", "zh"]) {
  test(`${locale} mobile photo preview paywall keeps pricing secondary`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mockAccount(page);
    await installPhotoOcr(page);
    await page.addInitScript(
      (locale) => localStorage.setItem("mySpellingGameManualLocale", locale),
      locale,
    );
    const prefix = locale === "en" ? "" : `/${locale}`;
    const lang = locale === "pt-br" ? "pt-BR" : locale;
    await page.goto(`${prefix}/`);
    const chooser = page.waitForEvent("filechooser");
    await page.locator("#photo-import-btn").click();
    await expect(page.locator(".photo-import-notice")).toHaveCount(0);
    expect(await events(page, "photo_import_blocked")).toHaveLength(0);
    await (await chooser).setFiles(photoFile);
    await expect(page.locator("#photo-import-review-words")).toBeVisible();
    await page.locator(".photo-import-modal-close").click();
    await previewPhoto(page);
    const primary = page.locator(".photo-import-notice .paywall-primary");
    const unlock = page
      .locator('.photo-import-notice a[href*="/pricing"]')
      .first();
    await expect(page.locator("#photo-import-review-words")).toHaveValue(
      "apple\nbanana",
    );
    await expect(page.locator("#custom-word-list")).toHaveValue(
      "because\nfriend\nbeautiful\nanswer\nenough\nfavorite\nlibrary\nthrough",
    );
    await expect(primary).toBeVisible();
    await expect(primary).toContainText("7");
    await expect(primary).toHaveAttribute(
      "href",
      `/workspace?lang=${lang}#teacher-sign-in`,
    );
    expect(await events(page, "photo_import_clicked")).toHaveLength(2);
    await expect
      .poll(() => events(page, "photo_import_previewed"))
      .toEqual([
        { locale: lang, current_plan: "anonymous", outcome: "paywall" },
        { locale: lang, current_plan: "anonymous", outcome: "paywall" },
      ]);
    await expect
      .poll(() => events(page, "photo_import_blocked"))
      .toHaveLength(2);
    expect(await events(page, "locked_feature_attempted")).toEqual([
      {
        feature: "photo_import",
        current_plan: "anonymous",
        practice_source: "builder",
      },
    ]);
    const bounds = await primary.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
    await primary.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/paywall-${locale}.png` });
    // Inspect the event before navigation clears the page's analytics queue.
    await unlock.evaluate((el) =>
      el.addEventListener("click", (e) => e.preventDefault()),
    );
    await unlock.click();
    expect(await events(page, "upgrade_cta_clicked")).toEqual([
      {
        cta_location: "photo_import",
        transport_type: "beacon",
        plan: "parent",
        billing_interval: "month",
        practice_source: "builder",
      },
    ]);
    expect(await unlock.getAttribute("href")).toBe(
      `${prefix}/pricing?plan=parent&interval=month`,
    );
    await page.goto(await unlock.getAttribute("href"));
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale === "pt-br" ? "pt-BR" : locale === "zh" ? "zh-CN" : locale,
    );
    await expect(
      page.locator('[data-plan-card="parent"] [data-plan-option="month"]'),
    ).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('[data-plan-choice="parent"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.locator('[data-plan-card="parent"] [data-plan-price]'),
    ).toContainText(/7[.,]99/);
    const cta = page.locator('[data-plan-choice="parent"]');
    expect(await cta.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    expect(
      await cta.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getClientRects().length;
      }),
    ).toBe(1);
    await page.screenshot({
      path: `test-results/pricing-${locale}.png`,
      fullPage: true,
    });
  });
}

test("paid Photo Import opens the file picker without a blocked event", async ({
  page,
}) => {
  await installPhotoOcr(page);
  await mockAccount(page, { plan: "parent", billingInterval: "month" });
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.locator("#photo-import-btn").click();
  await (await chooser).setFiles(photoFile);
  await expect(page.locator("#photo-import-review-words")).toHaveValue(
    "apple\nbanana",
  );
  await expect(page.locator(".photo-import-notice")).toHaveCount(0);
  await expect(
    page.locator(".photo-import-review-actions button").first(),
  ).toHaveText("Use these words");
  expect(await events(page, "photo_import_clicked")).toHaveLength(1);
  expect(await events(page, "photo_import_previewed")).toEqual([
    { locale: "en", current_plan: "parent", outcome: "review" },
  ]);
  expect(await events(page, "photo_import_blocked")).toHaveLength(0);
});

test("saved Teacher monthly selection survives the photo paywall", async ({
  page,
}) => {
  await mockAccount(page);
  await installPhotoOcr(page);
  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.setItem(
      "mySpellingPendingCheckout",
      JSON.stringify({
        plan: "teacher",
        interval: "month",
        at: Date.now(),
        auto: false,
      }),
    );
    sessionStorage.setItem("pendingCheckoutPlan", "teacher");
    sessionStorage.setItem("pendingCheckoutInterval", "month");
  });
  await previewPhoto(page);
  await page.locator('.photo-import-notice a[href*="/pricing"]').click();
  await expect(page).toHaveURL(/plan=teacher&interval=month/);
  await expect(page.locator('[data-plan-choice="teacher"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.locator('[data-plan-card="teacher"] [data-plan-option="month"]'),
  ).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("anonymous photo preview signs in, restores the words, and uses one trial", async ({
  page,
}) => {
  let signedIn = false;
  let accepts = 0;
  await installPhotoOcr(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { googleAuthConfigured: true } }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: signedIn
        ? {
            user: { id: "new-parent", name: "Parent" },
            plan: "free",
            featureTrial: {
              active: true,
              startedAt: new Date().toISOString(),
              endsAt: new Date(Date.now() + 6 * 86400000).toISOString(),
              remainingMs: 6 * 86400000,
            },
          }
        : { error: "sign_in_required" },
    }),
  );
  await page.route("**/api/auth/sign-in/social", async (route) => {
    signedIn = true;
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { url: body.callbackURL } });
  });
  await page.route("**/api/photo-import/accept", async (route) => {
    accepts += 1;
    const body = route.request().postDataJSON();
    expect(body.words).toBe("apple\npear");
    expect(body.importId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    await route.fulfill({
      json: {
        allowed: true,
        featureTrial: {
          active: true,
          endsAt: new Date(Date.now() + 6 * 86400000).toISOString(),
        },
      },
    });
  });
  await page.goto("/");
  await page.locator("#custom-word-list").fill("keep-me");
  await previewPhoto(page);
  await expect(page.locator("#custom-word-list")).toHaveValue("keep-me");
  await page.locator("#photo-import-review-words").fill("apple\npear");
  expect(accepts).toBe(0);
  await page.locator(".photo-import-notice .paywall-primary").click();
  await expect(page).toHaveURL(/\/workspace\?lang=en#teacher-sign-in$/);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator("#custom-word-list")).toHaveValue("apple\npear");
  expect(accepts).toBe(1);
  await expect(page).not.toHaveURL(/photo_import=1/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingPhotoImport")),
  ).toBeNull();
});

test("signing in with no trials left keeps the preview behind pricing", async ({
  page,
}) => {
  let signedIn = false;
  let accepts = 0;
  await installPhotoOcr(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { googleAuthConfigured: true } }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: signedIn
        ? {
            user: { id: "returning", name: "Returning" },
            plan: "free",
            featureTrial: {
              active: false,
              endsAt: new Date(Date.now() - 86400000).toISOString(),
            },
          }
        : { error: "sign_in_required" },
    }),
  );
  await page.route("**/api/auth/sign-in/social", async (route) => {
    signedIn = true;
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { url: body.callbackURL } });
  });
  await page.route("**/api/photo-import/accept", (route) => {
    accepts += 1;
    return route.fulfill({
      status: 403,
      json: { error: "feature_trial_expired" },
    });
  });
  await page.goto("/");
  await page.locator("#custom-word-list").fill("keep-me");
  await previewPhoto(page);
  await page.locator(".photo-import-notice .paywall-primary").click();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator("#photo-import-review-words")).toHaveValue(
    "apple\nbanana",
  );
  await expect(page.locator("#custom-word-list")).not.toHaveValue(
    "apple\nbanana",
  );
  await expect(
    page.locator(".photo-import-notice .paywall-primary"),
  ).toHaveAttribute("href", "/pricing?plan=parent&interval=month");
  expect(accepts).toBe(0);
});

test("signed-in users without trials preview words before the pricing unlock", async ({
  page,
}) => {
  let accepts = 0;
  await installPhotoOcr(page);
  await mockAccount(page, {
    user: { id: "free-user" },
    plan: "free",
    featureTrial: {
      active: false,
      endsAt: new Date(Date.now() - 86400000).toISOString(),
    },
  });
  await page.route("**/api/photo-import/accept", (route) => {
    accepts += 1;
    return route.fulfill({
      status: 403,
      json: { error: "feature_trial_expired" },
    });
  });
  await page.goto("/");
  await page.locator("#custom-word-list").fill("existing");
  await previewPhoto(page);
  await expect(page.locator("#custom-word-list")).toHaveValue("existing");
  await expect(
    page.locator(".photo-import-notice .paywall-primary"),
  ).toHaveAttribute("href", "/pricing?plan=parent&interval=month");
  await expect(
    page.getByRole("button", { name: "Use these words" }),
  ).toHaveCount(0);
  expect(accepts).toBe(0);
  expect(await events(page, "photo_import_blocked")).toHaveLength(1);
  expect(await events(page, "photo_import_clicked")).toHaveLength(1);
});

test("known teacher workspace defaults to Teacher monthly", async ({
  page,
}) => {
  await mockAccount(page, { plan: "free", workspaceType: "teacher" });
  await page.goto("/pricing");
  await expect(page.locator('[data-plan-choice="teacher"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.locator('[data-plan-card="teacher"] [data-plan-option="month"]'),
  ).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
