import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceDictationSession,
  configuredWords,
  createDictationSession,
  currentDictationWord,
  dictationSummary,
  normalizeAnswer,
  parseWords,
  retryMissedDictation,
  submitDictationAnswer,
  takeCustomWord,
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

test('answer comparison ignores surrounding whitespace and case', () => {
  assert.equal(normalizeAnswer('  BeAuTiFuL  '), 'beautiful');
  const session = createDictationSession(['beautiful']);
  assert.equal(submitDictationAnswer(session, '  BEAUTIFUL ').correct, true);
});
