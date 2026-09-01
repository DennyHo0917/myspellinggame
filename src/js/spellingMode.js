import { gameState } from './gameState.js';
import { getPageLocale, t } from './pageLocale.js';
import {
  ANONYMOUS_WORD_LIMIT,
  customTypingRoundComplete,
  parseWords,
  SAMPLE_EXAMPLE_SENTENCES,
  SAMPLE_WORDS,
  takeCustomWord,
  typingCompletionStats,
} from './spellingCore.mjs';
import { speakWord as speak } from './speech.js';
import { entryPage, pageLocale, setAssignmentEntryPoint, trackEvent, trackLockedFeature } from './analytics.mjs';
import { buildShareHash, readShareState } from './shareState.mjs';
import { productMessage, productPagePath } from './productLocale.mjs';

const STORAGE_KEY = 'mySpellingGameSpellingWords';
const SENTENCES_STORAGE_KEY = 'mySpellingGameExampleSentences';
const HEAR_KEY = 'mySpellingGameHearWords';
const LEGACY_READ_KEY = 'mySpellingGameReadWords';
const EASY_KEY = 'mySpellingGameEasyMode';
let signupCtaViewTracked = false;
let shareOptionsViewTracked = false;
let accountPromise;
let accountState;
let tesseractPromise;
let wordLimitHitTracked = false;

export { parseWords };

function textarea() {
  return document.getElementById('custom-word-list');
}

function sentenceTextarea() {
  return document.getElementById('custom-example-sentences');
}

function photoImportNotice(account) {
  const field = textarea()?.closest('.word-entry-field');
  if (!field) return;
  field.querySelector('.photo-import-notice, .photo-import-review')?.remove();
  const notice = document.createElement('small');
  notice.className = 'photo-import-notice sentence-library-notice';
  notice.setAttribute('role', 'status');
  notice.textContent = t('photoImportRequired');
  const primary = document.createElement('a');
  primary.href = account
    ? `${productPagePath('pricing', getPageLocale())}#pricing`
    : `/workspace?lang=${encodeURIComponent(getPageLocale())}#teacher-sign-in`;
  primary.textContent = account ? t('photoImportPlans') : t('photoImportSignIn');
  notice.append(' ', primary);
  if (!account) {
    const plans = document.createElement('a');
    plans.href = `${productPagePath('pricing', getPageLocale())}#pricing`;
    plans.textContent = t('photoImportPlans');
    notice.append(' · ', plans);
  }
  field.append(notice);
}

function photoImportStatus(message) {
  const field = textarea()?.closest('.word-entry-field');
  if (!field) return;
  field.querySelector('.photo-import-notice, .photo-import-review')?.remove();
  const notice = document.createElement('small');
  notice.className = 'photo-import-notice sentence-library-notice';
  notice.setAttribute('role', 'status');
  notice.textContent = message;
  field.append(notice);
  return notice;
}

function loadTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = new Promise((resolve, reject) => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('tesseract_unavailable'));
      script.onerror = () => reject(new Error('tesseract_unavailable'));
      document.head.append(script);
    });
  }
  return tesseractPromise;
}

function showPhotoImportReview(words) {
  const field = textarea()?.closest('.word-entry-field');
  if (!field) return;
  field.querySelector('.photo-import-notice, .photo-import-review')?.remove();
  const review = document.createElement('div');
  review.className = 'photo-import-review';
  const title = document.createElement('strong');
  title.textContent = t('photoImportReviewTitle');
  const help = document.createElement('small');
  help.textContent = t('photoImportReviewHelp');
  const input = document.createElement('textarea');
  input.id = 'photo-import-review-words';
  input.rows = 5;
  input.value = words.join('\n');
  const actions = document.createElement('div');
  actions.className = 'photo-import-review-actions';
  const use = document.createElement('button');
  use.type = 'button';
  use.className = 'auto-sentence-btn';
  use.textContent = t('photoImportUse');
  use.addEventListener('click', () => {
    textarea().value = input.value
      .split(/\r?\n/)
      .map((word) => word.trim())
      .filter(Boolean)
      .join('\n');
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
    review.remove();
  });
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'auto-sentence-btn';
  cancel.textContent = t('photoImportCancel');
  cancel.addEventListener('click', () => review.remove());
  actions.append(use, cancel);
  review.append(title, help, input, actions);
  field.append(review);
}

