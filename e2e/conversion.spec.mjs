import { expect, test } from "@playwright/test";

const teacher = {
  user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
  billingInterval: null,
};

function account(plan, billingInterval = null) {
  return { ...teacher, plan, billingInterval };
}

async function mockAssignments(page, plan = "pro") {
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assignments: [],
        usage: {
          activeAssignments: 0,
          monthlyAttempts: 0,
          studentNicknames: 0,
          limits: {
            activeAssignments: plan === "pro" ? 20 : 2,
            monthlyAttempts: plan === "pro" ? null : 30,
          },
        },
      }),
    }),
  );
}

async function mockSignedOut(page) {
  await page.route("**/api/config", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ googleAuthConfigured: true }),
    }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "sign_in_required" }),
    }),
  );
}

const conversionEvents = (page) =>
  page.evaluate(() =>
    window.dataLayer
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === "event")
      .map((entry) => entry[1])
      .filter((name) => ["subscription_started", "purchase"].includes(name)),
  );

test("Checkout success waits for Free to become Pro and records once", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/me", async (route) => {
    calls += 1;
    if (calls > 1) await new Promise((resolve) => setTimeout(resolve, 1_500));
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1 ? account("free") : account("pro", "year"),
      ),
    });
  });
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Activating your Pro plan…")).toBeVisible();
  await expect(page.getByText("Pro plan", { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/checkout=success/);
  expect(await conversionEvents(page)).toEqual([
    "subscription_started",
    "purchase",
  ]);
  expect(calls).toBe(2);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Pro plan", { exact: true })).toBeVisible();
  expect(await conversionEvents(page)).toEqual([]);
});

test("Checkout success handles an account that is already Pro", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/me", (route) => {
    calls += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("pro", "month")),
    });
  });
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Pro plan", { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  expect(await conversionEvents(page)).toEqual([
    "subscription_started",
    "purchase",
  ]);
});

test("Checkout success times out safely and can be checked again", async ({
  page,
}) => {
  let calls = 0;
  let activated = false;
  await page.route("**/api/me", (route) => {
    calls += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        activated ? account("pro", "month") : account("free"),
      ),
    });
  });
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(
    page.getByText("Payment received. Pro activation is still processing."),
  ).toBeVisible({ timeout: 15_000 });
  expect(calls).toBe(11);
  expect(await conversionEvents(page)).toEqual([]);
  await expect(page).toHaveURL(/checkout=success/);

  activated = true;
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page.getByText("Pro plan", { exact: true })).toBeVisible();
  expect(await conversionEvents(page)).toEqual([
    "subscription_started",
    "purchase",
  ]);
});

test("Checkout activation recovers from a temporary network error", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/me", (route) => {
    calls += 1;
    if (calls === 2) return route.abort("failed");
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1 ? account("free") : account("pro", "month"),
      ),
    });
  });
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Activating your Pro plan…")).toBeVisible();
  await expect(page.getByText("Pro plan", { exact: true })).toBeVisible();
  expect(calls).toBe(3);
  expect(await conversionEvents(page)).toEqual([
    "subscription_started",
    "purchase",
  ]);
});

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name} embedded Free CTA focuses sign-in without reloading`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockSignedOut(page);
    await page.goto("/teacher?lang=en");
    await expect(page.locator("#teacher-sign-in")).toBeVisible();
    await page.evaluate(() => {
      window.teacherPageMarker = "still-here";
    });

    await page.locator("[data-free-teacher-cta]").click();

    await expect(page).toHaveURL(/#teacher-sign-in$/);
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeFocused();
    expect(await page.evaluate(() => window.teacherPageMarker)).toBe(
      "still-here",
    );
  });
}

test("standalone Free CTA opens the matching teacher sign-in area", async ({
  page,
}) => {
  await mockSignedOut(page);
  await page.goto("/pricing");
  const freeCta = page.locator("[data-free-teacher-cta]");
  await expect(freeCta).toHaveAttribute(
    "href",
    "/teacher?lang=en#teacher-sign-in",
  );
  await freeCta.click();
  await expect(page).toHaveURL(/\/teacher\?lang=en#teacher-sign-in$/);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeFocused();
});

test("signed-in Free pricing marks the current plan without a link", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("free")),
    }),
  );
  await mockAssignments(page, "free");

  await page.goto("/teacher?lang=en");
  const currentPlan = page.locator("button[data-free-teacher-cta]");
  await expect(currentPlan).toHaveText("Current plan");
  await expect(currentPlan).toBeDisabled();
  await expect(page.locator("a[data-free-teacher-cta]")).toHaveCount(0);
});
