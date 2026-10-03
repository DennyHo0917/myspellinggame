import { expect, test } from "./fixtures.mjs";
import { productMessages } from "../src/js/productLocale.mjs";
const id = "12345678-1234-4234-8234-123456789012";
const publicId = "abcdefghijklmnopqrstuvwx";
const learner = "zyxwvutsrqponmlkjihgfedc";
const classId = "classroom123";
const words = [{ id, word: "apple", position: 0 }];
const json = (route, value, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(value),
  });
async function workspace(
  page,
  {
    assigned = false,
    plan = "teacher",
    closed = false,
    expired = false,
    locale = "en",
  } = {},
) {
  const copy = productMessages(locale);
  await page.route("**/api/me", (r) =>
    json(r, {
      user: { id: "adult-test", name: "Test adult" },
      plan,
      workspaceType: "teacher",
      classPublicId: classId,
    }),
  );
  await page.route("**/api/lifecycle/**", (r) => json(r, { ok: true }));
  await page.route("**/api/assignments", (r) =>
    json(r, { assignments: [], learners: [], savedLists: [] }),
  );
  await page.route(`**/api/assignments/${id}`, (r) =>
    json(r, {
      id,
      public_id: publicId,
      title: "Spelling & 拼写 + #",
      mode: "typing",
      status: closed ? "closed" : "published",
      expires_at: new Date(
        Date.now() + (expired ? -1 : 1) * 86400000,
      ).toISOString(),
      words,
      attempts: [],
      summary: { students: 0, attempts: 0, averageAccuracy: 0 },
      assignedLearners: assigned
        ? [{ id, name: "Test learner", public_id: learner }]
        : [],
      sharePath: assigned
        ? plan === "teacher"
          ? `/join/${classId}?assignment=${publicId}`
          : null
        : `/a/${publicId}`,
    }),
  );
  await page.addInitScript(() => {
    window.__popup = {
      closed: false,
      location: {},
      close() {
        this.closed = true;
      },
    };
    window.open = () => window.__popup;
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value) => {
          window.__clipboard = value;
        },
      },
    });
  });
  await page.goto(`/workspace/assignments/${id}?lang=${locale}`);
  await expect(
    page.getByRole("heading", { name: "Spelling & 拼写 + #" }),
  ).toBeVisible();
  return copy;
}
for (const locale of ["en", "es", "pt-BR", "fr", "id", "zh"]) {
  test(`${locale} class-wide share encodes title, body and safe PIN target on mobile`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const clicks = [];
    await page.route(`**/api/assignments/${id}/share`, (r) => {
      clicks.push(r.request().postDataJSON());
      return json(r, { path: `/join/${classId}?assignment=${publicId}` });
    });
    const copy = await workspace(page, { assigned: true, locale });
    await page
      .getByRole("button", { name: copy.shareClassroom, exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.__popup.location.href))
      .toContain("classroom.google.com/share");
    const share = new URL(
      await page.evaluate(() => window.__popup.location.href),
    );
    expect(share.searchParams.get("title")).toBe("Spelling & 拼写 + #");
    expect(share.searchParams.get("body")).toBe(copy.classroomPinBody);
    const target = new URL(share.searchParams.get("url"));
    expect(target.pathname).toBe(`/join/${classId}`);
    expect(target.searchParams.get("assignment")).toBe(publicId);
    expect(target.searchParams.get("channel")).toBe("google_classroom");
    expect(target.searchParams.get("lang")).toBe(locale);
    expect(share.href).not.toContain(learner);
    expect(clicks).toHaveLength(1);
    expect(clicks[0].channel).toBe("google_classroom");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/classroom-${locale}.png`,
      fullPage: true,
    });
  });
}
test("copy uses common link and Classroom returning/repeated clicks never claims publication", async ({
  page,
}) => {
  const clicks = [];
  await page.route(`**/api/assignments/${id}/share`, async (r) => {
    clicks.push(r.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 120));
    await json(r, { path: `/a/${publicId}` });
  });
  const copy = await workspace(page, { plan: "free" });
  await page
    .getByRole("button", { name: copy.freeCopyLink, exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.__clipboard))
    .toContain("channel=copy_link");
  const button = page.getByRole("button", {
    name: copy.shareClassroom,
    exact: true,
  });
  await button.click();
  await expect(button).toBeDisabled();
  await expect(button).toBeEnabled();
  await page.evaluate(() => {
    window.__popup.closed = true;
  });
  await button.click();
  await expect(button).toBeEnabled();
  expect(clicks.map((c) => c.channel)).toEqual([
    "copy_link",
    "google_classroom",
    "google_classroom",
  ]);
  expect(new Set(clicks.map((c) => c.clickId)).size).toBe(3);
  expect(await page.locator(".status").allTextContents()).not.toContain(
    "Published to Classroom",
  );
});
test("blocked popup has safe fallback and stale unauthorized sharing shows errors", async ({
  page,
}) => {
  await page.route(`**/api/assignments/${id}/share`, (r) =>
    json(r, { path: `/a/${publicId}` }),
  );
  const copy = await workspace(page);
  await page.evaluate(() => {
    window.open = () => null;
  });
  await page.getByRole("button", { name: copy.shareClassroom }).click();
  const link = page.getByRole("link", { name: copy.shareClassroom });
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await page.route(`**/api/assignments/${id}/share`, (r) =>
    json(r, { error: "sign_in_required" }, 401),
  );
  await page.getByRole("button", { name: copy.shareClassroom }).click();
  await expect(page.locator(".status").first()).toContainText(
    copy.signInRequired,
  );
});
for (const plan of ["free", "parent"])
  test(`${plan} assigned work keeps individual links and hides class-wide sharing`, async ({
    page,
  }) => {
    const copy = await workspace(page, { assigned: true, plan });
    await expect(
      page.getByRole("button", { name: copy.shareClassroom }),
    ).toHaveCount(0);
    await expect(page.getByText(copy.classroomIndividualOnly)).toBeVisible();
    await expect(page.locator(`a[href*="learner=${learner}"]`)).toBeVisible();
  });
test("closed assignments disable sharing", async ({ page }) => {
  const copy = await workspace(page, { closed: true });
  await expect(
    page.getByRole("button", { name: copy.shareClassroom }),
  ).toBeDisabled();
});
for (const plan of ["free", "parent", "teacher"]) {
  for (const state of ["closed", "expired"]) {
    test(`${plan} ${state} assigned work disables individual copying`, async ({
      page,
    }) => {
      await workspace(page, { assigned: true, plan, [state]: true });
      await expect(
        page.locator(".assignment-learner-links button"),
      ).toBeDisabled();
      expect(await page.evaluate(() => window.__clipboard)).toBeUndefined();
    });
  }
}
for (const [error, status, key] of [
  ["assignment_closed", 410, "assignmentClosed"],
  ["sign_in_required", 401, "signInRequired"],
]) {
  test(`individual copy refuses a stale ${error} response`, async ({
    page,
  }) => {
    await page.route(`**/api/assignments/${id}/share`, (r) =>
      json(r, { error }, status),
    );
    const copy = await workspace(page, { assigned: true });
    const button = page.locator(".assignment-learner-links button");
    await button.click();
    await expect(
      page.getByRole("status").filter({ hasText: copy[key] }),
    ).toBeVisible();
    await expect(button).toHaveText(copy.copyLink);
    expect(await page.evaluate(() => window.__clipboard)).toBeUndefined();
    await expect(page.getByLabel(copy.studentLink)).toHaveCount(0);
    if (status === 410) await expect(button).toBeDisabled();
    else await expect(button).toBeEnabled();
  });
}
test("validated individual links remain manually copyable when clipboard permission is denied", async ({
  page,
}) => {
  await page.route(`**/api/assignments/${id}/share`, (r) =>
    json(r, { path: null }),
  );
  const copy = await workspace(page, { assigned: true });
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.locator(".assignment-learner-links button").click();
  await expect(page.getByLabel(copy.studentLink)).toHaveValue(
    new RegExp(`learner=${learner}`),
  );
  await expect(page.getByText(copy.clipboardHelp)).toBeVisible();
});

for (const logout of [true, false]) {
  test(`adult acquisition follows the account ${logout ? "after logout" : "after a session switch"}`, async ({
    page,
  }) => {
    let account = "a";
    const captures = [];
    await page.route("**/api/me", (r) =>
      json(r, {
        user: {
          id: `adult-${account}`,
          name: `Adult ${account}`,
          email: `${account}@example.test`,
        },
        plan: "teacher",
        workspaceType: "teacher",
        classPublicId: classId,
      }),
    );
    await page.route("**/api/assignments", (r) =>
      json(r, { assignments: [], learners: [], savedLists: [] }),
    );
    await page.route("**/api/lifecycle/acquisition", (r) => {
      captures.push({ account, body: r.request().postDataJSON() });
      return json(r, { ok: true });
    });
    await page.route("**/api/auth/sign-out", (r) => json(r, { ok: true }));
    await page.goto("/workspace?lang=en&utm_source=google&utm_medium=cpc");
    await expect.poll(() => captures.length).toBe(1);
    if (logout) {
      await page.locator(".workspace-user-toggle").click();
      await page
        .getByRole("menuitem", { name: "Sign out", exact: true })
        .click();
      await expect(page).toHaveURL(/\/$/);
    }
    account = "b";
    if (logout) {
      await page.goto("/workspace?lang=en&utm_source=bing&utm_medium=organic");
    } else {
      await page.goto("/?utm_source=bing&utm_medium=organic");
      await expect(page.locator(".workspace-user-toggle")).toContainText(
        "Adult b",
      );
      await page.goto("/workspace?lang=en");
    }
    await expect.poll(() => captures.length).toBe(2);
    expect(captures).toEqual([
      {
        account: "a",
        body: { source: "google", medium: "cpc", campaign: null },
      },
      {
        account: "b",
        body: { source: "bing", medium: "organic", campaign: null },
      },
    ]);
    await page.goto("/workspace?lang=en&utm_source=facebook&utm_medium=social");
    await expect.poll(() => captures.length).toBe(3);
    expect(captures[2].body).toEqual(captures[1].body);
  });
}

async function player(page) {
  const requests = [];
  await page.route("**/api/public/assignments/**", (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith("/start") || u.pathname.endsWith("/entry")) {
      requests.push({ path: u.pathname, body: r.request().postDataJSON() });
      return json(r, { ok: true });
    }
    if (u.pathname.endsWith("/attempts")) {
      requests.push({ path: u.pathname, body: r.request().postDataJSON() });
      return json(
        r,
        {
          accuracy: 100,
          correct_count: 1,
          incorrect_count: 0,
          missedWords: [],
        },
        201,
      );
    }
    return json(r, {
      title: "PIN spelling",
      mode: "typing",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      words,
      learner: { name: "Test learner" },
    });
  });
  return requests;
}
test("PIN redirects straight to target, preserves channel through refresh, practice and result", async ({
  page,
}) => {
  const requests = await player(page);
  let joinBody;
  await page.route(`**/api/public/join/${classId}`, (r) => {
    joinBody = r.request().postDataJSON();
    return json(r, { learnerPublicId: learner, assignmentPublicId: publicId });
  });
  await page.goto(
    `/join/${classId}?assignment=${publicId}&lang=en&channel=google_classroom`,
  );
  await page.locator("#pin").fill("1234");
  await page.getByRole("button", { name: "Start assignment" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/a/${publicId}.*channel=google_classroom`),
  );
  expect(joinBody).toEqual({ pin: "1234", assignmentPublicId: publicId });
  await expect(page.getByLabel("Nickname")).toHaveCount(0);
  await page.getByRole("button", { name: "Start assignment" }).click();
  await expect(page.locator(".answer-form input")).toBeVisible();
  await page.reload();
  await page.locator(".answer-form input").fill("apple");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(
    page.getByRole("heading", { name: "Your result" }),
  ).toBeVisible();
  for (const r of requests) expect(r.body.channel).toBe("google_classroom");
  const submission = requests.find((r) => r.path.endsWith("/attempts")).body;
  expect(submission.learnerPublicId).toBe(learner);
  expect(submission).not.toHaveProperty("pin");
  const ga = await page.evaluate(() => JSON.stringify(window.dataLayer || []));
  expect(ga).not.toContain(learner);
  expect(ga).not.toContain("1234");
});
for (const [error, key] of [
  ["invalid_join", "invalidPin"],
  ["learner_not_found", "assignmentUnavailable"],
  ["assignment_closed", "assignmentClosed"],
  ["assignment_expired", "assignmentExpired"],
  ["assignment_not_found", "assignmentNotFound"],
])
  test(`PIN ${error} remains safely at entry`, async ({ page }) => {
    await page.route(`**/api/public/join/${classId}`, (r) =>
      json(r, { error }, 401),
    );
    await page.goto(`/join/${classId}?assignment=${publicId}&lang=en`);
    await page.locator("#pin").fill("0000");
    await page.getByRole("button", { name: "Start assignment" }).click();
    await expect(page.locator(".status")).toHaveText(
      productMessages("en")[key],
    );
    await expect(page).toHaveURL(new RegExp("/join/"));
    await expect(page.getByRole("button")).toBeEnabled();
  });
