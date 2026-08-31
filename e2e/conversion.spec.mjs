import { expect, test } from "@playwright/test";
import { PLAN_LIMITS } from "../src/worker/domain.ts";

const teacher = {
  user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
  billingInterval: null,
};

function account(plan, billingInterval = null) {
  return {
    ...teacher,
    plan,
    billingInterval,
    subscriptionStatus: plan === "free" ? null : "active",
  };
}

async function mockAssignments(page, plan = "teacher") {
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assignments: [],
        usage: {
          activeAssignments: 0,
          monthlyAttempts: 0,
          savedLists: 0,
          learnerProfiles: 0,
          limits: PLAN_LIMITS[plan],
        },
      }),
    }),
  );
}

async function mockSignedOut(page) {
  await page.route("**/api/config", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        googleAuthConfigured: true,
        microsoftAuthConfigured: true,
      }),
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

const analyticsEvents = (page, name) =>
  page.evaluate(
    (eventName) =>
      (window.dataLayer || [])
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event" && entry[1] === eventName)
        .map((entry) => entry[2]),
    name,
  );

test("ordinary teacher routes do not override the stored locale", async ({
  page,
}) => {
  await mockSignedOut(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() =>
    localStorage.setItem("mySpellingGamePreferredLocale", "es"),
  );

  await page.goto("/teacher", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.goto("/teacher?lang=__proto__", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.evaluate(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "zh"),
  );
  await page.goto("/teacher?lang=es", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("Checkout success waits for Free to become Teacher and records once", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "en"),
  );
  let calls = 0;
  await page.route("**/api/me", async (route) => {
    calls += 1;
    if (calls > 1) await new Promise((resolve) => setTimeout(resolve, 1_500));
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1 ? account("free") : account("teacher", "year"),
      ),
    });
  });
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Teacher Plan", { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/checkout=success/);
  expect(await conversionEvents(page)).toEqual([
    "subscription_started",
    "purchase",
  ]);
  expect(calls).toBe(2);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Teacher Plan", { exact: true })).toBeVisible();
  expect(await conversionEvents(page)).toEqual([]);
});

test("Parent Checkout success waits for Parent activation and records the Parent price", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "en"),
  );
  let calls = 0;
  await page.route("**/api/me", async (route) => {
    calls += 1;
    if (calls > 1) await new Promise((resolve) => setTimeout(resolve, 1_500));
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1 ? account("free") : account("parent", "month"),
      ),
    });
  });
  await mockAssignments(page, "parent");

  await page.goto("/teacher?lang=en&checkout=success&plan=parent");
  await expect(page.getByText("Parent Plan", { exact: true })).toBeVisible();
  await expect(page.getByText("Parent Plan is active.")).toBeVisible();
  await expect(page).not.toHaveURL(/checkout=success|plan=parent/);
  expect(
    await page.evaluate(
      () =>
        window.dataLayer
          .map((entry) => Array.from(entry))
          .find(
            (entry) => entry[0] === "event" && entry[1] === "purchase",
          )?.[2],
    ),
  ).toEqual({
    plan: "parent",
    billing_interval: "month",
    value: 4.99,
    currency: "USD",
  });
});

test("Teacher Checkout success waits for Teacher activation and records the Teacher price", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "en"),
  );
  let calls = 0;
  await page.route("**/api/me", async (route) => {
    calls += 1;
    if (calls > 1) await new Promise((resolve) => setTimeout(resolve, 1_500));
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1 ? account("free") : account("teacher", "month"),
      ),
    });
  });
  await mockAssignments(page, "teacher");

  await page.goto("/teacher?lang=en&checkout=success&plan=teacher");
  await expect(page.getByText("Teacher Plan", { exact: true })).toBeVisible();
  await expect(page.getByText("Teacher Plan is active.")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.dataLayer
          .map((entry) => Array.from(entry))
          .find(
            (entry) => entry[0] === "event" && entry[1] === "purchase",
          )?.[2],
    ),
  ).toEqual({
    plan: "teacher",
    billing_interval: "month",
    value: 9.99,
    currency: "USD",
  });
});

