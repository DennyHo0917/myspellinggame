// My Spelling Game 词汇与掉落单词逻辑模块

import { gameState } from './gameState.js';
import { wordDatabase } from './wordDatabase.js';
import { createExplosion } from './rendering.js';
import { playWordCompleteSound } from './audio.js';
import { getCustomWord, speakWord } from './spellingMode.js';

// 与旧代码共享同一个数组
export const fallingWords = typeof window !== 'undefined' && window.fallingWords ? window.fallingWords : [];
if (typeof window !== 'undefined') {
  window.fallingWords = fallingWords;
}

function getCanvas() {
  return document.getElementById('game-canvas');
}

function getCtx() {
  const canvas = getCanvas();
  return canvas ? canvas.getContext('2d') : null;
}

function randomBetween(min, max) {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

function measureWordWidth(canvas, word, fontSize) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return word.length * fontSize * 0.62;

  ctx.save();
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  const width = ctx.measureText(word).width;
  ctx.restore();
  return width;
}

function statsRectOnCanvas(canvas) {
  const stats = document.querySelector('.stats');
  if (!stats) return null;

  const statsStyle = window.getComputedStyle(stats);
  if (statsStyle.display === 'none' || statsStyle.visibility === 'hidden') return null;

  const canvasRect = canvas.getBoundingClientRect();
  const statsRect = stats.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height || !statsRect.width || !statsRect.height) return null;

  const scaleX = canvas.width / canvasRect.width;
  const scaleY = canvas.height / canvasRect.height;
  const left = Math.max(0, (statsRect.left - canvasRect.left) * scaleX);
  const right = Math.min(canvas.width, (statsRect.right - canvasRect.left) * scaleX);
  const top = Math.max(0, (statsRect.top - canvasRect.top) * scaleY);
  const bottom = Math.min(canvas.height, (statsRect.bottom - canvasRect.top) * scaleY);

  if (right <= 0 || left >= canvas.width || bottom <= 0 || top >= canvas.height) return null;
  return { left, right, top, bottom };
}

function chooseSafeSpawnPosition(canvas, word, fontSize) {
  const margin = 24;
  const statsPadding = 18;
  const wordWidth = measureWordWidth(canvas, word, fontSize);
  const halfWord = wordWidth / 2;
  const minX = Math.min(canvas.width / 2, margin + halfWord);
  const maxX = Math.max(canvas.width / 2, canvas.width - margin - halfWord);
  const fallback = { x: randomBetween(minX, maxX), y: -50 };
  const statsRect = statsRectOnCanvas(canvas);

  if (!statsRect) return fallback;

  const leftRange = {
    min: minX,
    max: Math.min(maxX, statsRect.left - statsPadding - halfWord),
  };
  const rightRange = {
    min: Math.max(minX, statsRect.right + statsPadding + halfWord),
    max: maxX,
  };
  const ranges = [leftRange, rightRange]
    .filter((range) => range.max > range.min)
    .map((range) => ({ ...range, width: range.max - range.min }));

  if (ranges.length) {
    const totalWidth = ranges.reduce((sum, range) => sum + range.width, 0);
    let pick = Math.random() * totalWidth;
    for (const range of ranges) {
      if (pick <= range.width) return { x: randomBetween(range.min, range.max), y: -50 };
      pick -= range.width;
    }
  }

  return {
    x: fallback.x,
    y: Math.min(canvas.height - margin, statsRect.bottom + statsPadding + fontSize),
  };
}

export class FallingWord {
  constructor() {
    this.word = this.getRandomWord();
    if (!this.word) return; // 无可用单词

    const canvas = getCanvas();
    if (!canvas) {
      this.word = null;
      return;
    }

    this.fontSize = 24;
    const spawnPosition = chooseSafeSpawnPosition(canvas, this.word, this.fontSize);
    this.x = spawnPosition.x;
    this.y = spawnPosition.y;
    this.spawnY = spawnPosition.y;
    this.speed = (Math.random() * 0.5 + 0.3 + (gameState.level - 1) * 0.1);
    if (gameState.mode === 'practice' && gameState.practiceSpeed) {
      this.speed *= gameState.practiceSpeed;
    }
    this.color = this.getWordColor();
    this.matched = false;
    this.progress = 0;
    speakWord(this.word);
  }

