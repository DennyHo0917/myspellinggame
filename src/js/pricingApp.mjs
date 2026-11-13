import {
  CHECKOUT_AUTH_RETURN_KEY,
  readPendingCheckout,
  savePendingCheckout,
  clearPendingCheckout,
  consumePendingCheckout,
} from "./pendingCheckout.mjs";
import { bindUpgradeReturn, readUpgradeReturn } from "./upgradeReturn.mjs";
import {
  pricingQuerySelection,
  upgradeSelection,
} from "./upgradeSelection.mjs";
import { trackCheckoutCancelled, trackEvent } from "./analytics.mjs";
import {
  normalizeProductLocale,
  PENDING_CHECKOUT_LOCALE_KEY,
  productMessages,
  productMessage,
} from "./productLocale.mjs";

const pendingOnLoad = readPendingCheckout();
// A stored choice only preselects a plan. Never open Stripe during page load.
consumePendingCheckout();

const locale = normalizeProductLocale(document.body.dataset.productLocale);
const copy = productMessages(locale);
const planOptions = document.querySelectorAll("[data-plan-option]");
const planChoices = document.querySelectorAll("[data-plan-choice]");
const pricingGrid = document.querySelector(".pricing-grid");
const freeChoice = document.querySelector('[data-plan-cta="free"]');
const subscriptionStatus = document.querySelector("[data-subscription-status]");
const subscriptionMessage = subscriptionStatus?.querySelector(
  "[data-subscription-message]",
);
const renewButton = subscriptionStatus?.querySelector(
  "[data-renew-subscription]",
);
const PAID_PLANS = ["parent", "teacher"];
let currentAccount = null;
const intervalChosen = { parent: false, teacher: false };
let canceledSelection = null;
const selectionParams = new URLSearchParams(location.search);
const querySelection = pricingQuerySelection(selectionParams);
let returningFromAuth = false;
try {
  returningFromAuth =
    sessionStorage.getItem(CHECKOUT_AUTH_RETURN_KEY) === "1" &&
    Boolean(pendingOnLoad);
} catch {}
const authReturnNotice = document.createElement("p");
authReturnNotice.className = "notice pricing-auth-notice";
authReturnNotice.setAttribute("role", "status");
authReturnNotice.hidden = true;
pricingGrid?.before(authReturnNotice);
let billingRequestPending = false;
let pendingPlanChoice = null;
for (const choice of planChoices)
  choice.dataset.selectPlanLabel = choice.textContent;
const accountPromise = fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);

function restoreCheckoutRetry() {
  let required = false;
  try {
    required = sessionStorage.getItem("pendingCheckoutRetryRequired") === "1";
  } catch {}
  if (!required || checkoutCanceled) return;
  const choice = document.querySelector(
    `[data-plan-choice="${selectedPlan()}"]`,
  );
  if (choice) showCheckoutRetry(choice, null);
}

