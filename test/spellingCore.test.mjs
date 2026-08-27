import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceDictationSession,
  configuredWords,
  createDictationSession,
  customTypingRoundComplete,
  currentDictationWord,
  dictationSummary,
  normalizeAnswer,
  parseWords,
  retryMissedDictation,
  shouldEndTypingOnMiss,
  submitDictationAnswer,
  takeCustomWord,
  typingCompletionStats,
} from '../src/js/spellingCore.mjs';

test('dictation uses each word once and completes after the last answer', () => {
  const session = createDictationSession(['one', 'two', 'three']);
  const seen = [];

  while (currentDictationWord(session)) {
    seen.push(currentDictationWord(session));
    submitDictationAnswer(session, currentDictationWord(session));
    advanceDictationSession(session);
  }

  assert.deepEqual(seen, ['one', 'two', 'three']);
  assert.deepEqual(dictationSummary(session), {
    total: 3,
    correct: 3,
    incorrect: 0,
    accuracy: 100,
    missedWords: [],
  });
});

test('missed words can be retried on their own', () => {
  const session = createDictationSession(['alpha', 'beta', 'gamma']);
  submitDictationAnswer(session, 'alpha');
  advanceDictationSession(session);
  submitDictationAnswer(session, 'wrong');
  advanceDictationSession(session);
  submitDictationAnswer(session, 'gamma');

  const retry = retryMissedDictation(session);
  assert.deepEqual(retry.words, ['beta']);
  assert.equal(currentDictationWord(retry), 'beta');
});

test('custom typing words stop at exhaustion without a fallback word', () => {
  let cursor = 0;
  const words = ['red', 'blue'];
  const first = takeCustomWord(words, cursor);
  cursor = first.cursor;
  const second = takeCustomWord(words, cursor);
  cursor = second.cursor;
  const exhausted = takeCustomWord(words, cursor);

  assert.equal(first.word, 'red');
  assert.equal(second.word, 'blue');
  assert.equal(exhausted.word, null);
  assert.equal(exhausted.cursor, 2);
});

test('empty input falls back and duplicate words are removed', () => {
  assert.deepEqual(parseWords(' Apple\nAPPLE, banana  banana '), ['apple', 'banana']);
  assert.deepEqual(configuredWords('', ['sample']), ['sample']);
});

test('word parsing keeps values above the plan limit for explicit validation', () => {
  const words = Array.from({ length: 81 }, (_, index) =>
    `word${index.toString(2).padStart(7, 'a').replaceAll('0', 'a').replaceAll('1', 'b')}`,
  );
  assert.equal(parseWords(words.join('\n')).length, 81);
});

test('answer comparison ignores surrounding whitespace and case', () => {
  assert.equal(normalizeAnswer('  BeAuTiFuL  '), 'beautiful');
  const session = createDictationSession(['beautiful']);
  assert.equal(submitDictationAnswer(session, '  BEAUTIFUL ').correct, true);
});

test('custom Typing Rain processes all 20 words before ending', () => {
  const words = Array.from({ length: 20 }, (_, index) => `word${index}`);
  for (let processed = 1; processed <= 5; processed++) {
    assert.equal(shouldEndTypingOnMiss(true, processed, 5), false);
    assert.equal(customTypingRoundComplete(words.length, processed, 0), false);
  }
  assert.equal(customTypingRoundComplete(words.length, 19, 0), false);
  assert.equal(customTypingRoundComplete(words.length, 20, 1), false);
  assert.equal(customTypingRoundComplete(words.length, 20, 0), true);
  assert.equal(shouldEndTypingOnMiss(false, 5, 5), true);
});

test('Typing Rain completion and GA4 stats only count processed words', () => {
  const firstFiveMissed = ['one', 'two', 'three', 'four', 'five'];
  assert.deepEqual(typingCompletionStats(5, firstFiveMissed), {
    word_count: 5,
    correct_count: 0,
    missed_count: 5,
    accuracy: 0,
  });
  assert.deepEqual(typingCompletionStats(20, firstFiveMissed), {
    word_count: 20,
    correct_count: 15,
    missed_count: 5,
    accuracy: 75,
  });
});
