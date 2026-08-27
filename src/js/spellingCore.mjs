export const SAMPLE_WORDS = ['because', 'friend', 'beautiful', 'answer', 'enough', 'favorite', 'library', 'through'];
export const ANONYMOUS_WORD_LIMIT = 20;

export function parseWords(text) {
  return [...new Set((text || '')
    .toLowerCase()
    .split(/[^a-z'-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && word.length <= 24))];
}

export function configuredWords(text, fallback = SAMPLE_WORDS) {
  const words = parseWords(text);
  return words.length ? words : [...fallback];
}

export function normalizeAnswer(answer) {
  return String(answer || '').trim().toLowerCase();
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
  const missedWords = session.results.filter((result) => !result.correct).map((result) => result.word);
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
  if (!Array.isArray(words) || cursor >= words.length) return { word: null, cursor };
  return { word: words[cursor], cursor: cursor + 1 };
}

export function shouldEndTypingOnMiss(isCustomRound, missedCount, maxMisses) {
  return !isCustomRound && missedCount >= maxMisses;
}

export function customTypingRoundComplete(totalWords, processedCount, activeWordCount) {
  return totalWords > 0 && processedCount >= totalWords && activeWordCount === 0;
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
