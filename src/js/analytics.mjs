const VISIT_KEY = 'mySpellingGameVisitHistory';
const SESSION_KEY = 'mySpellingGameReturnVisitSent';

const EVENT_PARAMS = {
  word_list_created: ['mode', 'word_count', 'locale', 'shared_link', 'entry_page'],
  game_completed: ['mode', 'word_count', 'correct_count', 'missed_count', 'accuracy', 'duration_seconds', 'replay_round'],
  practice_link_copied: ['mode', 'word_count', 'locale'],
  missed_words_replayed: ['mode', 'word_count', 'locale'],
  word_completed: ['mode', 'word_length', 'correct'],
  word_missed: ['mode', 'word_length', 'correct'],
  return_visit: ['days_since_last_visit', 'visit_count_range'],
  teacher_signup_started: [],
  teacher_signup_completed: [],
  assignment_created: ['mode', 'word_count'],
  assignment_link_copied: ['mode', 'word_count'],
  assignment_opened: ['mode', 'word_count'],
  assignment_completed: ['mode', 'word_count', 'accuracy_range', 'duration_range'],
  assignment_abandoned: ['mode', 'word_count'],
  upgrade_viewed: [],
  checkout_started: ['billing_interval'],
  subscription_started: ['billing_interval'],
};

export function cleanPageLocation(locationLike) {
  const location = locationLike || (typeof window !== 'undefined' ? window.location : null);
  if (!location) return '';
  if (typeof location === 'string') {
    const url = new URL(location, 'https://myspellinggame.com');
    return `${url.origin}${url.pathname}`;
  }
  return `${location.origin || ''}${location.pathname || '/'}`;
}

export function sanitizeEventParams(name, params = {}) {
  const allowed = EVENT_PARAMS[name] || [];
  return Object.fromEntries(allowed
    .filter((key) => params[key] !== undefined)
    .map((key) => [key, params[key]]));
}

export function pageLocale() {
  if (typeof document === 'undefined') return 'en';
  return document.documentElement.lang || 'en';
}

export function entryPage() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, sanitizeEventParams(name, params));
}

function visitRange(count) {
  if (count <= 2) return '2';
  if (count <= 5) return '3-5';
  if (count <= 10) return '6-10';
  return '11+';
}

export function initReturnVisit(now = Date.now()) {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    sessionStorage.setItem(SESSION_KEY, '1');
    const previous = JSON.parse(localStorage.getItem(VISIT_KEY) || 'null');
    const count = Math.max(0, Number(previous?.count) || 0) + 1;
    if (previous?.lastVisit) {
      const days = Math.max(0, Math.floor((now - Number(previous.lastVisit)) / 86400000));
      trackEvent('return_visit', {
        days_since_last_visit: days,
        visit_count_range: visitRange(count),
      });
    }
    localStorage.setItem(VISIT_KEY, JSON.stringify({ lastVisit: now, count }));
  } catch (_) {
    // Storage can be unavailable; analytics must never block the game.
  }
}

if (typeof window !== 'undefined') {
  window.MySpellingAnalytics = {
    cleanPageLocation,
    sanitizeEventParams,
    trackEvent,
    initReturnVisit,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initReturnVisit(), { once: true });
  else initReturnVisit();
}
