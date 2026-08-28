import { expect, test } from "@playwright/test";

const publicId = "abcdefghijklmnopqrstuvwx";
const words = [
  { id: "11111111-1111-4111-8111-111111111111", position: 0, word: "apple" },
  { id: "22222222-2222-4222-8222-222222222222", position: 1, word: "banana" },
];

async function mockAssignment(
  page,
  mode,
  submitHandler,
  assignmentWords = words,
) {
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
        words: assignmentWords,
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
  await expect(page.getByText("Review word")).toBeVisible();
  await page.locator(".answer-form input").fill("banana");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
}

async function mockWorkspaceRoster(page) {
  await page.route("**/api/assignments", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ assignments: [], learners: [] }),
        })
      : route.fallback(),
  );
}

test("a lone second retry does not immediately repeat the same word", async ({
  page,
}) => {
  const banana = [words[1]];
  let submittedBody;
  await mockAssignment(
    page,
    "typing",
    async (route) => {
      submittedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ...submittedBody,
          correct_count: 0,
          incorrect_count: 1,
          accuracy: 0,
          missedWords: ["banana"],
        }),
      });
    },
    banana,
  );

  await page.goto(`/a/${publicId}?lang=en`);
  await page.getByLabel("Nickname").fill("Student 01");
  await page.getByRole("button", { name: "Start assignment" }).click();
  await page.locator(".answer-form input").fill("wrong");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Next word" }).click();

  await page.locator(".answer-form input").fill("wrong again");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.locator(".answer-form")).toHaveCount(0);

  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.locator(".player-word")).toHaveText("banana");
  await page.locator(".answer-form input").fill("banana");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(
    page.getByRole("heading", { name: "Your result" }),
  ).toBeVisible();
  expect(submittedBody.answers).toEqual([
    { wordId: words[1].id, answer: "wrong" },
  ]);
});

test("other review words separate first and second retries", async ({
  page,
}) => {
  const reviewWords = [
    { ...words[1], position: 0 },
    { ...words[0], position: 1 },
    {
      id: "33333333-3333-4333-8333-333333333333",
      position: 2,
      word: "friend",
    },
  ];
  await mockAssignment(
    page,
    "typing",
    (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          correct_count: 0,
          incorrect_count: 3,
          accuracy: 0,
          missedWords: reviewWords.map((word) => word.word),
        }),
      }),
    reviewWords,
  );

  await page.goto(`/a/${publicId}?lang=en`);
  await page.getByLabel("Nickname").fill("Student 01");
  await page.getByRole("button", { name: "Start assignment" }).click();
  for (const word of reviewWords) {
    await expect(page.locator(".player-word")).toHaveText(word.word);
    await page.locator(".answer-form input").fill("wrong");
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByRole("button", { name: "Next word" }).click();
  }

  for (const [word, answer] of [
    ["banana", "wrong again"],
    ["apple", "apple"],
    ["friend", "friend"],
    ["banana", "banana"],
  ]) {
    await expect(page.locator(".player-word")).toHaveText(word);
    await page.locator(".answer-form input").fill(answer);
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByRole("button", { name: "Next word" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Your result" }),
  ).toBeVisible();
});

test("magic learner links use the server identity and hide nickname entry", async ({
  page,
}) => {
  const learnerPublicId = "learnerToken123456789012";
  let submittedBody;
  await page.route(`**/api/public/learners/${learnerPublicId}`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        learner: { name: "Emily" },
        assignments: [
          {
            public_id: publicId,
            title: "Week 3 Spelling",
            mode: "typing",
            expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          },
        ],
      }),
    }),
  );
  await page.route(
    `**/api/public/assignments/${publicId}?learner=${learnerPublicId}`,
    (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          public_id: publicId,
          title: "Week 3 Spelling",
          mode: "typing",
          max_attempts: 3,
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          learner: { name: "Emily" },
          words: [words[0]],
        }),
      }),
  );
  await page.route(
    `**/api/public/assignments/${publicId}/attempts`,
    async (route) => {
      submittedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ...submittedBody,
          correct_count: 1,
          incorrect_count: 0,
          accuracy: 100,
          missedWords: [],
        }),
      });
    },
  );

  await page.goto(`/l/${learnerPublicId}?lang=en`);
  await expect(page).toHaveTitle("Student home");
  await expect(page.getByRole("heading", { name: "Hi, Emily" })).toBeVisible();
  const startLink = page.getByRole("link", { name: "Start assignment" });
  await expect(startLink).toHaveAttribute(
    "href",
    `/a/${publicId}?learner=${learnerPublicId}&lang=en`,
  );
  await startLink.click();
  await expect(page.getByText("Practicing as Emily")).toBeVisible();
  await expect(page.getByLabel("Nickname")).toHaveCount(0);
  await page.getByRole("button", { name: "Start assignment" }).click();
  await page.locator(".answer-form input").fill("apple");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(
    page.getByRole("heading", { name: "Your result" }),
  ).toBeVisible();
  expect(submittedBody).toMatchObject({ learnerPublicId });
  expect(submittedBody).not.toHaveProperty("nickname");
});

