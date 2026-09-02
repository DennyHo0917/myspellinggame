// 屏幕管理桥接模块

/* 旧桥接保留但已弃用
const bind = (name) =>
  typeof window !== 'undefined' && typeof window[name] === 'function' ? window[name] : () => {};

export const showLevelStart = bind('showLevelStart');
export const showCongratulations = bind('showCongratulations');
export const showNameInput = bind('showNameInput');
export const skipNameInput = bind('skipNameInput');
export const showLeaderboard = bind('showLeaderboard');
export const closeLeaderboard = bind('closeLeaderboard');
export const showPrivacyPolicy = bind('showPrivacyPolicy');
export const closePrivacyPolicy = bind('closePrivacyPolicy');

export const screens = {
  showLevelStart,
  showCongratulations,
  showNameInput,
  skipNameInput,
  showLeaderboard,
  closeLeaderboard,
  showPrivacyPolicy,
  closePrivacyPolicy,
};

if (typeof window !== 'undefined') {
  window.screensBridge = screens;
}
*/

// 屏幕与 UI 管理模块（实现版）

import { dom } from "./domRefs.js";
import { gameState, resetGameState } from "./gameState.js";
import { initializeWords } from "./gameLoop.js";
import { fallingWords } from "./words.js";
import { updateStats } from "./rendering.js";
import {
  canStartPractice,
  prepareSession,
  renderSummary,
} from "./spellingMode.js";
import { renderDictationSummary, startDictation } from "./dictationMode.js";
import { t } from "./pageLocale.js";

function getCtx() {
  if (!dom.canvas) return null;
  return dom.canvas.getContext("2d");
}

// ---------- 关卡提示 ----------
export function showLevelStart() {
  const ctx = getCtx();
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = "rgba(246,250,248,0.88)";
  ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);

  ctx.fillStyle = "#2f6f73";
  ctx.font = "700 44px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(47,111,115,0.18)";
  ctx.shadowBlur = 8;
  ctx.fillText(
    `ROUND ${gameState.level}`,
    dom.canvas.width / 2,
    dom.canvas.height / 2,
  );

  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#5f6d7a";
  let desc = "";
  if (gameState.level === 1) desc = "Easy words with 10% medium words";
  else if (gameState.level === 2) desc = "Medium words with 10% hard words";
  else desc = "All hard words - Final challenge!";
  ctx.fillText(desc, dom.canvas.width / 2, dom.canvas.height / 2 + 60);
  ctx.restore();
}

// ---------- 通关祝贺 ----------
export function showCongratulations() {
  const ctx = getCtx();
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = "rgba(246,250,248,0.92)";
  ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, dom.canvas.width, 0);
  gradient.addColorStop(0, "#2f6f73");
  gradient.addColorStop(0.5, "#3468c2");
  gradient.addColorStop(1, "#2f946b");

  ctx.fillStyle = gradient;
  ctx.font = "700 54px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(47,111,115,0.18)";
  ctx.shadowBlur = 8;
  ctx.fillText(
    "CONGRATULATIONS!",
    dom.canvas.width / 2,
    dom.canvas.height / 2 - 50,
  );

  ctx.fillStyle = "#17202a";
  ctx.font = "700 28px Inter, system-ui, sans-serif";
  ctx.fillText(
    "You completed all levels!",
    dom.canvas.width / 2,
    dom.canvas.height / 2 + 20,
  );

  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.fillText(
    `Final Score: ${gameState.score}`,
    dom.canvas.width / 2,
    dom.canvas.height / 2 + 70,
  );
  ctx.restore();
}

