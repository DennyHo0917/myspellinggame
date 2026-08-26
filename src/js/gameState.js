// 游戏状态桥接模块

function createInitialState() {
  return {
    mode: (typeof window !== 'undefined' && window.currentMode) || 'level',
    score: 0,
    level: 1,
    lives: 3,
    wordsTyped: 0,
    totalChars: 0,
    correctChars: 0,
    startTime: Date.now(),
    gameRunning: true,
    combo: 0,
    maxCombo: 0,
    missedWords: 0,
    maxMisses: ((typeof window !== 'undefined' && window.currentMode) === 'practice') ? Number.MAX_SAFE_INTEGER : 5,
    // 关卡系统
    usedEasyWords: new Set(),
    usedMediumWords: new Set(),
    usedHardWords: new Set(),
    levelStarted: false,
    gameCompleted: false,
    gameStarted: false,
    // Practice assist
    easyMode: false,
    practiceDuration: 180, // 秒，默认 3 分钟
    practiceEndTime: null,
    practiceDifficulty: 1,
    practiceSpeed: 1,
    // --- Tournament mode ---
    tournamentDuration: 120, // 秒，默认 2 分钟
    tournamentEndTime: null,
    practiceMode: 'dictation',
    spellingMode: false,
    customWords: [],
    exampleSentences: {},
    customWordCursor: 0,
    missedWordList: [],
    hearWords: false,
    spellingRoundComplete: false,
    spellingWordsProcessed: 0,
    dictationSession: null,
    dictationSummary: null,
    replayRound: false,
  };
}

export const gameState = typeof window !== 'undefined' && window.gameState
  ? window.gameState
  : createInitialState();

export const GameMode = {
  LEVEL: 'level',
  PRACTICE: 'practice',
  TOURNAMENT: 'tournament',
  SPELLING: 'spelling',
};

export function resetGameState() {
  const fresh = createInitialState();
  // Preserve current mode if already set on window
  if (typeof window !== 'undefined' && window.currentMode) {
    fresh.mode = window.currentMode;
  }
  Object.keys(gameState).forEach((k) => delete gameState[k]);
  Object.assign(gameState, fresh);
}

// 简易绑定到旧版循环/初始化函数
const bind = (name) =>
  typeof window !== 'undefined' && typeof window[name] === 'function' ? window[name] : () => {};

export const initGame = bind('initGame');
export const gameLoop = bind('gameLoop');
export const resetGame = bind('resetGame'); // 若未来实现

// 暴露到全局，兼容旧代码
if (typeof window !== 'undefined') {
  window.gameState = gameState;
  window.resetGame = resetGameState;
}
