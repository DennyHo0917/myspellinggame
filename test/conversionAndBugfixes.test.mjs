import { upgradeSelection } from "../src/js/upgradeSelection.mjs";
import fs from "node:fs";
import path from "node:path";
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

test("Pricing default interval is month and savings badges exist across all 6 locales", () => {
  const selection = upgradeSelection({});
  assert.equal(selection.interval, "month");

  const pricingFiles = [
    { file: "pricing.html", locale: "en" },
    { file: "es/pricing.html", locale: "es" },
    { file: "pt-br/pricing.html", locale: "pt-BR" },
    { file: "fr/pricing.html", locale: "fr" },
    { file: "id/pricing.html", locale: "id" },
    { file: "zh/pricing.html", locale: "zh" },
  ];

  for (const { file } of pricingFiles) {
    const html = fs.readFileSync(path.resolve(file), "utf8");
    // Month toggle active by default
    assert.ok(html.includes('data-plan-option="month" aria-pressed="true"'), `${file}: month pressed`);
    assert.ok(html.includes('data-plan-option="year" aria-pressed="false"'), `${file}: year unpressed`);
    // Monthly prices rendered by default (either 7.99 or 7,99)
    assert.ok(html.includes("7.99") || html.includes("7,99"), `${file}: parent monthly price`);
    assert.ok(html.includes("14.99") || html.includes("14,99"), `${file}: teacher monthly price`);
    // Savings badges and subtexts exist in markup
    assert.ok(html.includes("data-plan-savings"), `${file}: data-plan-savings`);
    assert.ok(html.includes("17"), `${file}: 17% savings`);
    assert.ok(html.includes("data-plan-subtext"), `${file}: data-plan-subtext`);
    assert.ok(html.includes("6.66") || html.includes("6,66"), `${file}: 6.66 subtext`);
    assert.ok(html.includes("12.49") || html.includes("12,49"), `${file}: 12.49 subtext`);
  }
});

test("CTA monthly pricing and secondary yearly copy is complete in all 6 locales", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.ok(copy.classroomModalCta?.includes("14.99") || copy.classroomModalCta?.includes("14,99"), `${locale}:classroomModalCta month`);
    assert.ok(copy.teacherPriceMonthly?.includes("14.99") || copy.teacherPriceMonthly?.includes("14,99"), `${locale}:teacherPriceMonthly`);
    assert.ok(copy.parentPriceMonthly?.includes("7.99") || copy.parentPriceMonthly?.includes("7,99"), `${locale}:parentPriceMonthly`);
    assert.ok(copy.orTeacherYearly?.includes("149.90") || copy.orTeacherYearly?.includes("149,90"), `${locale}:orTeacherYearly`);
    assert.ok(copy.orParentYearly?.includes("79.90") || copy.orParentYearly?.includes("79,90"), `${locale}:orParentYearly`);
  }
});

test("upgradeSelection targets teacher for parent accounts and respects pending choices", () => {
  assert.equal(upgradeSelection({ plan: "parent" }).plan, "teacher");
  assert.equal(upgradeSelection({ plan: "parent", billingInterval: "year" }).interval, "year");
  assert.equal(upgradeSelection({ plan: "parent", billingInterval: "month" }).interval, "month");
  assert.equal(upgradeSelection({ plan: "free" }).plan, "parent");
  assert.equal(upgradeSelection({ plan: "free", workspaceType: "teacher" }).plan, "teacher");
  assert.equal(upgradeSelection({}).plan, "parent");
});

test("active assignment and learner limits are localized and plan-aware across all 6 locales", () => {
  const keys = [
    "activeLimit",
    "activeLimitParent",
    "activeLimitTeacher",
    "learnerLimit",
    "learnerLimitParent",
    "learnerLimitTeacher",
  ];
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    for (const key of keys) {
      assert.ok(copy[key]?.length > 0, `${locale}: ${key} must exist`);
      assert.doesNotMatch(copy[key], /\{date\}|\{count\}|\{limit\}/, `${locale}: ${key} has unreplaced placeholder`);
    }
  }

  // En specific limit wording
  const en = productMessages("en");
  assert.match(en.activeLimit, /Free Plan limit of 1/);
  assert.match(en.activeLimitParent, /Parent Plan limit of 5/);
  assert.match(en.activeLimitTeacher, /Teacher Plan limit of 10/);
  assert.match(en.learnerLimit, /Free Plan limit of 1/);
  assert.match(en.learnerLimitParent, /Parent Plan limit of 5/);
  assert.match(en.learnerLimitTeacher, /Teacher Plan limit of 40/);

  // Zh specific limit wording
  const zh = productMessages("zh");
  assert.match(zh.activeLimit, /免费版最多 1 个/);
  assert.match(zh.activeLimitParent, /家庭方案最多 5 个/);
  assert.match(zh.activeLimitTeacher, /教师方案最多 10 个/);
  assert.match(zh.learnerLimit, /免费方案 1 个/);
  assert.match(zh.learnerLimitParent, /家庭方案最多 5 个/);
  assert.match(zh.learnerLimitTeacher, /教师方案最多 40 个/);
});

