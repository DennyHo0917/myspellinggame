import { trackEvent, trackUsageLimit } from "./analytics.mjs";
import {
  PRODUCT_LOCALES,
  productPagePath,
  productLocale,
  productMessage,
  productMessages,
} from "./productLocale.mjs";

const root = document.getElementById("product-app");
const locale = productLocale();
const copy = productMessages(locale);
const publicId =
  location.pathname.match(/^\/a\/([A-Za-z0-9_-]{24})$/)?.[1] || "";
const learnerParam = new URLSearchParams(location.search).get("learner");
const learnerPublicId = learnerParam ?? "";
const learnerLink = learnerParam !== null;
const storageKey = learnerLink
  ? `mySpellingAssignment:${publicId}:${learnerPublicId}`
  : `mySpellingAssignment:${publicId}`;
const MAX_RETRIES_PER_WORD = 2;
const RETRY_GAP = 2;
let assignment;
let nickname = "";
let attemptId = "";
let index = 0;
let originalAnswers = [];
let retryQueue = [];
let promptStep = 0;
let lastPromptWordId = "";
let startedAt = 0;
let leaving = false;

document.documentElement.lang = locale;
document.title = copy.brand;

function m(key, vars) {
  return productMessage(key, vars, locale);
}
const ERROR_KEYS = {
  assignment_not_found: "assignmentNotFound",
  assignment_closed: "assignmentClosed",
  assignment_expired: "assignmentExpired",
  attempt_limit: "attemptLimit",
  monthly_submission_limit: "teacherLimit",
  student_limit: "studentLimit",
  attempt_conflict: "attemptConflict",
  invalid_nickname: "invalidNickname",
  personal_info_not_allowed: "invalidNickname",
  invalid_answers: "invalidSubmission",
  invalid_duration: "invalidSubmission",
  invalid_attempt_id: "invalidSubmission",
  learner_not_found: "learnerNotFound",
  rate_limited: "rateLimited",
};

function shell() {
  root.replaceChildren();
  const nav = document.createElement("header");
  nav.className = "top-right-nav";

  const brand = document.createElement("a");
  brand.className = "brand-link";
  brand.href = productPagePath("", locale);
  brand.setAttribute("aria-label", `${copy.brand} home`);
  brand.innerHTML = `<img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt=""><span class="brand-name">${copy.brand}</span>`;

  const language = document.createElement("details");
  language.className = "language-switcher";
  const summary = document.createElement("summary");
  summary.className = "lang-btn";
  summary.setAttribute("aria-label", copy.language);
  summary.textContent = copy.language;
  const menu = document.createElement("div");
  menu.className = "lang-menu";
  for (const [value, label] of PRODUCT_LOCALES) {
    const link = document.createElement("a");
    const url = new URL(location.href);
    url.searchParams.set("lang", value);
    link.className = "lang-option";
    link.href = url.toString();
    link.hreflang =
      value === "pt-BR" ? "pt-BR" : value === "zh" ? "zh-CN" : value;
    link.textContent = label;
    if (value === locale) link.setAttribute("aria-current", "page");
    link.addEventListener("click", () => {
      try {
        localStorage.setItem("mySpellingGamePreferredLocale", value);
      } catch {}
    });
    menu.append(link);
  }
  language.append(summary, menu);
  const home = document.createElement("a");
  home.className = "teacher-nav-link";
  home.href = productPagePath("", locale);
  home.textContent = copy.home;
  nav.append(brand, language, home);
  root.append(nav);

  const wrapper = document.createElement("main");
  wrapper.className = "assignment-player";
  root.append(wrapper);
  return wrapper;
}

function card(titleText) {
  const main = shell();
  const section = document.createElement("section");
  section.className = "product-card";
  const title = document.createElement("h1");
  title.className = "assignment-title";
  title.textContent = titleText;
  section.append(title);
  main.append(section);
  return section;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: options.body
        ? { "content-type": "application/json" }
        : undefined,
    });
  } catch {
    const error = new Error(copy.submitFailed);
    error.network = true;
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    trackUsageLimit(data.error);
    const error = new Error(m(ERROR_KEYS[data.error] || "error"));
    error.code = data.error;
    throw error;
  }
  return data;
}

function readSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

function saveState(value) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {}
}

function renderIntro() {
  const section = card(assignment.title);
  const meta = document.createElement("p");
  meta.className = "muted";
  meta.textContent = `${assignment.mode === "dictation" ? copy.dictation : copy.typing} · ${m("due", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(assignment.expires_at)) })}`;
  const form = document.createElement("form");
  form.className = "product-form";
  if (learnerLink) {
    const identity = document.createElement("p");
    identity.className = "muted";
    identity.textContent = m("practicingAs", {
      name: assignment.learner?.name || "",
    });
    const start = document.createElement("button");
    start.type = "submit";
    start.textContent = copy.start;
    form.append(identity, start);
    section.append(meta, form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      beginAssignment();
    });
    return;
  }
  const field = document.createElement("div");
  field.className = "field";
  const label = document.createElement("label");
  label.htmlFor = "student-nickname";
  label.textContent = copy.nickname;
  const input = document.createElement("input");
  input.id = "student-nickname";
  input.required = true;
  input.minLength = 2;
  input.maxLength = 32;
  input.autocomplete = "off";
  input.value = nickname;
  const help = document.createElement("small");
  help.textContent = copy.nicknameHelp;
  const start = document.createElement("button");
  start.type = "submit";
  start.textContent = copy.start;
  const status = document.createElement("p");
  status.className = "status";
  status.setAttribute("role", "status");
  field.append(label, input, help);
  form.append(field, start, status);
  section.append(meta, form);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    nickname = input.value.trim();
    if (nickname.length < 2 || nickname.length > 32 || nickname.includes("@")) {
      status.textContent = copy.invalidNickname;
      status.className = "status error";
      return;
    }
    beginAssignment();
  });
}

function beginAssignment() {
  nickname = assignment.learner?.name || nickname;
  attemptId = crypto.randomUUID();
  index = 0;
  originalAnswers = [];
  retryQueue = [];
  promptStep = 0;
  lastPromptWordId = "";
  startedAt = Date.now();
  saveState({ attemptId, nickname });
  renderWord();
}

function speak(word) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}

function nextPrompt() {
  const retryIndex = retryQueue.findIndex(
    (item) =>
      item.availableAt <= promptStep + 1 && item.word.id !== lastPromptWordId,
  );
  if (retryIndex >= 0) {
    const prompt = retryQueue.splice(retryIndex, 1)[0];
    lastPromptWordId = prompt.word.id;
    return { ...prompt, kind: "retry" };
  }
  if (index < assignment.words.length) {
    const word = assignment.words[index];
    const prompt = { word, kind: "original", originalIndex: index };
    index += 1;
    lastPromptWordId = word.id;
    return prompt;
  }
  if (retryQueue.length) {
    const otherRetryIndex = retryQueue.findIndex(
      (item) => item.word.id !== lastPromptWordId,
    );
    if (otherRetryIndex >= 0 || retryQueue[0].retries === 0) {
      const prompt = retryQueue.splice(
        otherRetryIndex >= 0 ? otherRetryIndex : 0,
        1,
      )[0];
      lastPromptWordId = prompt.word.id;
      return { ...prompt, kind: "retry" };
    }
    // ponytail: one transition prevents an immediate lone Retry #2 repeat.
    promptStep = Math.max(promptStep, retryQueue[0].availableAt - 1);
    lastPromptWordId = "";
    return { kind: "review-wait" };
  }
  return null;
}

