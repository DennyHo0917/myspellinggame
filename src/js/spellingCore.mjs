export const SAMPLE_WORDS = [
  "because",
  "friend",
  "beautiful",
  "answer",
  "enough",
  "favorite",
  "library",
  "through",
];
export const SAMPLE_EXAMPLE_SENTENCES = [
  "I stayed inside because it was raining.",
  "My friend helped me with my homework.",
  "We saw a beautiful rainbow after the storm.",
  "Please write the answer in your notebook.",
  "We have enough time to finish the project.",
  "Blue is my favorite color.",
  "I borrowed a book from the library.",
  "Sunlight came through the window.",
];
export const ANONYMOUS_WORD_LIMIT = 20;

export function analyzeWords(text) {
  const tokens = String(text || "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .toLowerCase()
    .split(/[\s,]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const validShape = (word) => /^[a-z]+(?:['-][a-z]+)*$/.test(word);
  const tooShort = [
    ...new Set(
      tokens.filter(
        (word) => validShape(word) && word.length === 1 && !/[ai]/.test(word),
      ),
    ),
  ];
  const tooLong = [
    ...new Set(tokens.filter((word) => validShape(word) && word.length > 24)),
  ];
  const invalid = [...new Set(tokens.filter((word) => !validShape(word)))];
  const accepted = tokens.filter(
    (word) =>
      validShape(word) &&
      word.length <= 24 &&
      (word.length > 1 || /[ai]/.test(word)),
  );
  const duplicates = [
    ...new Set(
      accepted.filter((word, index) => accepted.indexOf(word) !== index),
    ),
  ];
  const words = [...new Set(accepted)];
  return { words, duplicates, tooShort, tooLong, invalid };
}

export function parseWords(text) {
  const analysis = analyzeWords(text);
  return analysis.tooShort.length ||
    analysis.tooLong.length ||
    analysis.invalid.length
    ? []
    : analysis.words;
}

export function configuredWords(text, fallback = SAMPLE_WORDS) {
  const words = parseWords(text);
  return words.length ? words : [...fallback];
}

export function normalizeAnswer(answer) {
  return String(answer || "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .trim()
    .toLowerCase();
}

export function exampleSentenceParts(sentence, word) {
  const text = String(sentence || "").trim();
  if (!text || !word) return text ? [{ text }] : [];
  const escapedWord = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.matchAll(
    new RegExp(
      `(^|[^\\p{L}\\p{N}])(${escapedWord})(?=$|[^\\p{L}\\p{N}])`,
      "giu",
    ),
  );
  const parts = [];
  let offset = 0;
  let found = false;
  for (const match of matches) {
    const wordStart = match.index + match[1].length;
    if (wordStart > offset) parts.push({ text: text.slice(offset, wordStart) });
    parts.push({ blank: true });
    offset = wordStart + match[2].length;
    found = true;
  }
  if (!found) return [{ text }];
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
}

export function isLowQualitySentenceTemplate(sentence) {
  if (!sentence || typeof sentence !== "string") return false;
  const s = sentence.trim();
  if (!s) return false;
  return (
    /The teacher (wrote|mentioned|asked|pointed|explained|used|showed|reviewed)/i.test(s) ||
    /on the board/i.test(s) ||
    /during the lesson/i.test(s) ||
    /The class (discussed|compared|read|reviewed|practiced)/i.test(s) ||
    /After (reading|discussing|reviewing|examining)/i.test(s) ||
    /as a (verb|noun|adverb|adjective)/i.test(s) ||
    /role of "[^"]+"/i.test(s) ||
    /can make a description more precise/i.test(s) ||
    /wrote an example that showed they understood/i.test(s) ||
    /The number [a-z0-9]+ is on the board/i.test(s) ||
    /The story uses "[^"]+"/i.test(s) ||
    /The lesson (includes|uses) "[^"]+"/i.test(s)
  );
}

export function sanitizeExampleSentence(sentence) {
  if (!sentence) return null;
  const trimmed = String(sentence).trim();
  if (!trimmed) return null;
  if (isLowQualitySentenceTemplate(trimmed)) return null;
  return trimmed;
}

export function dictationSpeechText(word, sentence) {
  if (isLowQualitySentenceTemplate(sentence)) return word;
  const cleanSentence = String(sentence || "")
    .trim()
    .replace(/[.!?]+$/, "");
  return cleanSentence ? `${word}. ${cleanSentence}.` : word;
}

export function createDictationSession(words) {
  return {
    words: [...new Set(words)],
    index: 0,
    submitted: false,
    results: [],
  };
}

export function currentDictationWord(session) {
  return session.words[session.index] || null;
}

export function submitDictationAnswer(session, answer) {
  const word = currentDictationWord(session);
  if (!word || session.submitted) return null;

  const normalizedAnswer = normalizeAnswer(answer);
  const result = {
    word,
    answer: normalizedAnswer,
    correct: normalizedAnswer === normalizeAnswer(word),
  };
  session.results.push(result);
  session.submitted = true;
  return result;
}

export function advanceDictationSession(session) {
  if (!session.submitted) return false;
  session.index += 1;
  session.submitted = false;
  return session.index >= session.words.length;
}

export function dictationSummary(session) {
  const missedWords = session.results
    .filter((result) => !result.correct)
    .map((result) => result.word);
  const correct = session.results.length - missedWords.length;
  const total = session.words.length;
  return {
    total,
    correct,
    incorrect: missedWords.length,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    missedWords,
  };
}

export function retryMissedDictation(session) {
  return createDictationSession(dictationSummary(session).missedWords);
}

export function takeCustomWord(words, cursor = 0) {
  if (!Array.isArray(words) || cursor >= words.length)
    return { word: null, cursor };
  return { word: words[cursor], cursor: cursor + 1 };
}

export function shouldEndTypingOnMiss(isCustomRound, missedCount, maxMisses) {
  return !isCustomRound && missedCount >= maxMisses;
}

export function customTypingRoundComplete(
  totalWords,
  processedCount,
  activeWordCount,
) {
  return (
    totalWords > 0 && processedCount >= totalWords && activeWordCount === 0
  );
}

function sentenceLines(value) {
  if (Array.isArray(value)) return value.map((line) => String(line ?? ""));
  return String(value ?? "").split(/\r?\n/);
}

function sentenceWordKey(value) {
  return String(value ?? "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .trim()
    .toLowerCase();
}

// Keep a sentence only with the word it was written for. A replaced list must
// not keep the previous batch lined up by row.
export function alignExampleSentences(
  previousWords,
  previousSentences,
  nextWords,
) {
  const priorWords = sentenceLines(previousWords);
  const priorSentences = sentenceLines(previousSentences);
  const map = new Map();
  priorWords.forEach((word, index) => {
    const key = sentenceWordKey(word);
    const sentence = String(priorSentences[index] ?? "")
      .trim()
      .slice(0, 300);
    if (key && sentence) map.set(key, sentence);
  });
  return sentenceLines(nextWords).map((word) => {
    const key = sentenceWordKey(word);
    return key ? map.get(key) || "" : "";
  });
}

export function sentencesFromMatches(wordText, matches = {}) {
  return sentenceLines(wordText)
    .map((word) => {
      const key = sentenceWordKey(word);
      return key
        ? String(matches?.[key] ?? "")
            .trim()
            .slice(0, 300)
        : "";
    })
    .join("\n");
}

export function mergeLibrarySentences(
  wordText,
  existingSentences,
  matches = {},
) {
  const lines = sentenceLines(wordText);
  const existing = sentenceLines(existingSentences);
  return lines
    .map((word, index) => {
      const key = sentenceWordKey(word);
      if (!key) return "";
      const current = String(existing[index] ?? "")
        .trim()
        .slice(0, 300);
      return (
        current ||
        String(matches?.[key] ?? "")
          .trim()
          .slice(0, 300)
      );
    })
    .join("\n");
}

export function typingCompletionStats(processedCount, missedWords = []) {
  const wordCount = Math.max(0, Number(processedCount) || 0);
  const missedCount = Math.min(wordCount, new Set(missedWords).size);
  const correctCount = wordCount - missedCount;
  return {
    word_count: wordCount,
    correct_count: correctCount,
    missed_count: missedCount,
    accuracy: wordCount ? Math.round((correctCount / wordCount) * 100) : 0,
  };
}