async function importWordsFromPhoto(file) {
  const field = textarea()?.closest('.word-entry-field');
  if (!field) return;
  const notice = photoImportStatus(t('photoImportProcessing'));
  try {
    const Tesseract = await loadTesseract();
    const result = await Tesseract.recognize(file, 'eng');
    const words = [...new Set(
      (result.data?.text || '').match(/[A-Za-z]+(?:['’-][A-Za-z]+)?/g) || [],
    )];
    notice.remove();
    if (!words.length) {
      photoImportStatus(t('photoImportNoWords'));
      return;
    }
    showPhotoImportReview(words);
  } catch {
    notice.textContent = t('photoImportError');
  }
}

function initPhotoImport() {
  const button = document.getElementById('photo-import-btn');
  const input = document.getElementById('photo-import-input');
  if (!button || !input) return;
  button.addEventListener('click', () => {
    if (accountState !== undefined) {
      if (isPlusAccount(accountState)) input.click();
      else {
        trackLockedFeature('photo_import', accountState?.plan || 'anonymous');
        photoImportNotice(accountState);
      }
      return;
    }
    void getAccount().then((account) => {
      if (isPlusAccount(account)) input.click();
      else {
        trackLockedFeature('photo_import', account?.plan || 'anonymous');
        photoImportNotice(account);
      }
    });
  });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) void getAccount().then((account) => {
      if (isPlusAccount(account)) void importWordsFromPhoto(file);
      else {
        trackLockedFeature('photo_import', account?.plan || 'anonymous');
        photoImportNotice(account);
      }
    });
  });
}

function sentenceLibraryNotice(message = productMessage('sentenceLibraryRequired', {}, getPageLocale())) {
  const field = sentenceTextarea()?.closest('.word-entry-field');
  if (!field) return;
  field.querySelector('.sentence-library-notice')?.remove();
  const notice = document.createElement('small');
  notice.className = 'sentence-library-notice';
  notice.setAttribute('role', 'status');
  notice.textContent = message;
  const link = document.createElement('a');
  link.href = `${productPagePath('pricing', getPageLocale())}#pricing`;
  link.textContent = productMessage('upgrade', {}, getPageLocale());
  notice.append(' ', link);
  field.append(notice);
}

async function autoFillExampleSentences() {
  const button = document.getElementById('auto-example-sentences-btn');
  const words = currentWords();
  if (!button || !words.length) return;
  button.disabled = true;
  try {
    const account = await getAccount();
    if (!isPlusAccount(account)) {
      trackLockedFeature('example_sentences', account?.plan || 'anonymous');
      sentenceLibraryNotice();
      return;
    }
    sentenceTextarea()?.closest('.word-entry-field')?.querySelector('.sentence-library-notice')?.remove();
    const response = await fetch('/api/sentence-library/match', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ words: words.join('\n'), difficulty: 'simple' }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'sentence_library_error');
    const existing = (sentenceTextarea()?.value || '').split(/\r?\n/);
    sentenceTextarea().value = words
      .map((word, index) => existing[index]?.trim() || data.matches?.[word.toLowerCase()] || '')
      .join('\n');
  } catch (error) {
    if (error.message === 'sentence_library_required')
      trackLockedFeature('example_sentences', accountState?.plan || 'free');
    sentenceLibraryNotice(
      error.message === 'sentence_library_required'
        ? productMessage('sentenceLibraryRequired', {}, getPageLocale())
        : productMessage('sentenceLibraryError', {}, getPageLocale()),
    );
  } finally {
    button.disabled = false;
  }
}

function status(text) {
  const el = document.getElementById('spelling-status');
  if (el) el.textContent = text;
  document.getElementById('spelling-limit-cta')?.remove();
}

async function updateLongListAdvice() {
  const input = textarea();
  if (!input) return;
  let advice = document.getElementById('long-list-advice');
  if (!advice) {
    advice = document.createElement('small');
    advice.id = 'long-list-advice';
    advice.className = 'spelling-help';
    advice.textContent = t('longListAdvice');
    input.after(advice);
  }
  advice.hidden = true;
  if (currentWords().length <= 20) return;
  if (readShareState(window.location).sharedLink) return;
  const account = await getAccount();
  advice.hidden = !account || currentWords().length <= 20;
}

function isPlusAccount(account) {
  return ['parent', 'teacher', 'plus', 'pro'].includes(account?.plan);
}

function practiceLimit(account, anonymousOnly = false) {
  if (anonymousOnly || !account) return ANONYMOUS_WORD_LIMIT;
  return isPlusAccount(account) ? 40 : 30;
}

function showLimitCta(key, href, ctaKey) {
  status(t(key));
  const host = document.querySelector('.spelling-options');
  if (!host) return;
  const link = document.createElement('a');
  link.id = 'spelling-limit-cta';
  link.className = 'button-link button-secondary';
  link.href = href;
  link.textContent = t(ctaKey);
  host.append(link);
}

async function getAccount() {
  if (!accountPromise) {
    accountPromise = fetch('/api/me', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) return null;
        const account = await response.json();
        return {
          ...account,
          plan:
            account.plan ||
            (account.limits?.monthlyAttempts === null ? 'teacher' : 'free'),
        };
      })
      .catch(() => null);
    accountPromise.then((account) => { accountState = account; });
  }
  return accountPromise;
}