test("teacher uses the visible student PIN to enter the assigned student home", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__copiedText = value;
        },
      },
    });
  });
  const classPublicId = "classroom123";
  const learnerPublicId = "learnerToken123456789012";
  const learnerId = "77777777-7777-4777-8777-777777777777";
  const assignmentId = "88888888-8888-4888-8888-888888888888";
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
  const json = (route, body) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  await page.route("**/api/me", (route) =>
    json(route, {
      user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
      plan: "teacher",
      workspaceType: "family",
      classPublicId,
    }),
  );
  let createdBody;
  await page.route("**/api/assignments", async (route) => {
    if (route.request().method() === "POST") {
      createdBody = route.request().postDataJSON();
      return json(route, { id: assignmentId, publicId });
    }
    return json(route, {
      assignments: [],
      savedLists: [],
      learners: [
        {
          id: learnerId,
          name: "Alice",
          archived: 0,
          join_pin: "1842",
          completed_attempts: 0,
          accuracy: 0,
        },
      ],
      usage: {
        limits: {
          activeAssignments: 5,
          monthlyAttempts: null,
          savedLists: null,
          learnerProfiles: 40,
        },
        activeAssignments: 1,
        monthlyAttempts: 0,
        savedLists: 0,
        learnerProfiles: 1,
      },
    });
  });
  await page.route(`**/api/assignments/${assignmentId}`, (route) =>
    json(route, {
      id: assignmentId,
      public_id: publicId,
      title: "Alice's spelling assignment",
      mode: "typing",
      status: "published",
      words,
      assignedLearners: [{ id: learnerId, name: "Alice" }],
      summary: { students: 0, attempts: 0, averageAccuracy: 0 },
      attempts: [],
      missedWordStats: [],
    }),
  );
  let submittedPin;
  await page.route(`**/api/public/join/${classPublicId}`, async (route) => {
    submittedPin = route.request().postDataJSON().pin;
    await json(route, { learnerPublicId });
  });
  await page.route(`**/api/public/learners/${learnerPublicId}`, (route) =>
    json(route, {
      learner: { name: "Alice" },
      assignments: [
        {
          public_id: publicId,
          title: "Alice's spelling assignment",
          mode: "typing",
          expires_at: expiresAt,
          completed: 0,
        },
      ],
    }),
  );

  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Teacher Plan", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent assignments" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent progress" }),
  ).toBeVisible();
  await expect(page.locator("#saved-list-title")).toHaveCount(0);
  await expect(page.locator("#learner-name")).toHaveCount(0);
  await page
    .locator('.workspace-sidebar-link[data-section="learners"]')
    .click();
  await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add student" })).toBeVisible();
  await expect(
    page
      .locator("#learners")
      .getByRole("link", { name: "Progress", exact: true }),
  ).toBeVisible();
  const aliceRow = page.locator("article", { hasText: "Alice" });
  await expect(aliceRow.getByText("Active", { exact: true })).toBeVisible();
  const pinText = await aliceRow.getByText(/Student PIN: \d{4}/).textContent();
  const visiblePin = pinText.match(/\d{4}/)[0];
  const classUrlText = await page
    .locator(".workspace-class-join p", { hasText: "Class URL:" })
    .textContent();
  const classUrl = classUrlText.match(/https?:\/\/\S+/)[0];
  await expect(
    page.getByRole("button", { name: "Copy class URL" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy class URL" }).click();
  await expect(
    page.getByRole("button", { name: "Class URL copied" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__copiedText)).toBe(classUrl);
  await aliceRow.getByRole("button", { name: "Copy PIN" }).click();
  expect(await page.evaluate(() => window.__copiedText)).toBe(visiblePin);

  await page
    .locator('.workspace-sidebar-link[data-section="overview"]')
    .click();
  await page.getByRole("link", { name: "Create assignment" }).click();
  await expect(
    page.locator('.workspace-sidebar-link[data-section="assignments"]'),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("All students")).toBeVisible();
  await expect(page.getByLabel("Selected students")).toBeVisible();
  await page.getByLabel("Assignment title").fill("Alice's spelling assignment");
  await page.getByLabel("Spelling words").fill("apple\nbanana");
  await page.getByLabel("Typing").check();
  await page.getByLabel("Selected students").check();
  await page.getByLabel("Alice").check();
  await page.getByRole("button", { name: "Create and publish" }).click();
  await expect(page).toHaveURL(`/teacher/assignments/${assignmentId}?lang=en`);
  expect(createdBody.learnerIds).toEqual([learnerId]);
  await expect(page.getByRole("link", { name: "Export CSV" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Most commonly missed words" }),
  ).toBeVisible();

  await page.goto(`${classUrl}?lang=en`);
  await page.getByLabel("Student PIN").fill(visiblePin);
  await page.getByRole("button", { name: "Start assignment" }).click();

  await expect(page).toHaveURL(`/l/${learnerPublicId}?lang=en`);
  await expect(page.getByRole("heading", { name: "Hi, Alice" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Alice's spelling assignment" }),
  ).toBeVisible();
  expect(submittedPin).toBe(visiblePin);
});

test("Free workspace stays neutral regardless of legacy workspace type", async ({
  page,
}) => {
  let workspaceType = "family";
  const learnerId = "99999999-9999-4999-8999-999999999999";
  const json = (route, body) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  await page.route("**/api/me", (route) =>
    json(route, {
      user: { id: "account-a", name: "Account A", email: "a@example.test" },
      plan: "free",
      workspaceType,
      classPublicId: "legacyClass123",
    }),
  );
  await page.route("**/api/assignments", (route) =>
    json(route, {
      assignments: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "Week one",
          status: "published",
          student_count: 1,
          attempt_count: 0,
          average_accuracy: 0,
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        },
      ],
      savedLists: [],
      learners: [
        {
          id: learnerId,
          name: "Alex",
          archived: 0,
          join_pin: "1842",
          completed_attempts: 0,
          accuracy: 0,
        },
      ],
      usage: {
        limits: {
          activeAssignments: 1,
          monthlyAttempts: 8,
          savedLists: 1,
          learnerProfiles: 1,
        },
        activeAssignments: 1,
        monthlyAttempts: 0,
        savedLists: 0,
        learnerProfiles: 1,
      },
    }),
  );

  const expectNeutralWorkspace = async () => {
    await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Recent assignments" }),
    ).toBeVisible();
    await expect(page.locator("#saved-list-title")).toHaveCount(0);
    await expect(page.locator("#learner-name")).toHaveCount(0);
    await expect(page.getByText("1 of 1 learner profiles")).toBeVisible();
    await page
      .locator('.workspace-sidebar-link[data-section="learners"]')
      .click();
    await expect(page.getByRole("heading", { name: "Learners" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add learner" }),
    ).toBeVisible();
    await expect(
      page
        .locator("#learners")
        .getByRole("link", { name: "Progress", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Children" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Add child" })).toHaveCount(
      0,
    );
    await expect(page.getByText(/Class URL:/)).toHaveCount(0);
    await expect(page.getByText(/Student PIN:/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Copy PIN" })).toHaveCount(0);
  };

  await expectNeutralWorkspace();
  workspaceType = "teacher";
  await expectNeutralWorkspace();

  await page.goto("/teacher/assignments/new?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByLabel("Selected learners")).toBeVisible();
  await expect(page.getByLabel("All students")).toHaveCount(0);
  const sentenceLibraryButton = page.getByRole("button", {
    name: /Auto-fill example sentences/,
  });
  await expect(sentenceLibraryButton).toBeVisible();
  await expect(
    sentenceLibraryButton.locator(".sentence-library-upgrade-badge"),
  ).toHaveText("Upgrade");
  await expect(sentenceLibraryButton).toHaveAttribute(
    "title",
    "Sentence library is included in Parent and Teacher Plans.",
  );
  await sentenceLibraryButton.click();
  await expect(page).toHaveURL(/\/pricing#pricing$/);
});

const analyticsEvents = (page, name) =>
  page.evaluate(
    (eventName) =>
      window.dataLayer
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event" && entry[1] === eventName)
        .map((entry) => entry[2]),
    name,
  );

const limitWords = (count) =>
  Array.from({ length: count }, (_, index) => {
    let suffix = "";
    let value = index;
    do {
      suffix = String.fromCharCode(97 + (value % 26)) + suffix;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return `limitword${suffix}`;
  }).join("\n");

test("practice advises signed-in plans after 20 words and preserves hard limits", async ({
  page,
}) => {
  let account = null;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: account ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(account || {}),
    }),
  );

  await page.goto("/");
  await page.locator("#custom-word-list").fill(limitWords(20));
  await expect(page.locator("#long-list-advice")).toBeHidden();
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await expect(
    page.getByRole("button", { name: "Return to main menu" }),
  ).toBeVisible();
  await expect(page.locator("#sound-toggle")).toBeHidden();
  await page.getByRole("button", { name: "Return to main menu" }).click();

  await page.locator("#custom-word-list").fill(limitWords(21));
  await expect(page.locator("#long-list-advice")).toBeHidden();
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await expect(page.locator("#spelling-status")).toContainText(
    "No-login practice supports up to 20 words",
  );

  await page.getByRole("button", { name: "Copy practice link" }).click();
  await page
    .locator(".practice-share-option", { hasText: "Practice only" })
    .click();
  await expect(page.locator("#spelling-status")).toContainText(
    "No-login practice supports up to 20 words",
  );

  account = { plan: "free", user: { id: "teacher-a", name: "Teacher A" } };
  await page.reload();
  await page.locator("#custom-word-list").fill(limitWords(20));
  await expect(page.locator("#long-list-advice")).toBeHidden();
  await page.locator("#custom-word-list").fill(limitWords(21));
  await expect(page.locator("#long-list-advice")).toContainText(
    "Longer lists can increase memory load",
  );
  await expect(page.locator("#long-list-advice")).not.toContainText(/upgrade/i);
  await expect(page.locator("#spelling-limit-cta")).toHaveCount(0);
  await expect(page.locator("#custom-word-list")).toHaveValue(limitWords(21));
  await page.locator("#custom-word-list").fill(limitWords(30));
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await expect(
    page.getByRole("button", { name: "Return to main menu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to main menu" }).click();
  await page.locator("#custom-word-list").fill(limitWords(31));
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await expect(page.locator("#spelling-status")).toContainText(
    "Free accounts support up to 30 words",
  );
  await expect(page.locator("#spelling-limit-cta")).toHaveAttribute(
    "href",
    "/pricing#pricing",
  );

  account.plan = "parent";
  await page.reload();
  await page.locator("#custom-word-list").fill(limitWords(21));
  await expect(page.locator("#long-list-advice")).toBeVisible();
  await page.locator("#custom-word-list").fill(limitWords(40));
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await expect(
    page.getByRole("button", { name: "Return to main menu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to main menu" }).click();
  await page.locator("#custom-word-list").fill(limitWords(41));
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await expect(page.locator("#spelling-status")).toContainText(
    "Paid plans support up to 40",
  );

  account.plan = "teacher";
  await page.reload();
  await page.locator("#custom-word-list").fill(limitWords(21));
  await expect(page.locator("#long-list-advice")).toBeVisible();
  await page.locator("#custom-word-list").fill(limitWords(41));
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await expect(page.locator("#spelling-status")).toContainText(
    "Paid plans support up to 40",
  );
});

for (const [locale, href, advice] of [
  ["es", "/es/pricing#pricing", "Las listas largas pueden aumentar"],
  ["zh", "/zh/pricing#pricing", "词表较长时，记忆负担可能增加"],
]) {
  test(`${locale} Free word-limit upgrade stays in the active locale`, async ({
    page,
  }) => {
    await page.route("**/api/me", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          plan: "free",
          user: { id: "teacher-a", name: "Teacher A" },
        }),
      }),
    );
    await page.goto(`/${locale}/`);
    await page.locator("#custom-word-list").fill(limitWords(21));
    await expect(page.locator("#long-list-advice")).toContainText(advice);
    await page.locator("#custom-word-list").fill(limitWords(41));
    await page.locator("#start-practice-btn").click();
    await expect(page.locator("#spelling-limit-cta")).toHaveAttribute(
      "href",
      href,
    );
  });
}

test("practice records a valid list and start separately", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#custom-word-list").fill("because\nfriend");
  await page.locator('input[name="practice-mode"][value="typing"]').check();
  await expect(page.locator("#custom-example-sentences")).toBeHidden();
  await page.getByRole("button", { name: "Start Typing Rain" }).click();
  const sound = page.getByRole("button", { name: "Sound" });
  const returnToMenu = page.getByRole("button", {
    name: "Return to main menu",
  });
  await expect(sound).toBeVisible();
  await expect(returnToMenu).toBeVisible();
  await expect(page.locator(".game-toolbar-actions > button")).toHaveCount(2);
  await expect(page.locator(".game-toolbar-actions > button").first()).toHaveId(
    "sound-toggle",
  );
  await expect(sound).toHaveCSS("align-items", "center");
  await expect(returnToMenu).toHaveCSS("align-items", "center");
  expect(
    await page.locator(".game-toolbar-actions").evaluate((toolbar) => {
      const toolbarRect = toolbar.getBoundingClientRect();
      const containerRect = document
        .getElementById("game-container")
        .getBoundingClientRect();
      return toolbarRect.right <= containerRect.right + 1;
    }),
  ).toBe(true);
  await sound.click();
  await expect(page.getByRole("button", { name: "Muted" })).toBeVisible();

  await expect
    .poll(() => analyticsEvents(page, "practice_started"))
    .toEqual([{ mode: "typing", word_count: 2 }]);
  expect(await analyticsEvents(page, "word_list_created")).toHaveLength(1);
});

test("Copy practice link chooses anonymous practice before copying", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(value) {
          window.copiedPracticeUrl = value;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/");
  await page.locator("#custom-word-list").fill("because\nfriend");
  await page.locator('input[name="practice-mode"][value="typing"]').check();

  const trigger = page.getByRole("button", { name: "Copy practice link" });
  await trigger.click();
  const chooser = page.locator("#practice-share-options");
  await expect(chooser).toBeVisible();
  await expect(chooser.getByText("Share this practice")).toBeVisible();
  await expect(chooser.locator(".practice-share-option")).toHaveCount(2);
  await expect(chooser).toContainText("Practice only");
  await expect(chooser).toContainText("Track results");
  expect(await page.evaluate(() => window.copiedPracticeUrl)).toBeUndefined();
  expect(await analyticsEvents(page, "practice_link_copied")).toEqual([]);

  await trigger.click();
  await expect(chooser).toHaveCount(0);
  await trigger.click();
  expect(await analyticsEvents(page, "practice_share_options_viewed")).toEqual([
    { mode: "typing", word_count: 2, locale: "en" },
  ]);

  await page
    .locator(".practice-share-option", { hasText: "Practice only" })
    .click();
  expect(await page.evaluate(() => window.copiedPracticeUrl)).toMatch(
    /\/#words=/,
  );
  await expect(page).toHaveURL("/");
  await expect(chooser).toHaveCount(0);
  await expect(
    page.getByText("Want student results? Create a free assignment."),
  ).toHaveCount(0);
  expect(await analyticsEvents(page, "practice_link_copied")).toEqual([
    {
      mode: "typing",
      word_count: 2,
      locale: "en",
      share_type: "practice_only",
    },
  ]);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    ),
  ).toBeNull();
});

test("Practice only keeps the existing prompt fallback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("unavailable")) },
    });
    window.prompt = (_message, value) => {
      window.promptedPracticeUrl = value;
      return value;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Copy practice link" }).click();
  await page
    .locator(".practice-share-option", { hasText: "Practice only" })
    .click();
  expect(await page.evaluate(() => window.promptedPracticeUrl)).toMatch(
    /\/#words=/,
  );
  await expect(page.locator("#practice-share-options")).toHaveCount(0);
  await expect(page.locator("#spelling-status")).toHaveText(
    "Practice link ready",
  );
});

