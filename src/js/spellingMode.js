import { savePendingCheckout } from "./pendingCheckout.mjs";
import {
  clearPendingPhotoImport,
  readPendingPhotoImport,
  savePendingPhotoImport,
} from "./pendingPhotoImport.mjs";
import {
  clearPendingSmartReview,
  readPendingSmartReview,
  savePendingSmartReview,
} from "./pendingSmartReview.mjs";
import {
  renderSmartReviewPreview,
  uniquePreviewWords,
} from "./smartReviewPreview.mjs";
import { saveTrackingEntry } from "./trackingDraft.mjs";
import {
  saveUpgradeReturn,
  readUpgradeReturn,
  upgradeReturnFor,
  clearUpgradeReturn,
} from "./upgradeReturn.mjs";
import { upgradeSelection } from "./upgradeSelection.mjs";
import { gameState } from "./gameState.js";
import { getPageLocale, t } from "./pageLocale.js";
import {
  ANONYMOUS_WORD_LIMIT,
  analyzeWords,
  customTypingRoundComplete,
  alignExampleSentences,
  mergeLibrarySentences,
  parseWords,
  SAMPLE_EXAMPLE_SENTENCES,
  SAMPLE_WORDS,
  takeCustomWord,
  typingCompletionStats,
} from "./spellingCore.mjs";
import { speakWord as speak } from "./speech.js";
import {
  entryPage,
  capturePracticeSource,
  pageLocale,
  setAssignmentEntryPoint,
  trackEvent,
  trackLockedFeature,
  trackPremiumFeatureUsed,
} from "./analytics.mjs";
import { buildShareHash, readShareState } from "./shareState.mjs";
import { productMessage, productPagePath } from "./productLocale.mjs";
import { featureTrialActive, featureTrialLabel } from "./featureTrial.mjs";

const STORAGE_KEY = "mySpellingGameSpellingWords";
const SENTENCES_STORAGE_KEY = "mySpellingGameExampleSentences";
const HEAR_KEY = "mySpellingGameHearWords";
const LEGACY_READ_KEY = "mySpellingGameReadWords";
const EASY_KEY = "mySpellingGameEasyMode";
const PENDING_UPGRADE_FEATURE_KEY = "pendingUpgradeFeature";
let signupCtaViewTracked = false;
let shareOptionsViewTracked = false;
let accountPromise;
let accountState;
let tesseractPromise;
let wordLimitHitTracked = false;
let copyToastTimer;
let previousWordText = "";
let sentenceFillGeneration = 0;

export { parseWords };

function upgradeLink(
  feature,
  plan,
  interval,
  primary = true,
  prominent = primary,
) {
  const link = document.createElement("a");
  link.className = `button-link contextual-paywall-cta${prominent ? " paywall-primary" : " button-secondary"}`;
  const query = new URLSearchParams({ plan, interval });
  link.href = `${productPagePath("pricing", getPageLocale())}?${query}`;
  link.textContent = primary
    ? productMessage(
        feature === "photo_import"
          ? "unlockPhotoImport"
          : feature === "smart_review"
            ? "unlockSmartReview"
            : "unlockWordLimit",
        {},
        getPageLocale(),
      )
    : productMessage(`${plan}Plan`, {}, getPageLocale());
  link.addEventListener("click", () => {
    saveUpgradeReturn(feature, accountState?.user?.id, {
      words: textarea()?.value || "",
      sentences: sentenceTextarea()?.value || "",
      mode:
        document.querySelector('input[name="practice-mode"]:checked')?.value ||
        "dictation",
    });
    try {
      savePendingCheckout(plan, interval);
      sessionStorage.setItem("pendingCheckoutInterval", interval);
      sessionStorage.setItem("pendingCheckoutLocale", getPageLocale());
      sessionStorage.setItem(PENDING_UPGRADE_FEATURE_KEY, feature);
    } catch {}
    trackEvent("upgrade_cta_clicked", {
      cta_location: feature,
      plan,
      billing_interval: interval,
    });
  });
  return link;
}

function appendContextualPaywall(
  notice,
  feature,
  value,
  { account = accountState, freeCta = false } = {},
) {
  const { plan, interval } = upgradeSelection(account);
  const benefit = document.createElement("span");
  benefit.className = "contextual-paywall-benefit";
  benefit.textContent = value;
  const price = document.createElement("strong");
  price.className = "contextual-paywall-price";
  price.textContent = productMessage(
    `${plan}Upgrade${interval === "year" ? "Yearly" : ""}Price`,
    {},
    getPageLocale(),
  );
  const actions = document.createElement("span");
  actions.className = "contextual-paywall-actions";
  actions.append(upgradeLink(feature, plan, interval));
  if (plan === "parent")
    actions.append(upgradeLink(feature, "teacher", interval, false));
  if (freeCta) {
    const free = document.createElement("a");
    free.href = `/workspace?lang=${encodeURIComponent(getPageLocale())}#teacher-sign-in`;
    free.textContent =
      feature === "photo_import"
        ? t("photoImportFreeTrialCta")
        : t("continueFree25");
    actions.append(free);
  }
  notice.append(benefit, price, actions);
}

function textarea() {
  return document.getElementById("custom-word-list");
}

function sentenceTextarea() {
  return document.getElementById("custom-example-sentences");
}

function photoWordsText(value) {
  return Array.isArray(value) ? value.join("\n") : String(value || "");
}

function rememberPendingPhotoImport(rawText, importId, resumeAuth) {
  const text = String(rawText ?? "");
  if (!text.trim()) {
    clearPendingPhotoImport();
    return;
  }
  const existing = readPendingPhotoImport();
  savePendingPhotoImport({
    words: text,
    importId,
    locale: getPageLocale(),
    resumeAuth,
    createdAt:
      existing?.importId === importId ? existing.createdAt : Date.now(),
  });
}

