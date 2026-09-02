import {
  chaseSentenceRanges,
  chaseSnapshot,
  createChaseSession,
  registerChaseInput,
} from "./chaseCore.mjs";
import { dom } from "./domRefs.js";
import { gameState } from "./gameState.js";
import { getPageLocale, t } from "./pageLocale.js";
import { trackEvent } from "./analytics.mjs";

let samplePassage = null;
let session = null;
let frameId = 0;
let active = false;
let sentences = [];
let sentenceIndex = 0;
let sentenceInputLength = 0;
let audioContext = null;
let escaping = false;
let escapeStartedAt = 0;
let selectedChaseMode = null;
let previewVisible = false;
const ESCAPE_DURATION_MS = 1_100;
const CHASE_MODES = {
  simple: { thiefWpm: 40, dynamicThief: false },
  hard: { thiefWpm: 45, thiefMaxWpm: 55, dynamicThief: true },
};
const alleyTexture = new Image();
const runnerSource = new Image();
let runnerSheet = null;

alleyTexture.src = "/images/chase/alley-loop.png";
runnerSource.src = "/images/chase/runners-chroma.png";
runnerSource.addEventListener("load", () => {
  const canvas = document.createElement("canvas");
  canvas.width = runnerSource.naturalWidth;
  canvas.height = runnerSource.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(runnerSource, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index];
    const green = imageData.data[index + 1];
    const blue = imageData.data[index + 2];
    if (green > 120 && green > red + 45 && green > blue + 45) {
      imageData.data[index + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  runnerSheet = canvas;
  drawChasePreview();
});

function element(id) {
  return document.getElementById(id);
}

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function numberRange(value, thresholds, labels) {
  const index = thresholds.findIndex((threshold) => value < threshold);
  return labels[index < 0 ? labels.length - 1 : index];
}

function chaseOutcome() {
  return element("game-over-title")?.textContent === t("chaseCaught")
    ? "caught"
    : "escaped";
}

function currentSentence() {
  return sentences[sentenceIndex] || null;
}

function playTypingSound(valid) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(valid ? 420 : 180, now);
  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.05);
}

function drawRunnerFallback(ctx, x, y, color, phase, police = false) {
  const stride = Math.sin(phase) * 10;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 39, 24, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x, y + 27);
  ctx.moveTo(x, y + 13);
  ctx.lineTo(x - stride * 0.7, y + 24);
  ctx.moveTo(x, y + 13);
  ctx.lineTo(x + stride * 0.7, y + 24);
  ctx.moveTo(x, y + 27);
  ctx.lineTo(x - stride, y + 41);
  ctx.moveTo(x, y + 27);
  ctx.lineTo(x + stride, y + 41);
  ctx.stroke();
  ctx.fillStyle = police ? "#f6c7a5" : "#d6a37c";
  ctx.beginPath();
  ctx.arc(x, y - 8, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = police ? "#2563eb" : "#17202a";
  ctx.fillRect(x - 13, y - 21, 26, 7);
  if (!police) {
    ctx.fillStyle = "#17202a";
    ctx.fillRect(x - 11, y - 11, 22, 6);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 3, y - 20, 6, 5);
  }
  ctx.restore();
}

function drawAlley(ctx, width, height) {
  if (!alleyTexture.complete || !alleyTexture.naturalWidth) return false;
  const tileWidth =
    alleyTexture.naturalWidth * (height / alleyTexture.naturalHeight);
  const offset = session?.roadOffset || 0;
  const firstTile = Math.floor(offset / tileWidth);
  let x = -(offset % tileWidth);
  for (let tile = firstTile; x < width; tile += 1, x += tileWidth) {
    if (tile % 2) {
      ctx.save();
      ctx.translate(x + tileWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(alleyTexture, 0, 0, tileWidth, height);
      ctx.restore();
    } else {
      ctx.drawImage(alleyTexture, x, 0, tileWidth, height);
    }
  }
  return true;
}

function drawRunnerSprite(ctx, x, groundY, row, frame, sceneWidth) {
  if (!runnerSheet) return false;
  const sourceWidth = runnerSheet.width / 4;
  const sourceHeight = runnerSheet.height / 2;
  const width = Math.min(152, Math.max(92, sceneWidth * 0.14));
  const height = width * (sourceHeight / sourceWidth);
  ctx.save();
  ctx.fillStyle = "rgba(34, 46, 55, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x, groundY - 4, width * 0.34, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(
    runnerSheet,
    frame * sourceWidth,
    row * sourceHeight,
    sourceWidth,
    sourceHeight,
    x - width / 2,
    groundY - height,
    width,
    height,
  );
  ctx.restore();
  return true;
}

