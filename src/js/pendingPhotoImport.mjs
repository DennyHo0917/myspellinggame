const KEY = "pendingPhotoImport";
const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_WORDS_LENGTH = 8000;
const IMPORT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCALES = new Set(["en", "es", "pt-BR", "fr", "id", "zh"]);

export function readPendingPhotoImport() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (
      !value ||
      typeof value.words !== "string" ||
      !value.words.trim() ||
      value.words.length > MAX_WORDS_LENGTH ||
      !IMPORT_ID.test(value.importId) ||
      !LOCALES.has(value.locale) ||
      !Number.isFinite(value.createdAt) ||
      Date.now() - value.createdAt > MAX_AGE ||
      value.createdAt > Date.now()
    ) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return {
      words: value.words,
      importId: value.importId,
      locale: value.locale,
      resumeAuth: value.resumeAuth === true,
      createdAt: value.createdAt,
    };
  } catch {
    return null;
  }
}

export function savePendingPhotoImport({
  words,
  importId,
  locale,
  resumeAuth = false,
  createdAt = Date.now(),
}) {
  const text = String(words ?? "").slice(0, MAX_WORDS_LENGTH);
  if (!text.trim() || !IMPORT_ID.test(String(importId || ""))) return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        words: text,
        importId,
        locale: LOCALES.has(locale) ? locale : "en",
        resumeAuth: resumeAuth === true,
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
      }),
    );
  } catch {}
}

export function clearPendingPhotoImport() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