test("share choices are localized without raw message keys", async ({
  page,
}) => {
  for (const path of ["/es/", "/pt-br/", "/fr/", "/id/", "/zh/"]) {
    await page.goto(path);
    await page.locator("#copy-practice-link-btn").click();
    const chooser = page.locator("#practice-share-options");
    await expect(chooser).toBeVisible();
    await expect(chooser.locator(".practice-share-option")).toHaveCount(2);
    await expect(chooser).not.toContainText(
      /sharePracticeTitle|practiceOnlyTitle|trackResultsTitle/,
    );
  }
});

test("Track results skips anonymous copying and opens the existing assignment flow", async ({
  page,
}) => {
  await mockWorkspaceRoster(page);
  const assignmentId = "44444444-4444-4444-8444-444444444444";
  let signedIn = false;
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText() {
          sessionStorage.setItem(
            "clipboardWrites",
            String(Number(sessionStorage.getItem("clipboardWrites")) + 1),
          );
          return Promise.resolve();
        },
      },
    });
  });
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
            }
          : { error: "sign_in_required" },
      ),
    }),
  );
  await page.route("**/api/auth/sign-in/social", async (route) => {
    signedIn = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: route.request().postDataJSON().callbackURL }),
    });
  });
  await page.route("**/api/assignments", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: assignmentId, publicId }),
    });
  });
  await page.route(`**/api/assignments/${assignmentId}`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: assignmentId,
        public_id: publicId,
        title: "Tracked practice",
        mode: "typing",
        status: "published",
        words: [],
        summary: { students: 0, attempts: 0, averageAccuracy: 0 },
        attempts: [],
        missedWordStats: null,
      }),
    }),
  );
  await page.goto("/");
  await page.locator("#custom-word-list").fill("because\nfriend");
  await page
    .locator("#custom-example-sentences")
    .fill("It rained.\nA friend helped.");
  await page.locator('input[name="practice-mode"][value="typing"]').check();
  await page.evaluate(() => {
    addEventListener("beforeunload", () => {
      sessionStorage.setItem(
        "eventsBeforeNavigation",
        JSON.stringify(window.dataLayer.map((entry) => Array.from(entry))),
      );
    });
  });

  await page.getByRole("button", { name: "Copy practice link" }).click();
  await page
    .locator(".practice-share-option", { hasText: "Track results" })
    .click();
  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({
      words: sessionStorage.getItem("mySpellingTeacherDraftWords"),
      sentences: sessionStorage.getItem("mySpellingTeacherDraftSentences"),
      mode: sessionStorage.getItem("mySpellingTeacherDraftMode"),
      source: sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
      event: JSON.parse(
        sessionStorage.getItem("eventsBeforeNavigation") || "[]",
      )
        .filter((item) => item[1] === "assignment_entry_clicked")
        .at(-1)?.[2],
    })),
  ).toEqual({
    words: "because\nfriend",
    sentences: "It rained.\nA friend helped.",
    mode: "typing",
    source: "copy_track",
    event: { mode: "typing", word_count: 2, entry_point: "copy_track" },
  });
  expect(
    await page.evaluate(() =>
      Number(sessionStorage.getItem("clipboardWrites") || 0),
    ),
  ).toBe(0);
  await page.evaluate(() => {
    addEventListener("beforeunload", () => {
      sessionStorage.setItem(
        "trackAuthEvents",
        JSON.stringify(window.dataLayer.map((entry) => Array.from(entry))),
      );
    });
  });
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByLabel("Assignment title")).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("trackAuthEvents") || "[]")
        .filter((entry) => entry[1] === "teacher_auth_started")
        .map((entry) => entry[2]),
    ),
  ).toEqual([{ entry_point: "copy_track" }]);
  expect(await analyticsEvents(page, "teacher_auth_completed")).toEqual([
    { entry_point: "copy_track" },
  ]);
  await page.getByLabel("Assignment title").fill("Tracked practice");
  await page.evaluate(() => {
    addEventListener("beforeunload", () => {
      sessionStorage.setItem(
        "trackCreateEvents",
        JSON.stringify(window.dataLayer.map((entry) => Array.from(entry))),
      );
    });
  });
  await page.getByRole("button", { name: "Create and publish" }).click();
  await expect(page).toHaveURL(`/teacher/assignments/${assignmentId}?lang=en`);
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("trackCreateEvents") || "[]")
        .filter((entry) => entry[1] === "assignment_created")
        .map((entry) => entry[2]),
    ),
  ).toEqual([{ mode: "typing", word_count: 2, entry_point: "copy_track" }]);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    ),
  ).toBeNull();
});

test("signed-in Track results opens the existing assignment form directly", async ({
  page,
}) => {
  await mockWorkspaceRoster(page);
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
        plan: "free",
      }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Copy practice link" }).click();
  await page
    .locator(".practice-share-option", { hasText: "Track results" })
    .click();
  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  await expect(page.getByLabel("Assignment title")).toBeVisible();
  await expect(page.getByLabel("Spelling words")).toHaveValue(
    "because\nfriend\nbeautiful\nanswer\nenough\nfavorite\nlibrary\nthrough",
  );
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    ),
  ).toBe("copy_track");
});