function showCheckoutRetry(choice, error) {
  document.querySelector(".checkout-retry-notice")?.remove();
  const notice = document.createElement("div");
  notice.className = "notice checkout-retry-notice";
  notice.setAttribute("role", "alert");
  const message = document.createElement("p");
  message.textContent = productMessage("checkoutRetry", {}, locale);
  const status = document.createElement("p");
  status.className = "status error";
  status.textContent = error?.message || "";
  status.hidden = !error?.message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "button-secondary";
  retry.textContent = productMessage("retryCheckout", {}, locale);
  retry.addEventListener("click", () => {
    notice.remove();
    void beginCheckout(choice.dataset.planChoice);
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "button-secondary";
  cancel.textContent = copy.cancel;
  cancel.addEventListener("click", () => {
    clearPendingCheckout();
    notice.remove();
  });
  notice.append(message, retry, cancel, status);
  choice.closest(".pricing-card")?.append(notice);
}

let checkoutCanceled = false;
let canceledWorkspaceReturn = null;
try {
  checkoutCanceled =
    new URLSearchParams(location.search).get("checkout") === "cancelled";
  if (checkoutCanceled) {
    try {
      const resume = JSON.parse(
        sessionStorage.getItem("mySpellingWorkspaceDraftResume") || "null",
      );
      const returnUrl = new URL(resume?.path || "", location.origin);
      if (
        returnUrl.origin === location.origin &&
        (returnUrl.pathname === "/workspace/assignments/new" ||
          returnUrl.pathname === "/workspace/saved-lists" ||
          /^\/workspace\/assignments\/[0-9a-f-]{36}\/edit$/i.test(
            returnUrl.pathname,
          ))
      )
        canceledWorkspaceReturn = `${returnUrl.pathname}?lang=${encodeURIComponent(normalizeProductLocale(returnUrl.searchParams.get("lang")))}`;
    } catch {}
    const canceledCheckoutPlan = ["parent", "teacher"].includes(
      sessionStorage.getItem("pendingCheckoutPlan"),
    )
      ? sessionStorage.getItem("pendingCheckoutPlan")
      : "unknown";
    const canceledCheckoutInterval = ["month", "year"].includes(
      sessionStorage.getItem("pendingCheckoutInterval"),
    )
      ? sessionStorage.getItem("pendingCheckoutInterval")
      : "unknown";
    trackCheckoutCancelled(canceledCheckoutPlan, canceledCheckoutInterval);
    if (
      pendingOnLoad &&
      ["parent", "teacher"].includes(pendingOnLoad.plan) &&
      ["month", "year"].includes(pendingOnLoad.interval)
    )
      canceledSelection = {
        plan: pendingOnLoad.plan,
        interval: pendingOnLoad.interval,
      };
    clearPendingCheckout();
    sessionStorage.removeItem("pendingCheckoutInterval");
    sessionStorage.removeItem("pendingCheckoutPlan");
    sessionStorage.removeItem("pendingCheckoutRetryRequired");
    sessionStorage.removeItem("pendingUpgradeFeature");
    sessionStorage.removeItem(PENDING_CHECKOUT_LOCALE_KEY);
  }
} catch {}

function showCheckoutCanceledNotice(returnPath) {
  if (!pricingGrid || document.querySelector(".checkout-cancelled-notice"))
    return;
  const notice = document.createElement("div");
  notice.className = "notice checkout-cancelled-notice";
  notice.setAttribute("role", "status");
  const message = document.createElement("p");
  message.textContent = productMessage("checkoutCanceledNotice", {}, locale);
  notice.append(message);
  if (returnPath) {
    const backLink = document.createElement("a");
    backLink.className = "button-link button-secondary";
    backLink.href = returnPath;
    backLink.textContent = productMessage(
      returnPath.startsWith("/workspace")
        ? "checkoutCanceledReturnWorkspace"
        : "checkoutCanceledReturnPractice",
      {},
      locale,
    );
    notice.append(backLink);
  }
  pricingGrid.before(notice);
}

if (checkoutCanceled) {
  void fetch("/api/billing/checkout/cancel", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => null);
  void accountPromise.then((me) => {
    const origin = readUpgradeReturn();
    const returnPath =
      origin && (!origin.userId || origin.userId === me?.user?.id)
        ? origin.path
        : canceledWorkspaceReturn;
    showCheckoutCanceledNotice(returnPath);
  });
}

if (pricingGrid && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    trackEvent("upgrade_viewed");
    observer.disconnect();
  });
  observer.observe(pricingGrid);
}

function cardForPlan(plan) {
  return PAID_PLANS.includes(plan)
    ? document.querySelector(`[data-plan-card="${plan}"]`)
    : null;
}

function optionPlan(option) {
  return (
    option.dataset.planFor ||
    option.closest("[data-plan-card]")?.dataset.planCard ||
    null
  );
}

const priceAnimations = new WeakMap();

