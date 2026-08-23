import { trackEvent } from "./analytics.mjs";
import {
  PRODUCT_LOCALES,
  productLocale,
  productMessage,
  productMessages,
  setProductLocale,
} from "./productLocale.mjs";

const root = document.getElementById("product-app");
const locale = productLocale();
const copy = productMessages(locale);
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
  invalid_title: "invalidTitle",
  invalid_words: "invalidWords",
  invalid_deadline: "invalidDeadline",
  invalid_max_attempts: "invalidMaxAttempts",
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
    const error = new Error(m(ERROR_KEYS[data.error] || "error"));
    error.code = data.error;
    error.status = response.status;
    throw error;
  }
  return data;
}

function nav() {
  const element = document.createElement("nav");
  element.className = "product-nav";
  element.innerHTML = `
    <a class="product-brand" href="/">${copy.brand}</a>
    <a href="/">${copy.home}</a>
    <a href="/pricing?lang=${encodeURIComponent(locale)}">${copy.pricing}</a>
    <span class="product-nav-spacer"></span>
    <label><span class="muted">${copy.language}</span> <select id="product-language"></select></label>
    <button class="button-secondary" id="sign-out" type="button">${copy.signOut}</button>`;
  const select = element.querySelector("#product-language");
  for (const [value, label] of PRODUCT_LOCALES) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === locale;
    select.append(option);
  }
  select.addEventListener("change", () => setProductLocale(select.value));
  element.querySelector("#sign-out").addEventListener("click", async () => {
    await api("/api/auth/sign-out", { method: "POST", body: "{}" }).catch(
      () => null,
    );
    location.href = `/?lang=${encodeURIComponent(locale)}`;
  });
  return element;
}

function shell() {
  root.replaceChildren();
  const wrapper = document.createElement("div");
  wrapper.className = "product-shell";
  wrapper.append(nav());
  const main = document.createElement("main");
  main.className = "product-main";
  wrapper.append(main);
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

async function renderLogin() {
  const config = await api("/api/config").catch(() => ({
    googleAuthConfigured: false,
  }));
  root.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "product-shell";
  const main = document.createElement("main");
  main.className = "product-main";
  const card = document.createElement("section");
  card.className = "product-card";
  const title = document.createElement("h1");
  title.textContent = copy.signInTitle;
  const text = document.createElement("p");
  text.textContent = copy.signInCopy;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = copy.signIn;
  const status = statusElement(card);
  card.prepend(title, text, button);
  button.disabled = !config.googleAuthConfigured;
  if (!config.googleAuthConfigured) {
    status.textContent = copy.authMissing;
    status.className = "status error";
  }
  button.addEventListener("click", async () => {
    trackEvent("teacher_signup_started");
    button.disabled = true;
    status.textContent = copy.loading;
    try {
      const response = await api("/api/auth/sign-in/social", {
        method: "POST",
        body: JSON.stringify({
          provider: "google",
          callbackURL: `/teacher?lang=${encodeURIComponent(locale)}`,
        }),
      });
      if (!response.url) throw new Error(copy.error);
      location.href = response.url;
    } catch (error) {
      status.textContent = error.message;
      status.className = "status error";
      button.disabled = false;
    }
  });
  main.append(card);
  wrapper.append(main);
  root.append(wrapper);
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
    [m("studentUsage", { used: data.studentNicknames }), ""],
  ];
  for (const [text] of values) {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.textContent = text;
    grid.append(card);
  }
  return grid;
}

async function renderDashboard(me) {
  const data = await api("/api/assignments");
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card";
  const heading = document.createElement("h1");
  heading.textContent = copy.dashboardTitle;
  const greeting = document.createElement("p");
  greeting.textContent = m("greeting", { name: me.user.name });
  const plan = document.createElement("span");
  plan.className = `badge ${me.plan === "pro" ? "pro" : ""}`;
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
    billing.href = `/pricing?lang=${encodeURIComponent(locale)}`;
    billing.className = "button-link pro";
    billing.textContent = copy.upgrade;
  }
  actions.append(create, billing);
  card.append(heading, greeting, plan, usageCards(data.usage), actions);
  main.append(card);

  const listCard = document.createElement("section");
  listCard.className = "product-card";
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
      const title = document.createElement("h3");
      title.textContent = assignment.title;
      const badges = document.createElement("div");
      badges.className = "assignment-meta";
      const state = document.createElement("span");
      state.className = `badge ${assignment.status === "closed" ? "closed" : ""}`;
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
      badges.prepend(state);
      body.append(title, badges);
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
}