test("typing result offers Workspace CTA and keeps the practice draft", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/");
  await page.locator("#custom-word-list").fill("because\nfriend");
  await page
    .locator("#custom-example-sentences")
    .fill("It rained.\nA friend helped.");
  await page.locator('input[name="practice-mode"][value="typing"]').check();
  await page.getByRole("button", { name: "Start Typing Rain" }).click();
  await page.evaluate(() => {
    window.gameState.spellingWordsProcessed = 2;
    window.gameState.missedWordList = ["friend"];
    window.endGame();
  });

  await expect(
    page.getByRole("button", { name: "Continue in Workspace" }),
  ).toBeVisible();
  expect(await analyticsEvents(page, "signup_cta_viewed")).toEqual([
    {
      mode: "typing",
      word_count: 2,
      missed_count: 1,
      replay_round: false,
      cta_location: "practice_result",
    },
  ]);
  await page.evaluate(() => {
    addEventListener("beforeunload", () => {
      const events = window.dataLayer
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event");
      sessionStorage.setItem("eventsBeforeNavigation", JSON.stringify(events));
    });
  });
  await page.getByRole("button", { name: "Continue in Workspace" }).click();
  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  expect(
    await page.evaluate(() => ({
      words: sessionStorage.getItem("mySpellingTeacherDraftWords"),
      sentences: sessionStorage.getItem("mySpellingTeacherDraftSentences"),
      mode: sessionStorage.getItem("mySpellingTeacherDraftMode"),
      source: sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    })),
  ).toEqual({
    words: "because\nfriend",
    sentences: "It rained.\nA friend helped.",
    mode: "typing",
    source: "practice_result",
  });
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("eventsBeforeNavigation") || "[]")
        .filter((entry) => entry[1] === "assignment_entry_clicked")
        .map((entry) => entry[2]),
    ),
  ).toEqual([
    { mode: "typing", word_count: 2, entry_point: "practice_result" },
  ]);
});

test("signed-in result keeps the CTA without signup copy or signup analytics", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { id: "teacher-1" }, plan: "free" }),
    }),
  );
  await page.goto("/");
  await page.locator("#custom-word-list").fill("because");
  await page.locator("#custom-example-sentences").fill("It rained.");
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await page.evaluate(() => {
    window.gameState.dictationSummary = {
      total: 1,
      correct: 0,
      incorrect: 1,
      accuracy: 0,
      missedWords: ["because"],
    };
    window.endGame();
  });

  await expect(
    page.getByRole("button", { name: "Continue in Workspace" }),
  ).toBeVisible();
  await expect(page.getByText("Free account · Google sign-in")).toBeHidden();
  expect(await analyticsEvents(page, "signup_cta_viewed")).toEqual([]);

  await page.evaluate(() => {
    addEventListener("beforeunload", () => {
      const events = window.dataLayer
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event");
      sessionStorage.setItem("eventsBeforeNavigation", JSON.stringify(events));
    });
  });
  await page.getByRole("button", { name: "Continue in Workspace" }).click();
  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  expect(
    await page.evaluate(() => ({
      words: sessionStorage.getItem("mySpellingTeacherDraftWords"),
      sentences: sessionStorage.getItem("mySpellingTeacherDraftSentences"),
      mode: sessionStorage.getItem("mySpellingTeacherDraftMode"),
    })),
  ).toEqual({
    words: "because",
    sentences: "It rained.",
    mode: "dictation",
  });
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("eventsBeforeNavigation") || "[]")
        .filter((entry) => entry[1] === "assignment_entry_clicked")
        .map((entry) => entry[2]),
    ),
  ).toEqual([
    { mode: "dictation", word_count: 1, entry_point: "practice_result" },
  ]);
});

test("dictation result uses the same Workspace CTA", async ({ page }) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/");
  await page.locator("#custom-word-list").fill("because");
  await page.getByRole("button", { name: "Start Spelling Test" }).click();
  await page.evaluate(() => {
    window.gameState.dictationSummary = {
      total: 1,
      correct: 1,
      incorrect: 0,
      accuracy: 100,
      missedWords: [],
    };
    window.endGame();
  });
  await expect(
    page.getByRole("button", { name: "Continue in Workspace" }),
  ).toBeVisible();
  expect(await analyticsEvents(page, "signup_cta_viewed")).toEqual([
    {
      mode: "dictation",
      word_count: 1,
      missed_count: 0,
      replay_round: false,
      cta_location: "practice_result",
    },
  ]);
});

test("free practice accepts optional example sentences and replays the full prompt", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#custom-example-sentences")).toBeVisible();
  await page.locator("#custom-word-list").fill("because\nfriend");
  await page
    .locator("#custom-example-sentences")
    .fill("I stayed inside because it was raining.\n");
  await page.getByRole("button", { name: "Start Spelling Test" }).click();

  await expect(page.locator("#dictation-screen")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.gameState.exampleSentences))
    .toEqual({
      because: "I stayed inside because it was raining.",
      friend: "",
    });
  await page.getByRole("button", { name: "Return to main menu" }).click();
  await expect(
    page.getByRole("button", { name: "Start Spelling Test" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Return to main menu" }),
  ).toBeHidden();
});

test("dictation receives optional example sentence data and speaks the full prompt", async ({
  page,
}) => {
  const sentenceWords = [
    {
      ...words[0],
      example_sentence: "I ate an apple after school.",
    },
  ];
  await page.addInitScript(() => {
    const calls = [];
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {},
        speak(utterance) {
          calls.push(utterance.text);
        },
      },
    });
    window.__speechCalls = calls;
  });
  await mockAssignment(
    page,
    "dictation",
    (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          correct_count: 1,
          incorrect_count: 0,
          accuracy: 100,
          missedWords: [],
        }),
      }),
    sentenceWords,
  );
  await page.goto(`/a/${publicId}?lang=en`);
  await page.getByLabel("Nickname").fill("Student 01");
  await page.getByRole("button", { name: "Start assignment" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__speechCalls))
    .toContain("apple. I ate an apple after school. apple.");
  await page.getByRole("button", { name: "Play word" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__speechCalls.length))
    .toBe(2);
  await page.locator(".answer-form input").fill("wrong");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.getByText("Review word")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__speechCalls.at(-1)))
    .toBe("apple. I ate an apple after school. apple.");
});

test("teacher creates an assignment with an example sentence and the student player loads it", async ({
  page,
}) => {
  const assignmentId = "33333333-3333-4333-8333-333333333333";
  const sentence = "I stayed inside because it was raining.";
  let createdBody;
  let createCalls = 0;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
        plan: "free",
      }),
    }),
  );
  await page.route("**/api/assignments", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          assignments: [],
          savedLists: [
            {
              id: "55555555-5555-4555-8555-555555555555",
              title: "Sentence practice",
              words: ["because"],
              word_details: [{ word: "because", example_sentence: sentence }],
            },
          ],
          usage: {
            activeAssignments: 0,
            monthlyAttempts: 0,
            studentNicknames: 0,
            limits: { activeAssignments: 1, monthlyAttempts: 8 },
          },
        }),
      });
    }
    createCalls += 1;
    createdBody = route.request().postDataJSON();
    if (createCalls === 1) {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "internal_error" }),
      });
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: assignmentId, publicId }),
    });
  });
  await page.route(`**/api/assignments/${assignmentId}`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: assignmentId,
        public_id: publicId,
        title: "Sentence practice",
        mode: "dictation",
        status: "published",
        words: [{ ...words[0], word: "because", example_sentence: sentence }],
        summary: { students: 0, attempts: 0, averageAccuracy: 0 },
        attempts: [],
        missedWordStats: null,
      }),
    }),
  );
  await page.route(`**/api/public/assignments/${publicId}`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        public_id: publicId,
        title: "Sentence practice",
        mode: "dictation",
        status: "published",
        max_attempts: 3,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        words: [{ ...words[0], word: "because", example_sentence: sentence }],
      }),
    }),
  );

  await page.goto("/teacher?lang=en");
  await page.evaluate(() =>
    sessionStorage.setItem("mySpellingAssignmentEntryPoint", "copy_track"),
  );
  await page.getByRole("button", { name: "Use for assignment" }).click();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    ),
  ).toBe("workspace");
  await page.getByLabel("Assignment title").fill("Sentence practice");
  await page.getByLabel("Spelling words").fill("because");
  await page.getByLabel("Example sentences (optional)").fill(sentence);
  await page.getByRole("button", { name: "Create and publish" }).click();
  await expect(
    page.getByRole("button", { name: "Create and publish" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    ),
  ).toBe("workspace");
  await page.evaluate(() => {
    addEventListener("beforeunload", () => {
      sessionStorage.setItem(
        "createEventsBeforeNavigation",
        JSON.stringify(window.dataLayer.map((entry) => Array.from(entry))),
      );
    });
  });
  await page.getByRole("button", { name: "Create and publish" }).click();
  await expect(page).toHaveURL(`/teacher/assignments/${assignmentId}?lang=en`);
  expect(createdBody).toMatchObject({
    title: "Sentence practice",
    words: "because",
    exampleSentences: sentence,
    mode: "dictation",
  });
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("createEventsBeforeNavigation") || "[]")
        .filter((entry) => entry[1] === "assignment_created")
        .map((entry) => entry[2]),
    ),
  ).toEqual([{ mode: "dictation", word_count: 1, entry_point: "workspace" }]);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    ),
  ).toBeNull();

  await page.goto(`/a/${publicId}?lang=en`);
  await expect(
    page.getByRole("heading", { name: "Sentence practice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start assignment" }),
  ).toBeVisible();
});

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

