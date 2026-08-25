import { trackEvent, trackUsageLimit } from "./analytics.mjs";
import {
  PENDING_CHECKOUT_LOCALE_KEY,
  PRODUCT_LOCALES,
  productPagePath,
  productLocale,
  productMessage,
  productMessages,
} from "./productLocale.mjs";

const root = document.getElementById("product-app");
const locale = productLocale();
const copy = productMessages(locale);
const PURCHASE_RECORDED_KEY = "teacherPurchaseRecorded";
const AUTH_PENDING_KEY = "teacherOAuthPending";
const ACTIVATION_POLL_ATTEMPTS = 10;
let assignmentResultsViewed = false;
document.documentElement.lang = locale;
document.title = copy.dashboardTitle;

function m(key, vars) {
  return productMessage(key, vars, locale);
}
function date(value) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function duration(seconds) {
  const value = Number(seconds) || 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

const ERROR_KEYS = {
  sign_in_required: "signInRequired",
  assignment_not_found: "assignmentNotFound",
  assignment_closed: "assignmentClosed",
  assignment_expired: "assignmentExpired",
  attempt_limit: "attemptLimit",
  monthly_submission_limit: "teacherLimit",
  invalid_nickname: "invalidNickname",
  active_assignment_limit: "activeLimit",
  billing_not_configured: "billingUnavailable",
  already_subscribed: "alreadySubscribed",
  invalid_title: "invalidTitle",
  invalid_words: "invalidWords",
  invalid_deadline: "invalidDeadline",
  invalid_max_attempts: "invalidMaxAttempts",
  invalid_list_title: "invalidListTitle",
  saved_list_not_found: "savedListNotFound",
  saved_list_limit: "savedListLimit",
  learner_not_found: "learnerNotFound",
  learner_exists: "learnerExists",
  learner_limit: "learnerLimit",
  smart_review_required: "smartReviewRequired",
  rate_limited: "rateLimited",
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: options.body
      ? { "content-type": "application/json", ...options.headers }
      : options.headers,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    trackUsageLimit(data.error);
    const error = new Error(m(ERROR_KEYS[data.error] || "error"));
    error.code = data.error;
    error.status = response.status;
    throw error;
  }
  return data;
}

function nav({ signedIn = true } = {}) {
  const element = document.createElement("nav");
  element.className = "product-nav teacher-product-nav";
  const homeHref = productPagePath("", locale);
  const languageOptions = PRODUCT_LOCALES.map(
    ([value, label]) =>
      `<a class="lang-option" href="?lang=${encodeURIComponent(value)}"${value === locale ? ' aria-current="page"' : ""}>${label}</a>`,
  ).join("");
  element.innerHTML = `
    <a class="product-brand" href="${homeHref}"><img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt=""><span>${copy.brand}</span></a>
    <div class="product-nav-actions">
      <details class="language-switcher"><summary class="lang-btn" aria-label="${copy.language}">${copy.language}</summary><div class="lang-menu">${languageOptions}</div></details>
      <a class="button-link button-secondary" href="${homeHref}">${copy.homePage}</a>
      ${signedIn ? `<button class="button-secondary" id="sign-out" type="button">${copy.signOut}</button>` : ""}
    </div>`;
  if (signedIn) {
    element.querySelector("#sign-out").addEventListener("click", async () => {
      await api("/api/auth/sign-out", { method: "POST", body: "{}" }).catch(
        () => null,
      );
      location.href = homeHref;
    });
  }
  return element;
}

const FOOTER_PAGES = [
  "sight-word-typing-game",
  "homeschool-spelling-practice",
  "vocabulary-typing-game",
  "faq",
  "privacy",
  "about",
  "contact",
];

function footer() {
  const element = document.createElement("footer");
  element.className = "product-footer";
  const links = FOOTER_PAGES.map((page, index) => {
    const link = document.createElement("a");
    link.href = productPagePath(page, locale);
    link.textContent = copy.footerLinks[index];
    return link;
  });
  const paragraph = document.createElement("p");
  const linkGroup = document.createElement("span");
  linkGroup.className = "footer-links";
  links.forEach((link, index) => {
    if (index) linkGroup.append(" · ");
    linkGroup.append(link);
  });
  paragraph.append(
    linkGroup,
    document.createElement("br"),
    `© 2026 My Spelling Game ${copy.footerRights}`,
  );
  element.append(paragraph);
  return element;
}

function shell() {
  root.replaceChildren();
  const wrapper = document.createElement("div");
  wrapper.className = "product-shell";
  wrapper.append(nav());
  const main = document.createElement("main");
  main.className = "product-main teacher-main";
  wrapper.append(main, footer());
  root.append(wrapper);
  return main;
}

function statusElement(parent) {
  const status = document.createElement("p");
  status.className = "status";
  status.setAttribute("role", "status");
  parent.append(status);
  return status;
}

function upgradeLink(ctaLocation) {
  const link = document.createElement("a");
  link.className = "button-link pro";
  link.href = productPagePath("pricing", locale);
  link.textContent = copy.upgrade;
  link.addEventListener("click", () => {
    trackEvent("upgrade_cta_clicked", { cta_location: ctaLocation });
  });
  return link;
}

function saveAssignmentDraft(words, title = "") {
  try {
    sessionStorage.setItem("mySpellingTeacherDraftWords", words.join("\n"));
    sessionStorage.setItem("mySpellingTeacherDraftTitle", title.slice(0, 80));
    sessionStorage.setItem("mySpellingTeacherDraftMode", "dictation");
  } catch {}
  location.href = `/teacher/assignments/new?lang=${encodeURIComponent(locale)}`;
}

