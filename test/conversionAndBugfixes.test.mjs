import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_LOCALES, productMessages } from "../src/js/productLocale.mjs";
import { sanitizeEventParams } from "../src/js/analytics.mjs";

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

test("CONV-2 & CONV-3: Locked results and weekly preview copy is complete in all 6 locales", () => {
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.ok(copy.lockedResultsPracticed?.length, `${locale}:lockedResultsPracticed`);
    assert.ok(copy.weeklyPracticeStats?.length, `${locale}:weeklyPracticeStats`);
    assert.ok(copy.lockedRowLearner?.length, `${locale}:lockedRowLearner`);
    assert.ok(copy.unlock?.length, `${locale}:unlock`);
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
