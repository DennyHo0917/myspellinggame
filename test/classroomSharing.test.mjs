import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assignmentShareURL,
  classroomShareURL,
  distributionChannel,
} from "../src/js/assignmentSharing.mjs";
import {
  classifyAcquisition,
  sanitizeAcquisition,
} from "../src/js/adultAcquisition.mjs";
import { sanitizeEventParams } from "../src/js/analytics.mjs";
import { PRODUCT_LOCALES, productMessages } from "../src/js/productLocale.mjs";
test("Classroom nested URLs and Unicode titles round-trip without student identity", () => {
  const url = assignmentShareURL(
    "/join/classroom123?assignment=abcdefghijklmnopqrstuvwx",
    "https://example.test",
    "zh",
    "google_classroom",
  );
  const share = new URL(
    classroomShareURL(url, "作业 & + ? #", "Practice & learn"),
  );
  assert.equal(share.origin, "https://classroom.google.com");
  assert.equal(share.pathname, "/share");
  assert.equal(share.searchParams.get("url"), url);
  assert.equal(share.searchParams.get("title"), "作业 & + ? #");
  assert.equal(share.searchParams.get("body"), "Practice & learn");
  assert.equal(share.searchParams.get("itemtype"), "assignment");
  assert.equal(new URL(url).searchParams.get("channel"), "google_classroom");
  assert.equal(
    assignmentShareURL(
      "/a/abcdefghijklmnopqrstuvwx?learner=SECRET",
      "https://example.test",
      "en",
      "google_classroom",
    ),
    null,
  );
  assert.equal(
    assignmentShareURL(
      "https://evil.test/a/abcdefghijklmnopqrstuvwx",
      "https://example.test",
      "en",
      "copy_link",
    ),
    null,
  );
  assert.equal(distributionChannel("PIN=1234"), "direct");
});
test("adult attribution uses controlled dimensions only", () => {
  assert.deepEqual(
    classifyAcquisition(
      "https://example.test?utm_source=google&utm_campaign=teacher_resources&utm_medium=cpc&learner=SECRET",
      "https://evil.test/path?pin=1234",
    ),
    { source: "google", medium: "cpc", campaign: "teacher_resources" },
  );
  assert.deepEqual(
    classifyAcquisition(
      "https://example.test",
      "https://www.google.com/search?q=private",
    ),
    { source: "google", medium: "organic", campaign: null },
  );
  assert.equal(
    classifyAcquisition(
      "https://example.test",
      "https://google.com.evil.test/path",
    ).source,
    "external_other",
  );
  assert.deepEqual(
    sanitizeAcquisition({
      source: "SECRET",
      medium: "PIN",
      campaign: "learner",
      url: "private",
    }),
    { source: "direct", medium: null, campaign: null },
  );
});
test("GA4 rejects student identity, PIN, URLs and unapproved share dimensions", () => {
  assert.deepEqual(
    sanitizeEventParams("assignment_opened", {
      mode: "typing",
      word_count: 2,
      learner: "SECRET",
      pin: "1234",
      url: "secret",
      channel: "google_classroom",
    }),
    { mode: "typing", word_count: 2 },
  );
});
test("Classroom and safe PIN copy is complete in all six languages", () => {
  for (const [locale] of PRODUCT_LOCALES)
    for (const key of [
      "shareClassroom",
      "classroomTeacherRequired",
      "classroomBody",
      "classroomOpened",
      "classroomIndividualOnly",
      "invalidPin",
      "assignmentUnavailable",
    ])
      assert.ok(productMessages(locale)[key]?.length, `${locale}:${key}`);
});

test("ChatGPT referral and campaign aliases keep controlled first-touch dimensions", () => {
  assert.deepEqual(
    classifyAcquisition(
      "https://example.test",
      "https://chatgpt.com/c/private-conversation",
    ),
    { source: "chatgpt", medium: "ai_assistant", campaign: null },
  );
  assert.deepEqual(
    classifyAcquisition(
      "https://example.test?utm_source=chatgpt.com&utm_medium=ai-assistant",
    ),
    { source: "chatgpt", medium: "ai_assistant", campaign: null },
  );
  assert.equal(
    classifyAcquisition(
      "https://example.test",
      "https://chatgpt.com.evil.test/private",
    ).source,
    "external_other",
  );
});