test("student quota errors record their type once", async ({ page }) => {
  await mockAssignment(page, "typing", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "monthly_submission_limit" }),
    }),
  );

  await page.goto(`/a/${publicId}?lang=en`);
  await completeAssignment(page);
  await expect(page.locator(".status.error")).toBeVisible();
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect
    .poll(() => analyticsEvents(page, "usage_limit_reached"))
    .toEqual([{ limit_type: "monthly_submissions" }]);
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
  await mockWorkspaceRoster(page);
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
  await page.evaluate(() => {
    addEventListener("beforeunload", () => {
      const events = window.dataLayer
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event");
      sessionStorage.setItem("eventsBeforeNavigation", JSON.stringify(events));
    });
  });
  const assign = page.getByRole("button", {
    name: "Assign homework",
  });
  await expect(page.locator("#practice-share-options")).toHaveCount(0);
  const alignment = await Promise.all([
    assign.boundingBox(),
    page.locator(".spelling-actions").boundingBox(),
  ]);
  expect(
    Math.abs(
      alignment[1].x + alignment[1].width - alignment[0].x - alignment[0].width,
    ),
  ).toBeLessThanOrEqual(12);
  await assign.click();
  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  expect(
    await page.evaluate(() =>
      JSON.parse(
        sessionStorage.getItem("eventsBeforeNavigation") || "[]",
      ).filter((entry) => entry[1] === "assignment_entry_clicked"),
    ),
  ).toEqual([
    [
      "event",
      "assignment_entry_clicked",
      { mode: "typing", word_count: 2, entry_point: "assign_homework" },
    ],
  ]);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    ),
  ).toBe("assign_homework");
  await page.evaluate(() => {
    addEventListener("beforeunload", () => {
      sessionStorage.setItem(
        "authEventsBeforeNavigation",
        JSON.stringify(window.dataLayer.map((entry) => Array.from(entry))),
      );
    });
  });
  await page.getByRole("button", { name: "Continue with Google" }).click();

  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  expect(callbackURL).toBe("/teacher/assignments/new?lang=en");
  await expect(page.getByLabel("Spelling words")).toHaveValue(
    "because\nfriend",
  );
  await expect(page.getByLabel("Typing", { exact: true })).toBeChecked();
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("authEventsBeforeNavigation") || "[]")
        .filter((entry) => entry[1] === "teacher_auth_started")
        .map((entry) => entry[2]),
    ),
  ).toEqual([{ entry_point: "assign_homework" }]);
  expect(await analyticsEvents(page, "teacher_auth_completed")).toEqual([
    { entry_point: "assign_homework" },
  ]);
});

test("Parent plan starts Checkout with its plan and interval", async ({
  page,
}) => {
  let checkoutBody;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "parent-a", name: "Parent A", email: "a@example.test" },
        plan: "free",
      }),
    }),
  );
  await page.route("**/api/billing/checkout", (route) => {
    checkoutBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: "/pricing#parent-checkout" }),
    });
  });

  await page.goto("/pricing");
  const parent = page.getByRole("button", { name: "Select Parent Plan" });
  await parent.scrollIntoViewIfNeeded();
  await expect
    .poll(() => analyticsEvents(page, "upgrade_viewed"))
    .toHaveLength(1);
  await page.getByRole("button", { name: "Yearly plan" }).click();
  await parent.click();
  await expect(page).toHaveURL(/#parent-checkout$/);
  expect(checkoutBody).toEqual({
    plan: "parent",
    interval: "year",
    locale: "en",
  });
});

test("Teacher plan starts Checkout with its plan and interval", async ({
  page,
}) => {
  let checkoutBody;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
        plan: "free",
      }),
    }),
  );
  await page.route("**/api/billing/checkout", (route) => {
    checkoutBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: "/pricing#teacher-checkout" }),
    });
  });

  await page.goto("/pricing");
  await page.getByRole("button", { name: "Select Teacher Plan" }).click();
  await expect(page).toHaveURL(/#teacher-checkout$/);
  expect(checkoutBody).toEqual({
    plan: "teacher",
    interval: "month",
    locale: "en",
  });
});

test("failed automatic Checkout stays retryable on the teacher page", async ({
  page,
}) => {
  let checkoutCalls = 0;
  const checkoutBodies = [];
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
          limits: { activeAssignments: 1, monthlyAttempts: 8 },
        },
      }),
    }),
  );
  await page.route("**/api/billing/checkout", async (route) => {
    checkoutCalls += 1;
    checkoutBodies.push(route.request().postDataJSON());
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
  await page.evaluate(() =>
    sessionStorage.setItem("pendingCheckoutPlan", "parent"),
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
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBe("en");

  await page.getByRole("button", { name: "Try checkout again" }).click();
  await expect(page).toHaveURL(/#stripe-checkout$/);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingCheckoutInterval"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBe("en");
  expect(checkoutCalls).toBe(2);
  expect(checkoutBodies).toEqual([
    { plan: "parent", interval: "year", locale: "en" },
    { plan: "parent", interval: "year", locale: "en" },
  ]);
});

for (const path of ["/", "/es/", "/pt-br/", "/fr/", "/id/", "/zh/"]) {
  test(`${path} homepage actions stay on one desktop row`, async ({ page }) => {
    await page.setViewportSize({ width: 1005, height: 900 });
    await page.goto(path);
    const layout = await page
      .locator(".spelling-actions")
      .evaluate((actions) => {
        const buttons = [...actions.querySelectorAll("button")].map((button) =>
          button.getBoundingClientRect(),
        );
        return {
          count: buttons.length,
          rowOffset:
            Math.max(...buttons.map(({ top }) => top)) -
            Math.min(...buttons.map(({ top }) => top)),
          overflow: actions.scrollWidth > actions.clientWidth + 1,
        };
      });
    expect(layout.count, path).toBe(4);
    expect(layout.rowOffset, path).toBeLessThanOrEqual(1);
    expect(layout.overflow, path).toBe(false);
  });
}

test("mobile conversion pages keep their key actions usable", async ({
  page,
}) => {
  await mockWorkspaceRoster(page);
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
  await expect(
    page.getByRole("link", { name: "Workspace", exact: true }),
  ).toBeVisible();
  await expect(page.locator("header #sound-toggle")).toHaveCount(0);
  await expect(page.locator("#game-container #sound-toggle")).toBeHidden();
  await expect(page.locator("header").getByText("Privacy")).toHaveCount(0);
  const privacy = page
    .locator(".spelling-actions")
    .getByRole("button", { name: "Privacy" });
  await expect(privacy).toBeVisible();
  await privacy.click();
  await expect(page.locator("#privacy-policy")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator("#game-start")).toBeVisible();
  await expectNoHorizontalOverflow();

  await page.goto("/pricing");
  await expect(
    page.getByRole("link", { name: "Create free account" }),
  ).toHaveAttribute("href", "/teacher?lang=en#teacher-sign-in");
  await expect(
    page.getByText("Unlimited tracked submissions").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Monthly plan", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Yearly plan", exact: true }).click();
  await expect(page.getByText("$49.99 / year")).toBeVisible();
  await expect(page.getByText("$99.99 / year")).toBeVisible();
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

test("Free workspace warns before the submission limit and paid plans do not", async ({
  page,
}) => {
  let plan = "free";
  let monthlyAttempts = 6;
  const json = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  await page.route("**/api/me", (route) =>
    json(route, {
      user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
      plan,
      workspaceType: null,
    }),
  );
  await page.route("**/api/assignments", (route) =>
    json(route, {
      assignments: [],
      savedLists: [],
      learners: [],
      usage: {
        limits: {
          activeAssignments: plan === "free" ? 1 : 5,
          monthlyAttempts: plan === "free" ? 8 : null,
          savedLists: plan === "free" ? 1 : null,
          learnerProfiles: plan === "free" ? 1 : 40,
        },
        activeAssignments: 0,
        monthlyAttempts,
        savedLists: 0,
        learnerProfiles: 0,
      },
    }),
  );

  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "How will you use My Spelling Game?" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Recent assignments" }),
  ).toBeVisible();
  await expect(page.locator(".teacher-pricing")).toHaveCount(0);
  await expect(
    page
      .locator(".teacher-dashboard-card")
      .getByRole("link", {
        name: "View Plans",
      })
      .first(),
  ).toHaveAttribute("href", "/pricing");
  const warning = page.locator(".submission-limit-notice");
  await expect(warning).toContainText(
    "You're close to the Free Plan monthly limit",
  );
  await expect(warning).toContainText("6 of 8 student submissions");
  await expect(
    warning.getByRole("link", { name: "View Plans" }),
  ).toHaveAttribute("href", "/pricing");
  await page
    .locator(".teacher-dashboard-card")
    .getByRole("link", { name: "View Plans" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator(".pricing-grid .pricing-card")).toHaveCount(3);
  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });

  monthlyAttempts = 8;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".submission-limit-notice")).toContainText(
    "You've reached the Free Plan monthly limit of 8 student submissions",
  );

  plan = "teacher";
  monthlyAttempts = 100;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".submission-limit-notice")).toHaveCount(0);
});

