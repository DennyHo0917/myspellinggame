import { productLocale, productMessages } from "./productLocale.mjs";
const root = document.getElementById("product-app");
const locale = productLocale();
const copy = productMessages(locale);
const classId =
  location.pathname.match(/^\/join\/([A-Za-z0-9_-]{8,24})$/)?.[1] || "";
document.documentElement.lang = locale;
function render(message = "") {
  root.innerHTML = `<main class="product-main"><section class="product-card"><h1>${copy.classJoin}</h1><form class="product-form"><label for="pin">${copy.studentPin}</label><input id="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required><button type="submit">${copy.start}</button><p class="status">${message}</p></form></section></main>`;
  root.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = root.querySelector(".status");
    try {
      const response = await fetch(`/api/public/join/${classId}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: location.origin,
        },
        body: JSON.stringify({ pin: root.querySelector("#pin").value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(copy.error);
      location.href = `/l/${encodeURIComponent(data.learnerPublicId)}?lang=${encodeURIComponent(locale)}`;
    } catch {
      status.textContent = copy.error;
      status.className = "status error";
    }
  });
}
render();
