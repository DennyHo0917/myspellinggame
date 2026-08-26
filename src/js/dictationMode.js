import { gameState } from './gameState.js';
import { t } from './pageLocale.js';
import {
  advanceDictationSession,
  createDictationSession,
  currentDictationWord,
  dictationSummary,
  normalizeAnswer,
  retryMissedDictation as createMissedSession,
  submitDictationAnswer,
} from './spellingCore.mjs';
import { speechSupported, speakWord } from './speech.js';
import { track } from './spellingMode.js';
import { pageLocale } from './analytics.mjs';

let session = null;

function element(id) {
  return document.getElementById(id);
}

function announceSpeechSupport() {
  const notice = element('dictation-speech-status');
  if (notice) notice.textContent = speechSupported() ? '' : t('speechUnsupported');
}

function playCurrentWord() {
  const word = currentDictationWord(session);
  const sentence = gameState.exampleSentences?.[word];
  const prompt = sentence ? `${word}. ${sentence} ${word}.` : word;
  if (!word || !speakWord(prompt)) announceSpeechSupport();
}

function renderQuestion() {
  const word = currentDictationWord(session);
  if (!word) return finishDictation();

  element('dictation-progress').textContent = t('dictationProgress', {
    current: session.index + 1,
    total: session.words.length,
  });
  const answer = element('dictation-answer');
  answer.value = '';
  answer.disabled = false;
  element('dictation-submit').disabled = false;
  element('dictation-next').hidden = true;
  const feedback = element('dictation-feedback');
  feedback.textContent = '';
  feedback.className = 'dictation-feedback';
  announceSpeechSupport();
  answer.focus();
  playCurrentWord();
}

function finishDictation() {
  gameState.dictationSummary = dictationSummary(session);
  element('dictation-screen').hidden = true;
  window.endGame?.();
}

export function startDictation(words) {
  session = createDictationSession(words);
  gameState.dictationSession = session;
  gameState.gameRunning = true;
  gameState.gameStarted = true;
  document.getElementById('game-container')?.classList.add('dictation-active');
  element('dictation-screen').hidden = false;
  const title = document.querySelector('.game-title');
  if (title) title.textContent = t('dictationTitle');
  renderQuestion();
}

export function submitCurrentAnswer() {
  const input = element('dictation-answer');
  if (!normalizeAnswer(input.value)) {
    const feedback = element('dictation-feedback');
    feedback.textContent = t('answerRequired');
    feedback.className = 'dictation-feedback incorrect';
    return;
  }

  const result = submitDictationAnswer(session, input.value);
  if (!result) return;
  input.disabled = true;
  element('dictation-submit').disabled = true;
  const feedback = element('dictation-feedback');
  feedback.textContent = result.correct ? t('answerCorrect') : t('answerIncorrect', { word: result.word });
  feedback.className = `dictation-feedback ${result.correct ? 'correct' : 'incorrect'}`;
  element('dictation-next').hidden = false;
  element('dictation-next').focus();
  track(result.correct ? 'word_completed' : 'word_missed', {
    word_length: result.word.length,
    mode: 'dictation',
    correct: result.correct,
  });
}

export function nextDictationWord() {
  if (advanceDictationSession(session)) finishDictation();
  else renderQuestion();
}

export function renderDictationSummary() {
  const summary = gameState.dictationSummary || dictationSummary(session);
  element('game-over-title').textContent = t('dictationComplete');
  element('typing-final-stats').hidden = true;
  element('dictation-final-stats').hidden = false;
  element('dictation-total').textContent = summary.total;
  element('dictation-correct').textContent = summary.correct;
  element('dictation-incorrect').textContent = summary.incorrect;
  element('dictation-accuracy').textContent = `${summary.accuracy}%`;

  const box = element('spelling-summary');
  box.hidden = false;
  element('spelling-result').textContent = summary.missedWords.length
    ? t('dictationMissed', { count: summary.missedWords.length })
    : t('dictationPerfect');
  const list = element('missed-word-list');
  list.textContent = '';
  summary.missedWords.forEach((word) => {
    const chip = document.createElement('span');
    chip.className = 'word-chip';
    chip.textContent = word;
    list.appendChild(chip);
  });
  element('replay-missed-btn').hidden = summary.missedWords.length === 0;
  track('game_completed', {
    word_count: summary.total,
    correct_count: summary.correct,
    missed_count: summary.incorrect,
    mode: 'dictation',
    accuracy: summary.accuracy,
    duration_seconds: Math.max(0, Math.round((Date.now() - gameState.startTime) / 1000)),
    replay_round: gameState.replayRound,
  });
}

export function retryMissedDictation() {
  if (!session) return;
  const retry = createMissedSession(session);
  if (!retry.words.length) return;
  track('missed_words_replayed', { word_count: retry.words.length, mode: 'dictation', locale: pageLocale() });
  element('game-over').style.display = 'none';
  gameState.replayRound = true;
  gameState.startTime = Date.now();
  startDictation(retry.words);
}

if (typeof window !== 'undefined') {
  Object.assign(window, { startDictation, retryMissedDictation });
  document.addEventListener('DOMContentLoaded', () => {
    element('dictation-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      submitCurrentAnswer();
    });
    element('dictation-answer')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      submitCurrentAnswer();
    });
    element('dictation-replay')?.addEventListener('click', playCurrentWord);
    element('dictation-next')?.addEventListener('click', nextDictationWord);
  });
}
