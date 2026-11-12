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
