import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanPageLocation, initReturnVisit, sanitizeEventParams } from '../src/js/analytics.mjs';
import { launcherUrl } from '../src/js/landingLauncher.mjs';
import { buildShareHash, readShareState } from '../src/js/shareState.mjs';

test('new share links use a hash and restore their mode', () => {
  const hash = buildShareHash(['because', 'friend'], 'dictation');
  assert.match(hash, /^#words=/);
  assert.equal(hash.includes('?'), false);
  assert.deepEqual(readShareState({ hash, search: '' }), {
    words: 'because,friend',
    mode: 'dictation',
    autoStart: false,
    entryPage: '',
    sharedLink: true,
    source: 'hash',
  });
});

test('legacy query shares still load and default to Typing Rain', () => {
  const state = readShareState({ search: '?words=red,blue', hash: '' });
  assert.equal(state.words, 'red,blue');
  assert.equal(state.mode, 'typing');
  assert.equal(state.source, 'query');
});

test('landing launchers preserve the selected mode and autostart', () => {
  const url = new URL(launcherUrl('/fr/', ' Apple\napple\nbanana ', 'typing', '/fr/'));
  const state = readShareState(url);
  assert.equal(url.pathname, '/fr/');
  assert.equal(state.words, 'apple,banana');
  assert.equal(state.mode, 'typing');
  assert.equal(state.autoStart, true);
  assert.equal(state.entryPage, '/fr/');
});

test('GA page location strips query strings and fragments', () => {
  assert.equal(
    cleanPageLocation('https://myspellinggame.com/zh/?words=secret#words=private'),
    'https://myspellinggame.com/zh/',
  );
});

test('analytics allowlists omit raw words and typed answers', () => {
  assert.deepEqual(sanitizeEventParams('word_completed', {
    mode: 'dictation',
    word_length: 7,
    correct: true,
    word: 'because',
    answer: 'becuase',
    words: ['because'],
  }), { mode: 'dictation', word_length: 7, correct: true });
});

test('teacher analytics omit student, assignment, and Stripe identifiers', () => {
  const privateValues = {
    nickname: 'Student 01',
    word: 'because',
    words: ['because'],
    answer: 'becuase',
    assignment_id: 'assignment-secret',
    public_id: 'public-secret',
    stripe_id: 'sub_secret',
  };
  const expected = {
    mode: 'typing',
    word_count: 8,
    accuracy_range: '90-100',
    duration_range: '1-3m',
  };
  assert.deepEqual(sanitizeEventParams('assignment_completed', {
    ...privateValues,
    ...expected,
  }), expected);
  assert.deepEqual(sanitizeEventParams('checkout_started', {
    ...privateValues,
    billing_interval: 'year',
  }), { billing_interval: 'year' });
  assert.deepEqual(sanitizeEventParams('upgrade_clicked', {
    ...privateValues,
    billing_interval: 'month',
  }), { billing_interval: 'month' });
  assert.deepEqual(sanitizeEventParams('purchase', {
    ...privateValues,
    billing_interval: 'year',
    value: 49.99,
    currency: 'USD',
  }), { billing_interval: 'year', value: 49.99, currency: 'USD' });
  assert.deepEqual(sanitizeEventParams('teacher_auth_completed', privateValues), {});
});

test('return visits are emitted at most once per session', () => {
  const local = new Map([['mySpellingGameVisitHistory', JSON.stringify({ lastVisit: 1000, count: 2 })]]);
  const session = new Map();
  const events = [];
  globalThis.window = { gtag: (...args) => events.push(args) };
  globalThis.localStorage = {
    getItem: (key) => local.get(key) || null,
    setItem: (key, value) => local.set(key, value),
  };
  globalThis.sessionStorage = {
    getItem: (key) => session.get(key) || null,
    setItem: (key, value) => session.set(key, value),
  };

  try {
    initReturnVisit(86401000);
    initReturnVisit(172801000);
    assert.deepEqual(events, [['event', 'return_visit', {
      days_since_last_visit: 1,
      visit_count_range: '3-5',
    }]]);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  }
});