test("Checkout success handles an account that is already Teacher", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "en"),
  );
  let calls = 0;
  await page.route("**/api/me", (route) => {
    calls += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("teacher", "month")),
    });
  });
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Teacher Plan", { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  expect(await conversionEvents(page)).toEqual([
    "subscription_started",
    "purchase",
  ]);
});

test("a historical trialing subscription stays usable without trial UI", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "en"),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...account("teacher", "year"),
        subscriptionStatus: "trialing",
      }),
    }),
  );
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");

  await expect(page.getByText("Teacher Plan is active.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/trial/i);
  await expect(
    page.locator("#overview").getByRole("button", { name: "Manage billing" }),
  ).toBeVisible();
  expect(await conversionEvents(page)).toEqual([]);
});

test("an arbitrary Checkout success URL does not record a purchase", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("teacher", "month")),
    }),
  );
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Teacher Plan", { exact: true })).toBeVisible();
  expect(await conversionEvents(page)).toEqual([]);
});

test("Checkout success restores supported locales and cleans its URL", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("teacher", "year")),
    }),
  );
  await mockAssignments(page);

  for (const locale of ["en", "es", "pt-BR", "fr", "id", "zh"]) {
    await page.goto(
      `/teacher?lang=${encodeURIComponent(locale)}&checkout=success&interval=year&keep=value#workspace`,
    );
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page).toHaveURL(
      `/teacher?lang=${encodeURIComponent(locale)}&keep=value#workspace`,
    );
  }
});

test("Checkout success prefers its pending locale and preserves unrelated URL state", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "zh"),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("teacher", "year")),
    }),
  );
  await mockAssignments(page);

  await page.goto(
    "/teacher?lang=es&checkout=success&interval=year&keep=value#workspace",
  );

  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page).toHaveURL("/teacher?lang=zh&keep=value#workspace");
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBeNull();
});

test("an invalid pending Checkout locale cannot override the URL locale", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "not-a-locale"),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("teacher", "month")),
    }),
  );
  await mockAssignments(page);

  await page.goto("/teacher?lang=es&checkout=success");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page).toHaveURL("/teacher?lang=es");
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBeNull();
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
        activated ? account("teacher", "month") : account("free"),
      ),
    });
  });
  await mockAssignments(page);
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "en"),
  );

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(
    page.getByText("Checkout completed. Plan activation is still processing."),
  ).toBeVisible({ timeout: 15_000 });
  expect(calls).toBe(11);
  expect(await conversionEvents(page)).toEqual([]);
  await expect(page).toHaveURL(/checkout=success/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBe("en");

  activated = true;
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page.getByText("Teacher Plan", { exact: true })).toBeVisible();
  expect(await conversionEvents(page)).toEqual([
    "subscription_started",
    "purchase",
  ]);
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBeNull();
});

test("the teacher sends its locale when opening Billing Portal", async ({
  page,
}) => {
  let portalBody;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("teacher", "month")),
    }),
  );
  await mockAssignments(page);
  await page.route("**/api/billing/portal", async (route) => {
    portalBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: "" }),
    });
  });

  await page.goto("/teacher?lang=zh");
  await page.locator(".teacher-dashboard-card .actions button").click();

  await expect.poll(() => portalBody).toEqual({ locale: "zh" });
});

test("a cancelled Checkout clears its pending locale", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("pendingCheckoutLocale", "zh");
    sessionStorage.setItem("pendingCheckoutPlan", "parent");
    sessionStorage.setItem("pendingCheckoutInterval", "year");
  });

  await page.goto("/zh/pricing?checkout=cancelled");

  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      window.dataLayer
        .map((entry) => Array.from(entry))
        .filter(
          (entry) => entry[0] === "event" && entry[1] === "checkout_cancelled",
        )
        .map((entry) => entry[2]),
    ),
  ).toEqual([{ plan: "parent", billing_interval: "year" }]);
});