// ---------- 游戏控制 ----------
export async function startGame() {
  const selectedMode = document.querySelector(
    'input[name="practice-mode"]:checked',
  )?.value;
  if (selectedMode === "chase") {
    window.startTypingChase?.();
    return;
  }
  if (!(await canStartPractice())) return;
  const session = prepareSession();
  if (!session) return;
  gameState.startTime = Date.now();
  gameState.gameStarted = true;
  gameState.gameRunning = true;
  fallingWords.length = 0;
  document.getElementById("game-start")?.style &&
    (document.getElementById("game-start").style.display = "none");
  const returnButton = document.getElementById("return-menu-btn");
  if (returnButton) returnButton.style.display = "inline-flex";

  if (session.mode === "dictation") {
    document
      .getElementById("game-container")
      ?.classList.remove("typing-mode-active");
    if (dom.input) dom.input.disabled = true;
    startDictation(session.words);
    return;
  }

  document
    .getElementById("game-container")
    ?.classList.remove("dictation-active");
  document
    .getElementById("game-container")
    ?.classList.add("typing-mode-active");
  const dictationScreen = document.getElementById("dictation-screen");
  if (dictationScreen) dictationScreen.hidden = true;
  const title = document.querySelector(".game-title");
  if (title) title.textContent = t("typingTitle");
  if (dom.input) {
    dom.input.disabled = false;
    dom.input.focus();
  }
  initializeWords();

  // 启动游戏循环
  import("./gameLoop.js").then(({ gameLoop }) => {
    requestAnimationFrame(gameLoop);
  });

  if (gameState.mode === "practice") {
    const sel = document.getElementById("practice-duration-select");
    let minutes = 3;
    if (sel) {
      const v = parseInt(sel.value, 10);
      if (!isNaN(v)) minutes = v;
    }
    gameState.practiceDuration = minutes * 60;

    const diffSel = document.getElementById("practice-difficulty-select");
    const diff = parseInt(diffSel ? diffSel.value : "1", 10);
    gameState.practiceDifficulty = [1, 2, 3].includes(diff) ? diff : 1;
    gameState.level = gameState.practiceDifficulty; // set level for word selection

    const speedRange = document.getElementById("practice-speed-range");
    const sp = parseFloat(speedRange ? speedRange.value : "1");
    gameState.practiceSpeed = isNaN(sp) ? 1 : sp;
    gameState.practiceEndTime = Date.now() + gameState.practiceDuration * 1000;
  }

  // --- Tournament mode timer and settings ---
  if (gameState.mode === "tournament") {
    // 固定 2 分钟赛制
    const minutes = gameState.tournamentDuration / 60;
    gameState.tournamentEndTime =
      Date.now() + gameState.tournamentDuration * 1000;
    // 如有需要可在此扩展其他锦标赛特定设置
  }
}

export function endGame() {
  gameState.gameRunning = false;
  if (gameState.practiceMode === "dictation") {
    renderDictationSummary();
    document.getElementById("game-over").style.display = "flex";
    return;
  }
  // 更新最终统计
  document.getElementById("final-score").textContent = gameState.score;
  document.getElementById("final-level").textContent = gameState.level;
  document.getElementById("final-wpm").textContent =
    document.getElementById("wpm").textContent;
  document.getElementById("final-accuracy").textContent =
    document.getElementById("accuracy").textContent;
  document.getElementById("final-missed").textContent = gameState.missedWords;
  renderSummary();

  // Practice mode custom stats
  if (gameState.mode === "practice") {
    const durSec = Math.round((Date.now() - gameState.startTime) / 1000);
    const min = String(Math.floor(durSec / 60));
    const sec = String(durSec % 60).padStart(2, "0");
    const durEl = document.getElementById("final-duration");
    if (durEl) durEl.textContent = `${min}:${sec}`;
    const row = document.getElementById("duration-row");
    if (row) row.style.display = "";
    // hide level & missed rows for practice
    document.getElementById("final-level").parentElement.style.display = "none";
    document.getElementById("final-missed").parentElement.style.display =
      "none";
  }

  // Tournament mode - 显示持续时间
  if (gameState.mode === "tournament") {
    const durSec = Math.round((Date.now() - gameState.startTime) / 1000);
    const min = String(Math.floor(durSec / 60));
    const sec = String(durSec % 60).padStart(2, "0");
    const durEl = document.getElementById("final-duration");
    if (durEl) durEl.textContent = `${min}:${sec}`;
    const row = document.getElementById("duration-row");
    if (row) row.style.display = "";

    // 将综合得分显示在 Game Over 屏幕（方便玩家了解排行榜规则）
    const wpmText2 = document.getElementById("wpm").textContent;
    const accText2 = document.getElementById("accuracy").textContent;
    const totalScoreTmp = Math.round(
      gameState.score * 0.6 +
        parseFloat(wpmText2) * 10 +
        parseFloat(accText2) * 5 -
        gameState.missedWords * 20,
    );

    const go = document.getElementById("game-over");
    if (go) {
      let resEl = document.getElementById("tournament-result");
      if (!resEl) {
        resEl = document.createElement("div");
        resEl.id = "tournament-result";
        resEl.style.fontFamily = "Inter, system-ui, sans-serif";
        resEl.style.fontSize = "28px";
        resEl.style.marginBottom = "10px";
        resEl.style.textAlign = "center";
        const container = go.querySelector(".game-over-content");
        if (container) container.insertBefore(resEl, container.firstChild);
      }
      const lbl = window.totalScoreLabel || "Total Score";
      resEl.textContent = `${lbl}: ${totalScoreTmp}`;
      resEl.style.color = "#ffd86b";
    }
  }

  // 计算综合得分以判断是否进入排行榜
  document.getElementById("game-over").style.display = "flex";
}