async function openPortal() {
  try {
    const data = await api("/api/billing/portal", {
      method: "POST",
      body: "{}",
    });
    if (data.url) location.href = data.url;
  } catch (error) {
    alert(error.message);
  }
}

async function renderNew() {
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card";
  const heading = document.createElement("h1");
  heading.textContent = copy.newTitle;
  const form = document.createElement("form");
  form.className = "product-form";
  const defaultDeadline = new Date(Date.now() + 7 * 86_400_000);
  defaultDeadline.setSeconds(0, 0);
  let draftWords = "";
  let draftMode = "dictation";
  try {
    draftWords = sessionStorage.getItem("mySpellingTeacherDraftWords") || "";
    draftMode =
      sessionStorage.getItem("mySpellingTeacherDraftMode") || "dictation";
  } catch {}
  form.innerHTML = `
    <div class="field"><label for="assignment-title">${copy.assignmentTitle}</label><input id="assignment-title" maxlength="80" required placeholder="${copy.titlePlaceholder}"></div>
    <div class="field"><label for="assignment-words">${copy.words}</label><textarea id="assignment-words" required spellcheck="false"></textarea><small>${copy.wordsHelp}</small></div>
    <fieldset><legend>${copy.mode}</legend><div class="radio-row"><label><input type="radio" name="mode" value="dictation"> ${copy.dictation}</label><label><input type="radio" name="mode" value="typing"> ${copy.typing}</label></div></fieldset>
    <div class="grid"><div class="field"><label for="assignment-deadline">${copy.deadline}</label><input id="assignment-deadline" type="datetime-local" required></div><div class="field"><label for="assignment-max">${copy.maxAttempts}</label><select id="assignment-max">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option>${n}</option>`).join("")}</select></div></div>
    <div class="actions"><button type="submit">${copy.publish}</button><a class="button-link button-secondary" href="/teacher?lang=${encodeURIComponent(locale)}">${copy.cancel}</a></div>`;
  form.querySelector("#assignment-words").value = draftWords;
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
  card.append(heading, form);
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
  const linkLabel = document.createElement("h2");
  linkLabel.textContent = copy.studentLink;
  const studentUrl = `${location.origin}/a/${data.public_id}?lang=${encodeURIComponent(locale)}`;
  const link = document.createElement("a");
  link.href = studentUrl;
  link.textContent = studentUrl;
  link.rel = "noreferrer";
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
  actions.append(copyButton, toggle);
  if (me.plan === "pro") {
    const exportLink = document.createElement("a");
    exportLink.className = "button-link button-secondary";
    exportLink.href = `/api/assignments/${id}/export.csv`;
    exportLink.textContent = copy.exportCsv;
    actions.append(exportLink);
  }
  actions.append(remove);
  card.append(heading, badge, linkLabel, link, actions);
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
        attempt.attempt_number,
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
        await api(`/api/assignments/${id}/attempts/${attempt.id}`, {
          method: "DELETE",
        });
        row.remove();
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
    if (!sessionStorage.getItem("teacherSignupCompletedSent")) {
      trackEvent("teacher_signup_completed");
      sessionStorage.setItem("teacherSignupCompletedSent", "1");
    }
  } catch {}
  try {
    const pendingInterval = sessionStorage.getItem("pendingCheckoutInterval");
    if (pendingInterval === "month" || pendingInterval === "year") {
      sessionStorage.removeItem("pendingCheckoutInterval");
      const checkout = await api("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ interval: pendingInterval }),
      });
      if (checkout.url) {
        location.href = checkout.url;
        return;
      }
    }
  } catch {}
  const params = new URLSearchParams(location.search);
  if (params.get("checkout") === "success") {
    trackEvent("subscription_started", {
      billing_interval: params.get("interval") === "year" ? "year" : "month",
    });
    history.replaceState({}, "", `/teacher?lang=${encodeURIComponent(locale)}`);
  }
  const detail = location.pathname.match(
    /^\/teacher\/assignments\/([0-9a-f-]{36})$/i,
  );
  try {
    if (location.pathname === "/teacher/assignments/new") await renderNew();
    else if (detail) await renderDetail(me, detail[1]);
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

init();
