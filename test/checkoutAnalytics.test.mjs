import test from "node:test";
import assert from "node:assert/strict";
import { trackEvent, trackLockedFeatureError } from "../src/js/analytics.mjs";

test("trial error emits a lock once; navigation options survive sanitization without leaking fields", () => {
  const calls = [];
  globalThis.window = { gtag: (...args) => calls.push(args) };
  try {
    trackLockedFeatureError("tracking_trial_used");
    trackLockedFeatureError("tracking_trial_used");
    assert.equal(calls.length, 1);
    assert.equal(calls[0][2].feature, "tracking_trial_used");
    trackEvent("upgrade_cta_clicked", {
      cta_location: "locked_results",
      plan: "parent",
      billing_interval: "year",
      child_name: "private",
      transport_type: "unsafe",
    });
    assert.deepEqual(calls[1][2], {
      cta_location: "locked_results",
      plan: "parent",
      billing_interval: "year",
      transport_type: "beacon",
    });
  } finally {
    delete globalThis.window;
  }
});