function teacherCallbackURL() {
  const pathname = /^\/teacher(?:\/|$)/.test(location.pathname)
    ? location.pathname
    : "/teacher";
  return `${pathname}?lang=${encodeURIComponent(locale)}`;
}

function focusTeacherSignIn() {
  const card = document.getElementById("teacher-sign-in");
  const button = card?.querySelector(".google-sign-in");
  if (!card || !button) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  button.focus({ preventScroll: true });
}

async function appendPricing(
  main,
  { signInTarget = false, currentPlan = false } = {},
) {
  const pricing = document.createElement("section");
  pricing.id = "pricing";
  pricing.className = "teacher-pricing";
  try {
    const response = await fetch(productPagePath("pricing", locale));
    if (!response.ok) throw new Error("pricing unavailable");
    const html = await response.text();
    const documentCopy = new DOMParser().parseFromString(html, "text/html");
    const source = documentCopy.querySelector("main");
    if (!source) throw new Error("pricing unavailable");
    pricing.innerHTML = source.innerHTML;
    const freeCta = pricing.querySelector("[data-free-teacher-cta]");
    const proSecurity = pricing.querySelector(".checkout-security");
    if (freeCta && proSecurity) {
      const securitySpacer = proSecurity.cloneNode(true);
      securitySpacer.classList.add("pricing-card-spacer");
      securitySpacer.setAttribute("aria-hidden", "true");
      const statusSpacer = document.createElement("p");
      statusSpacer.className = "status pricing-card-spacer";
      statusSpacer.setAttribute("aria-hidden", "true");
      freeCta.after(securitySpacer, statusSpacer);
    }
    if (freeCta && currentPlan) {
      const current = document.createElement("button");
      current.type = "button";
      current.disabled = true;
      current.className = "button-secondary current-plan-cta";
      current.dataset.freeTeacherCta = "";
      current.textContent = freeCta.dataset.currentPlanLabel;
      freeCta.replaceWith(current);
    } else if (freeCta && signInTarget) {
      freeCta.addEventListener("click", (event) => {
        event.preventDefault();
        history.replaceState({}, "", freeCta.href);
        focusTeacherSignIn();
      });
    }
    main.append(pricing);
    document.body.dataset.productLocale = locale;
    await import("./pricingApp.mjs");
    if (location.hash === "#pricing") pricing.scrollIntoView();
  } catch {
    // Pricing remains available as a standalone page if this optional section fails.
  }
}

async function renderLogin() {
  const config = await api("/api/config").catch(() => ({
    googleAuthConfigured: false,
  }));
  root.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "product-shell teacher-login-shell";
  wrapper.append(nav({ signedIn: false }));
  const main = document.createElement("main");
  main.className = "product-main teacher-main teacher-login-main has-pricing";
  const card = document.createElement("section");
  card.id = "teacher-sign-in";
  card.className = "product-card auth-card";
  const title = document.createElement("h1");
  title.textContent = copy.signInTitle;
  const text = document.createElement("p");
  text.textContent = copy.signInCopy;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "google-sign-in";
  button.innerHTML = `<svg class="google-logo" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.807.54-1.836.86-3.048.86-2.345 0-4.332-1.584-5.044-3.715H.95v2.332A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.956 10.707A5.4 5.4 0 0 1 3.674 9c0-.592.102-1.167.282-1.707V4.96H.95A9 9 0 0 0 0 9c0 1.454.348 2.832.95 4.04l3.006-2.333Z"/><path fill="#EA4335" d="M9 3.578c1.322 0 2.508.454 3.442 1.345l2.582-2.582C13.463.89 11.426 0 9 0A9 9 0 0 0 .95 4.96l3.006 2.333C4.668 5.162 6.655 3.578 9 3.578Z"/></svg><span>${copy.signIn}</span>`;
  const status = statusElement(card);
  card.prepend(title, text, button);
  button.disabled = !config.googleAuthConfigured;
  if (!config.googleAuthConfigured) {
    status.textContent = copy.authMissing;
    status.className = "status error";
  }
  button.addEventListener("click", async () => {
    trackEvent("teacher_auth_started");
    button.disabled = true;
    status.textContent = copy.loading;
    try {
      const response = await api("/api/auth/sign-in/social", {
        method: "POST",
        body: JSON.stringify({
          provider: "google",
          callbackURL: teacherCallbackURL(),
        }),
      });
      if (!response.url) throw new Error(copy.error);
      try {
        sessionStorage.setItem(AUTH_PENDING_KEY, "1");
      } catch {}
      location.href = response.url;
    } catch (error) {
      status.textContent = error.message;
      status.className = "status error";
      button.disabled = false;
    }
  });
  main.append(card);
  wrapper.append(main, footer());
  root.append(wrapper);
  await appendPricing(main, { signInTarget: true });
  if (location.hash === "#teacher-sign-in") focusTeacherSignIn();
}