function renderWord() {
  const prompt = nextPrompt();
  if (!prompt) return saveResult();
  if (prompt.kind === "review-wait") {
    const section = card(assignment.title);
    const review = document.createElement("p");
    review.className = "muted";
    review.textContent = copy.reviewWord;
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = copy.nextWord;
    next.addEventListener("click", renderWord);
    const leave = document.createElement("button");
    leave.type = "button";
    leave.className = "button-secondary assignment-return";
    leave.textContent = copy.returnMenu;
    leave.addEventListener("click", leaveAssignment);
    section.append(review, next, leave);
    next.focus();
    return;
  }
  const { word } = prompt;
  const section = card(assignment.title);
  const progress = document.createElement("p");
  progress.className = "player-progress";
  progress.textContent = m("wordProgress", {
    current:
      prompt.kind === "original"
        ? prompt.originalIndex + 1
        : Math.min(index, assignment.words.length),
    total: assignment.words.length,
  });
  const instruction = document.createElement("p");
  instruction.textContent =
    assignment.mode === "dictation" ? copy.typeHeard : copy.typeShown;
  section.append(progress);
  if (prompt.kind === "retry") {
    const review = document.createElement("p");
    review.className = "muted";
    review.textContent = copy.reviewWord;
    section.append(review);
  }
  section.append(instruction);
  if (assignment.mode === "dictation") {
    const listen = document.createElement("button");
    listen.type = "button";
    listen.className = "button-secondary";
    listen.textContent = copy.listen;
    listen.addEventListener("click", () => speak(word.word));
    section.append(listen);
    queueMicrotask(() => speak(word.word));
  } else {
    const shown = document.createElement("div");
    shown.className = "player-word falling";
    shown.textContent = word.word;
    section.append(shown);
  }
  const form = document.createElement("form");
  form.className = "answer-form";
  const input = document.createElement("input");
  input.required = true;
  input.maxLength = 64;
  input.autocomplete = "off";
  input.autocapitalize = "none";
  input.spellcheck = false;
  input.placeholder = copy.answerPlaceholder;
  const check = document.createElement("button");
  check.type = "submit";
  check.textContent = copy.submitAnswer;
  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.setAttribute("role", "status");
  form.append(input, check, feedback);
  section.append(form);
  const leave = document.createElement("button");
  leave.type = "button";
  leave.className = "button-secondary assignment-return";
  leave.textContent = copy.returnMenu;
  leave.addEventListener("click", leaveAssignment);
  section.append(leave);
  input.focus();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answer = input.value.trim();
    if (!answer) return;
    input.disabled = true;
    check.remove();
    const correct = answer.toLowerCase() === word.word.toLowerCase();
    promptStep += 1;
    if (prompt.kind === "original") {
      originalAnswers.push({ wordId: word.id, answer });
      if (!correct) {
        retryQueue.push({
          word,
          retries: 0,
          availableAt: promptStep + RETRY_GAP + 1,
        });
      }
    } else if (!correct && prompt.retries < MAX_RETRIES_PER_WORD - 1) {
      retryQueue.push({
        word,
        retries: prompt.retries + 1,
        availableAt: promptStep + RETRY_GAP + 1,
      });
    }
    feedback.textContent = correct
      ? copy.correct
      : m("incorrect", { word: word.word });
    feedback.className = `feedback ${correct ? "correct" : "incorrect"}`;
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = copy.nextWord;
    next.addEventListener("click", () => {
      renderWord();
    });
    form.append(next);
    next.focus();
  });
}

async function leaveAssignment() {
  if (leaving) return;
  if (!attemptId) return renderIntro();
  leaving = true;
  const button = document.querySelector(".assignment-return");
  if (button) button.disabled = true;
  try {
    await request(`/api/public/assignments/${publicId}/attempts`, {
      method: "POST",
      body: JSON.stringify({
        attemptId,
        ...(learnerLink ? { learnerPublicId } : { nickname }),
        answers: originalAnswers,
        durationSeconds: Math.max(
          1,
          Math.round((Date.now() - startedAt) / 1000),
        ),
        completed: false,
      }),
    });
    trackEvent("assignment_abandoned", {
      mode: assignment.mode,
      word_count: assignment.words.length,
    });
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    attemptId = "";
    originalAnswers = [];
    retryQueue = [];
    promptStep = 0;
    lastPromptWordId = "";
    index = 0;
    leaving = false;
    renderIntro();
  } catch (error) {
    if (button) button.disabled = false;
    leaving = false;
    const notice = document.createElement("p");
    notice.className = "status error";
    notice.textContent = error.message;
    button?.after(notice);
  }
}

