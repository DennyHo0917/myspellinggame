import { gameState } from './gameState.js';
import { t } from './pageLocale.js';
import {
  configuredWords,
  customTypingRoundComplete,
  parseWords,
  SAMPLE_WORDS,
  takeCustomWord,
  typingCompletionStats,
} from './spellingCore.mjs';
import { speakWord as speak } from './speech.js';
import { entryPage, pageLocale, trackEvent } from './analytics.mjs';
import { buildShareHash, readShareState } from './shareState.mjs';

const STORAGE_KEY = 'mySpellingGameSpellingWords';
const SENTENCES_STORAGE_KEY = 'mySpellingGameExampleSentences';
const HEAR_KEY = 'mySpellingGameHearWords';
const LEGACY_READ_KEY = 'mySpellingGameReadWords';
const EASY_KEY = 'mySpellingGameEasyMode';

export { parseWords };

function textarea() {
  return document.getElementById('custom-word-list');
}

function sentenceTextarea() {
  return document.getElementById('custom-example-sentences');
}

function status(text) {
  const el = document.getElementById('spelling-status');
  if (el) el.textContent = text;
}

function currentWords() {
  return configuredWords(textarea()?.value || '');
}

function currentExampleSentences(words = currentWords()) {
  const lines = (sentenceTextarea()?.value || '').split(/\r?\n/);
  return Object.fromEntries(
    words.map((word, index) => [word, (lines[index] || '').trim().slice(0, 300)]),
  );
}

export function track(name, params = {}) {
  trackEvent(name, params);
}

function loadWordsFromUrl() {
  const raw = readShareState(window.location).words;
  return raw ? parseWords(raw) : [];
}

function selectedModeFromUrl() {
  return readShareState(window.location).mode;
}

function selectedMode() {
  return document.querySelector('input[name="practice-mode"]:checked')?.value || 'dictation';
}

function syncModeUI() {
  const mode = selectedMode();
  document.querySelectorAll('.typing-option').forEach((element) => {
    element.hidden = mode !== 'typing';
  });
  document.querySelectorAll('.dictation-option').forEach((element) => {
    element.hidden = mode !== 'dictation';
  });
  document.querySelector('.word-entry-grid')?.classList.toggle('single-column', mode !== 'dictation');
  const button = document.getElementById('start-practice-btn');
  if (button) button.textContent = t(mode === 'dictation' ? 'startDictation' : 'startTyping');
}

export function initSpellingMode() {
  const input = textarea();
  if (!input) return;

  const fromUrl = loadWordsFromUrl();
  const saved = parseWords(localStorage.getItem(STORAGE_KEY) || '');
  input.value = (fromUrl.length ? fromUrl : saved.length ? saved : SAMPLE_WORDS).join('\n');
  const sentenceInput = sentenceTextarea();
  if (sentenceInput) sentenceInput.value = localStorage.getItem(SENTENCES_STORAGE_KEY) || '';

  const mode = selectedModeFromUrl();
  const modeInput = document.querySelector(`input[name="practice-mode"][value="${mode}"]`);
  if (modeInput) modeInput.checked = true;
  document.querySelectorAll('input[name="practice-mode"]').forEach((radio) => {
    radio.addEventListener('change', syncModeUI);
  });

  const hearToggle = document.getElementById('hear-words-toggle');
  if (hearToggle) {
    hearToggle.checked = localStorage.getItem(HEAR_KEY) === '1' || localStorage.getItem(LEGACY_READ_KEY) === '1';
  }

  const easyToggle = document.getElementById('easy-mode-toggle');
  if (easyToggle) easyToggle.checked = localStorage.getItem(EASY_KEY) === '1';

  status(t('wordsReady', { count: currentWords().length }));
  input.addEventListener('input', () => status(t('wordsReady', { count: currentWords().length })));
  syncModeUI();
  if (readShareState(window.location).autoStart) queueMicrotask(() => window.startGame?.());
}

export function loadSampleWords() {
  const input = textarea();
  if (!input) return;
  input.value = SAMPLE_WORDS.join('\n');
  if (sentenceTextarea()) sentenceTextarea().value = '';
  status(t('sampleLoaded', { count: SAMPLE_WORDS.length }));
}

export function prepareSession() {
  if (!textarea()) return null;
  const words = currentWords();
  const practiceMode = selectedMode();
  gameState.spellingMode = true;
  gameState.practiceMode = practiceMode;
  gameState.mode = practiceMode === 'dictation' ? 'dictation' : 'spelling';
  gameState.customWords = words;
  gameState.exampleSentences = currentExampleSentences(words);
  gameState.customWordCursor = 0;
  gameState.missedWordList = [];
  gameState.spellingRoundComplete = false;
  gameState.spellingWordsProcessed = 0;
  gameState.maxMisses = practiceMode === 'typing' ? words.length : 5;
  gameState.level = 1;
  gameState.replayRound = window.pendingReplayRound === true;
  window.pendingReplayRound = false;
  window.currentMode = gameState.mode;

  const hearToggle = document.getElementById('hear-words-toggle');
  gameState.hearWords = !!hearToggle?.checked;
  const easyToggle = document.getElementById('easy-mode-toggle');
  gameState.easyMode = !!easyToggle?.checked;
  localStorage.setItem(STORAGE_KEY, words.join('\n'));
  localStorage.setItem(SENTENCES_STORAGE_KEY, sentenceTextarea()?.value || '');
  localStorage.setItem(HEAR_KEY, gameState.hearWords ? '1' : '0');
  localStorage.removeItem(LEGACY_READ_KEY);
  localStorage.setItem(EASY_KEY, gameState.easyMode ? '1' : '0');
  status(t('wordsInRound', { count: words.length }));
  const shareState = readShareState(window.location);
  if (!gameState.replayRound) {
    track('word_list_created', {
      word_count: words.length,
      mode: practiceMode,
      locale: pageLocale(),
      shared_link: shareState.sharedLink,
      entry_page: shareState.entryPage || entryPage(),
    });
    track('practice_started', { word_count: words.length, mode: practiceMode });
  }
  return { words, mode: practiceMode };
}

