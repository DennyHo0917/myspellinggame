import { test, expect } from "@playwright/test";

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
for (const locale of ["en", "es", "pt-br", "fr", "id", "zh"]) {
  test(`${locale} mobile photo paywall preserves annual selection and reports clicks`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mockAccount(page);
    await page.addInitScript(
      (locale) => localStorage.setItem("mySpellingGameManualLocale", locale),
      locale,
    );
    const prefix = locale === "en" ? "" : `/${locale}`;
    await page.goto(`${prefix}/`);
    await page.locator("#photo-import-btn").click();
    await page.locator("#photo-import-btn").click();
    const primary = page.locator(".photo-import-notice .paywall-primary");
    await expect(primary).toBeVisible();
    expect(await events(page, "photo_import_clicked")).toHaveLength(2);
    expect(await events(page, "photo_import_blocked")).toHaveLength(2);
    expect(await events(page, "locked_feature_attempted")).toEqual([
      { feature: "photo_import", current_plan: "anonymous" },
    ]);
    const bounds = await primary.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
    await primary.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/paywall-${locale}.png` });
    // Inspect the event before navigation clears the page's analytics queue.
    await primary.evaluate((el) =>
      el.addEventListener("click", (e) => e.preventDefault()),
    );
    await primary.click();
    expect(await events(page, "upgrade_cta_clicked")).toEqual([
      {
        cta_location: "photo_import",
        plan: "parent",
        billing_interval: "year",
      },
    ]);
    expect(await primary.getAttribute("href")).toBe(
      `${prefix}/pricing?plan=parent&interval=year`,
    );
    await page.goto(await primary.getAttribute("href"));
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale === "pt-br" ? "pt-BR" : locale === "zh" ? "zh-CN" : locale,
    );
    await expect(page.locator('[data-plan-option="year"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('[data-plan-choice="parent"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.locator('[data-plan-card="parent"] [data-plan-price]'),
    ).toContainText(/79[.,]90/);
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
  await mockAccount(page, { plan: "parent", billingInterval: "month" });
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.locator("#photo-import-btn").click();
  await chooser;
  expect(await events(page, "photo_import_clicked")).toHaveLength(1);
  expect(await events(page, "photo_import_blocked")).toHaveLength(0);
});

test("saved Teacher monthly selection survives the photo paywall", async ({
  page,
}) => {
  await mockAccount(page);
  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.setItem("pendingCheckoutPlan", "teacher");
    sessionStorage.setItem("pendingCheckoutInterval", "month");
  });
  await page.locator("#photo-import-btn").click();
  await page.locator(".photo-import-notice .paywall-primary").click();
  await expect(page).toHaveURL(/plan=teacher&interval=month/);
  await expect(page.locator('[data-plan-choice="teacher"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-option="month"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("known teacher workspace defaults to Teacher annually", async ({
  page,
}) => {
  await mockAccount(page, { plan: "free", workspaceType: "teacher" });
  await page.goto("/pricing");
  await expect(page.locator('[data-plan-choice="teacher"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-plan-option="year"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
