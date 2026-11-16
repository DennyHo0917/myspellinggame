const KEY = "pendingSentenceFill";
const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_WORDS_LENGTH = 8000;
const MAX_SENTENCES_LENGTH = 30000;
const LOCALES = new Set(["en", "es", "pt-BR", "fr", "id", "zh"]);

export function readPendingSentenceFill() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (
      !value ||
      typeof value.words !== "string" ||
      !value.words.trim() ||
      value.words.length > MAX_WORDS_LENGTH ||
      (value.sentences !== undefined &&
        (typeof value.sentences !== "string" ||
          value.sentences.length > MAX_SENTENCES_LENGTH)) ||
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
      sentences: value.sentences || "",
      locale: value.locale,
      resumeAuth: value.resumeAuth === true,
      createdAt: value.createdAt,
    };
  } catch {
    return null;
  }
}

export function savePendingSentenceFill({
  words,
  sentences = "",
  locale,
  resumeAuth = false,
  createdAt = Date.now(),
}) {
  const text = String(words ?? "").slice(0, MAX_WORDS_LENGTH);
  if (!text.trim()) return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        words: text,
        sentences: String(sentences ?? "").slice(0, MAX_SENTENCES_LENGTH),
        locale: LOCALES.has(locale) ? locale : "en",
        resumeAuth: resumeAuth === true,
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
      }),
    );
  } catch {}
}

export function clearPendingSentenceFill() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
