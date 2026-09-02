const VISIT_KEY = "mySpellingGameVisitHistory";
const SESSION_KEY = "mySpellingGameReturnVisitSent";
const ASSIGNMENT_ENTRY_POINT_KEY = "mySpellingAssignmentEntryPoint";
const ASSIGNMENT_ENTRY_POINTS = new Set([
  "copy_track",
  "assign_homework",
  "practice_result",
  "workspace",
]);

const EVENT_PARAMS = {
  word_list_created: [
    "mode",
    "word_count",
    "locale",
    "shared_link",
    "entry_page",
  ],
  practice_started: ["mode", "word_count"],
  game_completed: [
    "mode",
    "word_count",
    "correct_count",
    "missed_count",
    "accuracy",
    "duration_seconds",
    "replay_round",
  ],
  signup_cta_viewed: [
    "mode",
    "word_count",
    "missed_count",
    "replay_round",
    "cta_location",
  ],
  practice_share_options_viewed: ["mode", "word_count", "locale"],
  practice_link_copied: ["mode", "word_count", "locale", "share_type"],
  missed_words_replayed: ["mode", "word_count", "locale"],
  word_completed: ["mode", "word_length", "correct"],
  word_missed: ["mode", "word_length", "correct"],
  return_visit: ["days_since_last_visit", "visit_count_range"],
  teacher_auth_started: ["entry_point"],
  teacher_auth_completed: ["entry_point"],
  assignment_entry_clicked: ["mode", "word_count", "entry_point"],
  assignment_created: ["mode", "word_count", "entry_point"],
  assignment_results_viewed: ["mode", "word_count"],
  assignment_link_copied: ["mode", "word_count"],
  assignment_opened: ["mode", "word_count"],
  assignment_completed: [
    "mode",
    "word_count",
    "accuracy_range",
    "duration_range",
  ],
  assignment_abandoned: ["mode", "word_count"],
  upgrade_viewed: [],
  upgrade_clicked: ["plan", "billing_interval"],
  upgrade_cta_clicked: ["cta_location"],
  usage_limit_reached: ["limit_type"],
  checkout_started: ["plan", "billing_interval"],
  checkout_redirected: ["plan", "billing_interval"],
  subscription_started: ["plan", "billing_interval"],
  purchase: ["plan", "billing_interval", "value", "currency"],
  word_limit_hit: ["limit", "account_tier", "word_count_range", "action"],
  sign_up: ["provider", "workspace_type"],
  learner_created: [],
  saved_list_created: [],
  locked_feature_attempted: ["feature", "current_plan"],
  checkout_cancelled: ["plan", "billing_interval"],
  checkout_failed: ["plan", "billing_interval", "error_code"],
  typing_chase_selected: ["locale"],
  typing_chase_auth_required: ["locale"],
  typing_chase_mode_selected: ["chase_mode", "locale"],
  typing_chase_started: ["chase_mode", "locale"],
  typing_chase_completed: [
    "chase_mode",
    "outcome",
    "wpm_range",
    "accuracy_range",
    "duration_range",
    "locale",
  ],
  typing_chase_result_shared: ["outcome", "share_method", "locale"],
};

const LIMIT_TYPES = {
  active_assignment_limit: "active_assignments",
  monthly_submission_limit: "monthly_submissions",
  student_limit: "student_nicknames",
  saved_list_limit: "saved_lists",
  learner_limit: "learner_profiles",
};
const reportedLimits = new Set();
const reportedLockedFeatures = new Set();
const reportedCheckoutCancellations = new Set();
const LOCKED_FEATURE_ERRORS = {
  active_assignment_limit: "active_assignments",
  monthly_submission_limit: "monthly_submissions",
  word_limit: "word_limit",
  saved_list_limit: "saved_list_limit",
  learner_limit: "learner_limit",
  smart_review_required: "smart_review",
  sentence_library_required: "example_sentences",
};

export function cleanPageLocation(locationLike) {
  const location =
    locationLike || (typeof window !== "undefined" ? window.location : null);
  if (!location) return "";
  if (typeof location === "string") {
    const url = new URL(location, "https://myspellinggame.com");
    return `${url.origin}${url.pathname}`;
  }
  return `${location.origin || ""}${location.pathname || "/"}`;
}

export function sanitizeEventParams(name, params = {}) {
  const allowed = EVENT_PARAMS[name] || [];
  return Object.fromEntries(
    allowed
      .filter((key) => params[key] !== undefined)
      .map((key) => [key, params[key]]),
  );
}

export function getAssignmentEntryPoint() {
  try {
    const value = sessionStorage.getItem(ASSIGNMENT_ENTRY_POINT_KEY);
    return ASSIGNMENT_ENTRY_POINTS.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function setAssignmentEntryPoint(value) {
  if (!ASSIGNMENT_ENTRY_POINTS.has(value)) return false;
  try {
    sessionStorage.setItem(ASSIGNMENT_ENTRY_POINT_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export function clearAssignmentEntryPoint() {
  try {
    sessionStorage.removeItem(ASSIGNMENT_ENTRY_POINT_KEY);
  } catch {}
}

export function pageLocale() {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang || "en";
}

export function entryPage() {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

export function trackEvent(name, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function")
    return;
  window.gtag("event", name, sanitizeEventParams(name, params));
}

export function trackUsageLimit(errorCode) {
  const limitType = LIMIT_TYPES[errorCode];
  if (!limitType || reportedLimits.has(limitType)) return;
  reportedLimits.add(limitType);
  trackEvent("usage_limit_reached", { limit_type: limitType });
}

export function trackLockedFeature(feature, currentPlan = "free") {
  if (!feature || reportedLockedFeatures.has(feature)) return;
  reportedLockedFeatures.add(feature);
  trackEvent("locked_feature_attempted", {
    feature,
    current_plan: currentPlan || "free",
  });
}

export function trackLockedFeatureError(errorCode, currentPlan = "free") {
  const feature = LOCKED_FEATURE_ERRORS[errorCode];
  if (feature) trackLockedFeature(feature, currentPlan);
}

export function trackCheckoutCancelled(plan, billingInterval) {
  const key = `${plan || "unknown"}:${billingInterval || "unknown"}`;
  if (reportedCheckoutCancellations.has(key)) return;
  reportedCheckoutCancellations.add(key);
  trackEvent("checkout_cancelled", {
    plan: plan || "unknown",
    billing_interval: billingInterval || "unknown",
  });
}

function visitRange(count) {
  if (count <= 2) return "2";
  if (count <= 5) return "3-5";
  if (count <= 10) return "6-10";
  return "11+";
}

export function initReturnVisit(now = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    sessionStorage.setItem(SESSION_KEY, "1");
    const previous = JSON.parse(localStorage.getItem(VISIT_KEY) || "null");
    const count = Math.max(0, Number(previous?.count) || 0) + 1;
    if (previous?.lastVisit) {
      const days = Math.max(
        0,
        Math.floor((now - Number(previous.lastVisit)) / 86400000),
      );
      trackEvent("return_visit", {
        days_since_last_visit: days,
        visit_count_range: visitRange(count),
      });
    }
    localStorage.setItem(VISIT_KEY, JSON.stringify({ lastVisit: now, count }));
  } catch (_) {
    // Storage can be unavailable; analytics must never block the game.
  }
}

if (typeof window !== "undefined") {
  window.MySpellingAnalytics = {
    cleanPageLocation,
    sanitizeEventParams,
    trackEvent,
    initReturnVisit,
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => initReturnVisit(), {
      once: true,
    });
  else initReturnVisit();
}
