import { gameState } from './gameState.js';
import { t } from './pageLocale.js';
import { configuredWords, parseWords, SAMPLE_WORDS, takeCustomWord } from './spellingCore.mjs';
import { speakWord as speak } from './speech.js';

const STORAGE_KEY = 'mySpellingGameSpellingWords';
const HEAR_KEY = 'mySpellingGameHearWords';
const LEGACY_READ_KEY = 'mySpellingGameReadWords';
const EASY_KEY = 'mySpellingGameEasyMode';

export { parseWords };

function textarea() {
  return document.getElementById('custom-word-list');
}

function status(text) {
  const el = document.getElementById('spelling-status');
  if (el) el.textContent = text;
}

function currentWords() {
  return configuredWords(textarea()?.value || '');
}

export function track(name, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}

function loadWordsFromUrl() {
  const raw = new URLSearchParams(window.location.search).get('words');
  return raw ? parseWords(raw) : [];
}

function selectedModeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'dictation' || mode === 'typing') return mode;
  // Old shared links only contained words and opened the falling-word game.
  return params.has('words') ? 'typing' : 'dictation';
}

function selectedMode() {
  return document.querySelector('input[name="practice-mode"]:checked')?.value || 'dictation';
}

function syncModeUI() {
  const mode = selectedMode();
  document.querySelectorAll('.typing-option').forEach((element) => {
    element.hidden = mode !== 'typing';
  });
  const button = document.getElementById('start-practice-btn');
  if (button) button.textContent = t(mode === 'dictation' ? 'startDictation' : 'startTyping');
}

export function initSpellingMode() {
  const input = textarea();
  if (!input) return;

  const fromUrl = loadWordsFromUrl();
  const saved = parseWords(localStorage.getItem(STORAGE_KEY) || '');
  input.value = (fromUrl.length ? fromUrl : saved.length ? saved : SAMPLE_WORDS).join('\n');

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
}

export function loadSampleWords() {
  const input = textarea();
  if (!input) return;
  input.value = SAMPLE_WORDS.join('\n');
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
  gameState.customWordCursor = 0;
  gameState.missedWordList = [];
  gameState.spellingRoundComplete = false;
  gameState.spellingWordsProcessed = 0;
  gameState.maxMisses = 5;
  gameState.level = 1;
  window.currentMode = gameState.mode;

  const hearToggle = document.getElementById('hear-words-toggle');
  gameState.hearWords = !!hearToggle?.checked;
  const easyToggle = document.getElementById('easy-mode-toggle');
  gameState.easyMode = !!easyToggle?.checked;
  localStorage.setItem(STORAGE_KEY, words.join('\n'));
  localStorage.setItem(HEAR_KEY, gameState.hearWords ? '1' : '0');
  localStorage.removeItem(LEGACY_READ_KEY);
  localStorage.setItem(EASY_KEY, gameState.easyMode ? '1' : '0');
  status(t('wordsInRound', { count: words.length }));
  track('word_list_created', { word_count: words.length, mode: practiceMode, easy_mode: gameState.easyMode });
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
  return gameState.spellingWordsProcessed >= gameState.customWords.length && activeWordCount === 0;
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
  track('game_completed', { word_count: gameState.customWords.length, missed_count: missed.length, mode: 'typing' });
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
  track('missed_words_replayed', { word_count: missed.length });
  window.restartGame?.(true);
}

export async function copyPracticeLink() {
  const words = currentWords();
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('words', words.join(','));
  url.searchParams.set('mode', selectedMode());
  try {
    await navigator.clipboard.writeText(url.toString());
    status(t('linkCopied'));
  } catch {
    window.prompt(t('copyPrompt'), url.toString());
    status(t('linkReady'));
  }
  track('practice_link_copied', { word_count: words.length, mode: selectedMode() });
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
  };
  window.spellingMode = api;
  Object.assign(window, api);
  document.addEventListener('DOMContentLoaded', initSpellingMode);
}