function usageCards(data) {
  const grid = document.createElement("div");
  grid.className = "grid";
  const values = [
    [
      m("activeUsage", {
        used: data.activeAssignments,
        limit: data.limits.activeAssignments,
      }),
      "",
    ],
    [
      data.limits.monthlyAttempts === null
        ? copy.unlimited
        : m("submissionUsage", {
            used: data.monthlyAttempts,
            limit: data.limits.monthlyAttempts,
          }),
      "",
    ],
    [
      data.limits.savedLists === null
        ? copy.savedListsUnlimited
        : m("savedListsUsage", {
            used: data.savedLists,
            limit: data.limits.savedLists,
          }),
      "",
    ],
    [
      m("learnerUsage", {
        used: data.learnerProfiles,
        limit: data.limits.learnerProfiles,
      }),
      "",
    ],
  ];
  for (const [text] of values) {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.textContent = text;
    grid.append(card);
  }
  return grid;
}

function showSectionError(section, error, ctaLocation) {
  section.querySelector(".section-error")?.remove();
  const notice = document.createElement("div");
  notice.className = "notice section-error";
  const message = document.createElement("p");
  message.textContent = error.message;
  notice.append(message);
  if (ctaLocation) notice.append(upgradeLink(ctaLocation));
  section.append(notice);
}