function prefersReducedMotion() {
  return Boolean(
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );
}

function replayClass(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function animatePriceText(priceEl, fromText, toText) {
  const prevFrame = priceAnimations.get(priceEl);
  if (prevFrame) cancelAnimationFrame(prevFrame);
  priceAnimations.delete(priceEl);
  const fromMatch = String(fromText || "").match(/(\d+(?:[.,]\d+)?)/);
  const toMatch = String(toText || "").match(/(\d+(?:[.,]\d+)?)/);
  if (!fromMatch || !toMatch || prefersReducedMotion()) {
    priceEl.textContent = toText;
    return;
  }
  const fromValue = Number(fromMatch[1].replace(",", "."));
  const toValue = Number(toMatch[1].replace(",", "."));
  if (!Number.isFinite(fromValue) || !Number.isFinite(toValue) || fromValue === toValue) {
    priceEl.textContent = toText;
    return;
  }
  const decimalSeparator = toMatch[1].includes(",") ? "," : ".";
  const decimals = (toMatch[1].split(/[.,]/)[1] || "").length;
  const prefix = toText.slice(0, toMatch.index);
  const suffix = toText.slice(toMatch.index + toMatch[1].length);
  const duration = 280;
  const start = performance.now();
  replayClass(priceEl, "is-updating");
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = (fromValue + (toValue - fromValue) * eased).toFixed(decimals);
    priceEl.textContent =
      prefix +
      (decimalSeparator === "," ? current.replace(".", ",") : current) +
      suffix;
    if (progress < 1) {
      priceAnimations.set(priceEl, requestAnimationFrame(step));
    } else {
      priceAnimations.delete(priceEl);
      priceEl.textContent = toText;
    }
  };
  priceAnimations.set(priceEl, requestAnimationFrame(step));
}

function syncCardInterval(card, interval, { animate = false } = {}) {
  if (!card) return;
  for (const selector of card.querySelectorAll(".plan-selector"))
    selector.dataset.activeInterval = interval;
  for (const option of card.querySelectorAll("[data-plan-option]"))
    option.setAttribute(
      "aria-pressed",
      String(option.dataset.planOption === interval),
    );
  for (const price of card.querySelectorAll("[data-plan-price]")) {
    const targetText = price.dataset[interval];
    if (animate) animatePriceText(price, price.textContent, targetText);
    else {
      const prevFrame = priceAnimations.get(price);
      if (prevFrame) {
        cancelAnimationFrame(prevFrame);
        priceAnimations.delete(price);
      }
      price.textContent = targetText;
    }
  }
  for (const savings of card.querySelectorAll("[data-plan-savings]")) {
    const text = savings.dataset[interval];
    const wasHidden = savings.hidden;
    if (text) {
      savings.textContent = text;
      savings.hidden = false;
      if (animate && wasHidden) replayClass(savings, "is-entering");
    } else {
      savings.hidden = true;
      savings.classList.remove("is-entering");
    }
  }
  for (const subtext of card.querySelectorAll("[data-plan-subtext]")) {
    const text = subtext.dataset[interval];
    const wasHidden = subtext.hidden;
    if (text) {
      subtext.textContent = text;
      subtext.hidden = false;
      if (animate && wasHidden) replayClass(subtext, "is-entering");
    } else {
      subtext.hidden = true;
      subtext.classList.remove("is-entering");
    }
  }
}

function selectInterval(
  interval,
  targetPlan = null,
  { updateUrl = true, animate = false } = {},
) {
  const plans = PAID_PLANS.includes(targetPlan) ? [targetPlan] : PAID_PLANS;
  for (const plan of plans)
    syncCardInterval(cardForPlan(plan), interval, { animate });
  if (updateUrl) {
    try {
      const url = new URL(location.href);
      if (
        url.searchParams.get("checkout") !== "cancelled" &&
        (!targetPlan || targetPlan === selectedPlan()) &&
        url.searchParams.get("interval") !== interval
      ) {
        url.searchParams.set("interval", interval);
        history.replaceState({}, "", url);
      }
    } catch {}
  }
  syncPlanControls();
}

