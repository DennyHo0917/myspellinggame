import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_LOCALES, productMessages } from "../src/js/productLocale.mjs";
import { sanitizeEventParams } from "../src/js/analytics.mjs";
import {
  isLowQualitySentenceTemplate,
  sanitizeExampleSentence,
  dictationSpeechText,
} from "../src/js/spellingCore.mjs";
import classroomCopy from "../scripts/classroom-marketing-copy.cjs";

test("CONV-1 & BUG-5: Classroom locked modal copy is complete in all 6 locales", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.ok(copy.classroomLockedButton?.length, `${locale}:classroomLockedButton`);
    assert.ok(copy.classroomModalTitle?.length, `${locale}:classroomModalTitle`);
    assert.ok(copy.classroomModalBody?.length, `${locale}:classroomModalBody`);
    assert.ok(copy.classroomModalCta?.length, `${locale}:classroomModalCta`);
    assert.ok(copy.classroomModalCopyLink?.length, `${locale}:classroomModalCopyLink`);
  }
});

test("P0-1: Classroom marketing scope detail updated across all 6 locales", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = classroomCopy[locale];
    assert.ok(copy, `Missing copy for ${locale}`);
    assert.ok(copy.scopeDetail?.length, `Missing scopeDetail for ${locale}`);
    assert.ok(
      !copy.scopeDetail.includes("without the Classroom sharing button"),
      `${locale} should not mention without Classroom sharing button`,
    );
    assert.ok(
      !copy.scopeDetail.includes("不提供 Classroom 分享按钮"),
      `${locale} should not mention 不提供 Classroom 分享按钮`,
    );
  }
});

test("CONV-2 & CONV-3: Locked results and weekly preview copy is complete in all 6 locales", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.ok(copy.lockedResultsPracticed?.length, `${locale}:lockedResultsPracticed`);
    assert.ok(copy.weeklyPracticeStats?.length, `${locale}:weeklyPracticeStats`);
    assert.ok(copy.lockedRowLearner?.length, `${locale}:lockedRowLearner`);
    assert.ok(copy.unlock?.length, `${locale}:unlock`);
    // Ensure copy.unlock contains no curly braces
    assert.ok(!copy.unlock.includes("{") && !copy.unlock.includes("}"), `${locale}:unlock template variable`);
  }
});

test("P1 BUG-4: Low quality sentence templates are detected and filtered", () => {
  const badTemplates = [
    'The teacher wrote the adverb "not" on the board.',
    'The teacher wrote the adjective "new" on the board.',
    'The teacher wrote the verb "be" on the board.',
    'The teacher wrote "were" as a verb form.',
    'The teacher mentioned the time during the lesson.',
    'The teacher mentioned the room during the lesson.',
    'The teacher asked the class to explain the meaning of "did".',
    'The class discussed how the comparative adjective "more" can make a description more precise.',
    'After reading the sentence, the students explained what extra detail the adverb "not" adds.',
    'The number one is on the board.',
  ];

  for (const sentence of badTemplates) {
    assert.equal(isLowQualitySentenceTemplate(sentence), true, `Should detect: ${sentence}`);
    assert.equal(sanitizeExampleSentence(sentence), null, `Should sanitize to null: ${sentence}`);
    assert.equal(dictationSpeechText("word", sentence), "word", `Speech should only speak word: ${sentence}`);
  }

  const goodSentences = [
    "I ate a crisp apple.",
    "The cat jumped onto the warm roof.",
    "My friend helped me with my homework.",
    "She wore a warm winter coat.",
  ];

  for (const sentence of goodSentences) {
    assert.equal(isLowQualitySentenceTemplate(sentence), false, `Should allow: ${sentence}`);
    assert.equal(sanitizeExampleSentence(sentence), sentence, `Should keep: ${sentence}`);
  }
});

test("BUG-3: Expired assignment copy and notice is complete in all 6 locales", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.ok(copy.deadlineExpiredNote?.length, `${locale}:deadlineExpiredNote`);
    assert.ok(copy.assignmentExpiredContact?.length, `${locale}:assignmentExpiredContact`);
  }
});

test("CONV-5: Learner waiting list copy is complete in all 6 locales", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.ok(copy.learnersWaitingCount?.length, `${locale}:learnersWaitingCount`);
    assert.ok(copy.learnerWaitingBadge?.length, `${locale}:learnerWaitingBadge`);
  }
});

test("CONV-8: Telemetry events accept only approved parameters and strip extra/PII fields", () => {
  const pii = {
    email: "teacher@example.test",
    name: "Teacher Name",
    secret: "sensitive",
    word: "apple",
  };

  assert.deepEqual(
    sanitizeEventParams("classroom_cta_click", {
      ...pii,
      locked: true,
      plan: "free",
    }),
    { locked: true, plan: "free" },
  );

  assert.deepEqual(
    sanitizeEventParams("results_view", {
      ...pii,
      plan: "free",
      locked_count: 2,
      student_count: 1,
      attempt_count: 3,
    }),
    { plan: "free", locked_count: 2, student_count: 1, attempt_count: 3 },
  );

  assert.deepEqual(
    sanitizeEventParams("trial_exhausted_banner_view", {
      ...pii,
      plan: "free",
      locked_count: 5,
    }),
    { plan: "free", locked_count: 5 },
  );

  assert.deepEqual(
    sanitizeEventParams("upgrade_click", {
      ...pii,
      source: "classroom",
      plan: "teacher",
      billing_interval: "year",
    }),
    { source: "classroom", plan: "teacher", billing_interval: "year" },
  );
});
