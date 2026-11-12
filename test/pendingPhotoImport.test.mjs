import test from "node:test";
import assert from "node:assert/strict";
import {
  clearPendingPhotoImport,
  readPendingPhotoImport,
  savePendingPhotoImport,
} from "../src/js/pendingPhotoImport.mjs";

const IMPORT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function useStorage() {
  const storage = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  return storage;
}

test("pending photo import keeps edited words until sign-in resume", () => {
  const storage = useStorage();
  try {
    savePendingPhotoImport({
      words: "apple\nbanana",
      importId: IMPORT_ID,
      locale: "zh",
      resumeAuth: false,
    });
    const saved = readPendingPhotoImport();
    assert.equal(saved.words, "apple\nbanana");
    assert.equal(saved.locale, "zh");
    assert.equal(saved.resumeAuth, false);
    savePendingPhotoImport({ ...saved, resumeAuth: true });
    assert.equal(readPendingPhotoImport().resumeAuth, true);
    assert.equal(readPendingPhotoImport().importId, IMPORT_ID);
    clearPendingPhotoImport();
    assert.equal(readPendingPhotoImport(), null);
    assert.equal(storage.has("pendingPhotoImport"), false);
  } finally {
    delete globalThis.sessionStorage;
  }
});

test("pending photo import drops expired, forged, and empty payloads", () => {
  useStorage();
  try {
    savePendingPhotoImport({
      words: "   ",
      importId: IMPORT_ID,
      locale: "en",
    });
    assert.equal(readPendingPhotoImport(), null);
    savePendingPhotoImport({
      words: "apple",
      importId: "not-a-uuid",
      locale: "en",
    });
    assert.equal(readPendingPhotoImport(), null);
    savePendingPhotoImport({
      words: "apple",
      importId: IMPORT_ID,
      locale: "en",
      createdAt: Date.now() - 25 * 60 * 60 * 1000,
    });
    assert.equal(readPendingPhotoImport(), null);
    sessionStorage.setItem(
      "pendingPhotoImport",
      JSON.stringify({
        words: "secret",
        importId: IMPORT_ID,
        locale: "en",
        resumeAuth: true,
        createdAt: Date.now() + 60_000,
      }),
    );
    assert.equal(readPendingPhotoImport(), null);
  } finally {
    delete globalThis.sessionStorage;
  }
});
