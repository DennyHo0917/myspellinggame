import { trackCheckoutCancelled, trackEvent } from "./analytics.mjs";
import {
  normalizeProductLocale,
  PENDING_CHECKOUT_LOCALE_KEY,
  productMessages,
  productMessage,
} from "./productLocale.mjs";

const locale = normalizeProductLocale(document.body.dataset.productLocale);
const copy = productMessages(locale);
const planOptions = document.querySelectorAll("[data-plan-option]");
const planPrices = document.querySelectorAll("[data-plan-price]");
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
let currentAccount = null;
let billingRequestPending = false;
for (const choice of planChoices)
  choice.dataset.selectPlanLabel = choice.textContent;
const accountPromise = fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);

function showCheckoutRetry(choice, error) {
  document.querySelector(".checkout-retry-notice")?.remove();
  const notice = document.createElement("div");
  notice.className = "notice checkout-retry-notice";
  notice.setAttribute("role", "alert");
  const message = document.createElement("p");
  message.textContent = productMessage("checkoutRetry", {}, locale);
  const status = document.createElement("p");
  status.className = "status error";
  status.textContent = error.message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "button-secondary";
  retry.textContent = productMessage("retryCheckout", {}, locale);
  retry.addEventListener("click", () => {
    notice.remove();
    choice.click();
  });
  notice.append(message, retry, status);
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
    sessionStorage.removeItem("pendingCheckoutInterval");
    sessionStorage.removeItem("pendingCheckoutPlan");
    sessionStorage.removeItem("pendingCheckoutRetryRequired");
    sessionStorage.removeItem("pendingUpgradeFeature");
    sessionStorage.removeItem(PENDING_CHECKOUT_LOCALE_KEY);
  }
} catch {}

if (checkoutCanceled) {
  void fetch("/api/billing/checkout/cancel", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => null);
  if (canceledWorkspaceReturn) location.replace(canceledWorkspaceReturn);
}

if (pricingGrid && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    trackEvent("upgrade_viewed");
    observer.disconnect();
  });
  observer.observe(pricingGrid);
}

function selectInterval(interval) {
  for (const option of planOptions)
    option.setAttribute(
      "aria-pressed",
      String(option.dataset.planOption === interval),
    );
  for (const price of planPrices) price.textContent = price.dataset[interval];
  syncPlanControls();
}

function selectedInterval() {
  return document.querySelector('[data-plan-option][aria-pressed="true"]')
    ?.dataset.planOption;
}

function syncPlanControls() {
  const interval = selectedInterval();
  for (const option of planOptions) option.disabled = billingRequestPending;
  for (const choice of planChoices) {
    const current =
      currentAccount?.plan === choice.dataset.planChoice &&
      currentAccount?.billingInterval === interval;
    choice.disabled = billingRequestPending || current;
    choice.textContent = current
      ? choice.dataset.currentPlanLabel
      : choice.dataset.selectPlanLabel;
    choice.classList.toggle("current-plan-cta", current);
    const card = choice.closest("[data-plan-card]");
    card?.classList.toggle("current-plan", current);
    if (current) card?.setAttribute("aria-current", "true");
    else card?.removeAttribute("aria-current");
  }
}

function confirmPlanChange(me, plan, interval) {
  const targetCard = document.querySelector(`[data-plan-card="${plan}"]`);
  const targetPrice =
    targetCard?.querySelector("[data-plan-price]")?.textContent;
  const currentPlan = copy[`${me.plan}Plan`] || me.plan;
  const targetPlan = copy[`${plan}Plan`] || plan;
  const currentInterval = document.querySelector(
    `[data-plan-option="${me.billingInterval}"]`,
  )?.textContent;
  const targetInterval = document.querySelector(
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

function selectPlan(plan) {
  for (const choice of planChoices)
    choice.setAttribute(
      "aria-pressed",
      String(choice.dataset.planChoice === plan),
    );
  for (const card of document.querySelectorAll("[data-plan-card]"))
    card.classList.toggle("selected", card.dataset.planCard === plan);
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

for (const option of planOptions)
  option.addEventListener("click", () =>
    selectInterval(option.dataset.planOption),
  );
for (const choice of planChoices)
  choice.addEventListener("click", async () => {
    const plan = choice.dataset.planChoice;
    if (
      !["parent", "teacher"].includes(plan) ||
      choice.disabled ||
      billingRequestPending
    )
      return;
    billingRequestPending = true;
    syncPlanControls();
    const me = await accountPromise;
    const changingPlan = ["parent", "teacher"].includes(me?.plan);
    const interval = selectedInterval();
    if (me?.plan === plan && me?.billingInterval === interval) {
      billingRequestPending = false;
      syncPlanControls();
      return;
    }
    if (changingPlan && !confirmPlanChange(me, plan, interval)) {
      billingRequestPending = false;
      syncPlanControls();
      return;
    }
    const label = choice.textContent;
    choice.textContent = productMessage("loading", {}, locale);
    try {
      if (!changingPlan) {
        sessionStorage.setItem("pendingCheckoutInterval", interval);
        sessionStorage.setItem("pendingCheckoutPlan", plan);
        sessionStorage.setItem(PENDING_CHECKOUT_LOCALE_KEY, locale);
        sessionStorage.removeItem("pendingCheckoutRetryRequired");
      }
    } catch {}
    trackEvent("upgrade_clicked", { plan, billing_interval: interval });
    trackEvent("checkout_attempted", { plan, billing_interval: interval });
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
        location.href = `/workspace?lang=${encodeURIComponent(locale)}`;
        return;
      }
      if (response.ok && data.scheduled && data.effectiveAt) {
        const effectiveDate = formatSubscriptionDate(data.effectiveAt);
        if (!effectiveDate)
          throw new Error(productMessage("error", {}, locale));
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
      choice.textContent = label;
      billingRequestPending = false;
      syncPlanControls();
      showCheckoutRetry(choice, error);
    }
  });

accountPromise
  .then((me) => {
    currentAccount = me;
    const endDate = formatSubscriptionDate(me?.currentPeriodEnd);
    if (subscriptionStatus && ["parent", "teacher"].includes(me?.plan)) {
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
    if (me.billingInterval === "month" || me.billingInterval === "year")
      selectInterval(me.billingInterval);
    else syncPlanControls();
    const current = document.querySelector(`[data-plan-cta="${me?.plan}"]`);
    if (current && me.plan === "free") {
      const currentCard = document.querySelector('[data-plan-card="free"]');
      currentCard?.classList.add("current-plan");
      currentCard?.setAttribute("aria-current", "true");
      current.textContent = current.dataset.currentPlanLabel;
      current.classList.add("current-plan-cta");
      current.removeAttribute("href");
      current.setAttribute("aria-disabled", "true");
    }
    if (["parent", "teacher"].includes(me.plan) && freeChoice) {
      freeChoice.textContent = productMessage("manageBilling", {}, locale);
      freeChoice.addEventListener("click", (event) => {
        event.preventDefault();
        void openBillingPortal(freeChoice);
      });
    }
  })
  .catch(() => null);
