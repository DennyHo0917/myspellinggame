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

test("ordinary teacher routes do not override the stored locale", async ({
  page,
}) => {
  await mockSignedOut(page);
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("mySpellingGamePreferredLocale", "es"),
  );

  await page.goto("/teacher");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.goto("/teacher?lang=__proto__");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.evaluate(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "zh"),
  );
  await page.goto("/teacher?lang=es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

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

test("Checkout success restores supported locales and cleans its URL", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account("pro", "year")),
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
      body: JSON.stringify(account("pro", "year")),
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
      body: JSON.stringify(account("pro", "month")),
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
        activated ? account("pro", "month") : account("free"),
      ),
    });
  });
  await mockAssignments(page);
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "en"),
  );

  await page.goto("/teacher?lang=en&checkout=success");
  await expect(
    page.getByText("Payment received. Pro activation is still processing."),
  ).toBeVisible({ timeout: 15_000 });
  expect(calls).toBe(11);
  expect(await conversionEvents(page)).toEqual([]);
  await expect(page).toHaveURL(/checkout=success/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBe("en");

  activated = true;
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page.getByText("Pro plan", { exact: true })).toBeVisible();
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
      body: JSON.stringify(account("pro", "month")),
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
  await page.addInitScript(() =>
    sessionStorage.setItem("pendingCheckoutLocale", "zh"),
  );

  await page.goto("/zh/pricing?checkout=cancelled");

  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBeNull();
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
    const selector = page.locator(
      ".teacher-pricing .plan-selector:not(.pricing-card-spacer)",
    );
    const proCard = page.locator(".teacher-pricing .pricing-card").nth(1);
    await expect(selector).toBeVisible();
    const selectorBox = await selector.boundingBox();
    const proCardBox = await proCard.boundingBox();
    expect(selectorBox.width).toBeLessThan(proCardBox.width - 40);
    if (viewport.name === "desktop") {
      const freeHeadingBox = await page
        .locator(".teacher-pricing .pricing-card")
        .nth(0)
        .locator(".pricing-card-heading")
        .boundingBox();
      const proHeadingBox = await proCard
        .locator(".pricing-card-heading")
        .boundingBox();
      const proTitleBox = await proCard.locator("h2").boundingBox();
      const freePriceBox = await page
        .locator(".pricing-card")
        .nth(0)
        .locator(".price")
        .boundingBox();
      const proPriceBox = await page
        .locator(".pricing-card")
        .nth(1)
        .locator(".price")
        .boundingBox();
      const freeListBox = await page
        .locator(".pricing-card")
        .nth(0)
        .locator("ul")
        .boundingBox();
      const proListBox = await page
        .locator(".pricing-card")
        .nth(1)
        .locator("ul")
        .boundingBox();
      const proDescriptionBox = await proCard
        .locator("#selected-plan-description")
        .boundingBox();
      const freeDescriptionBox = await page
        .locator(".teacher-pricing .pricing-card")
        .nth(0)
        .locator(".plan-description")
        .boundingBox();
      const freeCtaBox = await page
        .locator("[data-free-teacher-cta]")
        .boundingBox();
      const proCtaBox = await page
        .locator("[data-confirm-checkout]")
        .boundingBox();
      expect(
        Math.abs(
          selectorBox.y +
            selectorBox.height / 2 -
            (proTitleBox.y + proTitleBox.height / 2),
        ),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(
          selectorBox.x +
            selectorBox.width -
            (proHeadingBox.x + proHeadingBox.width),
        ),
      ).toBeLessThanOrEqual(1);
      expect(
        freePriceBox.y - (freeHeadingBox.y + freeHeadingBox.height),
      ).toBeLessThanOrEqual(4);
      expect(
        proPriceBox.y - (proHeadingBox.y + proHeadingBox.height),
      ).toBeLessThanOrEqual(4);
      expect(
        freeListBox.y - (freeDescriptionBox.y + freeDescriptionBox.height),
      ).toBeLessThanOrEqual(24);
      expect(
        proListBox.y - (proDescriptionBox.y + proDescriptionBox.height),
      ).toBeLessThanOrEqual(32);
      expect(Math.abs(freeHeadingBox.y - proHeadingBox.y)).toBeLessThanOrEqual(
        1,
      );
      expect(Math.abs(freePriceBox.y - proPriceBox.y)).toBeLessThanOrEqual(1);
      expect(
        Math.abs(freeDescriptionBox.y - proDescriptionBox.y),
      ).toBeLessThanOrEqual(1);
      expect(Math.abs(freeListBox.y - proListBox.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(freeCtaBox.y - proCtaBox.y)).toBeLessThanOrEqual(1);
    }
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

for (const viewport of [
  { name: "desktop", width: 1280, height: 900, desktop: true },
  { name: "mobile", width: 390, height: 844, desktop: false },
]) {
  for (const locale of ["en", "es", "pt-BR", "fr", "id", "zh"]) {
    test(`${viewport.name} ${locale} pricing stays aligned without crowding`, async ({
      page,
    }) => {
      await mockSignedOut(page);
      await page.setViewportSize(viewport);
      await page.goto(`/teacher?lang=${encodeURIComponent(locale)}`);
      const layout = await page.locator(".teacher-pricing").evaluate((root) => {
        const cards = [...root.querySelectorAll(".pricing-card")];
        const bounds = (card, selector) =>
          card.querySelector(selector).getBoundingClientRect();
        const freeHeading = bounds(cards[0], ".pricing-card-heading");
        const proHeading = bounds(cards[1], ".pricing-card-heading");
        const freePrice = bounds(cards[0], ".price");
        const proPrice = bounds(cards[1], ".price");
        const freeDescription = bounds(cards[0], ".plan-description");
        const proDescription = bounds(cards[1], ".plan-description");
        const freeList = bounds(cards[0], "ul");
        const proList = bounds(cards[1], "ul");
        const selector = bounds(cards[1], ".plan-selector");
        return {
          cardHeight: cards[0].getBoundingClientRect().height,
          descriptionOffset: Math.abs(freeDescription.y - proDescription.y),
          headingOffset: Math.abs(freeHeading.y - proHeading.y),
          listOffset: Math.abs(freeList.y - proList.y),
          overflow: cards.some(
            (card) => card.scrollWidth > card.clientWidth + 1,
          ),
          priceOffset: Math.abs(freePrice.y - proPrice.y),
          selectorPriceGap: proPrice.top - selector.bottom,
        };
      });
      expect(layout.overflow, locale).toBe(false);
      expect(layout.selectorPriceGap, locale).toBeGreaterThanOrEqual(0);
      if (viewport.desktop) {
        expect(layout.cardHeight, locale).toBeGreaterThanOrEqual(500);
        expect(layout.headingOffset, locale).toBeLessThanOrEqual(1);
        expect(layout.priceOffset, locale).toBeLessThanOrEqual(1);
        expect(layout.descriptionOffset, locale).toBeLessThanOrEqual(1);
        expect(layout.listOffset, locale).toBeLessThanOrEqual(1);
      }
    });
  }
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

test("signed-out teacher pricing switches plans and preserves Checkout intent", async ({
  page,
}) => {
  let checkoutBody;
  await mockSignedOut(page);
  await page.route("**/api/billing/checkout", async (route) => {
    checkoutBody = route.request().postDataJSON();
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "sign_in_required" }),
    });
  });
  await page.goto("/teacher?lang=en");

  const price = page.locator("#selected-plan-price");
  const description = page.locator("#selected-plan-description");
  const savings = page.locator("#selected-plan-savings");
  const confirm = page.locator("[data-confirm-checkout]");
  const monthly = page.getByRole("button", { name: "Monthly plan" });
  const yearly = page.getByRole("button", { name: "Yearly plan" });

  await yearly.click();
  await expect(price).toHaveText("$4.17 / month");
  await expect(description).toHaveText("Billed $49.99 yearly");
  await expect(savings).toHaveText("Save 30%");
  await expect(savings).toBeVisible();
  await expect(confirm).toHaveText("Continue with yearly plan · $49.99 / year");

  await monthly.click();
  await expect(price).toHaveText("$5.99 / month");
  await expect(description).toHaveText("Billed monthly");
  await expect(savings).toBeHidden();
  await expect(confirm).toHaveText(
    "Continue with monthly plan · $5.99 / month",
  );

  await yearly.click();
  const navigated = page.waitForEvent(
    "framenavigated",
    (frame) => frame === page.mainFrame(),
  );
  await confirm.click();
  await navigated;
  await page.waitForLoadState("domcontentloaded");
  await expect(page).toHaveURL(/\/teacher\?lang=en$/);
  expect(checkoutBody).toEqual({ interval: "year", locale: "en" });
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingCheckoutInterval"),
    ),
  ).toBe("year");
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBe("en");

  await page.locator("[data-free-teacher-cta]").click();
  await expect(page).toHaveURL(/#teacher-sign-in$/);
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
  const pricingLayout = await page
    .locator(".teacher-pricing")
    .evaluate((root) => {
      const cards = root.querySelectorAll(".pricing-card");
      const freePrice = cards[0]
        .querySelector(".price")
        .getBoundingClientRect();
      const proPrice = cards[1].querySelector(".price").getBoundingClientRect();
      const freeList = cards[0].querySelector("ul").getBoundingClientRect();
      const proList = cards[1].querySelector("ul").getBoundingClientRect();
      const freeDescription = cards[0]
        .querySelector(".plan-description")
        .getBoundingClientRect();
      const freeHeading = cards[0]
        .querySelector(".pricing-card-heading")
        .getBoundingClientRect();
      const proHeading = cards[1]
        .querySelector(".pricing-card-heading")
        .getBoundingClientRect();
      const proDescription = cards[1]
        .querySelector("#selected-plan-description")
        .getBoundingClientRect();
      const selector = cards[1]
        .querySelector(".plan-selector")
        .getBoundingClientRect();
      const proTitle = cards[1].querySelector("h2").getBoundingClientRect();
      const freeCta = cards[0]
        .querySelector("[data-free-teacher-cta]")
        .getBoundingClientRect();
      const proCta = cards[1]
        .querySelector("[data-confirm-checkout]")
        .getBoundingClientRect();
      return {
        cardDisplay: getComputedStyle(cards[0]).display,
        ctaOffset: Math.abs(freeCta.y - proCta.y),
        freeHeadingGap: freePrice.top - freeHeading.bottom,
        freeListGap: freeList.top - freeDescription.bottom,
        proHeadingGap: proPrice.top - proHeading.bottom,
        proListGap: proList.top - proDescription.bottom,
        headingOffset: Math.abs(freeHeading.y - proHeading.y),
        priceOffset: Math.abs(freePrice.y - proPrice.y),
        descriptionOffset: Math.abs(freeDescription.y - proDescription.y),
        listOffset: Math.abs(freeList.y - proList.y),
        selectorTitleCenterOffset: Math.abs(
          selector.y + selector.height / 2 - (proTitle.y + proTitle.height / 2),
        ),
        selectorRightOffset: Math.abs(selector.right - proHeading.right),
      };
    });
  expect(pricingLayout.cardDisplay).toBe("flex");
  expect(pricingLayout.ctaOffset).toBeLessThanOrEqual(1);
  expect(pricingLayout.freeHeadingGap).toBeLessThanOrEqual(4);
  expect(pricingLayout.freeListGap).toBeLessThanOrEqual(24);
  expect(pricingLayout.proHeadingGap).toBeLessThanOrEqual(4);
  expect(pricingLayout.proListGap).toBeLessThanOrEqual(32);
  expect(pricingLayout.headingOffset).toBeLessThanOrEqual(1);
  expect(pricingLayout.priceOffset).toBeLessThanOrEqual(1);
  expect(pricingLayout.descriptionOffset).toBeLessThanOrEqual(1);
  expect(pricingLayout.listOffset).toBeLessThanOrEqual(1);
  expect(pricingLayout.selectorTitleCenterOffset).toBeLessThanOrEqual(1);
  expect(pricingLayout.selectorRightOffset).toBeLessThanOrEqual(1);
  await expect(page.getByRole("link", { name: "Practice" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pricing" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "/privacy",
  );
  const footerStyle = await page
    .locator(".product-footer")
    .evaluate((footer) => {
      const links = footer.querySelector(".footer-links");
      const privacy = footer.querySelector('a[href="/privacy"]');
      return {
        borderTopStyle: getComputedStyle(footer).borderTopStyle,
        linksDisplay: getComputedStyle(links).display,
        linkColor: getComputedStyle(privacy).color,
        linkWeight: getComputedStyle(privacy).fontWeight,
      };
    });
  expect(footerStyle).toEqual({
    borderTopStyle: "solid",
    linksDisplay: "block",
    linkColor: "rgb(47, 111, 115)",
    linkWeight: "700",
  });
});
