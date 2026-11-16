import test from "node:test";
import assert from "node:assert/strict";

import { featureTrialActive, featureTrialLabel } from "../src/js/featureTrial.mjs";

const message = (key, vars = {}) =>
  ({
    featureTrialDay: "1 day",
    featureTrialDays: `${vars.count} days`,
    featureTrialHour: "1 hour",
    featureTrialHours: `${vars.count} hours`,
    featureTrialStatus: `7-day free trial · ${vars.time} left · ends ${vars.date}`,
  })[key];

test("feature trial stays active until the shared end time", () => {
  const endsAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const trial = {
    active: true,
    startedAt: new Date().toISOString(),
    endsAt,
    remainingMs: 1,
  };
  assert.equal(featureTrialActive(trial), true);
  assert.match(featureTrialLabel(trial, message, "en-US"), /7-day free trial/);
  assert.match(featureTrialLabel(trial, message, "en-US"), /days left/);
  assert.equal(
    featureTrialActive({ ...trial, active: false }),
    false,
  );
  assert.equal(
    featureTrialLabel({ ...trial, endsAt: new Date(Date.now() - 1000).toISOString() }, message),
    "",
  );
});

test("feature trial shows hours during the last day", () => {
  const trial = {
    active: true,
    endsAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  };
  assert.match(featureTrialLabel(trial, message, "en-US"), /hours left/);
});

test("workspace 30-day trial copy exists across all 6 locales", async () => {
  const { PRODUCT_LOCALES, productMessages } = await import(
    "../src/js/productLocale.mjs"
  );
  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    assert.ok(copy.workspaceTrialActiveTitle, `${locale}: workspaceTrialActiveTitle`);
    assert.ok(copy.workspaceTrialActiveDesc, `${locale}: workspaceTrialActiveDesc`);
    assert.ok(copy.workspaceTrialTotalTag, `${locale}: workspaceTrialTotalTag`);
    assert.ok(copy.workspaceTrialClaimCta, `${locale}: workspaceTrialClaimCta`);
    assert.ok(copy.workspaceTrialExpiredTitle, `${locale}: workspaceTrialExpiredTitle`);
    assert.ok(copy.workspaceTrialExpiredDesc, `${locale}: workspaceTrialExpiredDesc`);
    assert.ok(copy.workspaceTrialStart7DayCta, `${locale}: workspaceTrialStart7DayCta`);
    assert.ok(copy.workspaceTrialTotalTag.includes("30"), `${locale}: 30 days in workspaceTrialTotalTag`);
    assert.ok(copy.workspaceTrialTotalTag.includes("7"), `${locale}: 7 days in workspaceTrialTotalTag`);
  }
});