test("active assignment limit offers a clear locale-aware upgrade", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "teacher-a",
          name: "Teacher A",
          email: "a@example.test",
        },
        plan: "free",
      }),
    }),
  );
  await page.route("**/api/assignments", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: "active_assignment_limit" }),
        })
      : route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ assignments: [], learners: [] }),
        }),
  );

  await page.goto("/teacher/assignments/new?lang=en");
  await page.getByLabel("Spelling words").fill(limitWords(20));
  await expect(page.locator(".long-list-advice")).toBeHidden();
  await page.getByLabel("Spelling words").fill(limitWords(21));
  await expect(page.locator(".long-list-advice")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create and publish" }),
  ).toBeEnabled();
  await page.getByLabel("Assignment title").fill("Week two");
  await page.getByLabel("Spelling words").fill("apple\nbanana");
  await page.getByRole("button", { name: "Create and publish" }).click();

  const notice = page.locator(".section-error");
  await expect(notice).toContainText(
    "You've reached the Free Plan limit of 1 active assignment",
  );
  await expect(notice).toContainText(
    "Close an existing assignment or upgrade for more active assignments",
  );
  await expect(
    notice.getByRole("link", { name: "View Plans" }),
  ).toHaveAttribute("href", "/pricing");
  await expect(
    page.getByRole("link", { name: "Back to workspace" }),
  ).toBeVisible();
});

test("localized FAQ home control is centered and returns home", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/zh/faq");
  const home = page.getByRole("link", { name: "首页", exact: true });
  await expect(home).toBeVisible();
  const style = await home.evaluate((element) => ({
    display: getComputedStyle(element).display,
    alignItems: getComputedStyle(element).alignItems,
  }));
  expect(style.display).toContain("flex");
  expect(style.alignItems).toBe("center");
  await home.click();
  await expect(page).toHaveURL(/\/zh\/$/);
});

test("workspace P0 flow keeps empty smart review actions retryable", async ({
  page,
}) => {
  const learnerId = "77777777-7777-4777-8777-777777777777";
  const assignmentId = "88888888-8888-4888-8888-888888888888";
  let savedLists = [];
  let learners = [];
  const json = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/me", (route) =>
    json(route, {
      user: { id: "teacher-a", name: "Account A", email: "a@example.test" },
      plan: "teacher",
      limits: {
        activeAssignments: 20,
        monthlyAttempts: null,
        savedLists: null,
        learnerProfiles: 150,
      },
    }),
  );
  await page.route("**/api/assignments", (route) =>
    json(route, {
      assignments: [],
      savedLists,
      learners,
      usage: {
        limits: {
          activeAssignments: 20,
          monthlyAttempts: null,
          savedLists: null,
          learnerProfiles: 150,
        },
        activeAssignments: 0,
        monthlyAttempts: 0,
        savedLists: savedLists.length,
        learnerProfiles: learners.length,
      },
    }),
  );
  await page.route("**/api/saved-lists", async (route) => {
    const body = route.request().postDataJSON();
    savedLists = [
      {
        id: "99999999-9999-4999-8999-999999999999",
        title: body.title,
        words: String(body.words).split("\n"),
      },
    ];
    await json(route, savedLists[0], 201);
  });
  await page.route("**/api/learners", async (route) => {
    const body = route.request().postDataJSON();
    learners = [
      {
        id: learnerId,
        name: body.name,
        archived: 0,
        completed_attempts: 0,
        accuracy: 0,
      },
    ];
    await json(route, learners[0], 201);
  });
  await page.route(`**/api/learners/${learnerId}`, (route) =>
    json(route, {
      learner: {
        id: learnerId,
        name: "Student 01",
        public_id: "studentToken1234567890",
        archived: false,
      },
      historyDays: 365,
      smartReview: true,
      summary: {
        completedAttempts: 0,
        accuracy: 0,
        mastered: 0,
        learning: 0,
        needsReview: 4,
      },
      words: [],
    }),
  );
  await page.route(`**/api/learners/${learnerId}/review`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await json(route, { words: [] });
  });
  await page.route(`**/api/assignments/${assignmentId}`, (route) =>
    json(route, {
      id: assignmentId,
      public_id: publicId,
      title: "Week one",
      mode: "dictation",
      status: "published",
      words,
      summary: { students: 0, attempts: 0, averageAccuracy: 0 },
      attempts: [],
      missedWordStats: [],
    }),
  );
  await page.route(`**/api/assignments/${assignmentId}/review`, (route) =>
    json(route, { words: [] }),
  );

  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });
  await page
    .locator('.workspace-sidebar-link[data-section="savedLists"]')
    .click();
  await page.getByLabel("List title").fill("Week one");
  await page.getByLabel("Spelling words").fill("apple\nbanana");
  await page.getByRole("button", { name: "Save list" }).click();
  await expect(page.getByRole("heading", { name: "Week one" })).toBeVisible();

  await page
    .locator('.workspace-sidebar-link[data-section="learners"]')
    .click();
  await page.getByLabel("Student nickname or number").fill("Student 01");
  await page.getByRole("button", { name: "Add student" }).click();
  await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
  await page
    .locator('.workspace-sidebar-link[data-section="progress"]')
    .click();
  await page.getByRole("tab", { name: "Mastery" }).click();
  await page
    .locator("#progress-mastery")
    .getByRole("link", { name: "View progress" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mastery overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy student link" }),
  ).toBeVisible();
  await expect(
    page.getByText("4 words currently need review.", { exact: false }),
  ).toHaveCount(0);
  const learnerReview = page.getByRole("button", {
    name: "Create review assignment",
  });
  await learnerReview.click();
  await expect(learnerReview).toBeDisabled();
  await expect(
    page.getByText("There are no missed words that need review yet."),
  ).toBeVisible();
  await expect(learnerReview).toBeEnabled();

  await page.goto(`/teacher/assignments/${assignmentId}?lang=en`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator('.workspace-sidebar-link[data-section="assignments"]'),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Student assignment link" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy student link" }),
  ).toBeVisible();
  const assignmentReview = page.getByRole("button", {
    name: "Create review assignment",
  });
  await assignmentReview.click();
  await expect(
    page.getByText("There are no missed words that need review yet."),
  ).toBeVisible();
  await expect(assignmentReview).toBeEnabled();
});

test("Teacher creates today's review assignment from learner detail", async ({
  page,
}) => {
  await mockWorkspaceRoster(page);
  const learnerId = "abababab-abab-4bab-8bab-abababababab";
  const json = (route, body) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  await page.route("**/api/me", (route) =>
    json(route, {
      user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
      plan: "teacher",
      limits: { activeAssignments: 20, monthlyAttempts: null },
    }),
  );
  await page.route(`**/api/learners/${learnerId}`, (route) =>
    json(route, {
      learner: { id: learnerId, name: "Emily", archived: false },
      historyDays: 365,
      smartReview: true,
      summary: {
        completedAttempts: 1,
        accuracy: 0,
        mastered: 0,
        learning: 0,
        needsReview: 1,
      },
      todaysReview: {
        count: 1,
        words: [
          {
            word: "because",
            recentMissCount: 2,
            lastPracticedAt: "2026-08-26T00:00:00.000Z",
            consecutiveCorrectAfterLastMiss: 0,
            dueAt: "2026-08-27T00:00:00.000Z",
            exampleSentence: "I stayed inside because it was raining.",
          },
        ],
      },
      words: [],
    }),
  );

  await page.goto(`/teacher/learners/${learnerId}?lang=en`, {
    waitUntil: "domcontentloaded",
  });
  await page.evaluate(() =>
    sessionStorage.setItem("mySpellingAssignmentEntryPoint", "copy_track"),
  );
  const review = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Today's Review" }),
  });
  await expect(review).toContainText("because");
  await review
    .getByRole("button", { name: "Create Review Assignment" })
    .click();
  await expect(page).toHaveURL(/\/teacher\/assignments\/new/);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("mySpellingAssignmentEntryPoint"),
    ),
  ).toBe("workspace");
  await expect(page.locator("#assignment-title")).toHaveValue(
    "Emily — Today's Review",
  );
  await expect(page.locator("#assignment-words")).toHaveValue("because");
  await expect(page.locator("#assignment-sentences")).toHaveValue(
    "I stayed inside because it was raining.",
  );
  await expect(
    page.locator('input[name="mode"][value="dictation"]'),
  ).toBeChecked();
});

