import { expect, test } from "@playwright/test";

const publicId = "abcdefghijklmnopqrstuvwx";
const words = [
  { id: "11111111-1111-4111-8111-111111111111", position: 0, word: "apple" },
  { id: "22222222-2222-4222-8222-222222222222", position: 1, word: "banana" },
];

async function mockAssignment(page, mode, submitHandler) {
  await page.route(`**/api/public/assignments/${publicId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        public_id: publicId,
        title: `${mode} practice`,
        mode,
        status: "published",
        max_attempts: 3,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        words,
      }),
    });
  });
  await page.route(
    `**/api/public/assignments/${publicId}/attempts`,
    submitHandler,
  );
}

async function completeAssignment(page) {
  await page.getByLabel("Nickname").fill("Student 01");
  await page.getByRole("button", { name: "Start assignment" }).click();
  for (const answer of ["apple", "wrong"]) {
    await page.locator(".answer-form input").fill(answer);
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByRole("button", { name: "Next word" }).click();
  }
}

for (const mode of ["dictation", "typing"]) {
  test(`${mode} assignment completes on a student device`, async ({ page }) => {
    let submittedBody;
    await mockAssignment(page, mode, async (route) => {
      submittedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: submittedBody.attemptId,
          nickname: submittedBody.nickname,
          score: 1,
          correct_count: 1,
          incorrect_count: 1,
          accuracy: 50,
          duration_seconds: submittedBody.durationSeconds,
          completed_at: new Date().toISOString(),
          missedWords: ["banana"],
        }),
      });
    });

    const navigation = await page.goto(`/a/${publicId}?lang=en`);
    expect(navigation.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator("ins.adsbygoogle")).toHaveCount(0);
    await completeAssignment(page);

    await expect(
      page.getByRole("heading", { name: "Your result" }),
    ).toBeVisible();
    await expect(page.getByText("50%")).toBeVisible();
    expect(submittedBody.nickname).toBe("Student 01");
    expect(submittedBody.answers).toHaveLength(2);
    expect(submittedBody).not.toHaveProperty("score");
  });
}

test("mobile student UI fits the viewport and reports a failed save before retrying", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let calls = 0;
  await mockAssignment(page, "typing", async (route) => {
    calls += 1;
    if (calls === 1) return route.abort("failed");
    const body = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: body.attemptId,
        nickname: body.nickname,
        score: 2,
        correct_count: 2,
        incorrect_count: 0,
        accuracy: 100,
        duration_seconds: body.durationSeconds,
        completed_at: new Date().toISOString(),
        missedWords: [],
      }),
    });
  });

  await page.goto(`/a/${publicId}?lang=en`);
  await completeAssignment(page);
  await expect(page.getByText(/not saved/i)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(
    page.getByText(/has been saved for your teacher/i),
  ).toBeVisible();
  expect(calls).toBe(2);
});

test("a student can return to the start during consecutive assignments", async ({
  page,
}) => {
  let calls = 0;
  await mockAssignment(page, "typing", async (route) => {
    calls += 1;
    const body = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: body.attemptId,
        nickname: body.nickname,
        status: "incomplete",
      }),
    });
  });

  await page.goto(`/a/${publicId}?lang=en`);
  await page.getByLabel("Nickname").fill("Student 01");
  for (let round = 0; round < 2; round += 1) {
    await page.getByRole("button", { name: "Start assignment" }).click();
    await page
      .getByRole("button", { name: "Return to assignment start" })
      .click();
    await expect(
      page.getByRole("button", { name: "Start assignment" }),
    ).toBeVisible();
  }
  expect(calls).toBe(2);
});

test("Google sign-in returns to a prefilled new teacher assignment", async ({
  page,
}) => {
  let signedIn = false;
  let callbackURL = "";
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
              user: {
                id: "teacher-a",
                name: "Teacher A",
                email: "a@example.test",
              },
              plan: "free",
              billingInterval: null,
            }
          : { error: "sign_in_required" },
      ),
    }),
  );
  await page.route("**/api/auth/sign-in/social", async (route) => {
    callbackURL = route.request().postDataJSON().callbackURL;
    signedIn = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: callbackURL }),
    });
  });

  await page.goto("/");
  await page.locator("#custom-word-list").fill("because\nfriend");
  await page.locator('input[name="practice-mode"][value="typing"]').check();
  await page.getByRole("button", { name: "Assign to students" }).click();
  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  await page.getByRole("button", { name: "Continue with Google" }).click();

  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  expect(callbackURL).toBe("/teacher/assignments/new?lang=en");
  await expect(page.getByLabel("Spelling words")).toHaveValue(
    "because\nfriend",
  );
  await expect(page.getByLabel("Typing", { exact: true })).toBeChecked();
});

test("Checkout analytics wait for a Stripe URL and do not duplicate intent", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/billing/checkout", async (route) => {
    calls += 1;
    await route.fulfill({
      status: calls === 1 ? 500 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1
          ? { error: "internal_error" }
          : { url: "/pricing#stripe-checkout" },
      ),
    });
  });

  await page.goto("/pricing");
  const checkout = page.getByRole("button", {
    name: "Continue with monthly plan · $5.99 / month",
  });
  await checkout.click();
  await expect(
    page.getByText("Something went wrong. Please try again."),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingCheckoutInterval"),
    ),
  ).toBe("month");

  const eventNames = () =>
    page.evaluate(() =>
      window.dataLayer
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event")
        .map((entry) => entry[1]),
    );
  expect(
    (await eventNames()).filter((name) => name === "upgrade_clicked"),
  ).toHaveLength(1);
  expect(
    (await eventNames()).filter((name) => name === "checkout_started"),
  ).toHaveLength(0);

  await checkout.click();
  await expect(page).toHaveURL(/#stripe-checkout$/);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingCheckoutInterval"),
    ),
  ).toBeNull();
  expect(
    (await eventNames()).filter((name) => name === "upgrade_clicked"),
  ).toHaveLength(1);
  expect(
    (await eventNames()).filter((name) => name === "checkout_started"),
  ).toHaveLength(1);
});

test("failed automatic Checkout stays retryable on the teacher page", async ({
  page,
}) => {
  let checkoutCalls = 0;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
        plan: "free",
        billingInterval: null,
      }),
    }),
  );
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assignments: [],
        usage: {
          activeAssignments: 0,
          monthlyAttempts: 0,
          studentNicknames: 0,
          limits: { activeAssignments: 2, monthlyAttempts: 30 },
        },
      }),
    }),
  );
  await page.route("**/api/billing/checkout", async (route) => {
    checkoutCalls += 1;
    await route.fulfill({
      status: checkoutCalls === 1 ? 500 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        checkoutCalls === 1
          ? { error: "internal_error" }
          : { url: "/teacher?lang=en#stripe-checkout" },
      ),
    });
  });

  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem("pendingCheckoutInterval", "year"),
  );
  await page.goto("/teacher?lang=en");
  await expect(
    page.getByText(
      "We couldn’t open Stripe Checkout. Your selected plan is still saved.",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingCheckoutInterval"),
    ),
  ).toBe("year");

  await page.getByRole("button", { name: "Try checkout again" }).click();
  await expect(page).toHaveURL(/#stripe-checkout$/);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingCheckoutInterval"),
    ),
  ).toBeNull();
  expect(checkoutCalls).toBe(2);
});

test("mobile conversion pages keep their key actions usable", async ({
  page,
}) => {
  let signedIn = false;
  await page.setViewportSize({ width: 390, height: 844 });
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
              user: {
                id: "teacher-a",
                name: "Teacher A",
                email: "a@example.test",
              },
              plan: "free",
              billingInterval: null,
            }
          : { error: "sign_in_required" },
      ),
    }),
  );

  const expectNoHorizontalOverflow = async () => {
    const layout = await page.evaluate(() => ({
      fits: document.documentElement.scrollWidth <= window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      offenders: Array.from(document.querySelectorAll("body *"))
        .filter(
          (element) =>
            element.getBoundingClientRect().right > window.innerWidth + 1,
        )
        .slice(0, 5)
        .map((element) => ({
          element: `${element.tagName.toLowerCase()}.${element.className}`,
          right: Math.round(element.getBoundingClientRect().right),
        })),
    }));
    expect(layout.fits, JSON.stringify(layout)).toBe(true);
  };

  await page.goto("/");
  await expect(page.locator(".brand-logo")).toBeVisible();
  await expect(page.locator(".lang-btn")).toBeVisible();
  await expect(page.getByRole("link", { name: "For teachers" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sound/ })).toBeVisible();
  await expect(page.locator("header").getByText("Privacy")).toHaveCount(0);
  await expectNoHorizontalOverflow();

  await page.goto("/pricing");
  await expect(
    page.getByRole("link", { name: "Start free teacher account" }),
  ).toHaveAttribute("href", "/teacher?lang=en");
  await expect(page.getByText("Unlimited student submissions")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Monthly plan", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Yearly plan", exact: true }).click();
  await expect(page.getByText("$4.17 / month")).toBeVisible();
  await expect(page.getByText("Billed $49.99 yearly")).toBeVisible();
  await expect(page.getByText("Save 30%")).toBeVisible();
  await expect(
    page.getByText("Secure checkout by Stripe · Cancel anytime"),
  ).toBeVisible();
  await expectNoHorizontalOverflow();

  await page.goto("/teacher?lang=en");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow();

  signedIn = true;
  await page.goto("/teacher/assignments/new?lang=en");
  await expect(page.getByLabel("Spelling words")).toBeVisible();
  await expectNoHorizontalOverflow();
});

test("a Pro dashboard does not load the upgrade pricing component", async ({
  page,
}) => {
  let pricingRequests = 0;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
        plan: "pro",
        limits: {
          activeAssignments: 20,
          monthlyAttempts: null,
          studentNicknames: 150,
        },
        activeAssignments: 0,
        monthlyAttempts: 0,
        studentNicknames: 0,
      }),
    }),
  );
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assignments: [],
        usage: {
          limits: { monthlyAttempts: null },
          monthlyAttempts: 0,
          studentNicknames: 0,
        },
      }),
    }),
  );
  await page.route("**/pricing", (route) => {
    pricingRequests += 1;
    return route.fulfill({ contentType: "text/html", body: "<main></main>" });
  });

  await page.goto("/teacher?lang=en");
  await expect(
    page.getByRole("button", { name: "Manage billing" }),
  ).toBeVisible();
  await expect(page.locator(".teacher-pricing")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pricing" })).toHaveCount(0);
  expect(pricingRequests).toBe(0);
});

test("teacher results render assignment and nickname as inert text", async ({
  page,
}) => {
  const assignmentId = "33333333-3333-4333-8333-333333333333";
  const hostileTitle = "<img src=x onerror=globalThis.pwned=1>";
  const hostileNickname = "<script>globalThis.pwned=2</script>";
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
        plan: "free",
        limits: {
          activeAssignments: 2,
          monthlyAttempts: 30,
          studentNicknames: 30,
        },
        activeAssignments: 1,
        monthlyAttempts: 1,
        studentNicknames: 1,
      }),
    }),
  );
  await page.route(`**/api/assignments/${assignmentId}`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: assignmentId,
        public_id: publicId,
        title: hostileTitle,
        mode: "typing",
        status: "published",
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        words,
        summary: { students: 1, attempts: 1, averageAccuracy: 50 },
        attempts: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            nickname: hostileNickname,
            attempt_number: 1,
            correct_count: 1,
            incorrect_count: 1,
            accuracy: 50,
            missed_words: ["banana"],
            duration_seconds: 42,
            completed_at: new Date().toISOString(),
          },
        ],
        missedWordStats: null,
      }),
    }),
  );

  const navigation = await page.goto(
    `/teacher/assignments/${assignmentId}?lang=en`,
  );
  expect(navigation.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("heading", { name: hostileTitle })).toBeVisible();
  await expect(page.getByRole("cell", { name: hostileNickname })).toBeVisible();
  expect(await page.evaluate(() => globalThis.pwned)).toBeUndefined();
});

test("deleting a result refreshes teacher summaries and reports failures", async ({
  page,
}) => {
  const assignmentId = "55555555-5555-4555-8555-555555555555";
  const attemptId = "66666666-6666-4666-8666-666666666666";
  let deleted = false;
  let deleteCalls = 0;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
        plan: "pro",
        limits: {
          activeAssignments: 20,
          monthlyAttempts: null,
          studentNicknames: 150,
        },
        activeAssignments: 1,
        monthlyAttempts: 1,
        studentNicknames: 1,
      }),
    }),
  );
  await page.route(`**/api/assignments/${assignmentId}`, async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: assignmentId,
        public_id: publicId,
        title: "Week one",
        mode: "typing",
        status: "published",
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        words,
        summary: deleted
          ? { students: 0, attempts: 0, averageAccuracy: 0 }
          : { students: 1, attempts: 1, averageAccuracy: 50 },
        attempts: deleted
          ? []
          : [
              {
                id: attemptId,
                nickname: "Student 01",
                attempt_number: 1,
                status: "completed",
                correct_count: 1,
                incorrect_count: 1,
                accuracy: 50,
                missed_words: ["banana"],
                duration_seconds: 42,
                completed_at: new Date().toISOString(),
              },
            ],
        missedWordStats: deleted ? [] : [{ word: "banana", misses: 1 }],
      }),
    });
  });
  await page.route(
    `**/api/assignments/${assignmentId}/attempts/${attemptId}`,
    async (route) => {
      deleteCalls += 1;
      if (deleteCalls === 1) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "internal_error" }),
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      deleted = true;
      return route.fulfill({ status: 204, body: "" });
    },
  );

  await page.goto(`/teacher/assignments/${assignmentId}?lang=en`);
  const deleteButton = page.getByRole("button", { name: "Delete result" });
  await deleteButton.click();
  await expect(page.getByRole("alert")).toHaveText(
    "The result could not be deleted. Try again.",
  );
  await expect(deleteButton).toBeEnabled();

  await deleteButton.click();
  await expect(deleteButton).toBeDisabled();
  await expect(
    page.getByText("No student has completed this assignment yet."),
  ).toBeVisible();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Students" })
      .locator(".stat-value"),
  ).toHaveText("0");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Submissions" })
      .locator(".stat-value"),
  ).toHaveText("0");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Average accuracy" })
      .locator(".stat-value"),
  ).toHaveText("0%");
  await expect(page.getByText("banana · 1")).toHaveCount(0);
});