function selectedInterval(plan = selectedPlan() || "parent") {
  const card = cardForPlan(plan);
  return (
    card?.querySelector('[data-plan-option][aria-pressed="true"]')?.dataset
      .planOption || "month"
  );
}

function syncPlanControls() {
  for (const option of planOptions) option.disabled = billingRequestPending;
  for (const choice of planChoices) {
    const plan = choice.dataset.planChoice;
    const interval = selectedInterval(plan);
    const current =
      currentAccount?.plan === plan &&
      currentAccount?.billingInterval === interval;
    choice.disabled = billingRequestPending || current;
    choice.textContent =
      billingRequestPending && pendingPlanChoice === plan
        ? productMessage("loading", {}, locale)
        : current
          ? choice.dataset.currentPlanLabel
          : choice.dataset.selectPlanLabel;
    choice.classList.toggle("current-plan-cta", current);
    choice.classList.toggle("button-secondary", !current);
    const showAuthFocus =
      returningFromAuth &&
      currentAccount?.user &&
      currentAccount.plan === "free" &&
      !billingRequestPending &&
      choice.dataset.planChoice === selectedPlan() &&
      !current;
    choice.classList.toggle("auth-return-cta", showAuthFocus);
    const card = choice.closest("[data-plan-card]");
    card?.classList.toggle("current-plan", current);
    if (current) card?.setAttribute("aria-current", "true");
    else card?.removeAttribute("aria-current");
  }
  if (returningFromAuth && currentAccount?.user && currentAccount.plan === "free") {
    authReturnNotice.textContent = productMessage(
      "pendingCheckoutReview",
      {},
      locale,
    );
    authReturnNotice.hidden = false;
  } else {
    authReturnNotice.hidden = true;
  }
}

function confirmPlanChange(me, plan, interval) {
  const targetCard = cardForPlan(plan);
  const currentCard = cardForPlan(me.plan) || targetCard;
  const targetPrice =
    targetCard?.querySelector("[data-plan-price]")?.textContent;
  const currentPlan = copy[`${me.plan}Plan`] || me.plan;
  const targetPlan = copy[`${plan}Plan`] || plan;
  const currentInterval = currentCard?.querySelector(
    `[data-plan-option="${me.billingInterval}"]`,
  )?.textContent;
  const targetInterval = targetCard?.querySelector(
    `[data-plan-option="${interval}"]`,
  )?.textContent;
  const scheduled = me.plan === "teacher" && plan === "parent";
  return confirm(
    productMessage(
      scheduled ? "planChangeScheduledConfirm" : "planChangeImmediateConfirm",
      {
        currentPlan,
        currentInterval,
        targetPlan,
        targetInterval,
        price: targetPrice,
        date:
          formatSubscriptionDate(me.currentPeriodEnd) ||
          productMessage("nextRenewal", {}, locale),
      },
      locale,
    ),
  );
}

function selectedPlan() {
  return document.querySelector('[data-plan-choice][aria-pressed="true"]')
    ?.dataset.planChoice;
}

function selectPlan(plan) {
  for (const choice of planChoices)
    choice.setAttribute(
      "aria-pressed",
      String(choice.dataset.planChoice === plan),
    );
}

function formatSubscriptionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

async function openBillingPortal(control) {
  const label = control.textContent;
  if (control instanceof HTMLButtonElement) control.disabled = true;
  else control.setAttribute("aria-disabled", "true");
  control.textContent = productMessage("loading", {}, locale);
  try {
    const response = await fetch("/api/billing/portal", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      location.href = `/workspace?lang=${encodeURIComponent(locale)}`;
      return;
    }
    if (!response.ok || !data.url)
      throw new Error(productMessage("error", {}, locale));
    location.href = data.url;
  } catch (error) {
    control.textContent = label;
    if (control instanceof HTMLButtonElement) control.disabled = false;
    else control.removeAttribute("aria-disabled");
    alert(error.message);
  }
}

