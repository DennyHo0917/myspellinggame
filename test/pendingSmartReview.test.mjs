import test from "node:test";
import assert from "node:assert/strict";
import {
  clearPendingSmartReview,
  readPendingSmartReview,
  savePendingSmartReview,
} from "../src/js/pendingSmartReview.mjs";
import {
  assignmentReviewPreviewWords,
  learnerReviewPreviewWords,
  missedStatPreviewWords,
  uniquePreviewWords,
} from "../src/js/smartReviewPreview.mjs";

const LEARNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function useStorage() {
  const storage = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  return storage;
}

test("pending smart review keeps the preview list until sign-in resume", () => {
  const storage = useStorage();
  try {
    savePendingSmartReview({
      words: "banana\napple",
      locale: "zh",
      target: "practice",
      resumeAuth: false,
    });
    const saved = readPendingSmartReview();
    assert.equal(saved.words, "banana\napple");
    assert.equal(saved.locale, "zh");
    assert.equal(saved.target, "practice");
    assert.equal(saved.resumeAuth, false);
    savePendingSmartReview({ ...saved, resumeAuth: true });
    assert.equal(readPendingSmartReview().resumeAuth, true);
    savePendingSmartReview({
      words: "pear",
      locale: "en",
      target: `learner:${LEARNER}`,
    });
    assert.equal(readPendingSmartReview().target, `learner:${LEARNER}`);
    clearPendingSmartReview();
    assert.equal(readPendingSmartReview(), null);
    assert.equal(storage.has("pendingSmartReview"), false);
  } finally {
    delete globalThis.sessionStorage;
  }
});

test("pending smart review drops expired, forged, and empty payloads", () => {
  useStorage();
  try {
    savePendingSmartReview({ words: "   ", locale: "en", target: "practice" });
    assert.equal(readPendingSmartReview(), null);
    savePendingSmartReview({
      words: "123",
      locale: "en",
      target: "practice",
    });
    assert.equal(readPendingSmartReview(), null);
    savePendingSmartReview({
      words: "apple",
      locale: "en",
      target: "workspace",
    });
    assert.equal(readPendingSmartReview(), null);
    savePendingSmartReview({
      words: "apple",
      locale: "en",
      target: "practice",
      createdAt: Date.now() - 25 * 60 * 60 * 1000,
    });
    assert.equal(readPendingSmartReview(), null);
    sessionStorage.setItem(
      "pendingSmartReview",
      JSON.stringify({
        words: "secret",
        locale: "en",
        target: "practice",
        resumeAuth: true,
        createdAt: Date.now() + 60_000,
      }),
    );
    assert.equal(readPendingSmartReview(), null);
  } finally {
    delete globalThis.sessionStorage;
  }
});

test("smart review preview words follow the paid selection without saving history", () => {
  assert.deepEqual(uniquePreviewWords(["Apple", "apple", "pear"], 10), [
    "Apple",
    "pear",
  ]);
  assert.deepEqual(
    learnerReviewPreviewWords([
      {
        word: "mastered",
        status: "mastered",
        incorrectCount: 2,
        lastIncorrectAt: "2026-11-02T00:00:00.000Z",
      },
      {
        word: "older",
        status: "needs_review",
        incorrectCount: 4,
        lastIncorrectAt: "2026-11-01T00:00:00.000Z",
      },
      {
        word: "newer",
        status: "learning",
        incorrectCount: 1,
        lastIncorrectAt: "2026-11-03T00:00:00.000Z",
      },
    ]),
    ["newer", "older"],
  );
  assert.deepEqual(
    assignmentReviewPreviewWords([
      { missed_words: ["pear", "apple"] },
      { missed_words: ["apple", "plum"] },
    ]),
    ["pear", "apple", "plum"],
  );
  assert.deepEqual(
    missedStatPreviewWords([
      { word: "pear", misses: 1 },
      { word: "apple", misses: 3 },
    ]),
    ["apple", "pear"],
  );
});
