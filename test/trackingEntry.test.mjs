import test from "node:test";
import assert from "node:assert/strict";
import {
  saveTrackingEntry,
  takeTrackingEntry,
} from "../src/js/trackingDraft.mjs";
import { sanitizeEventParams } from "../src/js/analytics.mjs";

test("incoming tracking draft is consumed once, isolated by account, and expires", () => {
  const values = new Map();
  globalThis.sessionStorage = {
    setItem: (k, v) => values.set(k, v),
    getItem: (k) => values.get(k) || null,
    removeItem: (k) => values.delete(k),
  };
  try {
    saveTrackingEntry({ words: "apple", mode: "typing" });
    assert.equal(takeTrackingEntry("alice").words, "apple");
    assert.equal(takeTrackingEntry("alice"), null);
    saveTrackingEntry({ words: "private" }, "alice");
    assert.equal(takeTrackingEntry("bob"), null);
    values.set(
      "mySpellingTrackingEntry",
      JSON.stringify({ words: "old", createdAt: Date.now() - 86400001 }),
    );
    assert.equal(takeTrackingEntry("alice"), null);
  } finally {
    delete globalThis.sessionStorage;
  }
});

test("tracking and feature-use analytics omit child identity and practice content", () => {
  const privateData = {
    learner_id: "secret",
    name: "Alice",
    words: "apple",
    email: "private@test.com",
  };
  for (const event of [
    "tracking_cta_viewed",
    "tracking_setup_viewed",
    "tracking_practice_ready",
    "premium_feature_used",
  ]) {
    assert.deepEqual(sanitizeEventParams(event, privateData), {});
  }
  assert.deepEqual(
    sanitizeEventParams("premium_feature_used", {
      ...privateData,
      feature: "photo_import",
      current_plan: "parent",
      word_count: 2,
      after_upgrade: true,
    }),
    {
      feature: "photo_import",
      current_plan: "parent",
      word_count: 2,
      after_upgrade: true,
    },
  );
});
