import { trackEvent } from "./analytics.mjs";
import {
  normalizeProductLocale,
  PENDING_CHECKOUT_LOCALE_KEY,
  productMessage,
} from "./productLocale.mjs";

const locale = normalizeProductLocale(document.body.dataset.productLocale);
const planOptions = document.querySelectorAll("[data-plan-option]");
const planPrices = document.querySelectorAll("[data-plan-price]");
const planChoices = document.querySelectorAll("[data-plan-choice]");
const pricingGrid = document.querySelector(".pricing-grid");

try {
  if (new URLSearchParams(location.search).get("checkout") === "cancelled") {
    sessionStorage.removeItem("pendingCheckoutInterval");
    sessionStorage.removeItem("pendingCheckoutPlan");
    sessionStorage.removeItem(PENDING_CHECKOUT_LOCALE_KEY);
  }
} catch {}

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

for (const option of planOptions)
  option.addEventListener("click", () =>
    selectInterval(option.dataset.planOption),
  );
for (const choice of planChoices)
  choice.addEventListener("click", async () => {
    const plan = choice.dataset.planChoice;
    selectPlan(plan);
    if (!["parent", "teacher"].includes(plan) || choice.disabled) return;
    const interval = document.querySelector(
      '[data-plan-option][aria-pressed="true"]',
    )?.dataset.planOption;
    const label = choice.textContent;
    choice.disabled = true;
    choice.textContent = productMessage("loading", {}, locale);
    try {
      sessionStorage.setItem("pendingCheckoutInterval", interval);
      sessionStorage.setItem("pendingCheckoutPlan", plan);
      sessionStorage.setItem(PENDING_CHECKOUT_LOCALE_KEY, locale);
    } catch {}
    trackEvent("upgrade_clicked", { billing_interval: interval });
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, interval, locale }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        location.href = `/teacher?lang=${encodeURIComponent(locale)}`;
        return;
      }
      if (!response.ok || !data.url)
        throw new Error(
          data.error === "billing_not_configured"
            ? productMessage("billingUnavailable", {}, locale)
            : data.error === "already_subscribed"
              ? productMessage("alreadySubscribed", {}, locale)
              : data.error === "checkout_pending"
                ? productMessage("checkoutPending", {}, locale)
                : productMessage("error", {}, locale),
        );
      trackEvent("checkout_started", { billing_interval: interval });
      trackEvent("checkout_redirected", { billing_interval: interval });
      try {
        sessionStorage.removeItem("pendingCheckoutInterval");
      } catch {}
      location.href = data.url;
    } catch (error) {
      choice.textContent = label;
      choice.disabled = false;
      alert(error.message);
    }
  });

fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((me) => {
    const current = document.querySelector(`[data-plan-cta="${me?.plan}"]`);
    if (!current) return;
    current.textContent = current.dataset.currentPlanLabel;
    current.classList.add("current-plan-cta");
    if (current instanceof HTMLAnchorElement) {
      current.removeAttribute("href");
      current.setAttribute("aria-disabled", "true");
    } else {
      current.disabled = true;
    }
  })
  .catch(() => null);
