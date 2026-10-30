import test from "node:test";
import assert from "node:assert/strict";
import {
  savePendingCheckout,
  readPendingCheckout,
  consumePendingCheckout,
  clearPendingCheckout,
} from "../src/js/pendingCheckout.mjs";
import { upgradeSelection } from "../src/js/upgradeSelection.mjs";

test("checkout intent expires, consumes once, clears old choices and preserves valid explicit choices", () => {
  const storage = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };
  try {
    storage.set("pendingCheckoutPlan", "teacher");
    storage.set("pendingCheckoutInterval", "month");
    assert.deepEqual(upgradeSelection({}), {
      plan: "parent",
      interval: "year",
    });
    savePendingCheckout("teacher", "month", true);
    assert.deepEqual(upgradeSelection({}), {
      plan: "teacher",
      interval: "month",
    });
    assert.equal(consumePendingCheckout().plan, "teacher");
    assert.equal(consumePendingCheckout(), null);
    const value = readPendingCheckout();
    value.at -= 15 * 60 * 1000;
    storage.set("mySpellingPendingCheckout", JSON.stringify(value));
    assert.equal(readPendingCheckout(), null);
    assert.equal(storage.has("pendingCheckoutPlan"), false);
    savePendingCheckout("parent", "year", false);
    assert.equal(consumePendingCheckout(), null);
    clearPendingCheckout();
    assert.equal(readPendingCheckout(), null);
    assert.deepEqual(upgradeSelection({ workspaceType: "teacher" }), {
      plan: "teacher",
      interval: "year",
    });
  } finally {
    delete globalThis.sessionStorage;
  }
});