function drawScene(snapshot, now, escapeProgress = 0) {
  if (!dom.canvas) return;
  const ctx = dom.canvas.getContext("2d");
  if (!ctx) return;
  const width = dom.canvas.width;
  const height = dom.canvas.height;
  const sceneBottom = Math.max(320, height * 0.72);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  if (!drawAlley(ctx, width, sceneBottom)) {
    const sky = ctx.createLinearGradient(0, 0, 0, sceneBottom);
    sky.addColorStop(0, "#dff3ff");
    sky.addColorStop(1, "#f8d9a8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, sceneBottom);
  }

  const policeX = width * 0.26;
  const normalThiefX = Math.min(width - 48, policeX + width * snapshot.gap);
  const escapeEase = escapeProgress ** 1.4;
  const thiefX = normalThiefX + (width + 120 - normalThiefX) * escapeEase;
  const runnerY = sceneBottom * 0.91;
  const policeDelay = Math.max(80, 220 - snapshot.rollingWpm * 2);
  const policeFrame = Math.floor(now / policeDelay) % 4;
  const policePhase = (now / policeDelay) * (Math.PI / 2);
  const thiefFrame = Math.floor(now / 135) % 4;
  if (!drawRunnerSprite(ctx, policeX, runnerY, 0, policeFrame, width)) {
    drawRunnerFallback(
      ctx,
      policeX,
      runnerY - 50,
      "#2563eb",
      policePhase,
      true,
    );
  }
  if (!drawRunnerSprite(ctx, thiefX, runnerY, 1, thiefFrame, width)) {
    drawRunnerFallback(ctx, thiefX, runnerY - 50, "#26323a", now * 0.009);
  }

  const barWidth = Math.min(520, width * 0.66);
  const barX = (width - barWidth) / 2;
  const barY = sceneBottom - 16;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillRect(barX, barY, barWidth, 9);
  ctx.fillStyle = "#2f946b";
  ctx.fillRect(barX, barY, barWidth * snapshot.progress, 9);
  ctx.strokeStyle = "rgba(23,32,42,0.18)";
  ctx.strokeRect(barX, barY, barWidth, 9);
}

function drawChasePreview() {
  if (!previewVisible || active) return;
  drawScene({ gap: 0.24, progress: 0, rollingWpm: 0 }, performance.now());
}

alleyTexture.addEventListener("load", drawChasePreview);

function renderPassage(
  comparison = { prefixLength: session?.correctChars || 0, valid: true },
) {
  const passage = element("chase-passage-text");
  const sentence = currentSentence();
  if (!passage || !session || !sentence) return;
  const cursor = Math.max(
    0,
    Math.min(sentence.text.length, comparison.prefixLength - sentence.start),
  );
  const done = document.createElement("span");
  done.className = "chase-passage-done";
  done.textContent = sentence.text.slice(0, cursor);
  const current = document.createElement("span");
  current.className = `chase-passage-current${comparison.valid ? "" : " is-error"}`;
  current.textContent =
    sentence.text[cursor] === " " ? "\u00a0" : sentence.text[cursor] || "";
  const remaining = document.createElement("span");
  remaining.textContent = sentence.text.slice(
    cursor + (sentence.text[cursor] ? 1 : 0),
  );
  passage.replaceChildren(done, current, remaining);
}

function updateHud(snapshot) {
  const values = {
    "chase-progress": `${Math.round(snapshot.progress * 100)}%`,
    "chase-wpm": String(snapshot.wpm),
    "chase-thief-wpm": String(snapshot.thiefWpm || session?.thiefWpm || 40),
    "chase-accuracy": `${snapshot.accuracy}%`,
    "chase-errors": String(session?.mistakes || 0),
  };
  for (const [id, value] of Object.entries(values)) {
    const node = element(id);
    if (node) node.textContent = value;
  }
}

function finishChase(caught, now = performance.now()) {
  if (!session || session.finished) return;
  session.finished = true;
  active = false;
  cancelAnimationFrame(frameId);
  const snapshot = chaseSnapshot(session, now);
  const capture = element("chase-input");
  capture?.blur();
  element("chase-screen")?.setAttribute("hidden", "");
  element("typing-final-stats")?.setAttribute("hidden", "");
  element("dictation-final-stats")?.setAttribute("hidden", "");
  element("chase-final-stats")?.removeAttribute("hidden");
  element("spelling-summary")?.setAttribute("hidden", "");
  const title = element("game-over-title");
  if (title) title.textContent = t(caught ? "chaseCaught" : "chaseEscaped");
  const finalValues = {
    "chase-final-wpm": snapshot.wpm,
    "chase-final-accuracy": `${snapshot.accuracy}%`,
    "chase-final-errors": session.mistakes,
    "chase-final-time": formatTime(snapshot.elapsedMs),
  };
  for (const [id, value] of Object.entries(finalValues)) {
    const node = element(id);
    if (node) node.textContent = String(value);
  }
  document
    .querySelector(".assignment-complete-btn")
    ?.setAttribute("hidden", "");
  element("edit-list-btn")?.setAttribute("hidden", "");
  element("chase-return-menu-btn")?.removeAttribute("hidden");
  element("chase-share-btn")?.removeAttribute("hidden");
  const shareStatus = element("chase-share-status");
  if (shareStatus) shareStatus.textContent = "";
  const gameOver = element("game-over");
  if (gameOver) gameOver.style.display = "flex";
  trackEvent("typing_chase_completed", {
    chase_mode: selectedChaseMode,
    outcome: caught ? "caught" : "escaped",
    wpm_range: numberRange(
      snapshot.wpm,
      [30, 45, 60],
      ["under_30", "30_44", "45_59", "60_plus"],
    ),
    accuracy_range: numberRange(
      snapshot.accuracy,
      [80, 95, 100],
      ["under_80", "80_94", "95_99", "100"],
    ),
    duration_range: numberRange(
      snapshot.elapsedMs / 1000,
      [30, 60, 120],
      ["under_30", "30_59", "60_119", "120_plus"],
    ),
    locale: getPageLocale(),
  });
}

async function shareChaseResult() {
  const wpm = element("chase-final-wpm")?.textContent || "0";
  const time = element("chase-final-time")?.textContent || "0:00";
  const caught = chaseOutcome() === "caught";
  const result = t(caught ? "chaseShareCaught" : "chaseShareEscaped", {
    wpm,
    time,
  });
  const shareUrl = new URL(location.pathname, location.origin).href;
  const text = `${result}\n${shareUrl}`;
  const status = element("chase-share-status");
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = t("chaseShareCopied");
      trackEvent("typing_chase_result_shared", {
        outcome: caught ? "caught" : "escaped",
        share_method: "clipboard",
        locale: getPageLocale(),
      });
      return;
    } catch {
      // Fall through when clipboard permissions are unavailable.
    }
  }
  window.prompt(t("chaseShare"), text);
  trackEvent("typing_chase_result_shared", {
    outcome: caught ? "caught" : "escaped",
    share_method: "prompt",
    locale: getPageLocale(),
  });
}

