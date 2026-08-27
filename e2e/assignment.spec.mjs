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

const analyticsEvents = (page, name) =>
  page.evaluate(
    (eventName) =>
      window.dataLayer
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event" && entry[1] === eventName)
        .map((entry) => entry[2]),
    name,
  );

test("practice records a valid list and start separately", async ({ page }) => {
  await page.goto("/");
  await page.locator("#custom-word-list").fill("because\nfriend");
  await page.locator('input[name="practice-mode"][value="typing"]').check();
  await expect(page.locator("#custom-example-sentences")).toBeHidden();
  await page.getByRole("button", { name: "Start Typing Rain" }).click();
  await expect(
    page.getByRole("button", { name: "Return to main menu" }),
  ).toBeVisible();

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
  expect(await analyticsEvents(page, "practice_share_options_viewed")).toEqual(
    [{ mode: "typing", word_count: 2, locale: "en" }],
  );

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

test("share choices are localized without raw message keys", async ({ page }) => {
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
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "sign_in_required" }),
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
    event: { mode: "typing", word_count: 2, entry_point: "copy_track" },
  });
  expect(
    await page.evaluate(() =>
      Number(sessionStorage.getItem("clipboardWrites") || 0),
    ),
  ).toBe(0);
});

test("signed-in Track results opens the existing assignment form directly", async ({
  page,
}) => {
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
    })),
  ).toEqual({
    words: "because\nfriend",
    sentences: "It rained.\nA friend helped.",
    mode: "typing",
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
    if (route.request().method() !== "POST") return route.fallback();
    createdBody = route.request().postDataJSON();
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

  await page.goto("/teacher/assignments/new?lang=en");
  await page.getByLabel("Assignment title").fill("Sentence practice");
  await page.getByLabel("Spelling words").fill("because");
  await page.getByLabel("Example sentences (optional)").fill(sentence);
  await page.getByRole("button", { name: "Create and publish" }).click();
  await expect(page).toHaveURL(`/teacher/assignments/${assignmentId}?lang=en`);
  expect(createdBody).toMatchObject({
    title: "Sentence practice",
    words: "because",
    exampleSentences: sentence,
    mode: "dictation",
  });

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
  await page.getByRole("button", { name: "Continue with Google" }).click();

  await expect(page).toHaveURL(/\/teacher\/assignments\/new\?lang=en$/);
  expect(callbackURL).toBe("/teacher/assignments/new?lang=en");
  await expect(page.getByLabel("Spelling words")).toHaveValue(
    "because\nfriend",
  );
  await expect(page.getByLabel("Typing", { exact: true })).toBeChecked();
  expect(await analyticsEvents(page, "teacher_auth_completed")).toEqual([{}]);
});

test("Checkout analytics separate creation attempts from Stripe redirects", async ({
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
    name: "Start 30-day free trial · Monthly",
  });
  await checkout.scrollIntoViewIfNeeded();
  await expect
    .poll(() => analyticsEvents(page, "upgrade_viewed"))
    .toHaveLength(1);
  await checkout.click();
  await expect(
    page.getByText("Something went wrong. Please try again."),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingCheckoutInterval"),
    ),
  ).toBe("month");
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBe("en");

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
  ).toHaveLength(1);
  expect(
    (await eventNames()).filter((name) => name === "checkout_redirected"),
  ).toHaveLength(0);

  await checkout.click();
  await expect(page).toHaveURL(/#stripe-checkout$/);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("pendingCheckoutInterval"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem("pendingCheckoutLocale")),
  ).toBe("en");
  expect(
    (await eventNames()).filter((name) => name === "upgrade_clicked"),
  ).toHaveLength(1);
  expect(
    (await eventNames()).filter((name) => name === "checkout_started"),
  ).toHaveLength(2);
  expect(
    (await eventNames()).filter((name) => name === "checkout_redirected"),
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
  await expect(page.getByRole("link", { name: "Workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sound/ })).toBeVisible();
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
  await expect(page.getByText("Unlimited student submissions")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Monthly plan", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Yearly plan", exact: true }).click();
  await expect(page.getByText("$4.17 / month")).toBeVisible();
  await expect(page.getByText(/\$49\.99\/year automatically/)).toBeVisible();
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
      plan: "pro",
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

  await page.goto("/teacher?lang=en");
  await page.getByLabel("List title").fill("Week one");
  await page.getByLabel("Spelling words").fill("apple\nbanana");
  await page.getByRole("button", { name: "Save list" }).click();
  await expect(page.getByRole("heading", { name: "Week one" })).toBeVisible();

  await page.getByLabel("Student nickname or number").fill("Student 01");
  await page.getByRole("button", { name: "Add student" }).click();
  await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
  await page.getByRole("link", { name: "View progress" }).click();
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

  await page.goto(`/teacher/assignments/${assignmentId}?lang=en`);
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

test("Plus teacher creates today's review assignment from learner detail", async ({
  page,
}) => {
  const learnerId = "abababab-abab-4bab-8bab-abababababab";
  const json = (route, body) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  await page.route("**/api/me", (route) =>
    json(route, {
      user: { id: "teacher-a", name: "Teacher A", email: "a@example.test" },
      plan: "plus",
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

  await page.goto(`/teacher/learners/${learnerId}?lang=en`);
  const review = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Today's Review" }),
  });
  await expect(review).toContainText("because");
  await review
    .getByRole("button", { name: "Create Review Assignment" })
    .click();
  await expect(page).toHaveURL(/\/teacher\/assignments\/new/);
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

test("a Pro dashboard never requests or displays upgrade pricing", async ({
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

test("free teacher results preview distinct missed words as inert text", async ({
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
  );
  expect(navigation.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page.getByRole("heading", { name: "Student results" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: hostileTitle })).toBeVisible();
  await expect(page.getByRole("cell", { name: hostileNickname })).toBeVisible();
  const misses = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Most commonly missed words" }),
  });
  await expect(misses).toContainText(
    "2 words have been missed in this assignment.",
  );
  await expect(misses).not.toContainText(
    "3 words have been missed in this assignment.",
  );
  await expect(
    misses.getByRole("link", { name: "Upgrade to Pro" }),
  ).toBeVisible();
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
        activeAssignments: 2,
        monthlyAttempts: 30,
        learnerProfiles: 3,
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
      historyDays: 30,
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

  await page.goto(`/teacher/assignments/${assignmentId}?lang=en`);
  const misses = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Most commonly missed words" }),
  });
  await expect(misses).toContainText(
    "Upgrade to Pro for assignment-wide missed-word statistics",
  );
  await expect(misses).not.toContainText("0 words");

  await page.goto(`/teacher/learners/${learnerId}?lang=en`);
  const review = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Smart missed-word review" }),
  });
  await expect(review).toContainText(
    "4 words currently need review. Upgrade to Pro to turn them into a focused review assignment.",
  );
  await expect(
    review.getByRole("link", { name: "Upgrade to Pro" }),
  ).toHaveCount(1);

  needsReview = 0;
  await page.reload();
  await expect(review).toContainText(
    "Upgrade to Pro to create smart review assignments.",
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