test("old generic assigned link recovers through PIN entry while retaining source", async ({
  page,
}) => {
  await page.route(`**/api/public/assignments/${publicId}`, (r) =>
    json(
      r,
      {
        error: "learner_required",
        joinPath: `/join/${classId}?assignment=${publicId}`,
      },
      403,
    ),
  );
  await page.goto(`/a/${publicId}?lang=fr&channel=copy_link`);
  await expect(page).toHaveURL(
    new RegExp(`/join/${classId}.*channel=copy_link`),
  );
  await expect(page.locator("#pin")).toBeVisible();
});
test("adult source survives interrupted OAuth, associates separately and respects privacy signals", async ({
  page,
}) => {
  let signedIn = false;
  let authBody;
  const captures = [];
  await page.route("**/api/me", (r) =>
    json(
      r,
      signedIn
        ? { user: { id: "adult-test", name: "Test adult" }, plan: "free" }
        : { error: "sign_in_required" },
      signedIn ? 200 : 401,
    ),
  );
  await page.route("**/api/config", (r) =>
    json(r, { googleAuthConfigured: true }),
  );
  await page.route("**/api/assignments", (r) =>
    json(r, { assignments: [], learners: [], savedLists: [] }),
  );
  await page.route("**/api/lifecycle/acquisition", (r) => {
    captures.push(r.request().postDataJSON());
    return json(r, { ok: true });
  });
  await page.route("**/api/auth/sign-in/social", (r) => {
    authBody = r.request().postDataJSON();
    return json(r, { error: "interrupted" }, 500);
  });
  await page.goto(
    "/workspace?lang=en&utm_source=google&utm_medium=cpc&utm_campaign=teacher_resources&pin=private",
  );
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => authBody?.callbackURL).toContain("acq_source=google");
  expect(authBody.callbackURL).not.toContain("private");
  signedIn = true;
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(authBody.callbackURL);
  await expect.poll(() => captures.length).toBe(1);
  expect(captures[0]).toEqual({
    source: "google",
    medium: "cpc",
    campaign: "teacher_resources",
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "doNotTrack", { value: "1" }),
  );
  await page.reload();
  expect(captures).toHaveLength(1);
});