function renderSavedLists(me, savedLists) {
  const section = document.createElement("section");
  section.className = "product-card";
  const heading = document.createElement("h2");
  heading.textContent = copy.savedLists;
  const intro = document.createElement("p");
  intro.textContent = copy.savedListsCopy;
  const form = document.createElement("form");
  form.className = "product-form compact-form";
  form.innerHTML = `
    <div class="field"><label for="saved-list-title">${copy.listTitle}</label><input id="saved-list-title" maxlength="80" required placeholder="${copy.listTitlePlaceholder}"></div>
    <div class="field"><label for="saved-list-words">${copy.words}</label><textarea id="saved-list-words" required spellcheck="false" placeholder="${copy.wordsHelp}"></textarea></div>
    <div class="actions"><button type="submit">${copy.saveList}</button></div>`;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api("/api/saved-lists", {
        method: "POST",
        body: JSON.stringify({
          title: form.querySelector("#saved-list-title").value,
          words: form.querySelector("#saved-list-words").value,
        }),
      });
      await renderDashboard(me);
    } catch (error) {
      button.disabled = false;
      showSectionError(
        section,
        error,
        error.code === "saved_list_limit" ? "saved_list_limit" : null,
      );
    }
  });
  section.append(heading, intro, form);
  const list = document.createElement("div");
  list.className = "assignment-list workspace-list";
  for (const savedList of savedLists) {
    const row = document.createElement("article");
    row.className = "assignment-row";
    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = savedList.title;
    const summary = document.createElement("p");
    summary.className = "assignment-meta";
    summary.textContent = m("wordCount", { count: savedList.words.length });
    body.append(title, summary);
    const actions = document.createElement("div");
    actions.className = "actions compact-actions";
    const use = document.createElement("button");
    use.type = "button";
    use.textContent = copy.useList;
    use.addEventListener("click", () =>
      saveAssignmentDraft(savedList.words, savedList.title),
    );
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button-secondary";
    edit.textContent = copy.edit;
    edit.addEventListener("click", async () => {
      const titleValue = prompt(copy.listTitlePrompt, savedList.title);
      if (titleValue === null) return;
      const wordsValue = prompt(
        copy.listWordsPrompt,
        savedList.words.join("\n"),
      );
      if (wordsValue === null) return;
      try {
        await api(`/api/saved-lists/${savedList.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: titleValue, words: wordsValue }),
        });
        await renderDashboard(me);
      } catch (error) {
        showSectionError(section, error);
      }
    });
    const duplicate = document.createElement("button");
    duplicate.type = "button";
    duplicate.className = "button-secondary";
    duplicate.textContent = copy.copyList;
    duplicate.addEventListener("click", async () => {
      try {
        await api("/api/saved-lists", {
          method: "POST",
          body: JSON.stringify({
            title: m("copyListTitle", { title: savedList.title }).slice(0, 80),
            words: savedList.words,
          }),
        });
        await renderDashboard(me);
      } catch (error) {
        showSectionError(
          section,
          error,
          error.code === "saved_list_limit" ? "saved_list_limit" : null,
        );
      }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button-danger";
    remove.textContent = copy.deleteList;
    remove.addEventListener("click", async () => {
      if (!confirm(copy.deleteListConfirm)) return;
      await api(`/api/saved-lists/${savedList.id}`, { method: "DELETE" });
      await renderDashboard(me);
    });
    actions.append(use, edit, duplicate, remove);
    row.append(body, actions);
    list.append(row);
  }
  if (savedLists.length) section.append(list);
  return section;
}

function renderLearners(me, learners) {
  const section = document.createElement("section");
  section.className = "product-card";
  const heading = document.createElement("h2");
  heading.textContent = copy.learners;
  const intro = document.createElement("p");
  intro.textContent = copy.learnersCopy;
  const form = document.createElement("form");
  form.className = "product-form compact-form inline-form";
  form.innerHTML = `<div class="field"><label for="learner-name">${copy.learnerName}</label><input id="learner-name" maxlength="40" required placeholder="${copy.learnerNamePlaceholder}"></div><div class="actions"><button type="submit">${copy.addLearner}</button></div>`;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api("/api/learners", {
        method: "POST",
        body: JSON.stringify({
          name: form.querySelector("#learner-name").value,
        }),
      });
      await renderDashboard(me);
    } catch (error) {
      button.disabled = false;
      showSectionError(
        section,
        error,
        error.code === "learner_limit" ? "learner_limit" : null,
      );
    }
  });
  section.append(heading, intro, form);
  const list = document.createElement("div");
  list.className = "assignment-list workspace-list";
  for (const learner of learners) {
    const row = document.createElement("article");
    row.className = "assignment-row";
    const body = document.createElement("div");
    const titleRow = document.createElement("div");
    titleRow.className = "assignment-title-row";
    const title = document.createElement("h3");
    title.textContent = learner.name;
    titleRow.append(title);
    if (learner.archived) {
      const badge = document.createElement("span");
      badge.className = "badge closed";
      badge.textContent = copy.archived;
      titleRow.append(badge);
    }
    const summary = document.createElement("p");
    summary.className = "assignment-meta";
    summary.textContent = m("learnerSummary", {
      count: learner.completed_attempts,
      accuracy: learner.accuracy,
    });
    body.append(titleRow, summary);
    const actions = document.createElement("div");
    actions.className = "actions compact-actions";
    const open = document.createElement("a");
    open.className = "button-link button-secondary";
    open.href = `/teacher/learners/${learner.id}?lang=${encodeURIComponent(locale)}`;
    open.textContent = copy.viewLearner;
    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "button-secondary";
    rename.textContent = copy.rename;
    rename.addEventListener("click", async () => {
      const name = prompt(copy.learnerNamePrompt, learner.name);
      if (name === null) return;
      try {
        await api(`/api/learners/${learner.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        await renderDashboard(me);
      } catch (error) {
        showSectionError(section, error);
      }
    });
    const archive = document.createElement("button");
    archive.type = "button";
    archive.className = "button-secondary";
    archive.textContent = learner.archived
      ? copy.restoreLearner
      : copy.archiveLearner;
    archive.addEventListener("click", async () => {
      await api(`/api/learners/${learner.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !learner.archived }),
      });
      await renderDashboard(me);
    });
    actions.append(open, rename, archive);
    row.append(body, actions);
    list.append(row);
  }
  if (learners.length) section.append(list);
  return section;
}

async function renderDashboard(me) {
  const data = await api("/api/assignments");
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card teacher-dashboard-card";
  const heading = document.createElement("h1");
  heading.textContent = copy.dashboardTitle;
  const greeting = document.createElement("p");
  greeting.textContent = m("greeting", { name: me.user.name });
  const plan = document.createElement("span");
  plan.className = `badge teacher-plan-badge ${me.plan === "pro" ? "pro" : ""}`;
  plan.textContent = m("plan", { plan: me.plan === "pro" ? "Pro" : "Free" });
  const actions = document.createElement("div");
  actions.className = "actions";
  const create = document.createElement("a");
  create.className = "button-link";
  create.href = `/teacher/assignments/new?lang=${encodeURIComponent(locale)}`;
  create.textContent = copy.newAssignment;
  const billing = document.createElement(me.plan === "pro" ? "button" : "a");
  if (me.plan === "pro") {
    billing.type = "button";
    billing.className = "button-secondary";
    billing.textContent = copy.manageBilling;
    billing.addEventListener("click", openPortal);
  } else {
    billing.href = "#pricing";
    billing.className = "button-link pro";
    billing.textContent = copy.upgrade;
  }
  actions.append(create, billing);
  card.append(heading, greeting, plan, usageCards(data.usage), actions);
  main.append(card);

  const listCard = document.createElement("section");
  listCard.className = "product-card";
  const listHeading = document.createElement("h2");
  listHeading.textContent = copy.assignments;
  listCard.append(listHeading);
  if (!data.assignments.length) {
    const empty = document.createElement("p");
    empty.textContent = copy.noAssignments;
    listCard.append(empty);
  } else {
    const list = document.createElement("div");
    list.className = "assignment-list";
    for (const assignment of data.assignments) {
      const row = document.createElement("article");
      row.className = "assignment-row";
      const body = document.createElement("div");
      const titleRow = document.createElement("div");
      titleRow.className = "assignment-title-row";
      const title = document.createElement("h3");
      title.textContent = assignment.title;
      const badges = document.createElement("div");
      badges.className = "assignment-meta";
      const state = document.createElement("span");
      state.className = `badge assignment-row-status ${assignment.status === "closed" ? "closed" : ""}`;
      state.textContent =
        assignment.status === "closed"
          ? copy.statusClosed
          : copy.statusPublished;
      for (const text of [
        m("students", { count: assignment.student_count }),
        m("attempts", { count: assignment.attempt_count }),
        m("average", { count: assignment.average_accuracy }),
        m("due", { date: date(assignment.expires_at) }),
      ]) {
        const item = document.createElement("span");
        item.textContent = text;
        badges.append(item);
      }
      titleRow.append(title, state);
      body.append(titleRow, badges);
      const link = document.createElement("a");
      link.className = "button-link button-secondary";
      link.href = `/teacher/assignments/${assignment.id}?lang=${encodeURIComponent(locale)}`;
      link.textContent = copy.open;
      row.append(body, link);
      list.append(row);
    }
    listCard.append(list);
  }
  main.append(listCard);
  main.append(
    renderSavedLists(me, data.savedLists || []),
    renderLearners(me, data.learners || []),
  );
  if (me.plan !== "pro") await appendPricing(main, { currentPlan: true });
}

async function openPortal() {
  try {
    const data = await api("/api/billing/portal", {
      method: "POST",
      body: JSON.stringify({ locale }),
    });
    if (data.url) location.href = data.url;
  } catch (error) {
    alert(error.message);
  }
}

async function startCheckout(interval) {
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_LOCALE_KEY, locale);
  } catch {}
  trackEvent("checkout_started", { billing_interval: interval });
  const checkout = await api("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ interval, locale }),
  });
  if (!checkout?.url) throw new Error(copy.error);
  trackEvent("checkout_redirected", { billing_interval: interval });
  try {
    sessionStorage.removeItem("pendingCheckoutInterval");
    sessionStorage.removeItem(PURCHASE_RECORDED_KEY);
  } catch {}
  location.href = checkout.url;
}

function showCheckoutRetry(interval, error) {
  const main = root.querySelector(".product-main");
  if (!main) return;
  main.querySelector(".checkout-retry-notice")?.remove();
  const notice = document.createElement("section");
  notice.className = "notice checkout-retry-notice";
  notice.setAttribute("role", "alert");
  const message = document.createElement("p");
  message.textContent = copy.checkoutRetry;
  const status = document.createElement("p");
  status.className = "status error";
  status.textContent = error.message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "button-secondary";
  retry.textContent = copy.retryCheckout;
  retry.addEventListener("click", async () => {
    retry.disabled = true;
    status.textContent = copy.loading;
    status.className = "status";
    try {
      await startCheckout(interval);
    } catch (retryError) {
      status.textContent = retryError.message;
      status.className = "status error";
      retry.disabled = false;
    }
  });
  notice.append(message, retry, status);
  main.prepend(notice);
}

async function renderNew() {
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card";
  const heading = document.createElement("h1");
  heading.textContent = copy.newTitle;
  const headingRow = document.createElement("div");
  headingRow.className = "assignment-form-heading";
  const backLink = document.createElement("a");
  backLink.className = "button-link button-secondary";
  backLink.href = `/teacher?lang=${encodeURIComponent(locale)}`;
  backLink.textContent = copy.backToDashboard;
  headingRow.append(heading, backLink);
  const form = document.createElement("form");
  form.className = "product-form";
  const defaultDeadline = new Date(Date.now() + 7 * 86_400_000);
  defaultDeadline.setSeconds(0, 0);
  let draftWords = "";
  let draftTitle = "";
  let draftMode = "dictation";
  try {
    draftWords = sessionStorage.getItem("mySpellingTeacherDraftWords") || "";
    draftTitle = sessionStorage.getItem("mySpellingTeacherDraftTitle") || "";
    draftMode =
      sessionStorage.getItem("mySpellingTeacherDraftMode") || "dictation";
  } catch {}
  form.innerHTML = `
    <div class="field"><label for="assignment-title">${copy.assignmentTitle}</label><input id="assignment-title" maxlength="80" required placeholder="${copy.titlePlaceholder}"></div>
    <div class="field"><label for="assignment-words">${copy.words}</label><textarea id="assignment-words" required spellcheck="false"></textarea><small>${copy.wordsHelp}</small></div>
    <fieldset><legend>${copy.mode}</legend><div class="radio-row"><label><input type="radio" name="mode" value="dictation"> ${copy.dictation}</label><label><input type="radio" name="mode" value="typing"> ${copy.typing}</label></div></fieldset>
    <div class="grid"><div class="field"><label for="assignment-deadline">${copy.deadline}</label><input id="assignment-deadline" type="datetime-local" required></div><div class="field"><label for="assignment-max">${copy.maxAttempts}</label><select id="assignment-max">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option>${n}</option>`).join("")}</select></div></div>
    <div class="actions"><button type="submit">${copy.publish}</button></div>`;
  form.querySelector("#assignment-words").value = draftWords;
  form.querySelector("#assignment-title").value = draftTitle;
  form.querySelector(
    `input[name="mode"][value="${draftMode === "typing" ? "typing" : "dictation"}"]`,
  ).checked = true;
  const local = new Date(
    defaultDeadline.getTime() - defaultDeadline.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16);
  form.querySelector("#assignment-deadline").value = local;
  const status = statusElement(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = copy.creating;
    try {
      const mode = form.querySelector('input[name="mode"]:checked').value;
      const result = await api("/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          title: form.querySelector("#assignment-title").value,
          words: form.querySelector("#assignment-words").value,
          mode,
          expiresAt: new Date(
            form.querySelector("#assignment-deadline").value,
          ).toISOString(),
          maxAttempts: Number(form.querySelector("#assignment-max").value),
        }),
      });
      try {
        sessionStorage.removeItem("mySpellingTeacherDraftWords");
        sessionStorage.removeItem("mySpellingTeacherDraftTitle");
        sessionStorage.removeItem("mySpellingTeacherDraftMode");
      } catch {}
      trackEvent("assignment_created", {
        mode,
        word_count: String(form.querySelector("#assignment-words").value)
          .split(/\s+/)
          .filter(Boolean).length,
      });
      location.href = `/teacher/assignments/${result.id}?lang=${encodeURIComponent(locale)}`;
    } catch (error) {
      status.textContent = error.message;
      status.className = "status error";
      button.disabled = false;
      button.textContent = copy.publish;
    }
  });
  card.append(headingRow, form);
  main.append(card);
}

function statCard(label, value) {
  const card = document.createElement("div");
  card.className = "stat-card";
  const number = document.createElement("span");
  number.className = "stat-value";
  number.textContent = value;
  const text = document.createElement("span");
  text.textContent = label;
  card.append(number, text);
  return card;
}

async function renderDetail(me, id) {
  const data = await api(`/api/assignments/${id}`);
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card";
  const heading = document.createElement("h1");
  heading.textContent = data.title;
  const badge = document.createElement("span");
  badge.className = `badge ${data.status === "closed" ? "closed" : ""}`;
  badge.textContent =
    data.status === "closed" ? copy.statusClosed : copy.statusPublished;
  const titleRow = document.createElement("div");
  titleRow.className = "assignment-title-row";
  titleRow.append(heading, badge);
  const headingRow = document.createElement("div");
  headingRow.className = "assignment-detail-heading";
  const backLink = document.createElement("a");
  backLink.className = "button-link button-secondary";
  backLink.href = `/teacher?lang=${encodeURIComponent(locale)}`;
  backLink.textContent = copy.backToDashboard;
  headingRow.append(titleRow, backLink);
  const linkLabel = document.createElement("h2");
  linkLabel.textContent = copy.studentLink;
  const studentUrl = `${location.origin}/a/${data.public_id}?lang=${encodeURIComponent(locale)}`;
  const linkPanel = document.createElement("div");
  linkPanel.className = "assignment-student-link";
  const link = document.createElement("a");
  link.href = studentUrl;
  link.textContent = studentUrl;
  link.rel = "noreferrer";
  linkPanel.append(link);
  const actions = document.createElement("div");
  actions.className = "actions";
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = copy.copyLink;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "button-secondary";
  toggle.textContent = data.status === "published" ? copy.close : copy.reopen;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "button-danger";
  remove.textContent = copy.deleteAssignment;
  const saveList = document.createElement("button");
  saveList.type = "button";
  saveList.className = "button-secondary";
  saveList.textContent = copy.saveAssignmentAsList;
  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(studentUrl);
    copyButton.textContent = copy.copied;
    trackEvent("assignment_link_copied", {
      mode: data.mode,
      word_count: data.words.length,
    });
  });
  toggle.addEventListener("click", async () => {
    await api(`/api/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: data.status === "published" ? "closed" : "published",
      }),
    });
    location.reload();
  });
  remove.addEventListener("click", async () => {
    if (!confirm(copy.deleteConfirm)) return;
    await api(`/api/assignments/${id}`, { method: "DELETE" });
    location.href = `/teacher?lang=${encodeURIComponent(locale)}`;
  });
  saveList.addEventListener("click", async () => {
    try {
      await api("/api/saved-lists", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          words: data.words.map((word) => word.word),
        }),
      });
      saveList.disabled = true;
      saveList.textContent = copy.listSaved;
    } catch (error) {
      showSectionError(
        card,
        error,
        error.code === "saved_list_limit" ? "saved_list_limit" : null,
      );
    }
  });
  actions.append(copyButton, saveList, toggle);
  if (me.plan === "pro") {
    const exportLink = document.createElement("a");
    exportLink.className = "button-link button-secondary";
    exportLink.href = `/api/assignments/${id}/export.csv`;
    exportLink.textContent = copy.exportCsv;
    actions.append(exportLink);
  }
  actions.append(remove);
  card.append(headingRow, linkLabel, linkPanel, actions);
  main.append(card);
  const summary = document.createElement("section");
  summary.className = "product-card";
  const summaryTitle = document.createElement("h2");
  summaryTitle.textContent = copy.detailTitle;
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.append(
    statCard(copy.summaryStudents, data.summary.students),
    statCard(copy.summaryAverage, `${data.summary.averageAccuracy}%`),
    statCard(copy.summarySubmissions, data.summary.attempts),
  );
  summary.append(summaryTitle, grid);
  main.append(summary);
  const review = document.createElement("section");
  review.className = "product-card";
  const reviewTitle = document.createElement("h2");
  reviewTitle.textContent = copy.smartReview;
  const reviewCopy = document.createElement("p");
  reviewCopy.textContent = copy.smartReviewValue;
  review.append(reviewTitle, reviewCopy);
  if (me.plan === "pro") {
    const createReview = document.createElement("button");
    createReview.type = "button";
    createReview.textContent = copy.createReview;
    review.append(createReview);
    const reviewStatus = statusElement(review);
    createReview.addEventListener("click", async () => {
      createReview.disabled = true;
      try {
        const result = await api(`/api/assignments/${id}/review`, {
          method: "POST",
          body: "{}",
        });
        if (!result.words.length) {
          reviewStatus.textContent = copy.noReviewWords;
          return;
        }
        saveAssignmentDraft(
          result.words,
          m("reviewDraftTitle", { name: data.title }),
        );
      } catch (error) {
        reviewStatus.textContent = error.message;
        reviewStatus.className = "status error";
        createReview.disabled = false;
      }
    });
  } else {
    const locked = document.createElement("p");
    locked.textContent = copy.smartReviewUpgrade;
    review.append(locked, upgradeLink("smart_review"));
  }
  main.append(review);
  const results = document.createElement("section");
  results.className = "product-card";
  const resultTitle = document.createElement("h2");
  resultTitle.textContent = copy.results;
  results.append(resultTitle);
  if (!data.attempts.length) {
    const empty = document.createElement("p");
    empty.textContent = copy.noResults;
    results.append(empty);
  } else {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const table = document.createElement("table");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const text of [
      copy.nickname,
      copy.attempt,
      copy.attemptStatus,
      copy.score,
      copy.accuracy,
      copy.missedWords,
      copy.duration,
      copy.completed,
      "",
    ]) {
      const th = document.createElement("th");
      th.textContent = text;
      headRow.append(th);
    }
    head.append(headRow);
    table.append(head);
    const body = document.createElement("tbody");
    for (const attempt of data.attempts) {
      const row = document.createElement("tr");
      for (const value of [
        attempt.nickname,
        attempt.attempt_number ?? "—",
        attempt.status === "incomplete"
          ? copy.statusIncomplete
          : copy.statusCompleted,
        `${attempt.correct_count}/${attempt.correct_count + attempt.incorrect_count}`,
        `${attempt.accuracy}%`,
        attempt.missed_words.join(", ") || "—",
        duration(attempt.duration_seconds),
        date(attempt.completed_at),
      ]) {
        const td = document.createElement("td");
        td.textContent = value;
        row.append(td);
      }
      const actionCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.className = "button-secondary";
      deleteButton.type = "button";
      deleteButton.textContent = copy.deleteResult;
      deleteButton.addEventListener("click", async () => {
        const deleteButtons = results.querySelectorAll("tbody button");
        for (const button of deleteButtons) button.disabled = true;
        results.querySelector(".delete-result-error")?.remove();
        try {
          await api(`/api/assignments/${id}/attempts/${attempt.id}`, {
            method: "DELETE",
          });
          await renderDetail(me, id);
        } catch {
          for (const button of deleteButtons) button.disabled = false;
          const notice = document.createElement("p");
          notice.className = "status error delete-result-error";
          notice.setAttribute("role", "alert");
          notice.textContent = copy.deleteResultFailed;
          results.append(notice);
        }
      });
      actionCell.append(deleteButton);
      row.append(actionCell);
      body.append(row);
    }
    table.append(body);
    wrap.append(table);
    results.append(wrap);
  }
  main.append(results);
  if (data.summary.attempts > 0 && !assignmentResultsViewed) {
    assignmentResultsViewed = true;
    trackEvent("assignment_results_viewed", {
      mode: data.mode,
      word_count: data.words.length,
    });
  }
  const misses = document.createElement("section");
  misses.className = "product-card";
  const missesTitle = document.createElement("h2");
  missesTitle.textContent = copy.commonMisses;
  misses.append(missesTitle);
  if (data.missedWordStats === null) {
    const locked = document.createElement("p");
    locked.textContent = copy.proStatsLocked;
    misses.append(locked);
  } else {
    const list = document.createElement("div");
    list.className = "word-list";
    for (const item of data.missedWordStats) {
      const chip = document.createElement("span");
      chip.className = "word-chip";
      chip.textContent = `${item.word} · ${item.misses}`;
      list.append(chip);
    }
    misses.append(list);
  }
  main.append(misses);
}

async function renderLearner(me, id) {
  const data = await api(`/api/learners/${id}`);
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card";
  const headingRow = document.createElement("div");
  headingRow.className = "assignment-detail-heading";
  const titleRow = document.createElement("div");
  titleRow.className = "assignment-title-row";
  const heading = document.createElement("h1");
  heading.textContent = data.learner.name;
  titleRow.append(heading);
  if (data.learner.archived) {
    const badge = document.createElement("span");
    badge.className = "badge closed";
    badge.textContent = copy.archived;
    titleRow.append(badge);
  }
  const back = document.createElement("a");
  back.className = "button-link button-secondary";
  back.href = `/teacher?lang=${encodeURIComponent(locale)}`;
  back.textContent = copy.backToDashboard;
  headingRow.append(titleRow, back);
  const history = document.createElement("p");
  history.textContent = m("historyWindow", { days: data.historyDays });
  card.append(headingRow, history);
  if (me.plan !== "pro") {
    const historyUpgrade = document.createElement("div");
    historyUpgrade.className = "notice";
    const message = document.createElement("p");
    message.textContent = copy.masteryHistoryUpgrade;
    historyUpgrade.append(message, upgradeLink("mastery_history"));
    card.append(historyUpgrade);
  }
  main.append(card);

  const summary = document.createElement("section");
  summary.className = "product-card";
  const summaryTitle = document.createElement("h2");
  summaryTitle.textContent = copy.mastery;
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.append(
    statCard(copy.completedPractices, data.summary.completedAttempts),
    statCard(copy.summaryAverage, `${data.summary.accuracy}%`),
    statCard(copy.mastered, data.summary.mastered),
    statCard(copy.needsReview, data.summary.needsReview),
  );
  summary.append(summaryTitle, grid);
  main.append(summary);

  const review = document.createElement("section");
  review.className = "product-card";
  const reviewTitle = document.createElement("h2");
  reviewTitle.textContent = copy.smartReview;
  const reviewCopy = document.createElement("p");
  reviewCopy.textContent = copy.smartReviewValue;
  review.append(reviewTitle, reviewCopy);
  if (data.smartReview) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = copy.createReview;
    review.append(button);
    const status = statusElement(review);
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const result = await api(`/api/learners/${id}/review`, {
          method: "POST",
          body: "{}",
        });
        if (!result.words.length) {
          status.textContent = copy.noReviewWords;
          return;
        }
        saveAssignmentDraft(
          result.words,
          m("reviewDraftTitle", { name: data.learner.name }),
        );
      } catch (error) {
        status.textContent = error.message;
        status.className = "status error";
        button.disabled = false;
      }
    });
  } else {
    const locked = document.createElement("p");
    locked.textContent = copy.smartReviewUpgrade;
    review.append(locked, upgradeLink("smart_review"));
  }
  main.append(review);

  const words = document.createElement("section");
  words.className = "product-card";
  const wordsTitle = document.createElement("h2");
  wordsTitle.textContent = copy.wordMasteryProgress;
  words.append(wordsTitle);
  if (!data.words.length) {
    const empty = document.createElement("p");
    empty.textContent = copy.noLearnerHistory;
    words.append(empty);
  } else {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const table = document.createElement("table");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of [
      copy.word,
      copy.masteryStatus,
      copy.correctCount,
      copy.incorrectCount,
      copy.recentResult,
      copy.lastPractice,
    ]) {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.append(th);
    }
    head.append(headRow);
    table.append(head);
    const body = document.createElement("tbody");
    for (const item of data.words) {
      const row = document.createElement("tr");
      const labels = {
        mastered: copy.mastered,
        learning: copy.learning,
        needs_review: copy.needsReview,
      };
      for (const value of [
        item.word,
        labels[item.status],
        item.correctCount,
        item.incorrectCount,
        item.lastResult === "correct"
          ? copy.correctStatus
          : copy.incorrectStatus,
        date(item.lastPracticedAt),
      ]) {
        const td = document.createElement("td");
        td.textContent = value;
        row.append(td);
      }
      body.append(row);
    }
    table.append(body);
    wrap.append(table);
    words.append(wrap);
  }
  main.append(words);
}

function activationCard(message) {
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card auth-card activation-card";
  card.setAttribute("role", "status");
  const heading = document.createElement("h1");
  heading.textContent = message;
  card.append(heading);
  main.append(card);
  return card;
}

async function pollForPro() {
  for (let attempt = 0; attempt < ACTIVATION_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    try {
      const me = await api("/api/me");
      if (me.plan === "pro") return me;
    } catch {
      // Keep the activation status visible and retry within the bounded window.
    }
  }
  return null;
}

function recordPurchase(me) {
  let shouldRecord = false;
  try {
    const pendingLocale = sessionStorage.getItem(PENDING_CHECKOUT_LOCALE_KEY);
    shouldRecord =
      PRODUCT_LOCALES.some(([value]) => value === pendingLocale) &&
      sessionStorage.getItem(PURCHASE_RECORDED_KEY) !== "1";
    if (shouldRecord) sessionStorage.setItem(PURCHASE_RECORDED_KEY, "1");
  } catch {}
  if (!shouldRecord) return;
  const billingInterval = me.billingInterval === "year" ? "year" : "month";
  trackEvent("subscription_started", { billing_interval: billingInterval });
  trackEvent("purchase", {
    billing_interval: billingInterval,
    value: billingInterval === "year" ? 49.99 : 5.99,
    currency: "USD",
  });
}

function clearCheckoutParam() {
  const url = new URL(location.href);
  url.searchParams.set("lang", locale);
  url.searchParams.delete("checkout");
  url.searchParams.delete("interval");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_LOCALE_KEY);
  } catch {}
}

async function renderTeacherRoute(me) {
  const detail = location.pathname.match(
    /^\/teacher\/assignments\/([0-9a-f-]{36})$/i,
  );
  const learner = location.pathname.match(
    /^\/teacher\/learners\/([0-9a-f-]{36})$/i,
  );
  try {
    if (location.pathname === "/teacher/assignments/new") await renderNew();
    else if (detail) await renderDetail(me, detail[1]);
    else if (learner) await renderLearner(me, learner[1]);
    else await renderDashboard(me);
  } catch (error) {
    const main = shell();
    const card = document.createElement("section");
    card.className = "product-card error-card";
    const title = document.createElement("h1");
    title.textContent = error.message;
    card.append(title);
    main.append(card);
  }
}

async function finishProActivation(me) {
  recordPurchase(me);
  clearCheckoutParam();
  await renderTeacherRoute(me);
  const main = root.querySelector(".product-main");
  if (main) {
    const notice = document.createElement("p");
    notice.className = "notice pro-activation-notice";
    notice.setAttribute("role", "status");
    notice.textContent = copy.proActive;
    main.prepend(notice);
  }
}

function showActivationTimeout() {
  const card = activationCard(copy.activationDelayed);
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "button-secondary";
  retry.textContent = copy.checkAgain;
  retry.addEventListener("click", async () => {
    activationCard(copy.activatingPro);
    const me = await pollForPro();
    if (me) await finishProActivation(me);
    else showActivationTimeout();
  });
  card.append(retry);
}

async function init() {
  root.textContent = copy.loading;
  let me;
  try {
    me = await api("/api/me");
  } catch (error) {
    if (error.status === 401) return renderLogin();
    root.textContent = error.message;
    return;
  }
  try {
    if (sessionStorage.getItem(AUTH_PENDING_KEY) === "1") {
      trackEvent("teacher_auth_completed");
      sessionStorage.removeItem(AUTH_PENDING_KEY);
    }
  } catch {}
  let pendingInterval = null;
  let pendingCheckoutError = null;
  try {
    pendingInterval = sessionStorage.getItem("pendingCheckoutInterval");
  } catch {}
  if (pendingInterval === "month" || pendingInterval === "year") {
    try {
      await startCheckout(pendingInterval);
      return;
    } catch (error) {
      pendingCheckoutError = error;
    }
  }
  const params = new URLSearchParams(location.search);
  if (params.get("checkout") === "success") {
    if (me.plan !== "pro") {
      activationCard(copy.activatingPro);
      me = await pollForPro();
      if (!me) {
        showActivationTimeout();
        return;
      }
    }
    await finishProActivation(me);
  } else {
    await renderTeacherRoute(me);
  }
  if (pendingCheckoutError)
    showCheckoutRetry(pendingInterval, pendingCheckoutError);
}

init();
