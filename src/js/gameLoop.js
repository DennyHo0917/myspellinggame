// My Spelling Game 主循环模块

import { gameState } from './gameState.js';
import { fallingWords, FallingWord, spawnWord } from './words.js';
import { resizeCanvas, initBackgroundParticles, createExplosion } from './rendering.js';
import { playMissSound } from './audio.js';
import { updateStats } from './rendering.js';
import { dom } from './domRefs.js';
import { isRoundComplete, markMissed } from './spellingMode.js';

// 背景与粒子数组与旧全局共享
if (typeof window !== 'undefined') {
  window.particles = window.particles || [];
  window.backgroundParticles = window.backgroundParticles || [];
}

export function initializeWords() {
  fallingWords.length = 0;
  for (let i = 0; i < 3; i++) {
    const w = new FallingWord();
    if (w.word) {
      w.y = w.spawnY > 0 ? w.spawnY + i * 64 : -100 - i * 150;
      fallingWords.push(w);
    }
  }
}

function ensureCtx() {
  const canvas = dom.canvas || document.getElementById('game-canvas');
  return canvas ? canvas.getContext('2d') : null;
}

export function gameLoop() {
  if (!gameState.gameRunning) return;

  const ctx = ensureCtx();
  const particlesCanvas = document.getElementById('particles-canvas');
  const particlesCtx = particlesCanvas ? particlesCanvas.getContext('2d') : null;
  const canvas = dom.canvas;

  // 清空画布
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (particlesCtx) particlesCtx.clearRect(0, 0, canvas.width, canvas.height);

  // 更新背景粒子
  (window.backgroundParticles || []).forEach((p) => {
    p.update();
    p.draw();
  });

  if (!gameState.gameStarted) {
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!gameState.levelStarted) {
    if (gameState.mode === 'level') {
      if (typeof window.showLevelStart === 'function') window.showLevelStart();
      setTimeout(() => {
        gameState.levelStarted = true;
      }, 2000);
    } else {
      // Practice / Tournament 等模式直接跳过关卡提示
      gameState.levelStarted = true;
    }
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameState.gameCompleted) {
    if (typeof window.showCongratulations === 'function') window.showCongratulations();
    setTimeout(() => {
      if (typeof window.endGame === 'function') window.endGame();
    }, 5000);
    return;
  }

  // Practice / Tournament 计时结束
  const nowTs = Date.now();
  if (
    (gameState.mode === 'practice' && gameState.practiceEndTime && nowTs >= gameState.practiceEndTime) ||
    (gameState.mode === 'tournament' && gameState.tournamentEndTime && nowTs >= gameState.tournamentEndTime)
  ) {
    if (typeof window.endGame === 'function') window.endGame();
    return;
  }

  spawnWord();

  for (let i = fallingWords.length - 1; i >= 0; i--) {
    const word = fallingWords[i];
    word.update();
    word.draw();

    if (word.y > canvas.height) {
      fallingWords.splice(i, 1);
      markMissed(word.word);
      if (gameState.mode === 'practice') {
        continue;
      }
      gameState.missedWords++;
      gameState.combo = 0;
      createExplosion(word.x, canvas.height - 20, '#ff6b6b');
      playMissSound();
      if (gameState.missedWords >= gameState.maxMisses) {
        if (typeof window.endGame === 'function') window.endGame();
        return;
      }
    }
  }

  // 更新前景粒子
  if (isRoundComplete(fallingWords.length)) {
    gameState.spellingRoundComplete = true;
    if (typeof window.endGame === 'function') window.endGame();
    return;
  }

  window.particles = (window.particles || []).filter((p) => {
    p.update();
    const ctx2 = ensureCtx();
    if (ctx2) p.draw(ctx2);
    return p.life > 0;
  });

  updateStats();
  requestAnimationFrame(gameLoop);
}

if (typeof window !== 'undefined') {
  window.initializeWords = initializeWords;
  window.gameLoop = gameLoop;
}