test("Safari-style lost clipboard activation offers a validated second-click and manual copy", async ({
  page,
}) => {
  await page.route(`**/api/assignments/${id}/share`, (r) =>
    json(r, { path: `/a/${publicId}` }),
  );
  const copy = await workspace(page, { plan: "free" });
  await page.evaluate(() => {
    let first = true;
    navigator.clipboard.writeText = async (value) => {
      if (first) {
        first = false;
        throw new DOMException("Gesture expired", "NotAllowedError");
      }
      window.__clipboard = value;
    };
  });
  await page
    .getByRole("button", { name: copy.freeCopyLink, exact: true })
    .click();
  await expect(page.getByText(copy.clipboardHelp)).toBeVisible();
  await expect(page.getByLabel(copy.studentLink)).toHaveValue(
    new RegExp("channel=copy_link"),
  );
  await page
    .getByRole("button", { name: copy.copyManually, exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.__clipboard))
    .toContain("channel=copy_link");
});
test("pending acquisition never blocks rendering and detail login returns to the assignment", async ({
  page,
}) => {
  await workspace(page);
  await page.route("**/api/lifecycle/acquisition", () => new Promise(() => {}));
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Share to Google Classroom" }),
  ).toBeVisible();
  let auth;
  await page.route("**/api/me", (r) =>
    json(r, { error: "sign_in_required" }, 401),
  );
  await page.route("**/api/config", (r) =>
    json(r, { googleAuthConfigured: true }),
  );
  await page.route("**/api/auth/sign-in/social", (r) => {
    auth = r.request().postDataJSON();
    return json(r, { error: "interrupted" }, 500);
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect
    .poll(() => auth?.callbackURL)
    .toBe(`/workspace/assignments/${id}?lang=en`);
});

test("individual copy keeps its own student channel without Classroom identity sharing", async ({
  page,
}) => {
  const clicks = [];
  await page.route(`**/api/assignments/${id}/share`, (r) => {
    clicks.push(r.request().postDataJSON());
    return json(r, { path: null });
  });
  const copy = await workspace(page, { assigned: true, plan: "parent" });
  await page.locator(".assignment-student-link button").click();
  await expect
    .poll(() => page.evaluate(() => window.__clipboard))
    .toContain(`learner=${learner}`);
  expect(
    new URL(await page.evaluate(() => window.__clipboard)).searchParams.get(
      "channel",
    ),
  ).toBe("copy_link");
  expect(clicks[0]).toMatchObject({
    channel: "copy_link",
    audience: "individual",
    learnerId: id,
  });
  await expect(
    page.getByRole("button", { name: copy.shareClassroom }),
  ).toHaveCount(0);
});