  getRandomWord() {
    let word;
    // A custom queue ending is the end of that queue, not permission to use built-in words.
    if (gameState.spellingMode) return getCustomWord();
    
    // 锦标赛模式：固定比例混合难度
    if (gameState.mode === 'tournament') {
      const rand = Math.random();
      
      if (rand < 0.3) {
        // 30% 简单词
        word = wordDatabase.easy[Math.floor(Math.random() * wordDatabase.easy.length)];
      } else if (rand < 0.8) {
        // 50% 中等词 (0.3 + 0.5 = 0.8)
        word = wordDatabase.medium[Math.floor(Math.random() * wordDatabase.medium.length)];
      } else {
        // 20% 困难词
        word = wordDatabase.hard[Math.floor(Math.random() * wordDatabase.hard.length)];
      }
      return word;
    }
    
    // 原有的级别模式逻辑保持不变
    if (gameState.level === 1) {
      if (Math.random() < 0.1 && gameState.usedMediumWords.size < wordDatabase.medium.length) {
        do {
          word = wordDatabase.medium[Math.floor(Math.random() * wordDatabase.medium.length)];
        } while (gameState.usedMediumWords.has(word));
        gameState.usedMediumWords.add(word);
      } else {
        if (gameState.usedEasyWords.size >= wordDatabase.easy.length) {
          gameState.level = 2;
          gameState.levelStarted = false;
          return this.getRandomWord();
        }
        do {
          word = wordDatabase.easy[Math.floor(Math.random() * wordDatabase.easy.length)];
        } while (gameState.usedEasyWords.has(word));
        gameState.usedEasyWords.add(word);
      }
    } else if (gameState.level === 2) {
      if (Math.random() < 0.1 && gameState.usedHardWords.size < wordDatabase.hard.length) {
        do {
          word = wordDatabase.hard[Math.floor(Math.random() * wordDatabase.hard.length)];
        } while (gameState.usedHardWords.has(word));
        gameState.usedHardWords.add(word);
      } else {
        if (gameState.usedMediumWords.size >= wordDatabase.medium.length) {
          gameState.level = 3;
          gameState.levelStarted = false;
          return this.getRandomWord();
        }
        do {
          word = wordDatabase.medium[Math.floor(Math.random() * wordDatabase.medium.length)];
        } while (gameState.usedMediumWords.has(word));
        gameState.usedMediumWords.add(word);
      }
    } else if (gameState.level === 3) {
      if (gameState.usedHardWords.size >= wordDatabase.hard.length) {
        gameState.gameCompleted = true;
        return null;
      }
      do {
        word = wordDatabase.hard[Math.floor(Math.random() * wordDatabase.hard.length)];
      } while (gameState.usedHardWords.has(word));
      gameState.usedHardWords.add(word);
    }
    return word;
  }

  getWordColor() {
    const colors = ['#2563eb', '#2f6f73', '#b45309', '#be123c', '#6d28d9', '#047857'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    const speedMultiplier = gameState.easyMode ? 0.55 : 1;
    this.y += this.speed * speedMultiplier;
  }

  draw() {
    const ctx = getCtx();
    if (!ctx) return;

    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 4;
    ctx.font = `700 ${this.fontSize}px Inter, system-ui, sans-serif`;

    const totalWidth = ctx.measureText(this.word).width;
    const startX = this.x - totalWidth / 2;

    if (this.progress > 0) {
      ctx.fillStyle = '#2f946b';
      ctx.textAlign = 'left';
      const partialWord = this.word.substring(0, this.progress);
      ctx.fillText(partialWord, startX, this.y);
    }

    ctx.fillStyle = this.color;
    const remainingWord = this.word.substring(this.progress);
    const offsetX = ctx.measureText(this.word.substring(0, this.progress)).width;
    ctx.fillText(remainingWord, startX + offsetX, this.y);
    ctx.restore();
  }

  checkMatch(typedWord) {
    if (this.word.startsWith(typedWord)) {
      this.progress = typedWord.length;
      if (typedWord === this.word) {
        this.matched = true;
        return 'complete';
      }
      return 'partial';
    }
    return 'none';
  }
}

if (typeof window !== 'undefined') {
  window.FallingWord = FallingWord;
}

export function spawnWord() {
  if (gameState.gameCompleted) return;
  if (gameState.spellingMode && gameState.customWordCursor >= gameState.customWords.length) return;

  const minWords = 3;
  const maxWords = 5;

  if (fallingWords.length < minWords) {
    const newWord = new FallingWord();
    if (newWord.word) fallingWords.push(newWord);
    return;
  }

  if (fallingWords.length < maxWords) {
    const spawnRate = 0.025 + gameState.level * 0.008;
    if (Math.random() < spawnRate) {
      const newWord = new FallingWord();
      if (newWord.word) fallingWords.push(newWord);
    }
  }
}

if (typeof window !== 'undefined') {
  window.spawnWord = spawnWord;
}