test("Checkout activation recovers from a temporary network error", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "en"),
  );
  let calls = 0;
  await page.route("**/api/me", (route) => {
    calls += 1;
    if (calls === 2) return route.abort("failed");
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1 ? account("free") : account("teacher", "month"),
      ),
    });
  });
  await mockAssignments(page);

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(page.getByText("Teacher Plan", { exact: true })).toBeVisible();
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
  test(`${viewport.name} signed-out workspace keeps copy and social sign-in in one card`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockSignedOut(page);
    await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#teacher-sign-in")).toBeVisible();
    await expect(page.locator(".product-brand")).toHaveCSS(
      "color",
      "rgb(47, 111, 115)",
    );
    await expect(page.locator(".teacher-pricing")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Microsoft" }),
    ).toBeVisible();
    const layout = await page.locator("#teacher-sign-in").evaluate((card) => {
      const buttons = card.querySelector(".social-sign-in-buttons");
      const googleButton = card.querySelector(".google-sign-in");
      const microsoftButton = card.querySelector(".microsoft-sign-in");
      const copy = card.querySelector(".teacher-login-copy");
      const cardBox = card.getBoundingClientRect();
      const buttonsBox = buttons.getBoundingClientRect();
      const googleBox = googleButton.getBoundingClientRect();
      const microsoftBox = microsoftButton.getBoundingClientRect();
      const copyBox = copy.getBoundingClientRect();
      const notice = copy.querySelector(".notice");
      return {
        buttonsBelowCopy: buttonsBox.top >= copyBox.bottom,
        buttonsCenterOffset: Math.abs(
          buttonsBox.left +
            buttonsBox.width / 2 -
            (cardBox.left + cardBox.width / 2),
        ),
        buttonsShareRow: Math.abs(googleBox.top - microsoftBox.top) <= 1,
        copyCenterOffset: Math.abs(
          copyBox.left + copyBox.width / 2 - (cardBox.left + cardBox.width / 2),
        ),
        copyTextAlign: getComputedStyle(copy).textAlign,
        noticeTextAlign: getComputedStyle(notice).textAlign,
        cardWidth: cardBox.width,
        copyWidth: copyBox.width,
        cardHeight: cardBox.height,
      };
    });
    expect(layout.buttonsBelowCopy).toBe(true);
    expect(layout.buttonsCenterOffset).toBeLessThanOrEqual(1);
    expect(layout.buttonsShareRow).toBe(viewport.name === "desktop");
    expect(layout.copyCenterOffset).toBeLessThanOrEqual(1);
    expect(layout.copyTextAlign).toBe("center");
    expect(layout.noticeTextAlign).toBe("center");
    expect(layout.cardWidth).toBeLessThanOrEqual(760);
    expect(layout.copyWidth).toBeLessThanOrEqual(608);
    expect(layout.cardHeight).toBeGreaterThanOrEqual(300);
  });
}

test("Microsoft sign-in submits the Microsoft provider", async ({ page }) => {
  await mockSignedOut(page);
  await page.route("**/api/auth/sign-in/social", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: "/teacher?lang=en" }),
    }),
  );
  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });
  const requestPromise = page.waitForRequest("**/api/auth/sign-in/social");
  await page
    .getByRole("button", { name: "Continue with Microsoft" })
    .click({ noWaitAfter: true });
  expect((await requestPromise).postDataJSON()).toMatchObject({
    provider: "microsoft",
    callbackURL: "/teacher?lang=en",
  });
});

test("successful social auth records signup dimensions once", async ({
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
              user: { id: "teacher-a", name: "Teacher A" },
              plan: "free",
              workspaceType: "teacher",
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
      body: JSON.stringify({ url: body.newUserCallbackURL }),
    });
  });
  await page.goto("/teacher?lang=en");
  await Promise.all([
    page.waitForURL(/\/teacher\?lang=en$/, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Continue with Google" }).click(),
  ]);
  await page.waitForTimeout(500);
  expect(await analyticsEvents(page, "sign_up")).toEqual([
    { provider: "google", workspace_type: "teacher" },
  ]);
  await expect(page).toHaveURL("/teacher?lang=en");
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await analyticsEvents(page, "sign_up")).toEqual([]);
});

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

