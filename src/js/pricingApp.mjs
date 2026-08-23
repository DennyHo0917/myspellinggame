import { trackEvent } from "./analytics.mjs";
import { normalizeProductLocale, productMessage } from "./productLocale.mjs";

const locale = normalizeProductLocale(document.body.dataset.productLocale);
const status = document.getElementById("pricing-status");
trackEvent("upgrade_viewed");

for (const button of document.querySelectorAll("[data-checkout]")) {
  button.addEventListener("click", async () => {
    const interval = button.dataset.checkout;
    trackEvent("checkout_started", { billing_interval: interval });
    try {
      sessionStorage.setItem("pendingCheckoutInterval", interval);
    } catch {}
    button.disabled = true;
    status.textContent = productMessage("loading", {}, locale);
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
            : productMessage("error", {}, locale),
        );
      try {
        sessionStorage.removeItem("pendingCheckoutInterval");
      } catch {}
      location.href = data.url;
    } catch (error) {
      status.textContent = error.message;
      status.className = "status error";
      button.disabled = false;
    }
  });
}