export function getCustomWord() {
  if (!gameState.spellingMode || !gameState.customWords?.length) return null;
  const next = takeCustomWord(gameState.customWords, gameState.customWordCursor || 0);
  gameState.customWordCursor = next.cursor;
  return next.word;
}

export function isRoundComplete(activeWordCount) {
  if (!gameState.spellingMode || !gameState.customWords?.length) return false;
  return customTypingRoundComplete(
    gameState.customWords.length,
    gameState.spellingWordsProcessed,
    activeWordCount,
  );
}

export function speakWord(word) {
  if (!gameState.spellingMode || !gameState.hearWords) return false;
  return speak(word);
}

export function markMissed(word) {
  if (!gameState.spellingMode || !word) return;
  if (!gameState.missedWordList.includes(word)) gameState.missedWordList.push(word);
  gameState.spellingWordsProcessed++;
  track('word_missed', { word_length: word.length, mode: 'typing', correct: false });
}

export function markCorrect(word) {
  if (!gameState.spellingMode || !word) return;
  gameState.missedWordList = gameState.missedWordList.filter((item) => item !== word);
  gameState.spellingWordsProcessed++;
  track('word_completed', { word_length: word.length, mode: 'typing', correct: true });
}

export function renderSummary() {
  const box = document.getElementById('spelling-summary');
  if (!box || !gameState.spellingMode || gameState.practiceMode === 'dictation') return;

  document.getElementById('typing-final-stats')?.removeAttribute('hidden');
  document.getElementById('dictation-final-stats')?.setAttribute('hidden', '');

  const missed = gameState.missedWordList || [];
  document.getElementById('game-over-title')?.replaceChildren(document.createTextNode(t('summaryTitle')));
  document.getElementById('spelling-result').textContent = missed.length
    ? t('summaryMissed', { count: missed.length })
    : t('summaryClean');

  const list = document.getElementById('missed-word-list');
  list.textContent = '';
  missed.forEach((word) => {
    const chip = document.createElement('span');
    chip.className = 'word-chip';
    chip.textContent = word;
    list.appendChild(chip);
  });

  const replay = document.getElementById('replay-missed-btn');
  if (replay) replay.hidden = missed.length === 0;
  box.hidden = false;
  const stats = typingCompletionStats(gameState.spellingWordsProcessed, missed);
  document.getElementById('final-accuracy').textContent = `${stats.accuracy}%`;
  document.getElementById('final-missed').textContent = stats.missed_count;
  track('game_completed', {
    mode: 'typing',
    ...stats,
    duration_seconds: Math.max(0, Math.round((Date.now() - gameState.startTime) / 1000)),
    replay_round: gameState.replayRound,
  });
}

export function replayMissedWords() {
  if (gameState.practiceMode === 'dictation') {
    window.retryMissedDictation?.();
    return;
  }
  const missed = gameState.missedWordList || [];
  const input = textarea();
  if (!input || !missed.length) return;
  input.value = missed.join('\n');
  track('missed_words_replayed', { word_count: missed.length, mode: 'typing', locale: pageLocale() });
  window.pendingReplayRound = true;
  window.restartGame?.(true);
}

export async function copyPracticeLink() {
  const words = currentWords();
  const url = new URL(window.location.origin + window.location.pathname);
  url.hash = buildShareHash(words, selectedMode()).slice(1);
  try {
    await navigator.clipboard.writeText(url.toString());
    status(t('linkCopied'));
  } catch {
    window.prompt(t('copyPrompt'), url.toString());
    status(t('linkReady'));
  }
  document.getElementById('copy-assignment-hint')?.removeAttribute('hidden');
  track('practice_link_copied', { word_count: words.length, mode: selectedMode(), locale: pageLocale() });
}

export function openTeacherAssignment() {
  track('assignment_entry_clicked', {
    word_count: currentWords().length,
    mode: selectedMode(),
    entry_point: 'practice',
  });
  try {
    sessionStorage.setItem('mySpellingTeacherDraftWords', currentWords().join('\n'));
    sessionStorage.setItem('mySpellingTeacherDraftSentences', sentenceTextarea()?.value || '');
    sessionStorage.setItem('mySpellingTeacherDraftMode', selectedMode());
  } catch (_) {
    // The teacher form still works when browser storage is unavailable.
  }
  window.location.href = `/teacher/assignments/new?lang=${encodeURIComponent(pageLocale())}`;
}

if (typeof window !== 'undefined') {
  const api = {
    initSpellingMode,
    loadSampleWords,
    prepareSession,
    getCustomWord,
    isRoundComplete,
    speakWord,
    markMissed,
    markCorrect,
    renderSummary,
    replayMissedWords,
    copyPracticeLink,
    openTeacherAssignment,
  };
  window.spellingMode = api;
  Object.assign(window, api);
  document.addEventListener('DOMContentLoaded', initSpellingMode);
}