test("signed-out pricing switches yearly and monthly plan prices", async ({
  page,
}) => {
  await mockSignedOut(page);
  await page.route("**/api/billing/checkout", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "internal_error" }),
    }),
  );
  await page.goto("/pricing");
  await expect(page.locator(".pricing-grid .pricing-card")).toHaveCount(3);
  const monthly = page.getByRole("button", { name: "Monthly plan" });
  const yearly = page.getByRole("button", { name: "Yearly plan" });
  const parentPrice = page.locator(
    '[data-plan-card="parent"] [data-plan-price]',
  );
  const teacherPrice = page.locator(
    '[data-plan-card="teacher"] [data-plan-price]',
  );
  await expect(parentPrice).toHaveText("$4.99 / month");
  await expect(teacherPrice).toHaveText("$9.99 / month");
  await yearly.click();
  await expect(parentPrice).toHaveText("$49.99 / year");
  await expect(teacherPrice).toHaveText("$99.99 / year");
  await monthly.click();
  await expect(parentPrice).toHaveText("$4.99 / month");
  await expect(teacherPrice).toHaveText("$9.99 / month");
});

test("signed-in Free standalone pricing remains available", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("free")),
    }),
  );
  await page.goto("/pricing");
  await expect(page.locator(".pricing-grid .pricing-card")).toHaveCount(3);
  await expect(page.locator('[data-plan-card="free"]')).toContainText(
    "Current plan",
  );
});

test("signed-in plan selection keeps all three plan cards available", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...account("free"),
      }),
    }),
  );
  await page.goto("/pricing");

  await expect(page.locator(".pricing-grid .pricing-card")).toHaveCount(3);
  await expect(page.locator('[data-plan-card="free"]')).toContainText(
    "Current plan",
  );
});

test("paid pricing shows renewal beside the expiration notice", async ({
  page,
}) => {
  let portalBody;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...account("parent", "month"),
        currentPeriodEnd: "2026-09-25T00:00:00.000Z",
      }),
    }),
  );
  await page.route("**/api/billing/portal", (route) => {
    portalBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: "/pricing?from=renewal" }),
    });
  });

  await page.goto("/pricing");
  const status = page.locator("[data-subscription-status]");
  await expect(status).toContainText("Parent Plan active through");
  const renew = status.getByRole("button", { name: "Renew subscription" });
  await expect(renew).toBeVisible();
  await expect(page.locator('[data-plan-card="parent"]')).toContainText(
    "Current plan",
  );
  await renew.click();
  await expect(page).toHaveURL(/\/pricing\?from=renewal$/);
  expect(portalBody).toEqual({ locale: "en" });
});

test("paid pricing changes plan through the prorated billing endpoint", async ({
  page,
}) => {
  let changeBody;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("parent", "month")),
    }),
  );
  await page.route("**/api/billing/change-plan", (route) => {
    changeBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: "/pricing?plan-change=payment" }),
    });
  });

  await page.goto("/pricing");
  await page.getByRole("button", { name: "Select Teacher Plan" }).click();
  await expect(page).toHaveURL(/\/pricing\?plan-change=payment$/);
  expect(changeBody).toEqual({
    plan: "teacher",
    interval: "month",
    locale: "en",
  });
});

test("Teacher pricing schedules Parent for the renewal date", async ({
  page,
}) => {
  let changeBody;
  let message = "";
  page.on("dialog", async (dialog) => {
    message = dialog.message();
    await dialog.accept();
  });
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...account("teacher", "month"),
        currentPeriodEnd: "2026-09-25T00:00:00.000Z",
      }),
    }),
  );
  await page.route("**/api/billing/change-plan", (route) => {
    changeBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        scheduled: true,
        effectiveAt: "2026-09-25T00:00:00.000Z",
      }),
    });
  });

  await page.goto("/pricing");
  await page.getByRole("button", { name: "Select Parent Plan" }).click();
  await expect
    .poll(() => message)
    .toContain("Teacher Plan remains active through September 25, 2026");
  expect(changeBody).toEqual({
    plan: "parent",
    interval: "month",
    locale: "en",
  });
  await expect(page.locator('[data-plan-card="teacher"]')).toContainText(
    "Current plan",
  );
});
