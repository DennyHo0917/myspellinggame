import './gameState.js';
import { getPageLocale } from './pageLocale.js';
import './wordDatabase.js';
import './domRefs.js';
import './screens.js';
import './spellingMode.js';
import './dictationMode.js';
import './words.js';
import './input.js';
import { initBackgroundParticles, resizeCanvas } from './rendering.js';
import { initAudio } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
  window.currentLanguage = getPageLocale();
  initAudio();
  resizeCanvas();
  initBackgroundParticles();
  window.addEventListener('resize', resizeCanvas);
});
