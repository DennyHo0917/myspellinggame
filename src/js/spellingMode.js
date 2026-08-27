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
let signupCtaViewTracked = false;
let shareOptionsViewTracked = false;
let signedInPromise;

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
  renderResultWorkspaceCta({
    mode: 'typing',
    wordCount: stats.word_count,
    missedCount: stats.missed_count,
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

function closePracticeShareOptions({ restoreFocus = false } = {}) {
  const panel = document.getElementById('practice-share-options');
  if (!panel) return;
  panel.remove();
  const trigger = document.getElementById('copy-practice-link-btn');
  trigger?.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', dismissPracticeShareOptions);
  document.removeEventListener('keydown', dismissPracticeShareOptions);
  if (restoreFocus) trigger?.focus();
}

function dismissPracticeShareOptions(event) {
  const panel = document.getElementById('practice-share-options');
  const trigger = document.getElementById('copy-practice-link-btn');
  if (event.type === 'keydown') {
    if (event.key === 'Escape') closePracticeShareOptions({ restoreFocus: true });
    return;
  }
  if (panel && !panel.contains(event.target) && event.target !== trigger) closePracticeShareOptions();
}

async function copyAnonymousPracticeLink() {
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
  track('practice_link_copied', {
    word_count: words.length,
    mode: selectedMode(),
    locale: pageLocale(),
    share_type: 'practice_only',
  });
  closePracticeShareOptions({ restoreFocus: true });
}

function shareOption(titleKey, copyKey, metaKey, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'practice-share-option';
  const title = document.createElement('strong');
  title.textContent = t(titleKey);
  const description = document.createElement('span');
  description.textContent = t(copyKey);
  const meta = document.createElement('small');
  meta.textContent = t(metaKey);
  button.append(title, description, meta);
  button.addEventListener('click', onClick);
  return button;
}

export function copyPracticeLink() {
  const existing = document.getElementById('practice-share-options');
  if (existing) {
    closePracticeShareOptions();
    return;
  }
  const trigger = document.getElementById('copy-practice-link-btn');
  const panel = document.createElement('section');
  panel.id = 'practice-share-options';
  panel.className = 'practice-share-options';
  panel.setAttribute('aria-labelledby', 'practice-share-options-title');
  const heading = document.createElement('strong');
  heading.id = 'practice-share-options-title';
  heading.textContent = t('sharePracticeTitle');
  panel.append(
    heading,
    shareOption('practiceOnlyTitle', 'practiceOnlyCopy', 'practiceOnlyMeta', copyAnonymousPracticeLink),
    shareOption('trackResultsTitle', 'trackResultsCopy', 'trackResultsMeta', () => {
      closePracticeShareOptions();
      openTeacherAssignment('copy_track');
    }),
  );
  trigger?.closest('.spelling-actions')?.after(panel);
  trigger?.setAttribute('aria-expanded', 'true');
  document.addEventListener('click', dismissPracticeShareOptions);
  document.addEventListener('keydown', dismissPracticeShareOptions);
  panel.querySelector('button')?.focus();
  if (!shareOptionsViewTracked) {
    shareOptionsViewTracked = true;
    track('practice_share_options_viewed', {
      word_count: currentWords().length,
      mode: selectedMode(),
      locale: pageLocale(),
    });
  }
}

export function renderResultWorkspaceCta({ mode, wordCount, missedCount }) {
  const summary = document.getElementById('spelling-summary');
  if (!summary) return;
  summary.querySelector('.result-conversion')?.remove();

  const block = document.createElement('section');
  block.className = 'result-conversion';
  const message = document.createElement('p');
  message.className = 'result-conversion-message';
  message.textContent = missedCount
    ? t('workspaceCtaMissed', { count: missedCount })
    : t('workspaceCtaClean');
  const benefits = document.createElement('ul');
  benefits.className = 'result-conversion-benefits';
  [
    t('workspaceCtaKeep'),
    t('workspaceCtaTrack'),
    t('workspaceCtaCreate'),
  ].forEach((label) => {
    const item = document.createElement('li');
    item.textContent = `✓ ${label}`;
    benefits.appendChild(item);
  });
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'share-score-btn result-conversion-button';
  button.textContent = t('workspaceCtaButton');
  button.addEventListener('click', () => openTeacherAssignment('practice_result'));
  const footnote = document.createElement('small');
  footnote.textContent = t('workspaceCtaFootnote');
  block.append(message, benefits, button, footnote);
  summary.appendChild(block);

  void isTeacherSignedIn().then((signedIn) => {
    footnote.hidden = signedIn;
    if (signedIn || signupCtaViewTracked) return;
    signupCtaViewTracked = true;
    track('signup_cta_viewed', {
      mode,
      word_count: wordCount,
      missed_count: missedCount,
      replay_round: gameState.replayRound,
      cta_location: 'practice_result',
    });
  });
}

function isTeacherSignedIn() {
  if (!signedInPromise) {
    signedInPromise = fetch('/api/me', { credentials: 'same-origin' })
      .then((response) => response.ok)
      .catch(() => false);
  }
  return signedInPromise;
}

export function openTeacherAssignment(entryPoint = 'practice') {
  track('assignment_entry_clicked', {
    word_count: currentWords().length,
    mode: selectedMode(),
    entry_point: entryPoint,
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
    renderResultWorkspaceCta,
    openTeacherAssignment,
  };
  window.spellingMode = api;
  Object.assign(window, api);
  document.addEventListener('DOMContentLoaded', initSpellingMode);
}