export function restartGame(startImmediately = false) {
  window.speechSynthesis?.cancel?.();
  window.stopTypingChase?.();
  resetGameState();
  fallingWords.length = 0;
  if (typeof window !== "undefined") {
    window.particles = [];
  }
  if (dom.input) {
    dom.input.value = "";
    dom.input.disabled = true;
  }
  // 隐藏所有覆盖层
  ["game-over", "privacy-policy"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  document
    .getElementById("game-container")
    ?.classList.remove("dictation-active");
  document
    .getElementById("game-container")
    ?.classList.remove("typing-mode-active", "chase-mode-active");
  const dictationScreen = document.getElementById("dictation-screen");
  if (dictationScreen) dictationScreen.hidden = true;
  document.getElementById("chase-screen")?.setAttribute("hidden", "");
  document.getElementById("typing-final-stats")?.removeAttribute("hidden");
  document.getElementById("dictation-final-stats")?.setAttribute("hidden", "");
  document.getElementById("chase-final-stats")?.setAttribute("hidden", "");
  document.getElementById("spelling-summary")?.setAttribute("hidden", "");
  document.querySelector(".assignment-complete-btn")?.removeAttribute("hidden");
  document.getElementById("edit-list-btn")?.removeAttribute("hidden");
  // 直接开始游戏，而不是显示开始界面
  updateStats();
  const startScreen = document.getElementById("game-start");
  if (startScreen) startScreen.style.display = "flex";
  const returnButton = document.getElementById("return-menu-btn");
  if (returnButton) returnButton.style.display = "none";
  if (startImmediately) {
    startGame();
  } else {
    document.getElementById("custom-word-list")?.focus();
  }
}

export function returnToMainMenu() {
  window.speechSynthesis?.cancel?.();
  window.stopTypingChase?.();

  const selectedMode = document.querySelector(
    'input[name="practice-mode"]:checked',
  );
  if (selectedMode?.value === "chase") {
    const dictationMode = document.querySelector(
      'input[name="practice-mode"][value="dictation"]',
    );
    if (dictationMode) {
      dictationMode.checked = true;
      dictationMode.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  resetGameState();
  gameState.gameRunning = false;
  gameState.gameStarted = false;
  fallingWords.length = 0;
  if (typeof window !== "undefined") window.particles = [];
  if (dom.input) {
    dom.input.value = "";
    dom.input.disabled = true;
  }
  document.getElementById("game-over")?.style &&
    (document.getElementById("game-over").style.display = "none");
  document.getElementById("privacy-policy")?.style &&
    (document.getElementById("privacy-policy").style.display = "none");
  document.getElementById("dictation-screen")?.setAttribute("hidden", "");
  document
    .getElementById("game-container")
    ?.classList.remove(
      "dictation-active",
      "typing-mode-active",
      "chase-mode-active",
    );
  document.getElementById("chase-screen")?.setAttribute("hidden", "");
  document.getElementById("spelling-summary")?.setAttribute("hidden", "");
  document.getElementById("typing-final-stats")?.removeAttribute("hidden");
  document.getElementById("dictation-final-stats")?.setAttribute("hidden", "");
  document.getElementById("chase-final-stats")?.setAttribute("hidden", "");
  document.querySelector(".assignment-complete-btn")?.removeAttribute("hidden");
  document.getElementById("edit-list-btn")?.removeAttribute("hidden");
  document.getElementById("game-start")?.style &&
    (document.getElementById("game-start").style.display = "flex");
  const returnButton = document.getElementById("return-menu-btn");
  if (returnButton) returnButton.style.display = "none";
  const title = document.querySelector(".game-title");
  if (title) title.textContent = t("roundTitle");
  updateStats();
  document.getElementById("custom-word-list")?.focus();
}

// ---------- 名字输入 ----------
export function showNameInput() {
  document.getElementById("game-over")?.style &&
    (document.getElementById("game-over").style.display = "flex");
}

export function submitScore() {
  document.getElementById("game-over")?.style &&
    (document.getElementById("game-over").style.display = "flex");
}

export function skipNameInput() {
  document.getElementById("game-over")?.style &&
    (document.getElementById("game-over").style.display = "flex");
}

// 其余屏幕函数从其他模块导入/复用
import { showPrivacyPolicy, closePrivacyPolicy } from "./privacy.js";

export const screens = {
  showLevelStart,
  showCongratulations,
  startGame,
  endGame,
  restartGame,
  returnToMainMenu,
  showNameInput,
  submitScore,
  skipNameInput,
  showPrivacyPolicy,
  closePrivacyPolicy,
};

// 挂载到全局，兼容旧 HTML 内联 onClick
if (typeof window !== "undefined") {
  Object.assign(window, screens);
  // legacy aliases
  window.showLevelStart = showLevelStart;
  window.showCongratulations = showCongratulations;
  window.startGame = startGame;
  window.endGame = endGame;
  window.restartGame = restartGame;
  window.returnToMainMenu = returnToMainMenu;
  window.showNameInput = showNameInput;
  window.submitScore = submitScore;
  window.skipNameInput = skipNameInput;
  window.screensBridge = screens;
}