function rememberCheckoutChoice(plan, interval) {
  try {
    savePendingCheckout(plan, interval);
    sessionStorage.setItem("pendingCheckoutPlan", plan);
    sessionStorage.setItem("pendingCheckoutInterval", interval);
    sessionStorage.setItem(PENDING_CHECKOUT_LOCALE_KEY, locale);
    sessionStorage.removeItem("pendingCheckoutRetryRequired");
  } catch {}
}

function sendSignedOutToPricingSignIn(plan, interval) {
  rememberCheckoutChoice(plan, interval);
  try {
    sessionStorage.setItem(CHECKOUT_AUTH_RETURN_KEY, "1");
  } catch {}
  location.href = `/workspace?lang=${encodeURIComponent(locale)}#teacher-sign-in`;
}

async function beginCheckout(plan) {
  if (!["parent", "teacher"].includes(plan) || billingRequestPending) return;
  const choice = document.querySelector(`[data-plan-choice="${plan}"]`);
  if (choice?.disabled) return;
  selectPlan(plan);
  pendingPlanChoice = plan;
  billingRequestPending = true;
  syncPlanControls();
  const me = await accountPromise;
  bindUpgradeReturn(me?.user?.id);
  const changingPlan = PAID_PLANS.includes(me?.plan);
  const interval = selectedInterval(plan);
  if (me?.plan === plan && me?.billingInterval === interval) {
    pendingPlanChoice = null;
    billingRequestPending = false;
    syncPlanControls();
    return;
  }
  if (changingPlan && !confirmPlanChange(me, plan, interval)) {
    pendingPlanChoice = null;
    billingRequestPending = false;
    syncPlanControls();
    return;
  }
  trackEvent("upgrade_clicked", { plan, billing_interval: interval });
  trackEvent("checkout_attempted", { plan, billing_interval: interval });
  if (!me?.user) {
    sendSignedOutToPricingSignIn(plan, interval);
    return;
  }
  if (!changingPlan) rememberCheckoutChoice(plan, interval);
  try {
    const response = await fetch(
      changingPlan ? "/api/billing/change-plan" : "/api/billing/checkout",
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, interval, locale }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      sendSignedOutToPricingSignIn(plan, interval);
      return;
    }
    if (response.ok && data.scheduled && data.effectiveAt) {
      const effectiveDate = formatSubscriptionDate(data.effectiveAt);
      if (!effectiveDate) throw new Error(productMessage("error", {}, locale));
      alert(
        productMessage(
          "downgradeScheduled",
          {
            currentPlan: copy.teacherPlan,
            targetPlan: copy.parentPlan,
            date: effectiveDate,
          },
          locale,
        ),
      );
      selectPlan(me.plan);
      pendingPlanChoice = null;
      billingRequestPending = false;
      syncPlanControls();
      return;
    }
    if (!response.ok || !data.url) {
      const error = new Error(
        data.error === "billing_not_configured"
          ? productMessage("billingUnavailable", {}, locale)
          : data.error === "already_subscribed"
            ? productMessage("alreadySubscribed", {}, locale)
            : data.error === "checkout_pending"
              ? productMessage("checkoutPending", {}, locale)
              : productMessage("error", {}, locale),
      );
      error.code = data.error || "checkout_unavailable";
      throw error;
    }
    trackEvent("checkout_started", { plan, billing_interval: interval });
    trackEvent("checkout_redirected", { plan, billing_interval: interval });
    try {
      sessionStorage.removeItem("pendingCheckoutInterval");
      sessionStorage.removeItem("pendingCheckoutRetryRequired");
      sessionStorage.removeItem(CHECKOUT_AUTH_RETURN_KEY);
    } catch {}
    location.href = data.url;
  } catch (error) {
    try {
      if (!changingPlan)
        sessionStorage.setItem("pendingCheckoutRetryRequired", "1");
    } catch {}
    trackEvent("checkout_failed", {
      plan,
      billing_interval: interval,
      error_code: error.code || "checkout_unavailable",
    });
    pendingPlanChoice = null;
    billingRequestPending = false;
    syncPlanControls();
    if (choice) showCheckoutRetry(choice, error);
  }
}

