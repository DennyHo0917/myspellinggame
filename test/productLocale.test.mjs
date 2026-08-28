import test from "node:test";
import assert from "node:assert/strict";

import {
  PRODUCT_LOCALES,
  productMessages,
  productPagePath,
} from "../src/js/productLocale.mjs";

test("pricing paths stay inside the active product locale", () => {
  assert.equal(productPagePath("pricing", "en"), "/pricing");
  assert.equal(productPagePath("pricing", "es"), "/es/pricing");
  assert.equal(productPagePath("pricing", "pt-BR"), "/pt-br/pricing");
  assert.equal(productPagePath("pricing", "fr"), "/fr/pricing");
  assert.equal(productPagePath("pricing", "id"), "/id/pricing");
  assert.equal(productPagePath("pricing", "zh"), "/zh/pricing");
});

test("word-limit copy states Free and Plus list limits in every locale", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.match(copy.wordLimit, /40/);
    assert.match(copy.wordLimit, /80/);
    assert.match(copy.wordLimit, /Plus/);
    assert.doesNotMatch(copy.wordLimit, /Pro/);
  }
});

test("paid workspace copy uses Plus as the visible product name", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    assert.doesNotMatch(JSON.stringify(productMessages(locale)), /\bPro\b/);
  }
});

test("every product locale keeps the brand and has a distinct student-limit message", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.equal(copy.brand, "My Spelling Game");
    assert.ok(copy.studentLimit);
    assert.notEqual(copy.studentLimit, copy.teacherLimit);
    assert.ok(copy.checkoutRetry);
    assert.ok(copy.checkoutPending);
    assert.ok(copy.retryCheckout);
    assert.match(copy.submissionLimitWarning, /\{used\}/);
    assert.match(copy.submissionLimitWarning, /\{limit\}/);
    assert.match(copy.submissionLimitReached, /\{limit\}/);
    assert.match(copy.activeLimit, /1/);
    assert.match(copy.activeLimit, /20/);
    assert.ok(copy.activatingPro);
    assert.ok(copy.activationDelayed);
    assert.ok(copy.checkAgain);
  }
});

test("workspace titles stay role-neutral in every product locale", () => {
  const expected = {
    en: "Workspace",
    es: "Espacio de trabajo",
    "pt-BR": "Espaço de trabalho",
    fr: "Espace de travail",
    id: "Ruang kerja",
    zh: "工作台",
  };
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.equal(copy.signInTitle, expected[locale]);
    assert.equal(copy.dashboardTitle, expected[locale]);
  }
});

test("paid workspace features are localized in every product locale", () => {
  const keys = [
    "savedLists",
    "learnerUsage",
    "masteryHistoryUpgrade",
    "smartReviewValue",
    "missedWordsPreview",
    "smartReviewPreview",
    "savedListLimit",
    "learnerLimit",
    "proActive",
    "learnerHome",
    "learnerGreeting",
    "practicingAs",
    "yourAssignments",
    "noActiveAssignments",
    "startAssignment",
    "copyLearnerLink",
    "learnerLinkCopied",
    "exampleSentences",
    "exampleSentencesHelp",
    "exampleSentencesPrompt",
    "invalidExampleSentence",
    "editAssignment",
    "assignmentHasResults",
  ];
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    for (const key of keys) assert.ok(copy[key], `${locale}: ${key}`);
  }
});

test("student terminology is used in learner-facing copy", () => {
  const keys = [
    "noAssignments",
    "students",
    "studentLink",
    "copyLink",
    "deleteConfirm",
    "summaryStudents",
    "results",
    "noResults",
    "copied",
    "learnerHome",
    "copyLearnerLink",
    "learnerLinkCopied",
    "learners",
    "learnersCopy",
    "learnerUsage",
    "learnerName",
    "learnerNamePlaceholder",
    "addLearner",
    "learnerNamePrompt",
    "learnerNotFound",
    "learnerExists",
    "learnerLimit",
  ];
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    for (const key of keys) {
      assert.doesNotMatch(
        String(copy[key]),
        /learner|learners|aprendiz|apprenant|pelajar|学习者/i,
        `${locale}: ${key}`,
      );
    }
  }
});