test("Parent creates children, assigns both, and opens progress with Smart Review", async ({
  page,
}) => {
  const assignmentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const childIds = [
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ];
  let children = [];
  let createdBody;
  const json = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  await page.route("**/api/me", (route) =>
    json(route, {
      user: { id: "parent-a", name: "Parent A", email: "a@example.test" },
      plan: "parent",
      workspaceType: "teacher",
      classPublicId: "legacyClass123",
    }),
  );
  await page.route("**/api/assignments", async (route) => {
    if (route.request().method() === "POST") {
      createdBody = route.request().postDataJSON();
      return json(route, { id: assignmentId, publicId });
    }
    return json(route, {
      assignments: [],
      savedLists: [],
      learners: children,
      usage: {
        limits: {
          activeAssignments: 3,
          monthlyAttempts: null,
          savedLists: null,
          learnerProfiles: 5,
        },
        activeAssignments: 0,
        monthlyAttempts: 0,
        savedLists: 0,
        learnerProfiles: children.length,
      },
    });
  });
  await page.route("**/api/learners", (route) => {
    const name = route.request().postDataJSON().name;
    const child = {
      id: childIds[children.length],
      name,
      public_id: `childToken${children.length + 1}`,
      archived: 0,
      join_pin: String(1842 + children.length),
      completed_attempts: 0,
      accuracy: 0,
    };
    children = [...children, child];
    return json(route, child, 201);
  });
  await page.route(`**/api/assignments/${assignmentId}`, (route) =>
    json(route, {
      id: assignmentId,
      public_id: publicId,
      title: "Family spelling",
      mode: "typing",
      status: "published",
      words: limitWords(40)
        .split("\n")
        .map((word) => ({ word, example_sentence: null })),
      assignedLearners: children.map(({ id, name }) => ({ id, name })),
      summary: { students: 0, attempts: 0, averageAccuracy: 0 },
      attempts: [],
      missedWordStats: null,
    }),
  );
  await page.route(`**/api/learners/${childIds[0]}`, (route) =>
    json(route, {
      learner: {
        id: childIds[0],
        name: "Alice",
        public_id: "childToken1",
        archived: false,
      },
      historyDays: 365,
      smartReview: true,
      summary: {
        completedAttempts: 1,
        accuracy: 80,
        mastered: 2,
        learning: 1,
        needsReview: 1,
      },
      todaysReview: { count: 0, words: [] },
      words: [],
    }),
  );
  await page.route(`**/api/learners/${childIds[0]}/review`, (route) =>
    json(route, { words: [] }),
  );

  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Parent Plan", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent assignments" }),
  ).toBeVisible();
  await expect(page.getByText("0 of 3 active assignments")).toBeVisible();
  await expect(page.getByText("Unlimited monthly submissions")).toBeVisible();
  await expect(page.getByText("0 of 5 child profiles")).toBeVisible();
  await expect(page.getByText(/Class URL:/)).toHaveCount(0);

  await page
    .locator('.workspace-sidebar-link[data-section="learners"]')
    .click();
  for (const name of ["Alice", "Bob"]) {
    await page.getByLabel("Child nickname or number").fill(name);
    await page.getByRole("button", { name: "Add child" }).click();
  }
  await expect(page.getByText(/Student PIN:/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy PIN" })).toHaveCount(0);

  await page
    .locator('.workspace-sidebar-link[data-section="overview"]')
    .click();
  await expect(page.getByText("2 of 5 child profiles")).toBeVisible();
  await page.getByRole("link", { name: "Create assignment" }).click();
  await expect(page.getByLabel("Selected children")).toBeVisible();
  await expect(page.getByLabel("All students")).toHaveCount(0);
  await page.getByLabel("Selected children").check();
  await page.getByLabel("Alice").check();
  await page.getByLabel("Bob").check();
  await page.getByLabel("Assignment title").fill("Family spelling");
  await page.getByLabel("Spelling words").fill(limitWords(40));
  await page.getByLabel("Typing").check();
  await page.getByRole("button", { name: "Create and publish" }).click();

  await expect(page).toHaveURL(`/teacher/assignments/${assignmentId}?lang=en`);
  expect(createdBody.learnerIds).toEqual(childIds);
  expect(String(createdBody.words).split("\n")).toHaveLength(40);
  await expect(
    page.getByRole("heading", { name: "Progress" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Most commonly missed words" }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Back to workspace" }).click();
  await page
    .locator('.workspace-sidebar-link[data-section="progress"]')
    .click();
  const alice = page.locator("article", { hasText: "Alice" });
  await alice.getByRole("link", { name: "View progress" }).click();
  await expect(page.getByText("Progress from the last 365 days")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy child link" }),
  ).toBeVisible();
  const smartReview = page.locator("section", {
    has: page.getByRole("heading", { name: "Smart missed-word review" }),
  });
  await smartReview
    .getByRole("button", { name: "Create review assignment" })
    .click();
  await expect(smartReview).toContainText(
    "There are no missed words that need review yet.",
  );
});

test("Free assignment progress hides class-wide missed-word statistics", async ({
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
          activeAssignments: 1,
          monthlyAttempts: 8,
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
            status: "completed",
            correct_count: 1,
            incorrect_count: 1,
            accuracy: 50,
            missed_words: ["because", "friend"],
            duration_seconds: 42,
            completed_at: new Date().toISOString(),
          },
          {
            id: "77777777-7777-4777-8777-777777777777",
            nickname: "Student 02",
            attempt_number: 1,
            status: "completed",
            correct_count: 1,
            incorrect_count: 1,
            accuracy: 50,
            missed_words: ["because"],
            duration_seconds: 35,
            completed_at: new Date().toISOString(),
          },
          {
            id: "88888888-8888-4888-8888-888888888888",
            nickname: "Student 03",
            attempt_number: 1,
            status: "incomplete",
            correct_count: 0,
            incorrect_count: 1,
            accuracy: 0,
            missed_words: ["beautiful"],
            duration_seconds: 20,
            completed_at: new Date().toISOString(),
          },
        ],
        missedWordStats: null,
      }),
    }),
  );

  const navigation = await page.goto(
    `/teacher/assignments/${assignmentId}?lang=en`,
    { waitUntil: "domcontentloaded" },
  );
  expect(navigation.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page.getByRole("heading", { name: "Progress" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: hostileTitle })).toBeVisible();
  await expect(page.getByRole("cell", { name: hostileNickname })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Most commonly missed words" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.pwned)).toBeUndefined();
  expect(await analyticsEvents(page, "assignment_results_viewed")).toEqual([
    { mode: "typing", word_count: 2 },
  ]);
  expect(await analyticsEvents(page, "teacher_auth_completed")).toEqual([]);
});

test("free assignment and learner previews avoid zero-value urgency", async ({
  page,
}) => {
  const assignmentId = "12121212-1212-4212-8212-121212121212";
  const learnerId = "13131313-1313-4313-8313-131313131313";
  let needsReview = 4;
  const json = (route, body) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  await page.route("**/api/me", (route) =>
    json(route, {
      user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
      plan: "free",
      limits: {
        activeAssignments: 1,
        monthlyAttempts: 8,
        learnerProfiles: 1,
      },
    }),
  );
  await page.route(`**/api/assignments/${assignmentId}`, (route) =>
    json(route, {
      id: assignmentId,
      public_id: publicId,
      title: "Perfect week",
      mode: "typing",
      status: "published",
      words,
      summary: { students: 0, attempts: 0, averageAccuracy: 0 },
      attempts: [],
      missedWordStats: null,
    }),
  );
  await page.route(`**/api/learners/${learnerId}`, (route) =>
    json(route, {
      learner: { id: learnerId, name: "Student 01", archived: false },
      historyDays: 14,
      smartReview: false,
      summary: {
        completedAttempts: 3,
        accuracy: 70,
        mastered: 2,
        learning: 1,
        needsReview,
      },
      words: [],
    }),
  );

  await page.goto(`/teacher/assignments/${assignmentId}?lang=en`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Most commonly missed words" }),
  ).toHaveCount(0);

  await page.goto(`/teacher/learners/${learnerId}?lang=en`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator('.workspace-sidebar-link[data-section="progress"]'),
  ).toHaveAttribute("aria-current", "page");
  const review = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Smart missed-word review" }),
  });
  await expect(review).toContainText(
    "4 words currently need review. Parent and Teacher Plans can turn them into a focused review assignment. View plans.",
  );
  await expect(review.getByRole("link", { name: "View Plans" })).toHaveCount(1);

  needsReview = 0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(review).toContainText(
    "Smart Review is included in Parent and Teacher Plans. View plans.",
  );
  await expect(review).not.toContainText("0 words");
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
        plan: "teacher",
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
  const misses = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Most commonly missed words" }),
  });
  await expect(misses).toContainText("banana · 1");
  await expect(misses).not.toContainText("words have been missed");
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
  expect(await analyticsEvents(page, "assignment_results_viewed")).toHaveLength(
    1,
  );
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