function clearSmartReviewQuery() {
  try {
    const url = new URL(location.href);
    if (url.searchParams.get("smart_review") !== "1") return;
    url.searchParams.delete("smart_review");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {}
}

function rememberPendingSmartReview(rawText, resumeAuth) {
  const words = uniquePreviewWords(rawText, 20);
  if (!words.length) {
    clearPendingSmartReview();
    return;
  }
  const existing = readPendingSmartReview();
  savePendingSmartReview({
    words: words.join("\n"),
    locale: getPageLocale(),
    target: "practice",
    resumeAuth,
    createdAt:
      existing?.target === "practice" ? existing.createdAt : Date.now(),
  });
}

function smartReviewPreviewCopy() {
  return {
    title: t("smartReviewPreviewTitle"),
    help: t("smartReviewPreviewHelp"),
    prompt: t("smartReviewPrompt"),
    hear: t("smartReviewHear"),
    check: t("smartReviewCheck"),
    progress: (current, total) => t("dictationProgress", { current, total }),
    correct: t("answerCorrect"),
    incorrect: (word) => t("answerIncorrect", { word }),
    required: t("answerRequired"),
    upNext: t("smartReviewUpNext"),
    close: t("smartReviewClose"),
    speechUnsupported: t("speechUnsupported"),
  };
}

function appendSmartReviewPaywall(notice, account, words) {
  const { plan, interval } = upgradeSelection(account);
  const signedOut = !account;
  if (signedOut) {
    const keep = document.createElement("span");
    keep.className = "contextual-paywall-benefit";
    keep.textContent = t("smartReviewKeepBenefit");
    notice.append(keep);
  }
  const benefit = document.createElement("span");
  benefit.className = "contextual-paywall-benefit";
  benefit.textContent = t("smartReviewPreviewValue");
  const price = document.createElement("strong");
  price.className = "contextual-paywall-price";
  price.textContent = productMessage(
    `${plan}Upgrade${interval === "year" ? "Yearly" : ""}Price`,
    {},
    getPageLocale(),
  );
  const actions = document.createElement("span");
  actions.className = "contextual-paywall-actions";
  if (signedOut) {
    const signIn = document.createElement("a");
    signIn.className = "button-link contextual-paywall-cta paywall-primary";
    signIn.href = `/workspace?lang=${encodeURIComponent(getPageLocale())}#teacher-sign-in`;
    signIn.textContent = t("smartReviewKeepCta");
    signIn.addEventListener("click", () => {
      rememberPendingSmartReview(words.join("\n"), true);
    });
    actions.append(signIn);
    actions.append(upgradeLink("smart_review", plan, interval, true, false));
  } else actions.append(upgradeLink("smart_review", plan, interval));
  if (plan === "parent")
    actions.append(upgradeLink("smart_review", "teacher", interval, false));
  for (const link of actions.querySelectorAll('a[href*="pricing"]')) {
    link.addEventListener("click", () => {
      rememberPendingSmartReview(words.join("\n"), false);
    });
  }
  notice.append(benefit, price, actions);
}

function showSmartReviewPreview(rawWords, account, { trackPreview = true } = {}) {
  const host = document.querySelector(".spelling-builder");
  if (!host || readShareState(window.location).sharedLink) return;
  const words = uniquePreviewWords(rawWords, 20);
  if (!words.length) return;
  rememberPendingSmartReview(words.join("\n"), false);
  if (trackPreview) {
    trackEvent("smart_review_previewed", {
      locale: getPageLocale(),
      current_plan: account?.plan || "anonymous",
      outcome: "paywall",
    });
    trackLockedFeature("smart_review", account?.plan || "anonymous");
  }
  const paywall = document.createElement("div");
  paywall.className = "smart-review-paywall contextual-paywall";
  paywall.setAttribute("role", "status");
  appendSmartReviewPaywall(paywall, account, words);
  const panel = renderSmartReviewPreview(host, {
    words,
    copy: smartReviewPreviewCopy(),
    limit: 20,
    paywall,
    onHear: speak,
    onClose: () => clearPendingSmartReview(),
  });
  const banner = document.getElementById("last-missed-banner");
  if (panel && banner?.parentElement === host) banner.after(panel);
}

function resumePendingSmartReview(account) {
  clearSmartReviewQuery();
  const pending = readPendingSmartReview();
  if (!pending || pending.target !== "practice") return;
  if (readShareState(window.location).sharedLink) return;
  if (hasSmartReviewAccess(account)) {
    saveTrackingEntry(
      {
        words: pending.words,
        mode: "dictation",
        entryPoint: "workspace",
        intent: "smart_review",
      },
      account?.user?.id,
    );
    clearPendingSmartReview();
    window.location.href = `/workspace?lang=${encodeURIComponent(pending.locale || getPageLocale())}&review=1`;
    return;
  }
  if (pending.resumeAuth)
    savePendingSmartReview({ ...pending, resumeAuth: false });
  showSmartReviewPreview(pending.words, account, { trackPreview: false });
}

function clearPhotoImportQuery() {
  try {
    const url = new URL(location.href);
    if (url.searchParams.get("photo_import") !== "1") return;
    url.searchParams.delete("photo_import");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {}
}

function trackPhotoPreview(account, outcome) {
  trackEvent("photo_import_previewed", {
    locale: getPageLocale(),
    current_plan: account?.plan || "anonymous",
    outcome,
  });
}

function appendPhotoImportPaywall(notice, account, readWords, importId) {
  const { plan, interval } = upgradeSelection(account);
  const signedOut = !account;
  if (signedOut) {
    const keep = document.createElement("span");
    keep.className = "contextual-paywall-benefit";
    keep.textContent = t("photoImportKeepBenefit");
    notice.append(keep);
  }
  const benefit = document.createElement("span");
  benefit.className = "contextual-paywall-benefit";
  benefit.textContent = t("photoImportValue");
  const price = document.createElement("strong");
  price.className = "contextual-paywall-price";
  price.textContent = productMessage(
    `${plan}Upgrade${interval === "year" ? "Yearly" : ""}Price`,
    {},
    getPageLocale(),
  );
  const actions = document.createElement("span");
  actions.className = "contextual-paywall-actions";
  if (signedOut) {
    const signIn = document.createElement("a");
    signIn.className = "button-link contextual-paywall-cta paywall-primary";
    signIn.href = `/workspace?lang=${encodeURIComponent(getPageLocale())}#teacher-sign-in`;
    signIn.textContent = t("photoImportKeepCta");
    signIn.addEventListener("click", () => {
      rememberPendingPhotoImport(readWords(), importId, true);
    });
    actions.append(signIn);
    actions.append(upgradeLink("photo_import", plan, interval, true, false));
  } else actions.append(upgradeLink("photo_import", plan, interval));
  if (plan === "parent")
    actions.append(upgradeLink("photo_import", "teacher", interval, false));
  for (const link of actions.querySelectorAll('a[href*="pricing"]')) {
    link.addEventListener("click", () => {
      rememberPendingPhotoImport(readWords(), importId, false);
    });
  }
  notice.append(benefit, price, actions);
}

function showLockedPhotoPreview(
  rawText,
  account,
  importId = crypto.randomUUID(),
  { trackPreview = true } = {},
) {
  const field = textarea()?.closest(".word-entry-field");
  if (!field) return;
  const text = photoWordsText(rawText);
  field.querySelector(".photo-import-notice, .photo-import-review")?.remove();
  if (trackPreview) trackPhotoPreview(account, "paywall");
  trackEvent("photo_import_blocked", {
    current_plan: account?.plan || "anonymous",
    locale: getPageLocale(),
  });
  trackLockedFeature("photo_import", account?.plan || "anonymous");
  const review = document.createElement("div");
  review.className = "photo-import-review";
  const title = document.createElement("strong");
  title.textContent = t("photoImportPreviewTitle");
  const help = document.createElement("small");
  help.textContent = t("photoImportPreviewHelp");
  const input = document.createElement("textarea");
  input.id = "photo-import-review-words";
  input.rows = 5;
  input.value = text;
  rememberPendingPhotoImport(input.value, importId, false);
  input.addEventListener("input", () => {
    const existing = readPendingPhotoImport();
    rememberPendingPhotoImport(
      input.value,
      importId,
      existing?.importId === importId && existing.resumeAuth,
    );
  });
  const notice = document.createElement("small");
  notice.className =
    "photo-import-notice sentence-library-notice contextual-paywall";
  notice.setAttribute("role", "status");
  appendPhotoImportPaywall(notice, account, () => input.value, importId);
  const actions = document.createElement("div");
  actions.className = "photo-import-review-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "auto-sentence-btn";
  cancel.textContent = t("photoImportCancel");
  cancel.addEventListener("click", () => {
    clearPendingPhotoImport();
    review.remove();
  });
  actions.append(cancel);
  review.append(title, help, input, notice, actions);
  field.append(review);
}

function photoImportStatus(message) {
  const field = textarea()?.closest(".word-entry-field");
  if (!field) return;
  field.querySelector(".photo-import-notice, .photo-import-review")?.remove();
  const notice = document.createElement("small");
  notice.className = "photo-import-notice sentence-library-notice";
  notice.setAttribute("role", "status");
  notice.textContent = message;
  field.append(notice);
  return notice;
}

function loadTesseract() {
  if (!tesseractPromise) {
    const script = document.createElement("script");
    const loading = new Promise((resolve, reject) => {
      if (typeof window.Tesseract?.recognize === "function") {
        resolve(window.Tesseract);
        return;
      }
      script.src =
        "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      script.onload = () => {
        script.onload = null;
        script.onerror = null;
        if (typeof window.Tesseract?.recognize === "function")
          resolve(window.Tesseract);
        else reject(new Error("tesseract_unavailable"));
      };
      script.onerror = () => reject(new Error("tesseract_unavailable"));
      document.head.append(script);
    });
    tesseractPromise = loading.catch((error) => {
      script.onload = null;
      script.onerror = null;
      script.remove();
      tesseractPromise = undefined;
      throw error;
    });
  }
  return tesseractPromise;
}

function showPhotoImportRetry(file) {
  const notice = photoImportStatus(t("photoImportError"));
  if (!notice) return;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "auto-sentence-btn photo-import-retry";
  retry.textContent = t("photoImportRetry");
  retry.addEventListener("click", () => void importWordsFromPhoto(file));
  notice.append(" ", retry);
}

async function applyPhotoImportWords(rawText, importId) {
  const analysis = analyzeWords(rawText);
  if (
    !analysis.words.length ||
    analysis.invalid.length ||
    analysis.tooShort.length ||
    analysis.tooLong.length
  )
    return { invalid: true };
  try {
    if (!isPlusAccount(accountState)) {
      const response = await fetch("/api/photo-import/accept", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importId, words: rawText }),
      });
      if (!response.ok) {
        if (response.status === 403) {
          if (accountState?.featureTrial)
            accountState.featureTrial = {
              ...accountState.featureTrial,
              active: false,
            };
          showPracticeFeatureTrial(accountState);
          return { blocked: true };
        }
        return { error: true };
      }
      const result = await response.json().catch(() => ({}));
      if (accountState && result.featureTrial)
        accountState.featureTrial = result.featureTrial;
    }
  } catch {
    return { error: true };
  }
  const list = textarea();
  if (!list) return { error: true };
  list.value = analysis.words.join("\n");
  list.dispatchEvent(new Event("input", { bubbles: true }));
  clearPendingPhotoImport();
  const count = currentWords().length;
  if (count) trackPremiumFeatureUsed("photo_import", accountState, count);
  showPracticeFeatureTrial(accountState);
  return { ok: true };
}