function startEscape(now = performance.now()) {
  if (escaping) return;
  escaping = true;
  escapeStartedAt = now;
  const capture = element("chase-input");
  if (capture) capture.disabled = true;
  capture?.blur();
}

function chaseFrame(now) {
  if (!active || !session) return;
  const delta = Math.min(64, Math.max(0, now - session.lastFrameAt));
  session.lastFrameAt = now;
  const snapshot = chaseSnapshot(session, now);
  if (session.startedAt !== null) {
    session.roadOffset +=
      delta * (0.04 + Math.min(0.5, snapshot.rollingWpm / 180));
  }
  const escapeProgress = escaping
    ? Math.min(1, (now - escapeStartedAt) / ESCAPE_DURATION_MS)
    : 0;
  drawScene(snapshot, now, escapeProgress);
  updateHud(snapshot);
  if (!escaping && snapshot.caught) {
    finishChase(true, now);
    return;
  }
  if (!escaping && snapshot.outpaced) startEscape(now);
  if (escaping && escapeProgress >= 1) {
    finishChase(false, now);
    return;
  }
  frameId = requestAnimationFrame(chaseFrame);
  trackEvent("typing_chase_started", {
    chase_mode: selectedChaseMode,
    locale: getPageLocale(),
  });
}

export function stopTypingChase({ keepPassage = true } = {}) {
  active = false;
  cancelAnimationFrame(frameId);
  frameId = 0;
  session = null;
  sentences = [];
  sentenceIndex = 0;
  sentenceInputLength = 0;
  escaping = false;
  escapeStartedAt = 0;
  selectedChaseMode = null;
  previewVisible = false;
  element("game-container")?.classList.remove(
    "chase-mode-active",
    "chase-preview-active",
  );
  element("chase-screen")?.setAttribute("hidden", "");
  const capture = element("chase-input");
  if (capture) capture.value = "";
  element("chase-return-menu-btn")?.setAttribute("hidden", "");
  element("chase-share-btn")?.setAttribute("hidden", "");
  element("chase-share-status")?.replaceChildren();
  if (!keepPassage) samplePassage = null;
}