async function mockWorkspaceShell(page, plan, overrides = {}) {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "owner-a", name: "Owner A", email: "a@example.test" },
        plan,
      }),
    }),
  );
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assignments: overrides.assignments || [],
        savedLists: overrides.savedLists || [],
        learners: overrides.learners || [],
        usage: {
          limits: {
            activeAssignments: plan === "free" ? 1 : 20,
            monthlyAttempts: plan === "free" ? 8 : null,
            savedLists: plan === "free" ? 1 : null,
            learnerProfiles:
              plan === "parent" ? 5 : plan === "teacher" ? 150 : 1,
          },
          activeAssignments: overrides.activeAssignments || 0,
          monthlyAttempts: overrides.monthlyAttempts || 0,
          savedLists: (overrides.savedLists || []).length,
          learnerProfiles: (overrides.learners || []).length,
        },
      }),
    }),
  );
}

for (const [plan, learnerLabel, billingLabel, usageLabel] of [
  ["free", "Learners", "View Plans", "0 of 1 learner profiles"],
  ["parent", "Children", "Manage billing", "0 of 5 child profiles"],
  ["teacher", "Students", "Manage billing", "0 of 150 student profiles"],
]) {
  test(`${plan} workspace sidebar uses the plan-specific labels`, async ({
    page,
  }) => {
    await mockWorkspaceShell(page, plan);
    await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });

    const sidebar = page.locator(".workspace-sidebar");
    await expect(
      sidebar.getByText(learnerLabel, { exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByText(billingLabel, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(usageLabel, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent assignments" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent progress" }),
    ).toBeVisible();
    await expect(page.locator("#saved-list-title")).toHaveCount(0);
    await expect(page.locator("#learner-name")).toHaveCount(0);
    await expect(sidebar.locator('[data-section="overview"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sidebar.getByText("Class join", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      sidebar.getByText("Smart missed-word review", { exact: true }),
    ).toHaveCount(0);

    await page.goto("/teacher/learners?lang=en", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: learnerLabel, exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('.workspace-sidebar-link[data-section="learners"]'),
    ).toHaveAttribute("aria-current", "page");
  });
}

test("learner management keeps progress, rename, archive, and restore actions", async ({
  page,
}) => {
  const learner = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Alice",
    archived: 0,
    completed_attempts: 2,
    accuracy: 75,
  };
  await mockWorkspaceShell(page, "free", { learners: [learner] });
  await page.route(`**/api/learners/${learner.id}`, async (route) => {
    const body = route.request().postDataJSON();
    if (body.name) learner.name = body.name;
    if (typeof body.archived === "boolean")
      learner.archived = Number(body.archived);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(learner),
    });
  });

  await page.goto("/teacher/learners?lang=en", {
    waitUntil: "domcontentloaded",
  });
  let row = page.locator("article", { hasText: "Alice" });
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
  await expect(row.getByRole("link", { name: "Progress" })).toHaveAttribute(
    "href",
    `/teacher/learners/${learner.id}?lang=en`,
  );

  page.once("dialog", (dialog) => dialog.accept("Alicia"));
  await row.getByRole("button", { name: "Rename" }).click();
  row = page.locator("article", { hasText: "Alicia" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Archive" }).click();
  await expect(row.getByText("Archived", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Restore" }).click();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
});

test("workspace overview stays lightweight and links to full management views", async ({
  page,
}) => {
  const assignments = Array.from({ length: 6 }, (_, index) => ({
    id: `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000000`,
    title: `Assignment ${index + 1}`,
    status: "published",
    student_count: 1,
    attempt_count: index,
    average_accuracy: 90,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  }));
  const learners = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Alice",
      archived: 0,
      completed_attempts: 3,
      accuracy: 80,
      last_practiced_at: "2026-08-28T10:00:00.000Z",
      needs_review_count: 3,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Bob",
      archived: 0,
      completed_attempts: 0,
      accuracy: 0,
      last_practiced_at: null,
      needs_review_count: 2,
    },
  ];
  await mockWorkspaceShell(page, "teacher", { assignments, learners });
  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByText("5 words need review", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Assignment 1" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assignment 6" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bob" })).toHaveCount(0);

  await page.locator('[data-section="assignments"]').click();
  await expect(page).toHaveURL(/\/teacher\/assignments\?lang=en$/);
  await expect(
    page.getByRole("heading", { name: "Assignment 6" }),
  ).toBeVisible();
  await page.locator('[data-section="learners"]').click();
  await expect(page).toHaveURL(/\/teacher\/learners\?lang=en$/);
  await expect(page.locator("#learner-name")).toBeVisible();
  await page.locator('[data-section="savedLists"]').click();
  await expect(page).toHaveURL(/\/teacher\/saved-lists\?lang=en$/);
  await expect(page.locator("#saved-list-title")).toBeVisible();
  await page.locator('[data-section="progress"]').click();
  await expect(page).toHaveURL(/\/teacher\/progress\?lang=en$/);
  await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
  await page.getByRole("tab", { name: "Mastery" }).click();
  await expect(page.getByRole("heading", { name: "Bob" })).toBeVisible();

  for (const [path, section] of [
    ["/teacher", "overview"],
    ["/teacher/assignments", "assignments"],
    ["/teacher/learners", "learners"],
    ["/teacher/saved-lists", "savedLists"],
    ["/teacher/progress", "progress"],
  ]) {
    await page.goto(`${path}?lang=en`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".workspace-sidebar")).toBeVisible();
    await expect(
      page.locator(`.workspace-sidebar-link[data-section="${section}"]`),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("desktop workspace sidebar collapses and restores", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockWorkspaceShell(page, "free");
  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });

  const sidebar = page.locator(".workspace-sidebar");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveClass(/is-collapsed/);
  await expect(page.locator(".workspace-layout")).toHaveClass(
    /is-sidebar-collapsed/,
  );
  await expect(
    sidebar.locator('[data-section="assignments"] .workspace-sidebar-icon'),
  ).toBeVisible();
  await expect(
    sidebar.locator('[data-section="assignments"] .workspace-sidebar-label'),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(sidebar).not.toHaveClass(/is-collapsed/);
  await expect(
    sidebar.locator('[data-section="assignments"] .workspace-sidebar-label'),
  ).toBeVisible();
});

test("paid workspace sidebar keeps the existing billing portal flow", async ({
  page,
}) => {
  await mockWorkspaceShell(page, "parent");
  let portalCalls = 0;
  await page.route("**/api/billing/portal", (route) => {
    portalCalls += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ url: "/pricing?from=portal" }),
    });
  });
  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });

  await page.locator('.workspace-sidebar-link[data-section="billing"]').click();
  await expect(page).toHaveURL(/\/pricing\?from=portal$/);
  expect(portalCalls).toBe(1);
});

test("mobile workspace drawer opens, closes, navigates, and does not overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockWorkspaceShell(page, "free", {
    assignments: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Week one spelling",
        status: "published",
        student_count: 1,
        attempt_count: 1,
        average_accuracy: 80,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    ],
    savedLists: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Week one words",
        words: ["apple", "banana"],
        word_details: [],
      },
    ],
    learners: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        name: "Alex",
        archived: 0,
        completed_attempts: 1,
        accuracy: 80,
        last_practiced_at: "2026-08-28T10:00:00.000Z",
        needs_review_count: 1,
      },
    ],
  });
  await page.goto("/teacher?lang=en", { waitUntil: "domcontentloaded" });

  const shell = page.locator(".workspace-shell");
  const menu = page.getByRole("button", { name: "Open workspace menu" });
  await expect(menu).toBeVisible();
  await expect(shell).not.toHaveClass(/is-drawer-open/);

  await menu.click();
  await expect(shell).toHaveClass(/is-drawer-open/);
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("button", { name: "Close workspace menu" })
    .click({ position: { x: 310, y: 100 } });
  await expect(shell).not.toHaveClass(/is-drawer-open/);

  await menu.click();
  await page.keyboard.press("Escape");
  await expect(shell).not.toHaveClass(/is-drawer-open/);

  await menu.click();
  await page
    .locator('.workspace-sidebar-link[data-section="assignments"]')
    .click();
  await expect(shell).not.toHaveClass(/is-drawer-open/);
  await expect(page).toHaveURL(/\/teacher\/assignments\?lang=en$/);
  await expect(
    page.locator('.workspace-sidebar-link[data-section="assignments"]'),
  ).toHaveAttribute("aria-current", "page");
  expect(
    await page
      .locator(".assignment-row .button-link")
      .evaluate((button) => button.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);

  for (const path of [
    "/teacher",
    "/teacher/assignments",
    "/teacher/learners",
    "/teacher/saved-lists",
    "/teacher/progress",
  ]) {
    await page.goto(`${path}?lang=en`, { waitUntil: "domcontentloaded" });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  }

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/teacher/progress?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await expect(menu).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});