for (const option of planOptions)
  option.addEventListener("click", () => {
    const plan = optionPlan(option);
    if (!PAID_PLANS.includes(plan)) return;
    if (option.getAttribute("aria-pressed") === "true") return;
    intervalChosen[plan] = true;
    selectInterval(option.dataset.planOption, plan, { animate: true });
  });
for (const choice of planChoices)
  choice.addEventListener("click", () => {
    const plan = choice.dataset.planChoice;
    if (
      !PAID_PLANS.includes(plan) ||
      choice.disabled ||
      billingRequestPending
    )
      return;
    try {
      const url = new URL(location.href);
      if (url.searchParams.get("plan") !== plan) {
        url.searchParams.set("plan", plan);
        history.replaceState({}, "", url);
      }
    } catch {}
    void beginCheckout(plan);
  });

const explicitSelection = querySelection || canceledSelection;
accountPromise
  .then((me) => {
    currentAccount = me;
    const endDate = formatSubscriptionDate(me?.currentPeriodEnd);
    if (subscriptionStatus && PAID_PLANS.includes(me?.plan)) {
      const planLabel = copy[`${me.plan}Plan`] || me.plan;
      if (endDate && subscriptionMessage)
        subscriptionMessage.textContent = productMessage(
          "subscriptionExpires",
          { plan: planLabel, date: endDate },
          locale,
        );
      if (renewButton) {
        renewButton.hidden = false;
        renewButton.textContent = productMessage(
          me.cancelAtPeriodEnd ? "resumeSubscription" : "manageSubscription",
          {},
          locale,
        );
        renewButton.addEventListener(
          "click",
          () => void openBillingPortal(renewButton),
        );
      }
      subscriptionStatus.hidden = false;
    }
    const selection = upgradeSelection(me);
    const preferred = explicitSelection
      ? explicitSelection
      : PAID_PLANS.includes(me?.plan)
        ? {
            plan: me.plan,
            interval: ["month", "year"].includes(me.billingInterval)
              ? me.billingInterval
              : "month",
          }
        : selection;
    if (!Object.values(intervalChosen).some(Boolean)) selectPlan(preferred.plan);
    if (!intervalChosen[preferred.plan])
      selectInterval(preferred.interval, preferred.plan, { updateUrl: false });
    else syncPlanControls();
    restoreCheckoutRetry();
    const current = document.querySelector(`[data-plan-cta="${me?.plan}"]`);
    if (current && me?.plan === "free") {
      const currentCard = document.querySelector('[data-plan-card="free"]');
      currentCard?.classList.add("current-plan");
      currentCard?.setAttribute("aria-current", "true");
      current.textContent = current.dataset.currentPlanLabel;
      current.classList.remove("button-secondary");
      current.classList.add("current-plan-cta");
      current.removeAttribute("href");
      current.setAttribute("aria-disabled", "true");
    }
    if (PAID_PLANS.includes(me?.plan) && freeChoice) {
      freeChoice.textContent = productMessage("manageBilling", {}, locale);
      freeChoice.addEventListener("click", (event) => {
        event.preventDefault();
        void openBillingPortal(freeChoice);
      });
    }
  })
  .catch(() => null);

const initialSelection = explicitSelection || upgradeSelection(null);
selectPlan(initialSelection.plan);
selectInterval(initialSelection.interval, initialSelection.plan, {
  updateUrl: false,
});
