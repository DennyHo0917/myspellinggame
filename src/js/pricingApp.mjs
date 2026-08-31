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
const accountPromise = fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);

let checkoutCanceled = false;
try {
  checkoutCanceled =
    new URLSearchParams(location.search).get("checkout") === "cancelled";
  if (checkoutCanceled) {
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
    sessionStorage.removeItem(PENDING_CHECKOUT_LOCALE_KEY);
  }
} catch {}

if (checkoutCanceled)
  void fetch("/api/billing/checkout/cancel", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => null);

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
      location.href = `/teacher?lang=${encodeURIComponent(locale)}`;
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
    selectPlan(plan);
    if (!["parent", "teacher"].includes(plan) || choice.disabled) return;
    const me = await accountPromise;
    if (me?.plan === plan) return;
    const changingPlan = ["parent", "teacher"].includes(me?.plan);
    const interval = document.querySelector(
      '[data-plan-option][aria-pressed="true"]',
    )?.dataset.planOption;
    const label = choice.textContent;
    choice.disabled = true;
    choice.textContent = productMessage("loading", {}, locale);
    try {
      if (!changingPlan) {
        sessionStorage.setItem("pendingCheckoutInterval", interval);
        sessionStorage.setItem("pendingCheckoutPlan", plan);
        sessionStorage.setItem(PENDING_CHECKOUT_LOCALE_KEY, locale);
      }
    } catch {}
    trackEvent("upgrade_clicked", { plan, billing_interval: interval });
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
        location.href = `/teacher?lang=${encodeURIComponent(locale)}`;
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
        choice.textContent = label;
        choice.disabled = false;
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
      } catch {}
      location.href = data.url;
    } catch (error) {
      trackEvent("checkout_failed", {
        plan,
        billing_interval: interval,
        error_code: error.code || "checkout_unavailable",
      });
      choice.textContent = label;
      choice.disabled = false;
      alert(error.message);
    }
  });

accountPromise
  .then((me) => {
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
          "renewSubscription",
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
    const current = document.querySelector(`[data-plan-cta="${me?.plan}"]`);
    if (!current) return;
    const currentCard = document.querySelector(`[data-plan-card="${me.plan}"]`);
    currentCard?.classList.add("current-plan");
    currentCard?.setAttribute("aria-current", "true");
    current.textContent = current.dataset.currentPlanLabel;
    current.classList.add("current-plan-cta");
    if (current instanceof HTMLAnchorElement) {
      current.removeAttribute("href");
      current.setAttribute("aria-disabled", "true");
    } else {
      current.disabled = true;
    }
    if (me.billingInterval === "month" || me.billingInterval === "year")
      selectInterval(me.billingInterval);
    if (["parent", "teacher"].includes(me.plan) && freeChoice) {
      freeChoice.textContent = productMessage("manageBilling", {}, locale);
      freeChoice.addEventListener("click", (event) => {
        event.preventDefault();
        void openBillingPortal(freeChoice);
      });
    }
  })
  .catch(() => null);