async function saveResult() {
  const section = card(copy.practiceComplete);
  const status = document.createElement("p");
  status.className = "status";
  status.textContent = copy.sending;
  section.append(status);
  const durationSeconds = Math.max(
    1,
    Math.round((Date.now() - startedAt) / 1000),
  );
  const body = JSON.stringify({
    attemptId,
    ...(learnerLink ? { learnerPublicId } : { nickname }),
    answers: originalAnswers,
    durationSeconds,
  });
  const submit = async () => {
    status.textContent = copy.sending;
    status.className = "status";
    try {
      const result = await request(
        `/api/public/assignments/${publicId}/attempts`,
        { method: "POST", body },
      );
      saveState({ attemptId, nickname, result });
      trackEvent("assignment_completed", {
        mode: assignment.mode,
        word_count: assignment.words.length,
        accuracy_range:
          result.accuracy < 50
            ? "0-49"
            : result.accuracy < 75
              ? "50-74"
              : result.accuracy < 90
                ? "75-89"
                : "90-100",
        duration_range:
          durationSeconds < 60
            ? "<1m"
            : durationSeconds < 180
              ? "1-3m"
              : durationSeconds < 600
                ? "3-10m"
                : "10m+",
      });
      renderResult(result);
    } catch (error) {
      status.textContent = error.network ? copy.submitFailed : error.message;
      status.className = "status error";
      let retry = section.querySelector("button");
      if (!retry) {
        retry = document.createElement("button");
        retry.type = "button";
        retry.textContent = copy.retrySubmit;
        retry.addEventListener("click", submit);
        section.append(retry);
      }
    }
  };
  await submit();
}

function renderResult(result) {
  const section = card(copy.yourResult);
  const saved = document.createElement("p");
  saved.className = "status success";
  saved.textContent = copy.resultSaved;
  const accuracy = document.createElement("p");
  const strong = document.createElement("span");
  strong.className = "stat-value";
  strong.textContent = `${result.accuracy}%`;
  accuracy.append(strong, document.createTextNode(copy.accuracy));
  const counts = document.createElement("p");
  counts.textContent = m("resultCorrect", {
    correct: result.correct_count,
    incorrect: result.incorrect_count,
  });
  const missed = document.createElement("p");
  missed.textContent = result.missedWords.length
    ? m("resultMissed", { words: result.missedWords.join(", ") })
    : copy.noMisses;
  const again = document.createElement("button");
  again.type = "button";
  again.className = "button-secondary";
  again.textContent = copy.retry;
  again.addEventListener("click", () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    nickname = result.nickname || nickname;
    renderIntro();
  });
  section.append(saved, accuracy, counts, missed, again);
}

async function init() {
  root.textContent = copy.assignmentLoading;
  try {
    assignment = await request(
      `/api/public/assignments/${publicId}${learnerLink ? `?learner=${encodeURIComponent(learnerPublicId)}` : ""}`,
    );
    if (learnerLink && !assignment.learner)
      throw new Error(copy.learnerNotFound);
    trackEvent("assignment_opened", {
      mode: assignment.mode,
      word_count: assignment.words.length,
    });
    const saved = readSaved();
    if (saved?.result) {
      nickname = saved.nickname || assignment.learner?.name || "";
      renderResult(saved.result);
      return;
    }
    if (saved?.nickname) nickname = saved.nickname;
    if (learnerLink) nickname = assignment.learner.name;
    renderIntro();
  } catch (error) {
    const section = card(error.message);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = copy.retry;
    retry.addEventListener("click", init);
    section.append(retry);
  }
}

init();