export function startTypingChase(
  passage = samplePassage,
  mode = selectedChaseMode || "simple",
) {
  if (!passage?.text) return;
  stopTypingChase();
  samplePassage = passage;
  const chaseMode = CHASE_MODES[mode] || CHASE_MODES.simple;
  session = createChaseSession(passage.text, {
    now: performance.now(),
    ...chaseMode,
  });
  sentences = chaseSentenceRanges(session.passage);
  sentenceIndex = 0;
  sentenceInputLength = 0;
  escaping = false;
  escapeStartedAt = 0;
  selectedChaseMode = mode;
  previewVisible = false;
  active = true;
  gameState.gameRunning = true;
  gameState.gameStarted = true;
  gameState.practiceMode = "chase";
  gameState.mode = "chase";
  const container = element("game-container");
  container?.classList.remove("dictation-active", "typing-mode-active");
  container?.classList.add("chase-mode-active");
  element("dictation-screen")?.setAttribute("hidden", "");
  const startScreen = element("game-start");
  if (startScreen) startScreen.style.display = "none";
  const gameOver = element("game-over");
  if (gameOver) gameOver.style.display = "none";
  element("typing-final-stats")?.setAttribute("hidden", "");
  element("dictation-final-stats")?.setAttribute("hidden", "");
  element("chase-final-stats")?.removeAttribute("hidden");
  element("chase-screen")?.removeAttribute("hidden");
  const returnButton = element("return-menu-btn");
  if (returnButton) returnButton.style.display = "inline-flex";
  const title = document.querySelector(".game-title");
  if (title) title.textContent = t("chaseTitle");
  const passageTitle = element("chase-passage-title");
  if (passageTitle) passageTitle.textContent = passage.title;
  const capture = element("chase-input");
  if (capture) {
    capture.value = "";
    capture.disabled = false;
    capture.maxLength = (currentSentence()?.text.length || 0) + 1;
    capture.classList.remove("is-error");
  }
  renderPassage();
  updateHud(chaseSnapshot(session, performance.now()));
  frameId = requestAnimationFrame(chaseFrame);
  if (window.innerWidth > 620 && window.matchMedia("(pointer: fine)").matches) {
    capture?.focus();
  }
}

