import test from "node:test";
import assert from "node:assert/strict";
import {
  safeUpgradePath,
  saveUpgradeReturn,
  bindUpgradeReturn,
  upgradeReturnFor,
  readUpgradeReturn,
} from "../src/js/upgradeReturn.mjs";

test("upgrade return only accepts local practice and workspace routes", () => {
  const origin = "https://example.test";
  assert.equal(
    safeUpgradePath("/workspace/assignments/new?lang=zh&tracking=1", origin),
    "/workspace/assignments/new?lang=zh&tracking=1",
  );
  for (const path of [
    "https://evil.test/zh/",
    "//evil.test/",
    "/api/billing/checkout",
    "/pricing",
    "/admin",
  ])
    assert.equal(safeUpgradePath(path, origin), null);
  assert.equal(
    safeUpgradePath("/zh/?checkout=success&lang=zh", origin),
    "/zh/?lang=zh",
  );
  assert.equal(
    safeUpgradePath(
      "/workspace/learners/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?lang=fr",
      origin,
    ),
    "/workspace/learners/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?lang=fr",
  );
});

test("upgrade return is bound to the paying account, expires, and requires paid access", () => {
  const storage = new Map();
  globalThis.location = {
    origin: "https://example.test",
    href: "https://example.test/zh/",
  };
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  try {
    saveUpgradeReturn("photo_import", null, { words: "apple" });
    bindUpgradeReturn("alice");
    assert.equal(
      upgradeReturnFor({ user: { id: "alice" }, plan: "free" }),
      null,
    );
    assert.equal(
      upgradeReturnFor({ user: { id: "bob" }, plan: "parent" }),
      null,
    );
    assert.equal(
      upgradeReturnFor({ user: { id: "alice" }, plan: "parent" }).draft.words,
      "apple",
    );
    bindUpgradeReturn("bob");
    assert.equal(readUpgradeReturn(), null);
    saveUpgradeReturn("photo_import", "alice");
    const value = readUpgradeReturn();
    value.createdAt -= 25 * 60 * 60 * 1000;
    storage.set("mySpellingUpgradeReturn", JSON.stringify(value));
    assert.equal(readUpgradeReturn(), null);
  } finally {
    delete globalThis.location;
    delete globalThis.sessionStorage;
  }
});
