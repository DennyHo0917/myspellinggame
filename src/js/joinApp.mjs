import {
  installDiagnostics,
  diagnosticFetch,
  reportDiagnostic,
} from "./diagnostics.mjs";
import { productLocale, productMessages } from "./productLocale.mjs";
import { distributionChannel } from "./assignmentSharing.mjs";
const params = new URLSearchParams(location.search);
const assignmentPublicId = params.get("assignment");
const channel = distributionChannel(params.get("channel"));
const root = document.getElementById("product-app");
const locale = productLocale();
const copy = productMessages(locale);
const classId =
  location.pathname.match(/^\/join\/([A-Za-z0-9_-]{8,24})$/)?.[1] || "";
installDiagnostics();
document.documentElement.lang = locale;
function render(message = "") {
  root.innerHTML = `<main class="product-main"><section class="product-card"><h1>${copy.classJoin}</h1><form class="product-form"><label for="pin">${copy.studentPin}</label><input id="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required><button type="submit">${copy.start}</button><p class="status">${message}</p></form></section></main>`;
  root.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = root.querySelector(".status");
    const button = root.querySelector("button");
    button.disabled = true;
    try {
      const response = await diagnosticFetch(`/api/public/join/${classId}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: location.origin,
        },
        body: JSON.stringify({
          pin: root.querySelector("#pin").value,
          ...(assignmentPublicId !== null ? { assignmentPublicId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          {
            invalid_join: copy.invalidPin,
            assignment_closed: copy.assignmentClosed,
            assignment_expired: copy.assignmentExpired,
            assignment_not_found: copy.assignmentNotFound,
            learner_not_found: copy.assignmentUnavailable,
            rate_limited: copy.rateLimited,
          }[data.error] || copy.error,
        );
      if (assignmentPublicId !== null) {
        if (
          data.assignmentPublicId !== assignmentPublicId ||
          !/^[A-Za-z0-9_-]{24}$/.test(data.learnerPublicId || "")
        ) {
          reportDiagnostic("invalid_response");
          throw new Error(copy.error);
        }
        location.href = `/a/${assignmentPublicId}?learner=${encodeURIComponent(data.learnerPublicId)}&lang=${encodeURIComponent(locale)}&channel=${channel}`;
        return;
      }
      location.href = `/l/${encodeURIComponent(data.learnerPublicId)}?lang=${encodeURIComponent(locale)}`;
    } catch (error) {
      status.textContent =
        error.name === "AbortError" || error instanceof TypeError
          ? copy.error
          : error.message;
      status.className = "status error";
    } finally {
      button.disabled = false;
    }
  });
}
render();
