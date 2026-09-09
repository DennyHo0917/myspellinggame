import { expect, test } from "@playwright/test";

const passage = {
  title: "The Quick Test",
  text: "Run to the bridge. Keep moving until you see the old clock tower and the thief.",
};

async function mockPassage(page) {
  await page.route("**/api/chase/passage", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ passage }),
    }),
  );
}

const analyticsEvents = (page, name) =>
  page.evaluate(
    (eventName) =>
      (window.dataLayer || [])
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event" && entry[1] === eventName)
        .map((entry) => entry[2]),
    name,
  );

test("anonymous Typing Chase players are sent to sign in", async ({ page }) => {
  await page.route("**/api/chase/passage", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "sign_in_required" }),
    }),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="practice-mode"][value="chase"]').check();

  await expect(page).toHaveURL(/\/workspace\?lang=en#teacher-sign-in$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingTypingChase")),
  ).toBe("1");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingTypingChaseLocale"),
    ),
  ).toBe("en");
});

test("Typing Chase intent resumes at mode selection after sign-in", async ({
  page,
}) => {
  let signedIn = false;
  await page.route("**/api/config", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ googleAuthConfigured: true }),
    }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(
        signedIn
          ? {
              plan: "free",
              user: {
                id: "teacher-a",
                name: "Teacher A",
                email: "teacher@example.test",
              },
            }
          : { error: "sign_in_required" },
      ),
    }),
  );
  await page.route("**/api/auth/sign-in/social", async (route) => {
    signedIn = true;
    const body = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: body.callbackURL }),
    });
  });
  await page.route("**/api/chase/passage", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(
        signedIn ? { passage } : { error: "sign_in_required" },
      ),
    }),
  );

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="practice-mode"][value="chase"]').check();
  await expect(page).toHaveURL(/\/workspace\?lang=en#teacher-sign-in$/);
  await page.getByRole("button", { name: "Continue with Google" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#chase-mode-options")).toBeVisible();
  await expect(page.locator("#chase-start-btn")).toBeDisabled();
  await expect(
    page.locator('[data-chase-mode][aria-pressed="true"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingTypingChase")),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingTypingChaseLocale"),
    ),
  ).toBeNull();
});

test("Typing Chase fits beside the two existing modes and starts for Free users", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockPassage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const cards = page.locator(".mode-card");
  await expect(cards).toHaveCount(3);
  const boxes = await cards.evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().width),
  );
  expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThanOrEqual(1);

  await page.locator('input[name="practice-mode"][value="chase"]').check();
  await expect(page.locator("#chase-screen")).toBeHidden();
  await expect(page.locator("#chase-mode-options")).toBeVisible();
  await page.locator('[data-chase-mode="simple"]').click();
  await page.locator("#chase-start-btn").click();
  await expect(page.locator("#chase-screen")).toBeVisible();
  await expect
    .poll(() => analyticsEvents(page, "typing_chase_started"))
    .toEqual([{ chase_mode: "simple", locale: "en" }]);
  await page.waitForTimeout(100);
  expect(await analyticsEvents(page, "typing_chase_started")).toHaveLength(1);
  await expect(page.locator("#chase-passage-title")).toHaveText(passage.title);
  await expect(page.locator("#chase-passage-text")).toHaveText(
    "Run to the bridge.",
  );
  await page.locator("#chase-input").fill("Run to the bridge.");
  await expect(page.locator("#chase-passage-text")).toHaveText(
    "Keep moving until you see the old clock tower and the thief.",
  );
  await page.locator("#chase-input").fill("Keep moving until you see");
  await expect(page.locator("#game-over")).toBeVisible();
  await expect(page.locator("#game-over-title")).toHaveText("Thief caught!");
  await expect(page.locator("#chase-return-menu-btn")).toBeVisible();
  await expect(page.locator("#chase-share-btn")).toBeVisible();
  expect(await analyticsEvents(page, "typing_chase_started")).toHaveLength(1);
  expect(await analyticsEvents(page, "typing_chase_completed")).toHaveLength(1);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        window.__shareCalled = true;
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__clipboardText = text;
        },
      },
    });
  });
  await page.locator("#chase-share-btn").click();
  await expect
    .poll(() => page.evaluate(() => window.__clipboardText || ""))
    .toContain("caught the thief");
  expect(await page.evaluate(() => window.__clipboardText)).toContain(
    new URL("/", page.url()).href,
  );
  expect(await page.evaluate(() => window.__shareCalled)).toBeFalsy();
  await expect(page.locator("#chase-share-status")).toHaveText(
    "Challenge link copied",
  );
  await page.locator("#chase-return-menu-btn").click();
  await expect(page.locator("#game-start")).toBeVisible();
  await expect(page.locator("#chase-screen")).toBeHidden();
});

test("Typing Chase has no custom-passage controls", async ({ page }) => {
  await mockPassage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="practice-mode"][value="chase"]').check();

  await expect(page.locator("#chase-paid-options")).toHaveCount(0);
  await expect(page.locator("#chase-custom-words")).toHaveCount(0);
  await expect(page.locator("#chase-generate-btn")).toHaveCount(0);
  await expect(page.locator("#chase-mode-options")).toBeVisible();
  await expect(page.locator("#chase-start-btn")).toBeDisabled();
  await expect(page.locator("#chase-screen")).toBeHidden();
});

test("the thief exits right when the article ends before being caught", async ({
  page,
}) => {
  await page.route("**/api/chase/passage", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        plan: "free",
        passage: { title: "Short Chase", text: "Go." },
      }),
    }),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="practice-mode"][value="chase"]').check();
  await page.locator('[data-chase-mode="simple"]').click();
  await page.locator("#chase-start-btn").click();
  await page.locator("#chase-input").fill("Go.");

  await expect(page.locator("#chase-screen")).toBeVisible();
  await expect(page.locator("#chase-input")).toBeDisabled();
  await page.waitForTimeout(450);
  await page.screenshot({ path: "test-results/typing-chase-escape.png" });
  await expect(page.locator("#game-over-title")).toHaveText(
    "The thief escaped",
    { timeout: 3_000 },
  );
});

test("the thief escapes when the player falls more than 30 WPM behind", async ({
  page,
}) => {
  await page.route("**/api/chase/passage", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        plan: "free",
        passage: { title: "Slow Chase", text: "Keep running." },
      }),
    }),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="practice-mode"][value="chase"]').check();
  await page.locator('[data-chase-mode="simple"]').click();
  await page.locator("#chase-start-btn").click();

  await expect(page.locator("#game-over-title")).toHaveText(
    "The thief escaped",
    { timeout: 7_000 },
  );
});

test("Typing Chase keeps its game surface inside a mobile canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockPassage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="practice-mode"][value="chase"]').check();
  await page.locator('[data-chase-mode="simple"]').click();
  await page.locator("#chase-start-btn").click();
  await expect(page.locator("#chase-input")).toBeVisible();

  const layout = await page.locator("#game-container").evaluate((container) => {
    const outer = container.getBoundingClientRect();
    const passage = container
      .querySelector(".chase-passage-card")
      .getBoundingClientRect();
    return {
      insideHorizontally:
        passage.left >= outer.left && passage.right <= outer.right,
      insideVertically:
        passage.top >= outer.top && passage.bottom <= outer.bottom,
    };
  });
  expect(layout).toEqual({ insideHorizontally: true, insideVertically: true });
  await page.screenshot({ path: "test-results/typing-chase-mobile.png" });
});
