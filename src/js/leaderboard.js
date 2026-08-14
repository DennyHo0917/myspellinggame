// 排行榜功能模块化实现

const getKey = () => {
  if (typeof window !== 'undefined' && window.currentMode === 'tournament') {
    return 'mySpellingGameTournamentLeaderboard';
  }
  return 'mySpellingGameLeaderboard';
};

const LEADERBOARD_KEY = getKey();
let currentPlayerEntry = null;

export function getLeaderboard() {
  const saved = localStorage.getItem(getKey());
  return saved ? JSON.parse(saved) : [];
}

export function saveLeaderboard(list) {
  localStorage.setItem(getKey(), JSON.stringify(list));
}

export function addToLeaderboard(name, score, level, wpm, accuracy, missed) {
  const leaderboard = getLeaderboard();

  // 将字符串转为数值
  const numWpm = typeof wpm === 'string' ? parseFloat(wpm) : wpm;
  const numAcc = typeof accuracy === 'string' ? parseFloat(accuracy) : accuracy;
  const numMissed = typeof missed === 'number' ? missed : 0;

  /* 综合评分公式：
     - 基础得分占 60%
     - WPM 乘 10 占约 30%
     - Accuracy 乘 5 占约 10%
     - 每 miss 扣 20 分
     可根据需要再调权重。
  */
  const totalScore = Math.round(score * 0.6 + numWpm * 10 + numAcc * 5 - numMissed * 20);

  const entry = {
    name: name || 'Anonymous',
    totalScore,
    typedScore: score,
    level,
    wpm: numWpm,
    accuracy: numAcc,
    missed: numMissed,
    date: new Date().toLocaleDateString(),
  };
  leaderboard.push(entry);
  leaderboard.sort((a, b) => (b.totalScore ?? b.score) - (a.totalScore ?? a.score));
  leaderboard.splice(10);
  saveLeaderboard(leaderboard);
  currentPlayerEntry = entry;
  return entry;
}

export function isHighScore(totalScore) {
  const leaderboard = getLeaderboard();
  if (leaderboard.length < 10) return true;
  const last = leaderboard[leaderboard.length - 1];
  const lastScore = last.totalScore ?? last.score;
  return totalScore > lastScore;
}

function createEntryDiv(entry, index) {
  const div = document.createElement('div');
  div.className = 'leaderboard-entry';
  if (
    currentPlayerEntry &&
    entry.name === currentPlayerEntry.name &&
    (entry.totalScore ?? entry.score) === (currentPlayerEntry.totalScore ?? currentPlayerEntry.score) &&
    entry.date === currentPlayerEntry.date
  ) {
    div.classList.add('current-player');
  }
  const displayScore = entry.totalScore !== undefined ? entry.totalScore : entry.score;
  div.innerHTML = `
    <div class="entry-rank">#${index + 1}</div>
    <div class="entry-name">${entry.name}</div>
    <div class="entry-score">${displayScore}</div>`;
  return div;
}

export function showLeaderboard() {
  const leaderboardEl = document.getElementById('leaderboard');
  const listEl = document.getElementById('leaderboard-list');
  if (!leaderboardEl || !listEl) return;

  const data = getLeaderboard();
  listEl.innerHTML = '';
  if (data.length === 0) {
    listEl.innerHTML = '<div class="empty-leaderboard">No scores yet. Be the first to play!</div>';
  } else {
    data.forEach((entry, idx) => listEl.appendChild(createEntryDiv(entry, idx)));
  }

  document.getElementById('game-over')?.style && (document.getElementById('game-over').style.display = 'none');
  leaderboardEl.style.display = 'flex';
}

export function closeLeaderboard() {
  const leaderboardEl = document.getElementById('leaderboard');
  if (leaderboardEl) leaderboardEl.style.display = 'none';
  const gameOver = document.getElementById('game-over');
  if (gameOver) gameOver.style.display = 'flex';
}

export const leaderboard = {
  getLeaderboard,
  saveLeaderboard,
  addToLeaderboard,
  showLeaderboard,
  closeLeaderboard,
  isHighScore,
};

// 同步到全局，兼容旧代码
if (typeof window !== 'undefined') {
  Object.assign(window, leaderboard);
  window.leaderboardBridge = leaderboard;
  window.LEADERBOARD_KEY = getKey();
  window.currentPlayerEntry = currentPlayerEntry;
}
