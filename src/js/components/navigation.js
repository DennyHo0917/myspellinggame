// 共享导航组件 - 统一管理顶部导航栏

/**
 * 生成顶部导航栏HTML
 * @returns {string} 导航栏HTML字符串
 */
export function generateTopNavHTML() {
  return `
    <div class="top-right-nav">
        <div class="language-switcher">
            <button class="lang-btn" onclick="toggleLanguageMenu()" id="lang-toggle" data-i18n-title="changeLanguage" title="Change Language">🌐</button>
            <div class="lang-menu" id="lang-menu">
                <div class="lang-option" onclick="switchLanguage('en')">🇺🇸 English</div>
                <div class="lang-option" onclick="switchLanguage('zh-tw')">🇹🇼 繁體中文</div>
                <div class="lang-option" onclick="switchLanguage('zh-cn')">🇨🇳 简体中文</div>
                <div class="lang-option" onclick="switchLanguage('ja')">🇯🇵 日本語</div>
                <div class="lang-option" onclick="switchLanguage('ko')">🇰🇷 한국어</div>
                <div class="lang-option" onclick="switchLanguage('de')">🇩🇪 Deutsch</div>
                <div class="lang-option" onclick="switchLanguage('fr')">🇫🇷 Français</div>
                <div class="lang-option" onclick="switchLanguage('es')">🇪🇸 Español</div>
                <div class="lang-option" onclick="switchLanguage('it')">🇮🇹 Italiano</div>
                <div class="lang-option" onclick="switchLanguage('ru')">🇷🇺 Русский</div>
                <div class="lang-option" onclick="switchLanguage('pt')">🇵🇹 Português</div>
            </div>
        </div>
        <div class="mode-switcher">
            <button class="lang-btn" onclick="toggleModeMenu()" id="mode-toggle" data-i18n-title="selectMode" title="Select Mode">🕹️</button>
            <div class="lang-menu" id="mode-menu">
                <div class="lang-option" onclick="chooseMode('level')" data-i18n="levelModeTitle">🎮 Level Mode</div>
                <div class="lang-option" onclick="chooseMode('practice')" data-i18n="practiceModeTitle">🎓 Practice Mode</div>
                <div class="lang-option" onclick="chooseMode('tournament')" data-i18n="tournamentModeTitle">🏆 Tournament Mode</div>
            </div>
        </div>
        <button class="share-btn" onclick="shareToTwitterLegacy()" data-i18n-title="shareOnTwitter" title="Share on X (Twitter)">📤</button>
        <button class="privacy-btn" onclick="showPrivacyPolicyLegacy()" data-i18n-title="privacyPolicyTooltip" title="Privacy Policy">🔒</button>
        <button class="sound-btn" onclick="toggleSound()" id="sound-toggle" data-i18n-title-dynamic="sound">Sound</button>
    </div>
  `;
}

/**
 * 生成游戏说明HTML
 * @returns {string} 游戏说明HTML字符串
 */
export function generateGameInstructionsHTML() {
  return `
    <div class="game-instructions">
        <div class="instructions-content">
            <h3>How to Play</h3>
            <p>• Type the falling words before they reach the bottom</p>
            <p>• Press <kbd>Enter</kbd> or <kbd>Space</kbd> to submit your word</p>
            <p>• Build combos by typing words consecutively</p>
            <p>• Higher levels bring faster and more challenging words</p>
            <p>• You have 5 chances to miss words before game over</p>
            <h4>Easy Mode</h4>
            <p>Turn on Easy mode before playing to slow down falling words.</p>
        </div>
    </div>
  `;
}

/**
 * 生成道具容器HTML
 * @returns {string} 道具容器HTML字符串
 */
export function generatePowerUpsContainerHTML() {
  return `
    <div class="power-ups-container practice-proof">
        <div class="practice-proof-copy">
            <h3>Why It Works</h3>
            <p>Exact weekly words, not a random word bank.</p>
            <p>Replay practice focuses on missed words.</p>
            <p>Easy mode slows the round without changing the spelling rules.</p>
        </div>
    </div>
  `;
}

/**
 * 生成完整的左侧面板HTML
 * @returns {string} 左侧面板HTML字符串
 */
export function generateLeftPanelHTML() {
  return `
    <div class="left-panel">
        ${generateGameInstructionsHTML()}
        ${generatePowerUpsContainerHTML()}
    </div>
  `;
}

/**
 * 注入导航组件到页面
 * @param {string} containerSelector - 容器选择器
 */
export function injectTopNavigation(containerSelector = 'body') {
  const container = document.querySelector(containerSelector);
  if (container) {
    const existingNav = container.querySelector('.top-right-nav');
    if (existingNav) {
      existingNav.remove();
    }
    container.insertAdjacentHTML('afterbegin', generateTopNavHTML());
  }
}

/**
 * 注入左侧面板到页面
 * @param {string} containerSelector - 容器选择器
 */
export function injectLeftPanel(containerSelector = '.main-content-wrapper') {
  const container = document.querySelector(containerSelector);
  if (container) {
    const existingPanel = container.querySelector('.left-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    container.insertAdjacentHTML('afterbegin', generateLeftPanelHTML());
  }
}

// 暴露到全局供旧代码使用
if (typeof window !== 'undefined') {
  window.navigationComponents = {
    generateTopNavHTML,
    generateGameInstructionsHTML,
    generatePowerUpsContainerHTML,
    generateLeftPanelHTML,
    injectTopNavigation,
    injectLeftPanel
  };
} 

// 简易 Cookie 同意提示（默认显示一次）
if (typeof window !== 'undefined') {
  (function initCookieConsent() {
    try {
      if (localStorage.getItem('mySpellingGameCookieConsent') === '1') return;
    } catch (e) {}
    const bar = document.createElement('div');
    bar.id = 'cookie-consent-bar';
    bar.style.position = 'fixed';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.bottom = '0';
    bar.style.zIndex = '9999';
    bar.style.background = '#ffffff';
    bar.style.color = '#17202a';
    bar.style.padding = '10px 14px';
    bar.style.fontFamily = "'Inter', system-ui, sans-serif";
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.justifyContent = 'space-between';
    bar.style.gap = '10px';
    const text = document.createElement('div');
    text.style.fontSize = '14px';
    bar.style.borderTop = '1px solid #dce8e4';
    bar.style.boxShadow = '0 -10px 24px rgba(39,62,70,0.08)';
    text.innerHTML = 'We use cookies for analytics and ads (via Google). <a href="/privacy.html" style="color:#2f6f73">Learn more</a>.';
    const btn = document.createElement('button');
    btn.textContent = 'OK';
    btn.style.border = 'none';
    btn.style.padding = '6px 12px';
    btn.style.borderRadius = '6px';
    btn.style.background = '#2f6f73';
    btn.style.color = '#ffffff';
    btn.style.cursor = 'pointer';
    btn.onclick = () => {
      try { localStorage.setItem('mySpellingGameCookieConsent', '1'); } catch (e) {}
      bar.remove();
    };
    bar.appendChild(text);
    bar.appendChild(btn);
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(bar);
    });
  })();
}
