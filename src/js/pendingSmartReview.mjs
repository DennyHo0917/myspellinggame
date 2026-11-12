const KEY = "pendingSmartReview";
const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_WORDS_LENGTH = 8000;
const LOCALES = new Set(["en", "es", "pt-BR", "fr", "id", "zh"]);
const TARGET =
  /^(?:practice|progress|review-entry|learner:[0-9a-f-]{36}|assignment:[0-9a-f-]{36})$/i;

function validWords(words) {
  return (
    typeof words === "string" &&
    words.trim().length > 0 &&
    words.length <= MAX_WORDS_LENGTH &&
    /[A-Za-z]/.test(words)
  );
}

export function readPendingSmartReview() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (
      !validWords(value?.words) ||
      !TARGET.test(String(value?.target || "")) ||
      !LOCALES.has(value?.locale) ||
      !Number.isFinite(value?.createdAt) ||
      Date.now() - value.createdAt > MAX_AGE ||
      value.createdAt > Date.now()
    ) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return {
      words: value.words,
      locale: value.locale,
      target: value.target,
      resumeAuth: value.resumeAuth === true,
      createdAt: value.createdAt,
    };
  } catch {
    return null;
  }
}

export function savePendingSmartReview({
  words,
  locale,
  target,
  resumeAuth = false,
  createdAt = Date.now(),
}) {
  const text = String(words ?? "").slice(0, MAX_WORDS_LENGTH);
  if (!validWords(text) || !TARGET.test(String(target || ""))) return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        words: text,
        locale: LOCALES.has(locale) ? locale : "en",
        target,
        resumeAuth: resumeAuth === true,
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
      }),
    );
  } catch {}
}

export function clearPendingSmartReview() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