export async function canStartPractice({ anonymousOnly = false } = {}) {
  const words = currentWords();
  if (!words.length) {
    status(t('emptyWords'));
    return false;
  }
  const sharedLink = readShareState(window.location).sharedLink;
  const anonymous = anonymousOnly || sharedLink;
  const account = anonymous ? null : await getAccount();
  const limit = practiceLimit(account, anonymous);
  if (words.length <= limit && words.length <= 80) return true;
  if (words.length > 80) {
    status(t('invalidWords'));
    return false;
  }
  if (anonymous || !account) {
    const lang = encodeURIComponent(pageLocale());
    showLimitCta('anonymousWordLimit', `/workspace?lang=${lang}#teacher-sign-in`, 'signInFree');
  } else {
    showLimitCta('freeWordLimit', `${productPagePath('pricing', pageLocale())}#pricing`, 'upgradePlus');
  }
  if (!wordLimitHitTracked) {
    wordLimitHitTracked = true;
    track('word_limit_hit', {
      limit,
      account_tier: isPlusAccount(account) ? 'plus' : account ? 'free' : 'anonymous',
      word_count_range: words.length > 80 ? '81+' : `${limit + 1}-80`,
      action: anonymous ? 'practice_link' : selectedMode() === 'typing' ? 'typing_rain' : 'spelling_test',
    });
    trackLockedFeature('word_limit', account?.plan || 'anonymous');
  }
  return false;
}

function currentWords() {
  return parseWords(textarea()?.value || '');
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

  const shareState = readShareState(window.location);
  const fromUrl = loadWordsFromUrl();
  const saved = parseWords(localStorage.getItem(STORAGE_KEY) || '');
  const usingSample =
    !fromUrl.length &&
    (!saved.length ||
      (saved.length === SAMPLE_WORDS.length &&
        saved.every((word, index) => word === SAMPLE_WORDS[index])));
  input.value = (fromUrl.length ? fromUrl : saved.length ? saved : SAMPLE_WORDS).join('\n');
  const sentenceInput = sentenceTextarea();
  if (sentenceInput) {
    sentenceInput.value = shareState.sharedLink
      ? shareState.exampleSentences
      : localStorage.getItem(SENTENCES_STORAGE_KEY) ||
        (usingSample ? SAMPLE_EXAMPLE_SENTENCES.join('\n') : '');
  }

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
  void updateLongListAdvice();
  input.addEventListener('input', () => {
    status(t('wordsReady', { count: currentWords().length }));
    void updateLongListAdvice();
  });
  syncModeUI();
  document.getElementById('auto-example-sentences-btn')?.addEventListener('click', autoFillExampleSentences);
  initPhotoImport();
  void getAccount();
  if (shareState.autoStart) queueMicrotask(() => window.startGame?.());
}

export function loadSampleWords() {
  const input = textarea();
  if (!input) return;
  input.value = SAMPLE_WORDS.join('\n');
  if (sentenceTextarea())
    sentenceTextarea().value = SAMPLE_EXAMPLE_SENTENCES.join('\n');
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
  const shareState = readShareState(window.location);
  if (!shareState.sharedLink) {
    localStorage.setItem(SENTENCES_STORAGE_KEY, sentenceTextarea()?.value || '');
  }
  localStorage.setItem(HEAR_KEY, gameState.hearWords ? '1' : '0');
  localStorage.removeItem(LEGACY_READ_KEY);
  localStorage.setItem(EASY_KEY, gameState.easyMode ? '1' : '0');
  status(t('wordsInRound', { count: words.length }));
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
  if (!(await canStartPractice({ anonymousOnly: true }))) return;
  const words = currentWords();
  const exampleSentences = sentenceTextarea()?.value || '';
  const url = new URL(window.location.origin + window.location.pathname);
  url.hash = buildShareHash(words, selectedMode(), { exampleSentences }).slice(1);
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
  return getAccount().then(Boolean);
}

export function openTeacherAssignment(entryPoint = 'practice_result') {
  const source = ['copy_track', 'assign_homework', 'practice_result'].includes(entryPoint)
    ? entryPoint
    : 'practice_result';
  track('assignment_entry_clicked', {
    word_count: currentWords().length,
    mode: selectedMode(),
    entry_point: source,
  });
  setAssignmentEntryPoint(source);
  try {
    sessionStorage.setItem('mySpellingTeacherDraftWords', currentWords().join('\n'));
    sessionStorage.setItem('mySpellingTeacherDraftSentences', sentenceTextarea()?.value || '');
    sessionStorage.setItem('mySpellingTeacherDraftMode', selectedMode());
  } catch (_) {
    // The teacher form still works when browser storage is unavailable.
  }
  window.location.href = `/workspace/assignments/new?lang=${encodeURIComponent(pageLocale())}`;
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
    canStartPractice,
  };
  window.spellingMode = api;
  Object.assign(window, api);
  document.addEventListener('DOMContentLoaded', initSpellingMode);
}