async function enterTypingChase() {
  trackEvent("typing_chase_selected", { locale: getPageLocale() });
  const status = element("chase-access-status");
  const modeOptions = element("chase-mode-options");
  const startButton = element("chase-start-btn");
  selectedChaseMode = null;
  modeOptions?.setAttribute("hidden", "");
  if (startButton) startButton.disabled = true;
  if (status) status.textContent = t("chaseChecking");
  try {
    const response = await fetch("/api/chase/passage", {
      credentials: "same-origin",
    });
    if (response.status === 401) {
      trackEvent("typing_chase_auth_required", { locale: getPageLocale() });
      window.location.href = `/workspace?lang=${encodeURIComponent(getPageLocale())}#teacher-sign-in`;
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.passage?.text)
      throw new Error("chase_passage_error");
    samplePassage = data.passage;
    const badge = document.querySelector(".chase-mode-card .mode-lock");
    if (badge) badge.textContent = t("chaseBuiltInBadge");
    if (status) status.textContent = t("chaseChooseMode");
    modeOptions?.removeAttribute("hidden");
    showChasePreview();
  } catch {
    if (status) status.textContent = t("chaseLoadError");
  }
}

function showChasePreview() {
  previewVisible = true;
  active = false;
  cancelAnimationFrame(frameId);
  const container = element("game-container");
  container?.classList.add("chase-mode-active", "chase-preview-active");
  const startScreen = element("game-start");
  if (startScreen) startScreen.style.display = "flex";
  element("chase-screen")?.setAttribute("hidden", "");
  drawChasePreview();
}

function chooseChaseMode(mode) {
  if (!CHASE_MODES[mode]) return;
  selectedChaseMode = mode;
  trackEvent("typing_chase_mode_selected", {
    chase_mode: mode,
    locale: getPageLocale(),
  });
  document.querySelectorAll("[data-chase-mode]").forEach((button) => {
    const selected = button.dataset.chaseMode === mode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const startButton = element("chase-start-btn");
  if (startButton) startButton.disabled = false;
  const status = element("chase-access-status");
  if (status)
    status.textContent = t(
      mode === "hard" ? "chaseHardSelected" : "chaseSimpleSelected",
    );
}

function initTypingChase() {
  document.querySelectorAll('input[name="practice-mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked && radio.value === "chase") void enterTypingChase();
    });
  });
  document.querySelectorAll("[data-chase-mode]").forEach((button) => {
    button.addEventListener("click", () =>
      chooseChaseMode(button.dataset.chaseMode),
    );
  });
  element("chase-start-btn")?.addEventListener("click", () => {
    if (selectedChaseMode && samplePassage)
      startTypingChase(samplePassage, selectedChaseMode);
  });
  const capture = element("chase-input");
  capture?.addEventListener("paste", (event) => event.preventDefault());
  capture?.addEventListener("input", (event) => {
    if (!active || !session) return;
    const sentence = currentSentence();
    if (!sentence) return;
    const typed = event.currentTarget.value;
    const added = typed.length > sentenceInputLength;
    sentenceInputLength = typed.length;
    const comparison = registerChaseInput(
      session,
      `${session.passage.slice(0, sentence.start)}${typed}`,
      performance.now(),
    );
    if (added) playTypingSound(comparison.valid);
    event.currentTarget.classList.toggle("is-error", !comparison.valid);
    renderPassage(comparison);
    if (!comparison.valid || typed !== sentence.text) return;

    const snapshot = chaseSnapshot(session, performance.now());
    if (snapshot.caught) {
      finishChase(true);
      return;
    }
    sentenceIndex += 1;
    const nextSentence = currentSentence();
    if (!nextSentence) {
      startEscape();
      return;
    }
    session.input = session.passage.slice(0, nextSentence.start);
    session.correctChars = nextSentence.start;
    event.currentTarget.value = "";
    event.currentTarget.maxLength = nextSentence.text.length + 1;
    event.currentTarget.classList.remove("is-error");
    sentenceInputLength = 0;
    renderPassage({ prefixLength: nextSentence.start, valid: true });
  });
  element("chase-passage-text")?.addEventListener("click", () =>
    capture?.focus(),
  );
}

if (typeof window !== "undefined") {
  Object.assign(window, {
    startTypingChase,
    stopTypingChase,
    shareChaseResult,
  });
  document.addEventListener("DOMContentLoaded", initTypingChase);
}
