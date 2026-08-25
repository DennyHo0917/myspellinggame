import { trackEvent } from "./analytics.mjs";
import { normalizeProductLocale, productMessage } from "./productLocale.mjs";

const locale = normalizeProductLocale(document.body.dataset.productLocale);
const status = document.getElementById("pricing-status");
const planOptions = document.querySelectorAll("[data-plan-option]");
const selectedPrice = document.getElementById("selected-plan-price");
const selectedDescription = document.getElementById(
  "selected-plan-description",
);
const selectedSavings = document.getElementById("selected-plan-savings");
const confirmButton = document.querySelector("[data-confirm-checkout]");
trackEvent("upgrade_viewed");

function selectPlan(interval) {
  for (const option of planOptions) {
    option.setAttribute(
      "aria-pressed",
      String(option.dataset.planOption === interval),
    );
  }
  selectedPrice.textContent = selectedPrice.dataset[interval];
  selectedDescription.textContent = selectedDescription.dataset[interval];
  selectedSavings.textContent = selectedSavings.dataset[interval];
  selectedSavings.hidden = !selectedSavings.textContent;
  confirmButton.dataset.checkout = interval;
  confirmButton.textContent =
    confirmButton.dataset[`confirm${interval === "month" ? "Month" : "Year"}`];
}

for (const option of planOptions) {
  option.addEventListener("click", () => selectPlan(option.dataset.planOption));
}

confirmButton.addEventListener("click", async () => {
  if (confirmButton.disabled) return;
  const interval = confirmButton.dataset.checkout;
  let previousInterval = null;
  try {
    previousInterval = sessionStorage.getItem("pendingCheckoutInterval");
    sessionStorage.setItem("pendingCheckoutInterval", interval);
  } catch {}
  if (previousInterval !== interval)
    trackEvent("upgrade_clicked", { billing_interval: interval });
  confirmButton.disabled = true;
  status.textContent = productMessage("loading", {}, locale);
  status.className = "status";
  try {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ interval }),
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
            : productMessage("error", {}, locale),
      );
    trackEvent("checkout_started", { billing_interval: interval });
    try {
      sessionStorage.removeItem("pendingCheckoutInterval");
    } catch {}
    location.href = data.url;
  } catch (error) {
    status.textContent = error.message;
    status.className = "status error";
    confirmButton.disabled = false;
  }
});
