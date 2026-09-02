import "./gameState.js";
import { getPageLocale } from "./pageLocale.js";
import "./wordDatabase.js";
import "./domRefs.js";
import "./screens.js";
import "./spellingMode.js";
import "./dictationMode.js";
import "./chaseMode.js";
import "./words.js";
import "./input.js";
import "./lineNumbers.mjs";
import { initBackgroundParticles, resizeCanvas } from "./rendering.js";
import { initAudio } from "./audio.js";

async function syncHomeAccount() {
  const link = document.querySelector(".home-account-link");
  if (!link) return;
  try {
    const response = await fetch("/api/me", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return;
    const { user } = await response.json();
    if (!user?.name) return;
    const userMenu = document.createElement("details");
    userMenu.className = "workspace-user-menu";
    const toggle = document.createElement("summary");
    toggle.className = "workspace-user-toggle";
    toggle.innerHTML = `<span class="workspace-user-avatar" aria-hidden="true"></span><span></span>`;
    toggle.querySelector(".workspace-user-avatar").textContent =
      user.name.trim().charAt(0).toUpperCase() || "?";
    toggle.querySelector("span:last-child").textContent = user.name;
    const menu = document.createElement("div");
    menu.className = "workspace-user-dropdown";
    menu.setAttribute("role", "menu");
    const email = document.createElement("div");
    email.className = "workspace-user-email";
    email.textContent = user.email;
    const logout = document.createElement("button");
    logout.type = "button";
    logout.textContent = link.dataset.signOut;
    logout.addEventListener("click", async () => {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "same-origin",
        body: "{}",
      }).catch(() => null);
      location.reload();
    });
    menu.append(email, logout);
    userMenu.append(toggle, menu);
    link.replaceWith(userMenu);
    document.addEventListener("click", (event) => {
      if (!userMenu.contains(event.target)) userMenu.open = false;
    });
  } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  window.currentLanguage = getPageLocale();
  syncHomeAccount();
  initAudio();
  resizeCanvas();
  initBackgroundParticles();
  window.addEventListener("resize", resizeCanvas);
});