function showPhotoImportReview(
  rawText,
  importId = crypto.randomUUID(),
  { trackPreview = true } = {},
) {
  const field = textarea()?.closest(".word-entry-field");
  if (!field) return;
  const text = photoWordsText(rawText);
  field.querySelector(".photo-import-notice, .photo-import-review")?.remove();
  if (trackPreview) trackPhotoPreview(accountState, "review");
  const review = document.createElement("div");
  review.className = "photo-import-review";
  const title = document.createElement("strong");
  title.textContent = t("photoImportReviewTitle");
  const trialNote = practiceFeatureTrialNote(accountState);
  const help = document.createElement("small");
  help.textContent = t("photoImportReviewHelp");
  const input = document.createElement("textarea");
  input.id = "photo-import-review-words";
  input.rows = 5;
  input.value = text;
  const actions = document.createElement("div");
  actions.className = "photo-import-review-actions";
  const use = document.createElement("button");
  use.type = "button";
  use.className = "auto-sentence-btn";
  use.textContent = t("photoImportUse");
  use.addEventListener("click", async () => {
    if (use.disabled) return;
    use.disabled = true;
    input.disabled = true;
    cancel.disabled = true;
    const result = await applyPhotoImportWords(input.value, importId);
    if (result.invalid) {
      help.textContent = t("invalidWords");
      use.disabled = false;
      input.disabled = false;
      cancel.disabled = false;
      return;
    }
    if (result.blocked) {
      showLockedPhotoPreview(input.value, accountState, importId, {
        trackPreview: false,
      });
      return;
    }
    if (!result.ok) {
      help.textContent = t("photoImportError");
      use.disabled = false;
      input.disabled = false;
      cancel.disabled = false;
      return;
    }
    review.remove();
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "auto-sentence-btn";
  cancel.textContent = t("photoImportCancel");
  cancel.addEventListener("click", () => {
    clearPendingPhotoImport();
    review.remove();
  });
  actions.append(use, cancel);
  review.append(title, ...(trialNote ? [trialNote] : []), help, input, actions);
  field.append(review);
}

async function importWordsFromPhoto(file) {
  const field = textarea()?.closest(".word-entry-field");
  if (!field) return;
  clearPendingPhotoImport();
  const notice = photoImportStatus(t("photoImportProcessing"));
  try {
    const [Tesseract, account] = await Promise.all([
      loadTesseract(),
      getAccount(),
    ]);
    const result = await Tesseract.recognize(file, "eng");
    const words = [
      ...new Set(
        (result.data?.text || "").match(/[A-Za-z]+(?:['’-][A-Za-z]+)?/g) || [],
      ),
    ];
    notice?.remove();
    if (!words.length) {
      photoImportStatus(t("photoImportNoWords"));
      return;
    }
    if (hasPhotoImportAccess(account)) showPhotoImportReview(words);
    else showLockedPhotoPreview(words, account);
  } catch {
    showPhotoImportRetry(file);
  }
}

async function resumePendingPhotoImport(account) {
  const pending = readPendingPhotoImport();
  let applyNow = pending?.resumeAuth === true;
  try {
    if (new URLSearchParams(location.search).get("photo_import") === "1")
      applyNow = true;
  } catch {}
  clearPhotoImportQuery();
  if (!pending) return;
  if (!hasPhotoImportAccess(account)) {
    if (pending.resumeAuth)
      savePendingPhotoImport({ ...pending, resumeAuth: false });
    showLockedPhotoPreview(pending.words, account, pending.importId, {
      trackPreview: false,
    });
    return;
  }
  if (!applyNow) {
    showPhotoImportReview(pending.words, pending.importId, {
      trackPreview: false,
    });
    return;
  }
  const result = await applyPhotoImportWords(pending.words, pending.importId);
  if (result.ok) return;
  if (result.blocked) {
    showLockedPhotoPreview(pending.words, account, pending.importId, {
      trackPreview: false,
    });
    return;
  }
  showPhotoImportReview(pending.words, pending.importId, {
    trackPreview: false,
  });
  const help = document.querySelector(".photo-import-review small");
  if (help)
    help.textContent = t(result.invalid ? "invalidWords" : "photoImportError");
}

export const LAST_MISSED_KEY = "mySpellingLastMissedWords";

function practiceTrialText(account) {
  return featureTrialLabel(
    account?.featureTrial,
    (key, vars) => t(key, vars),
    t("dateLocale"),
  );
}

function practiceFeatureTrialNote(account) {
  const text = practiceTrialText(account);
  if (!text) return null;
  const note = document.createElement("p");
  note.className = "feature-trial-note";
  note.textContent = text;
  return note;
}

function showPracticeFeatureTrial(account) {
  document.getElementById("feature-trial-note")?.remove();
  const note = practiceFeatureTrialNote(account);
  if (!note) return;
  note.id = "feature-trial-note";
  document.getElementById("photo-import-btn")?.closest(".word-field-heading")
    ?.after(note);
}

export function hasSmartReviewAccess(account) {
  if (!account) return false;
  if (isPlusAccount(account)) return true;
  return featureTrialActive(account.featureTrial);
}

export function hasPhotoImportAccess(account) {
  if (!account) return false;
  if (isPlusAccount(account)) return true;
  return featureTrialActive(account.featureTrial);
}

export function saveLastMissedWords(words) {
  try {
    if (Array.isArray(words) && words.length > 0) {
      localStorage.setItem(LAST_MISSED_KEY, JSON.stringify(words));
    } else {
      localStorage.removeItem(LAST_MISSED_KEY);
    }
  } catch {}
}

export function initLastMissedBanner() {
  if (readShareState(window.location).sharedLink) return;
  let savedMissed = [];
  try {
    savedMissed = JSON.parse(localStorage.getItem(LAST_MISSED_KEY) || "[]");
  } catch {}
  if (!Array.isArray(savedMissed) || !savedMissed.length) return;

  const container = document.querySelector(".spelling-builder");
  if (!container) return;
  document.getElementById("last-missed-banner")?.remove();

  const banner = document.createElement("div");
  banner.id = "last-missed-banner";
  banner.className = "last-missed-banner";

  const text = document.createElement("span");
  text.className = "last-missed-text";
  text.textContent = t("lastMissedBannerText", { count: savedMissed.length });

  const actions = document.createElement("div");
  actions.className = "last-missed-actions";

  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "last-missed-retry-btn";
  retryBtn.textContent = t("lastMissedRetryBtn");
  retryBtn.addEventListener("click", () => {
    const input = textarea();
    if (input) {
      input.value = savedMissed.join("\n");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      banner.remove();
    }
  });

  const smartReviewBtn = document.createElement("button");
  smartReviewBtn.type = "button";
  smartReviewBtn.className = "last-missed-smart-btn";
  smartReviewBtn.textContent = t("lastMissedSmartReviewBtn");
  smartReviewBtn.addEventListener("click", () => {
    const words = parseWords(savedMissed.join("\n"));
    if (!words.length || smartReviewBtn.disabled) return;
    smartReviewBtn.disabled = true;
    void getAccount().then((account) => {
      if (hasSmartReviewAccess(account)) {
        saveTrackingEntry(
          {
            words: words.join("\n"),
            mode: "dictation",
            entryPoint: "workspace",
            intent: "smart_review",
          },
          account?.user?.id,
        );
        window.location.href = `/workspace?lang=${encodeURIComponent(getPageLocale())}&review=1`;
        return;
      }
      showSmartReviewPreview(words, account);
      smartReviewBtn.disabled = false;
    });
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "last-missed-dismiss-btn";
  dismissBtn.setAttribute("aria-label", t("dismiss") || "Dismiss");
  dismissBtn.innerHTML = "&times;";
  dismissBtn.addEventListener("click", () => {
    banner.remove();
  });

  actions.append(retryBtn, smartReviewBtn, dismissBtn);
  banner.append(text, actions);
  container.prepend(banner);
}

function initPhotoImport() {
  const button = document.getElementById("photo-import-btn");
  const input = document.getElementById("photo-import-input");
  if (!button || !input) return;
  button.addEventListener("click", () => {
    trackEvent("photo_import_clicked", { locale: getPageLocale() });
    input.click();
  });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    if (file) void importWordsFromPhoto(file);
  });
}

function sentenceLibraryNotice(
  message = productMessage("sentenceLibraryRequired", {}, getPageLocale()),
) {
  const field = sentenceTextarea()?.closest(".word-entry-field");
  if (!field) return;
  field.querySelector(".sentence-library-notice")?.remove();
  const notice = document.createElement("small");
  notice.className = "sentence-library-notice contextual-paywall";
  notice.setAttribute("role", "status");
  appendContextualPaywall(
    notice,
    "example_sentences",
    message === productMessage("sentenceLibraryRequired", {}, getPageLocale())
      ? t("exampleSentencesValue")
      : message,
    { account: accountState },
  );
  field.append(notice);
}

function realignExampleSentences() {
  const sentenceInput = sentenceTextarea();
  const wordInput = textarea();
  if (!sentenceInput || !wordInput) return;
  const next = alignExampleSentences(
    previousWordText,
    sentenceInput.value,
    wordInput.value,
  ).join("\n");
  if (next !== sentenceInput.value) {
    sentenceInput.value = next;
    sentenceInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
  previousWordText = wordInput.value;
}

async function autoFillExampleSentences() {
  const button = document.getElementById("auto-example-sentences-btn");
  const words = currentWords();
  if (!button || !words.length) return;
  const generation = ++sentenceFillGeneration;
  button.disabled = true;
  try {
    const account = await getAccount();
    if (!isPlusAccount(account)) {
      trackLockedFeature("example_sentences", account?.plan || "anonymous");
      sentenceLibraryNotice();
      return;
    }
    sentenceTextarea()
      ?.closest(".word-entry-field")
      ?.querySelector(".sentence-library-notice")
      ?.remove();
    const response = await fetch("/api/sentence-library/match", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ words: words.join("\n"), difficulty: "simple" }),
    });
    const data = await response.json().catch(() => ({}));
    if (generation !== sentenceFillGeneration) return;
    if (!response.ok) throw new Error(data.error || "sentence_library_error");
    const sentenceInput = sentenceTextarea();
    const wordInput = textarea();
    if (!sentenceInput || !wordInput) return;
    // Apply matches to the list that is on screen now. An older response must
    // not write the previous batch back into the sentence box.
    sentenceInput.value = mergeLibrarySentences(
      wordInput.value,
      sentenceInput.value,
      data.matches || {},
    );
    sentenceInput.dispatchEvent(new Event("input", { bubbles: true }));
    previousWordText = wordInput.value;
  } catch (error) {
    if (error.message === "sentence_library_required")
      trackLockedFeature("example_sentences", accountState?.plan || "free");
    sentenceLibraryNotice(
      error.message === "sentence_library_required"
        ? productMessage("sentenceLibraryRequired", {}, getPageLocale())
        : productMessage("sentenceLibraryError", {}, getPageLocale()),
    );
  } finally {
    if (generation === sentenceFillGeneration) button.disabled = false;
  }
}

function status(text) {
  const el = document.getElementById("spelling-status");
  if (el) el.textContent = text;
  document.getElementById("spelling-limit-cta")?.remove();
}

function showCopyToast(message) {
  let toast = document.getElementById("copy-success-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "copy-success-toast";
    toast.className = "copy-success-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(copyToastTimer);
  copyToastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

async function updateLongListAdvice() {
  const input = textarea();
  if (!input) return;
  let advice = document.getElementById("long-list-advice");
  if (!advice) {
    advice = document.createElement("small");
    advice.id = "long-list-advice";
    advice.className = "spelling-help";
    advice.textContent = t("longListAdvice");
    input.after(advice);
  }
  advice.hidden = true;
  if (currentWords().length <= 20) return;
  if (readShareState(window.location).sharedLink) return;
  const account = await getAccount();
  advice.hidden = !account || currentWords().length <= 20;
}

function isPlusAccount(account) {
  return ["parent", "teacher", "plus", "pro"].includes(account?.plan);
}

function practiceLimit(account, anonymousOnly = false) {
  if (anonymousOnly || !account) return ANONYMOUS_WORD_LIMIT;
  return isPlusAccount(account) ? 40 : 25;
}

function showLimitCta(key, account) {
  status(t(key));
  const host = document.querySelector(".spelling-options");
  if (!host) return;
  const notice = document.createElement("div");
  notice.id = "spelling-limit-cta";
  notice.className = "notice contextual-paywall";
  appendContextualPaywall(notice, "word_limit", t("wordLimitValue"), {
    account,
    freeCta: !account,
  });
  host.append(notice);
}

async function getAccount() {
  if (!accountPromise) {
    accountPromise = fetch("/api/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        const account = await response.json();
        return {
          ...account,
          plan:
            account.plan ||
            (account.limits?.monthlyAttempts === null ? "teacher" : "free"),
        };
      })
      .catch(() => null);
    accountPromise.then((account) => {
      accountState = account;
    });
  }
  return accountPromise;
}

export async function canStartPractice({ anonymousOnly = false } = {}) {
  const analysis = currentWordAnalysis();
  if (
    analysis.tooShort.length ||
    analysis.tooLong.length ||
    analysis.invalid.length
  ) {
    status(t("invalidWords"));
    return false;
  }
  const words = currentWords();
  if (!words.length) {
    status(t("emptyWords"));
    return false;
  }
  const sharedLink = readShareState(window.location).sharedLink;
  const anonymous = anonymousOnly || sharedLink;
  const account = anonymous ? null : await getAccount();
  const limit = practiceLimit(account, anonymous);
  if (words.length <= limit && words.length <= 80) return true;
  if (words.length > 80) {
    status(t("invalidWords"));
    return false;
  }
  if (anonymous || !account) {
    showLimitCta("anonymousWordLimit", null);
  } else {
    showLimitCta("freeWordLimit", account);
  }
  if (!wordLimitHitTracked) {
    wordLimitHitTracked = true;
    track("word_limit_hit", {
      limit,
      account_tier: isPlusAccount(account)
        ? "plus"
        : account
          ? "free"
          : "anonymous",
      word_count_range: words.length > 80 ? "81+" : `${limit + 1}-80`,
      action: anonymous
        ? "practice_link"
        : selectedMode() === "typing"
          ? "typing_rain"
          : "spelling_test",
    });
    trackLockedFeature("word_limit", account?.plan || "anonymous");
  }
  return false;
}

function currentWords() {
  return parseWords(textarea()?.value || "");
}

function currentWordAnalysis() {
  return analyzeWords(textarea()?.value || "");
}

function currentExampleSentences(words = currentWords()) {
  const lines = (sentenceTextarea()?.value || "").split(/\r?\n/);
  return Object.fromEntries(
    words.map((word, index) => [
      word,
      (lines[index] || "").trim().slice(0, 300),
    ]),
  );
}

export function track(name, params = {}) {
  trackEvent(name, params);
}

function loadWordsFromUrl() {
  const raw = readShareState(window.location).words;
  return raw ? parseWords(raw) : [];
}

function selectedModeFromUrl() {
  return readShareState(window.location).mode;
}

function selectedMode() {
  return (
    document.querySelector('input[name="practice-mode"]:checked')?.value ||
    "dictation"
  );
}

function syncModeUI() {
  const mode = selectedMode();
  const chaseMode = mode === "chase";
  if (!chaseMode) window.stopTypingChase?.();
  document.querySelectorAll(".typing-option").forEach((element) => {
    element.hidden = mode !== "typing";
  });
  document.querySelectorAll(".dictation-option").forEach((element) => {
    element.hidden = mode !== "dictation";
  });
  document
    .querySelector(".word-entry-grid")
    ?.classList.toggle("single-column", mode !== "dictation");
  const builder = document.querySelector(".spelling-builder");
  if (builder) builder.hidden = chaseMode;
  const chaseOptions = document.getElementById("chase-start-options");
  if (chaseOptions) chaseOptions.hidden = !chaseMode;
  const button = document.getElementById("start-practice-btn");
  if (button) {
    button.hidden = chaseMode;
    if (!chaseMode)
      button.textContent = t(
        mode === "dictation" ? "startDictation" : "startTyping",
      );
  }
}

export function initSpellingMode() {
  const input = textarea();
  if (!input) return;
  capturePracticeSource();

  const shareState = readShareState(window.location);
  const fromUrl = loadWordsFromUrl();
  const saved = parseWords(localStorage.getItem(STORAGE_KEY) || "");
  const usingSample =
    !fromUrl.length &&
    (!saved.length ||
      (saved.length === SAMPLE_WORDS.length &&
        saved.every((word, index) => word === SAMPLE_WORDS[index])));
  input.value = (
    fromUrl.length ? fromUrl : saved.length ? saved : SAMPLE_WORDS
  ).join("\n");
  const sentenceInput = sentenceTextarea();
  if (sentenceInput) {
    sentenceInput.value = shareState.sharedLink
      ? shareState.exampleSentences
      : localStorage.getItem(SENTENCES_STORAGE_KEY) ||
        (usingSample ? SAMPLE_EXAMPLE_SENTENCES.join("\n") : "");
  }

  const mode = selectedModeFromUrl();
  const modeInput = document.querySelector(
    `input[name="practice-mode"][value="${mode}"]`,
  );
  if (modeInput) modeInput.checked = true;
  document.querySelectorAll('input[name="practice-mode"]').forEach((radio) => {
    radio.addEventListener("change", syncModeUI);
  });

  const hearToggle = document.getElementById("hear-words-toggle");
  if (hearToggle) {
    hearToggle.checked =
      localStorage.getItem(HEAR_KEY) === "1" ||
      localStorage.getItem(LEGACY_READ_KEY) === "1";
  }

  const easyToggle = document.getElementById("easy-mode-toggle");
  if (easyToggle) easyToggle.checked = localStorage.getItem(EASY_KEY) === "1";

  const updateWordStatus = () => {
    const analysis = currentWordAnalysis();
    status(
      analysis.tooShort.length ||
        analysis.tooLong.length ||
        analysis.invalid.length
        ? t("invalidWords")
        : t("wordsReady", { count: analysis.words.length }),
    );
  };
  previousWordText = input.value;
  updateWordStatus();
  void updateLongListAdvice();
  input.addEventListener("beforeinput", () => {
    previousWordText = input.value;
  });
  input.addEventListener("input", () => {
    realignExampleSentences();
    updateWordStatus();
    void updateLongListAdvice();
  });
  syncModeUI();
  document
    .getElementById("auto-example-sentences-btn")
    ?.addEventListener("click", autoFillExampleSentences);
  initPhotoImport();
  initLastMissedBanner();
  void getAccount().then((account) => {
    const resume = readUpgradeReturn();
    const canRestore =
      resume &&
      !resume.path.startsWith("/workspace") &&
      (!resume.userId || resume.userId === account?.user?.id);
    if (canRestore && resume.draft) {
      input.value = resume.draft.words || "";
      if (sentenceInput) sentenceInput.value = resume.draft.sentences || "";
      const mode = ["dictation", "typing", "chase"].includes(resume.draft.mode)
        ? resume.draft.mode
        : "dictation";
      const radio = document.querySelector(
        `input[name="practice-mode"][value="${mode}"]`,
      );
      if (radio) radio.checked = true;
      syncModeUI();
      updateWordStatus();
    }
    if (canRestore && upgradeReturnFor(account)) {
      const target = document.getElementById(
        resume.feature === "photo_import"
          ? "photo-import-btn"
          : resume.feature === "example_sentences"
            ? "auto-example-sentences-btn"
            : "custom-word-list",
      );
      const notice = document.createElement("p");
      notice.className = "notice upgrade-return-notice";
      notice.setAttribute("role", "status");
      notice.textContent = productMessage(
        "upgradeReturnReady",
        {},
        getPageLocale(),
      );
      input.closest(".word-entry-field")?.prepend(notice);
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
      clearUpgradeReturn();
    }
    showPracticeFeatureTrial(account);
    void resumePendingPhotoImport(account);
    resumePendingSmartReview(account);
  });
  if (shareState.autoStart && mode !== "chase")
    queueMicrotask(() => window.startGame?.());
}

export function loadSampleWords() {
  const input = textarea();
  if (!input) return;
  input.value = SAMPLE_WORDS.join("\n");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const sentences = sentenceTextarea();
  if (sentences) {
    sentences.value = SAMPLE_EXAMPLE_SENTENCES.join("\n");
    sentences.dispatchEvent(new Event("input", { bubbles: true }));
  }
  status(t("sampleLoaded", { count: SAMPLE_WORDS.length }));
}

export function prepareSession() {
  if (!textarea()) return null;
  const words = currentWords();
  const practiceMode = selectedMode();
  gameState.spellingMode = true;
  gameState.practiceMode = practiceMode;
  gameState.mode = practiceMode === "dictation" ? "dictation" : "spelling";
  gameState.customWords = words;
  gameState.exampleSentences = currentExampleSentences(words);
  gameState.customWordCursor = 0;
  gameState.missedWordList = [];
  gameState.spellingRoundComplete = false;
  gameState.spellingWordsProcessed = 0;
  gameState.maxMisses = practiceMode === "typing" ? words.length : 5;
  gameState.level = 1;
  gameState.replayRound = window.pendingReplayRound === true;
  window.pendingReplayRound = false;
  window.currentMode = gameState.mode;

  const hearToggle = document.getElementById("hear-words-toggle");
  gameState.hearWords = !!hearToggle?.checked;
  const easyToggle = document.getElementById("easy-mode-toggle");
  gameState.easyMode = !!easyToggle?.checked;
  localStorage.setItem(STORAGE_KEY, words.join("\n"));
  const shareState = readShareState(window.location);
  if (!shareState.sharedLink) {
    localStorage.setItem(
      SENTENCES_STORAGE_KEY,
      sentenceTextarea()?.value || "",
    );
  }
  localStorage.setItem(HEAR_KEY, gameState.hearWords ? "1" : "0");
  localStorage.removeItem(LEGACY_READ_KEY);
  localStorage.setItem(EASY_KEY, gameState.easyMode ? "1" : "0");
  status(t("wordsInRound", { count: words.length }));
  if (!gameState.replayRound) {
    track("word_list_created", {
      word_count: words.length,
      mode: practiceMode,
      locale: pageLocale(),
      shared_link: shareState.sharedLink,
      entry_page: shareState.entryPage || entryPage(),
    });
    track("practice_started", { word_count: words.length, mode: practiceMode });
  }
  return { words, mode: practiceMode };
}

export function getCustomWord() {
  if (!gameState.spellingMode || !gameState.customWords?.length) return null;
  const next = takeCustomWord(
    gameState.customWords,
    gameState.customWordCursor || 0,
  );
  gameState.customWordCursor = next.cursor;
  return next.word;
}

export function isRoundComplete(activeWordCount) {
  if (!gameState.spellingMode || !gameState.customWords?.length) return false;
  return customTypingRoundComplete(
    gameState.customWords.length,
    gameState.spellingWordsProcessed,
    activeWordCount,
  );
}

export function speakWord(word) {
  if (!gameState.spellingMode || !gameState.hearWords) return false;
  return speak(word);
}

export function markMissed(word) {
  if (!gameState.spellingMode || !word) return;
  if (!gameState.missedWordList.includes(word))
    gameState.missedWordList.push(word);
  gameState.spellingWordsProcessed++;
  track("word_missed", {
    word_length: word.length,
    mode: "typing",
    correct: false,
  });
}

export function markCorrect(word) {
  if (!gameState.spellingMode || !word) return;
  gameState.missedWordList = gameState.missedWordList.filter(
    (item) => item !== word,
  );
  gameState.spellingWordsProcessed++;
  track("word_completed", {
    word_length: word.length,
    mode: "typing",
    correct: true,
  });
}

export function renderSummary() {
  const box = document.getElementById("spelling-summary");
  if (!box || !gameState.spellingMode || gameState.practiceMode === "dictation")
    return;

  document.getElementById("typing-final-stats")?.removeAttribute("hidden");
  document.getElementById("dictation-final-stats")?.setAttribute("hidden", "");

  const missed = gameState.missedWordList || [];
  saveLastMissedWords(missed);
  document
    .getElementById("game-over-title")
    ?.replaceChildren(document.createTextNode(t("summaryTitle")));
  document.getElementById("spelling-result").textContent = missed.length
    ? t("summaryMissed", { count: missed.length })
    : t("summaryClean");

  const list = document.getElementById("missed-word-list");
  list.textContent = "";
  missed.forEach((word) => {
    const chip = document.createElement("span");
    chip.className = "word-chip";
    chip.textContent = word;
    list.appendChild(chip);
  });

  const replay = document.getElementById("replay-missed-btn");
  if (replay) replay.hidden = missed.length === 0;
  box.hidden = false;
  const stats = typingCompletionStats(gameState.spellingWordsProcessed, missed);
  document.getElementById("final-accuracy").textContent = `${stats.accuracy}%`;
  document.getElementById("final-missed").textContent = stats.missed_count;
  track("game_completed", {
    mode: "typing",
    ...stats,
    duration_seconds: Math.max(
      0,
      Math.round((Date.now() - gameState.startTime) / 1000),
    ),
    replay_round: gameState.replayRound,
  });
  renderResultWorkspaceCta({
    mode: "typing",
    wordCount: stats.word_count,
    missedCount: stats.missed_count,
  });
}

export function replayMissedWords() {
  if (gameState.practiceMode === "dictation") {
    window.retryMissedDictation?.();
    return;
  }
  const missed = gameState.missedWordList || [];
  saveLastMissedWords(missed);
  const input = textarea();
  if (!input || !missed.length) return;
  input.value = missed.join("\n");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  track("missed_words_replayed", {
    word_count: missed.length,
    mode: "typing",
    locale: pageLocale(),
  });
  window.pendingReplayRound = true;
  window.restartGame?.(true);
}

function closePracticeShareOptions({ restoreFocus = false } = {}) {
  const panel = document.getElementById("practice-share-options");
  if (!panel) return;
  panel.remove();
  const trigger = document.getElementById("copy-practice-link-btn");
  trigger?.setAttribute("aria-expanded", "false");
  document.removeEventListener("click", dismissPracticeShareOptions);
  document.removeEventListener("keydown", dismissPracticeShareOptions);
  if (restoreFocus) trigger?.focus();
}

function dismissPracticeShareOptions(event) {
  const panel = document.getElementById("practice-share-options");
  const trigger = document.getElementById("copy-practice-link-btn");
  if (event.type === "keydown") {
    if (event.key === "Escape")
      closePracticeShareOptions({ restoreFocus: true });
    return;
  }
  if (panel && !panel.contains(event.target) && event.target !== trigger)
    closePracticeShareOptions();
}

async function copyAnonymousPracticeLink() {
  if (!(await canStartPractice({ anonymousOnly: true }))) return;
  const words = currentWords();
  const exampleSentences = sentenceTextarea()?.value || "";
  const url = new URL(window.location.origin + window.location.pathname);
  url.hash = buildShareHash(words, selectedMode(), { exampleSentences }).slice(
    1,
  );
  try {
    await navigator.clipboard.writeText(url.toString());
    const message = t("linkCopied");
    status(message);
    showCopyToast(message);
  } catch {
    window.prompt(t("copyPrompt"), url.toString());
    status(t("linkReady"));
  }
  track("practice_link_copied", {
    word_count: words.length,
    mode: selectedMode(),
    locale: pageLocale(),
    share_type: "practice_only",
  });
  closePracticeShareOptions({ restoreFocus: true });
}

function shareOption(
  titleKey,
  copyKey,
  metaKey,
  onClick,
  { recommended = false } = {},
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `practice-share-option${recommended ? " practice-share-option-primary" : ""}`;
  const title = document.createElement("strong");
  title.textContent = recommended
    ? `${t(titleKey)} · ${t("recommendedTag") || "Recommended"}`
    : t(titleKey);
  const description = document.createElement("span");
  description.textContent = t(copyKey);
  const meta = document.createElement("small");
  meta.textContent = t(metaKey);
  button.append(title, description, meta);
  button.addEventListener("click", onClick);
  return button;
}

export function copyPracticeLink() {
  const existing = document.getElementById("practice-share-options");
  if (existing) {
    closePracticeShareOptions();
    return;
  }
  const trigger = document.getElementById("copy-practice-link-btn");
  const panel = document.createElement("section");
  panel.id = "practice-share-options";
  panel.className = "practice-share-options";
  panel.setAttribute("aria-labelledby", "practice-share-options-title");
  const heading = document.createElement("strong");
  heading.id = "practice-share-options-title";
  heading.textContent = t("sharePracticeTitle");
  panel.append(
    heading,
    shareOption(
      "trackResultsTitle",
      "trackResultsCopy",
      "trackResultsMeta",
      () => {
        closePracticeShareOptions();
        openTeacherAssignment("copy_track");
      },
      { recommended: true },
    ),
    shareOption(
      "practiceOnlyTitle",
      "practiceOnlyCopy",
      "practiceOnlyMeta",
      copyAnonymousPracticeLink,
    ),
  );
  trigger?.closest(".spelling-actions")?.after(panel);
  trigger?.setAttribute("aria-expanded", "true");
  document.addEventListener("click", dismissPracticeShareOptions);
  document.addEventListener("keydown", dismissPracticeShareOptions);
  panel.querySelector("button")?.focus();
  if (!shareOptionsViewTracked) {
    shareOptionsViewTracked = true;
    track("practice_share_options_viewed", {
      word_count: currentWords().length,
      mode: selectedMode(),
      locale: pageLocale(),
    });
  }
}

export function renderResultWorkspaceCta({ mode, wordCount, missedCount }) {
  const summary = document.getElementById("spelling-summary");
  if (!summary) return;
  summary.querySelector(".result-conversion")?.remove();

  const isShared = Boolean(readShareState(window.location).sharedLink);
  const block = document.createElement("section");
  block.className = "result-conversion";
  const message = document.createElement("p");
  message.className = "result-conversion-message";
  const benefits = document.createElement("ul");
  benefits.className = "result-conversion-benefits";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "share-score-btn result-conversion-button";
  const footnote = document.createElement("small");

  if (isShared) {
    message.textContent = t("workspaceSharedCtaTitle");
    [
      t("workspaceSharedCtaBenefit1"),
      t("workspaceSharedCtaBenefit2"),
      t("workspaceSharedCtaBenefit3"),
    ].forEach((label) => {
      const item = document.createElement("li");
      item.textContent = `✓ ${label}`;
      benefits.appendChild(item);
    });
    button.textContent = t("workspaceSharedCtaButton");
    footnote.textContent = t("workspaceSharedCtaFootnote");
  } else {
    message.textContent = missedCount
      ? t("workspaceCtaMissed", { count: missedCount })
      : t("workspaceCtaClean");
    [
      t("workspaceCtaKeep"),
      t("workspaceCtaTrack"),
      t("workspaceCtaCreate"),
    ].forEach((label) => {
      const item = document.createElement("li");
      item.textContent = `✓ ${label}`;
      benefits.appendChild(item);
    });
    button.textContent = productMessage(
      "trackNextPractice",
      {},
      getPageLocale(),
    );
    footnote.textContent = productMessage(
      "trackingExplanation",
      {},
      getPageLocale(),
    );
  }

  button.addEventListener("click", () =>
    openTeacherAssignment("practice_result"),
  );
  block.append(message, benefits, button, footnote);
  summary.appendChild(block);

  void isTeacherSignedIn().then((signedIn) => {
    if (signupCtaViewTracked) return;
    signupCtaViewTracked = true;
    track("tracking_cta_viewed", {
      signed_in: signedIn,
      mode,
      word_count: wordCount,
      missed_count: missedCount,
      replay_round: gameState.replayRound,
      cta_location: "practice_result",
    });
    if (!signedIn)
      track("signup_cta_viewed", {
        mode,
        word_count: wordCount,
        missed_count: missedCount,
        replay_round: gameState.replayRound,
        cta_location: "practice_result",
      });
  });
}

function isTeacherSignedIn() {
  return getAccount().then(Boolean);
}

export function openTeacherAssignment(entryPoint = "practice_result") {
  const source = ["copy_track", "assign_homework", "practice_result"].includes(
    entryPoint,
  )
    ? entryPoint
    : "practice_result";
  track("assignment_entry_clicked", {
    word_count: currentWords().length,
    mode: selectedMode(),
    entry_point: source,
  });
  setAssignmentEntryPoint(source);
  try {
    sessionStorage.setItem(
      "mySpellingTeacherDraftWords",
      currentWords().join("\n"),
    );
    sessionStorage.setItem(
      "mySpellingTeacherDraftSentences",
      sentenceTextarea()?.value || "",
    );
    sessionStorage.setItem("mySpellingTeacherDraftMode", selectedMode());
  } catch (_) {
    // The teacher form still works when browser storage is unavailable.
  }
  const tracking = source !== "assign_homework";
  if (tracking)
    saveTrackingEntry(
      {
        words: currentWords().join("\n"),
        exampleSentences: sentenceTextarea()?.value || "",
        mode: selectedMode(),
        entryPoint: source,
      },
      accountState?.user?.id,
    );
  window.location.href = `/workspace/assignments/new?lang=${encodeURIComponent(getPageLocale())}${tracking ? "&tracking=1" : ""}`;
}

if (typeof window !== "undefined") {
  const api = {
    initSpellingMode,
    loadSampleWords,
    prepareSession,
    getCustomWord,
    isRoundComplete,
    speakWord,
    markMissed,
    markCorrect,
    renderSummary,
    replayMissedWords,
    copyPracticeLink,
    renderResultWorkspaceCta,
    openTeacherAssignment,
    canStartPractice,
    hasPhotoImportAccess,
    hasSmartReviewAccess,
    LAST_MISSED_KEY,
    saveLastMissedWords,
    initLastMissedBanner,
  };
  window.spellingMode = api;
  Object.assign(window, api);
  document.addEventListener("DOMContentLoaded", initSpellingMode);
}
