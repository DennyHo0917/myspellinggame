import {
  clearAssignmentEntryPoint,
  getAssignmentEntryPoint,
  setAssignmentEntryPoint,
  trackEvent,
  trackLockedFeature,
  trackLockedFeatureError,
  trackUsageLimit,
} from "./analytics.mjs";
import {
  PENDING_CHECKOUT_LOCALE_KEY,
  PRODUCT_LOCALES,
  productPagePath,
  productLocale,
  productMessage,
  productMessages,
} from "./productLocale.mjs";
import { analyzeWords } from "./spellingCore.mjs";

const root = document.getElementById("product-app");
const locale = productLocale();
const copy = productMessages(locale);
const PURCHASE_RECORDED_KEY = "teacherPurchaseRecorded";
const AUTH_PENDING_KEY = "teacherOAuthPending";
const AUTH_PROVIDER_KEY = "teacherOAuthProvider";
const ACTIVATION_POLL_ATTEMPTS = 10;
const AVATAR_PATHS = Array.from(
  { length: 23 },
  (_, index) =>
    `/images/avatars/avatar-${String(index + 1).padStart(2, "0")}.jpg`,
);
let assignmentResultsViewed = false;
let workspaceState = null;
const workspaceCache = {
  data: null,
  promise: null,
  reviewCounts: false,
};
let workspaceNavigationBound = false;
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
  checkout_pending: "checkoutPending",
  invalid_title: "invalidTitle",
  invalid_words: "invalidWords",
  word_limit: "wordLimit",
  invalid_example_sentence: "invalidExampleSentence",
  assignment_has_results: "assignmentHasResults",
  invalid_deadline: "invalidDeadline",
  invalid_max_attempts: "invalidMaxAttempts",
  invalid_list_title: "invalidListTitle",
  saved_list_not_found: "savedListNotFound",
  saved_list_limit: "savedListLimit",
  learner_not_found: "learnerNotFound",
  learner_exists: "learnerExists",
  learner_limit: "learnerLimit",
  invalid_avatar: "invalidAvatar",
  smart_review_required: "smartReviewRequired",
  sentence_library_required: "sentenceLibraryRequired",
  invalid_sentence_level: "invalidSentenceLevel",
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
    trackLockedFeatureError(data.error, workspaceState?.me?.plan || "free");
    const error = new Error(m(ERROR_KEYS[data.error] || "error"));
    error.code = data.error;
    error.status = response.status;
    throw error;
  }
  return data;
}

function isPlusPlan(me) {
  return ["parent", "teacher", "plus", "pro"].includes(me.plan);
}

function isTeacherPlan(me) {
  return me.plan === "teacher";
}

function isParentPlan(me) {
  return me.plan === "parent";
}

function workspaceLearnerLabel(me) {
  return me.plan === "free"
    ? copy.freeLearners
    : isParentPlan(me)
      ? copy.familyLearners
      : copy.learners;
}

function learnerAvatar(learner, className = "learner-avatar") {
  if (learner.avatar) {
    const image = document.createElement("img");
    image.className = className;
    image.src = learner.avatar;
    image.alt = "";
    return image;
  }
  const fallback = document.createElement("span");
  fallback.className = `${className} learner-avatar-fallback`;
  fallback.textContent = learner.name
    .trim()
    .charAt(0)
    .toLocaleUpperCase(locale);
  fallback.setAttribute("aria-hidden", "true");
  return fallback;
}

async function uploadedAvatar(file) {
  if (!file.type.startsWith("image/") || file.size > 5_000_000)
    throw new Error(copy.invalidAvatar);
  const source = await createImageBitmap(file);
  if (!source.width || !source.height) {
    source.close();
    throw new Error(copy.invalidAvatar);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  const size = Math.min(source.width, source.height);
  context.drawImage(
    source,
    (source.width - size) / 2,
    (source.height - size) / 2,
    size,
    size,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  source.close();
  const value = canvas.toDataURL("image/jpeg", 0.8);
  if (value.length > 160_000) throw new Error(copy.invalidAvatar);
  return value;
}

function avatarPicker() {
  const field = document.createElement("fieldset");
  field.className = "avatar-picker";
  const legend = document.createElement("legend");
  legend.textContent = copy.chooseAvatar;
  const help = document.createElement("small");
  help.textContent = copy.chooseAvatarHelp;
  const grid = document.createElement("div");
  grid.className = "avatar-picker-grid";
  let value = AVATAR_PATHS[0];
  let uploadedButton = null;
  const select = (button, avatar) => {
    value = avatar;
    grid.querySelectorAll("button").forEach((choice) => {
      const selected = choice === button;
      choice.classList.toggle("is-selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
  };
  AVATAR_PATHS.forEach((path, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatar-choice";
    button.setAttribute("aria-label", m("avatarChoice", { number: index + 1 }));
    const image = document.createElement("img");
    image.src = path;
    image.alt = "";
    image.loading = "lazy";
    button.append(image);
    button.addEventListener("click", () => select(button, path));
    grid.append(button);
  });
  const upload = document.createElement("label");
  upload.className = "button-secondary avatar-upload";
  upload.textContent = copy.uploadAvatar;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
  const error = document.createElement("small");
  error.className = "avatar-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    upload.classList.add("is-loading");
    error.hidden = true;
    try {
      const avatar = await uploadedAvatar(file);
      if (!uploadedButton) {
        uploadedButton = document.createElement("button");
        uploadedButton.type = "button";
        uploadedButton.className = "avatar-choice avatar-uploaded-choice";
        uploadedButton.setAttribute("aria-label", copy.uploadedAvatar);
        uploadedButton.append(document.createElement("img"));
        uploadedButton.addEventListener("click", () =>
          select(uploadedButton, uploadedButton.querySelector("img").src),
        );
        grid.append(uploadedButton);
      }
      uploadedButton.querySelector("img").src = avatar;
      select(uploadedButton, avatar);
    } catch (uploadError) {
      error.textContent = uploadError.message;
      error.hidden = false;
      input.value = "";
    } finally {
      upload.classList.remove("is-loading");
    }
  });
  upload.append(input);
  field.append(legend, help, grid, upload, error);
  const reset = () => {
    uploadedButton?.remove();
    uploadedButton = null;
    input.value = "";
    error.hidden = true;
    select(grid.firstElementChild, AVATAR_PATHS[0]);
  };
  reset();
  return { element: field, value: () => value, reset };
}

function syncFormSubmit(form) {
  form.querySelector('button[type="submit"]').disabled = Boolean(
    form.querySelector('[aria-invalid="true"]'),
  );
}

function attachWordLimit(form, me, wordsSelector, { locked = false } = {}) {
  const input = form.querySelector(wordsSelector);
  if (!input) return;
  const limit = isPlusPlan(me) ? 40 : 30;
  const field = input.closest(".field");
  const count = document.createElement("small");
  count.className = "word-count";
  count.setAttribute("aria-live", "polite");
  const advice = document.createElement("small");
  advice.className = "long-list-advice";
  advice.textContent = copy.longListAdvice;
  const error = document.createElement("small");
  error.className = "word-list-error";
  error.setAttribute("role", "alert");
  const upgrade = upgradeLink("word_limit");
  upgrade.classList.add("word-limit-upgrade");
  field.append(count, advice, error, upgrade);
  const update = () => {
    const analysis = analyzeWords(input.value);
    const overLimit = analysis.words.length > limit;
    const messages = [];
    if (analysis.duplicates.length)
      messages.push(
        m("duplicateWords", { words: analysis.duplicates.join(", ") }),
      );
    if (analysis.tooShort.length)
      messages.push(m("shortWords", { words: analysis.tooShort.join(", ") }));
    if (analysis.tooLong.length)
      messages.push(m("longWords", { words: analysis.tooLong.join(", ") }));
    if (overLimit) messages.push(m("currentWordLimit", { limit }));
    const invalid = !locked && messages.length > 0;
    count.textContent = `${analysis.words.length} / ${limit}`;
    count.classList.toggle("error", overLimit && !locked);
    advice.hidden = analysis.words.length <= 20;
    error.hidden = !invalid;
    error.textContent = messages.join(" ");
    input.setAttribute("aria-invalid", String(invalid));
    syncFormSubmit(form);
    upgrade.hidden = locked || me.plan !== "free" || !overLimit;
  };
  input.addEventListener("input", update);
  form.addEventListener("submit", () => {
    if (analyzeWords(input.value).words.length > limit && me.plan === "free")
      trackLockedFeature("word_limit", me.plan);
  });
  update();
}

function attachSentenceLibraryControls(
  form,
  me,
  wordsSelector,
  sentencesSelector,
  modeSelector = null,
) {
  const sentenceField = form
    .querySelector(sentencesSelector)
    ?.closest(".field");
  if (!sentenceField) return;
  const level = document.createElement("select");
  level.id = `${sentencesSelector.slice(1)}-level`;
  level.innerHTML = `<option value="simple">${copy.sentenceSimple}</option><option value="difficult">${copy.sentenceDifficult}</option>`;
  const levelLabel = document.createElement("label");
  levelLabel.htmlFor = level.id;
  levelLabel.textContent = copy.sentenceLevel;
  const fill = document.createElement("button");
  fill.type = "button";
  fill.className = "button-secondary sentence-library-fill";
  if (isPlusPlan(me)) {
    fill.textContent = copy.fillSentenceLibrary;
  } else {
    fill.textContent = copy.fillSentenceLibraryPlus;
  }
  fill.addEventListener("click", async () => {
    if (!isPlusPlan(me)) {
      showLockedFeaturePlan(
        sentenceField,
        copy.sentenceLibraryRequired,
        "sentence_library",
      );
      return;
    }
    const words = form.querySelector(wordsSelector).value;
    fill.disabled = true;
    try {
      const { matches } = await api("/api/sentence-library/match", {
        method: "POST",
        body: JSON.stringify({ words, difficulty: level.value }),
      });
      const lines = words
        .split(/\r?\n/)
        .map((word) => word.trim())
        .filter(Boolean);
      const existing = form
        .querySelector(sentencesSelector)
        .value.split(/\r?\n/);
      form.querySelector(sentencesSelector).value = lines
        .map(
          (word, index) =>
            existing[index]?.trim() || matches[word.toLowerCase()] || "",
        )
        .join("\n");
    } catch (error) {
      showSectionError(
        form.closest("section") || form,
        error,
        error.code === "sentence_library_required" ? "sentence_library" : null,
      );
    } finally {
      fill.disabled = false;
    }
  });
  const controls = document.createElement("div");
  controls.className = "sentence-library-controls";
  controls.append(levelLabel, level, fill);
  sentenceField.append(controls);
  if (modeSelector) {
    const update = () => {
      const mode = form.querySelector(`${modeSelector}:checked`)?.value;
      sentenceField.hidden = mode === "word-rain";
    };
    form.addEventListener("change", update);
    update();
  }
}

function nav({ workspace = false, me = null } = {}) {
  const element = document.createElement("nav");
  element.className = "product-nav teacher-product-nav";
  const homeHref = productPagePath("", locale);
  const languageOptions = PRODUCT_LOCALES.map(
    ([value, label]) =>
      `<a class="lang-option" href="?lang=${encodeURIComponent(value)}"${value === locale ? ' aria-current="page"' : ""}>${label}</a>`,
  ).join("");
  element.innerHTML = `
    <a class="product-brand" href="${homeHref}"><img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt=""><span>${copy.brand}</span></a>
    ${workspace ? `<button class="workspace-drawer-toggle" id="workspace-menu-toggle" type="button" aria-label="${copy.openWorkspaceMenu}" aria-expanded="false"><span aria-hidden="true">☰</span></button>` : ""}
    <div class="product-nav-actions">
      <details class="language-switcher"><summary class="lang-btn" aria-label="${copy.language}">${copy.language}</summary><div class="lang-menu">${languageOptions}</div></details>
      ${workspace ? "" : `<a class="button-link button-secondary" href="${homeHref}">${copy.homePage}</a>`}
    </div>`;
  if (!workspace || !me) return element;
  const actions = element.querySelector(".product-nav-actions");
  const languageSwitcher = element.querySelector(".language-switcher");
  const userMenu = document.createElement("details");
  userMenu.className = "workspace-user-menu";
  const userToggle = document.createElement("summary");
  userToggle.className = "workspace-user-toggle";
  userToggle.setAttribute("role", "button");
  userToggle.setAttribute("aria-haspopup", "menu");
  userToggle.setAttribute("aria-expanded", "false");
  userToggle.setAttribute("aria-label", me.user.name);
  const avatar = document.createElement("span");
  avatar.className = "workspace-user-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = me.user.name.trim().charAt(0).toUpperCase() || "?";
  const userName = document.createElement("span");
  userName.className = "workspace-user-name";
  userName.textContent = me.user.name;
  userToggle.append(avatar, userName);
  const menu = document.createElement("div");
  menu.className = "workspace-user-dropdown";
  menu.setAttribute("role", "menu");
  const email = document.createElement("div");
  email.className = "workspace-user-email";
  email.textContent = me.user.email;
  email.setAttribute("role", "presentation");
  const logout = document.createElement("button");
  logout.type = "button";
  logout.className = "workspace-user-action";
  logout.textContent = copy.signOut;
  logout.setAttribute("role", "menuitem");
  logout.addEventListener("click", signOut);
  menu.append(email, logout);
  userMenu.append(userToggle, menu);
  userMenu.addEventListener("toggle", () => {
    userToggle.setAttribute("aria-expanded", String(userMenu.open));
    if (userMenu.open) languageSwitcher.open = false;
  });
  languageSwitcher.addEventListener("toggle", () => {
    if (languageSwitcher.open) userMenu.open = false;
  });
  userMenu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      userMenu.open = false;
      userToggle.focus();
    } else if (event.key === "ArrowDown" && event.target === userToggle) {
      event.preventDefault();
      userMenu.open = true;
      menu.querySelector('[role="menuitem"]').focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!userMenu.contains(event.target)) userMenu.open = false;
  });
  actions.append(userMenu);
  return element;
}

async function signOut() {
  await api("/api/auth/sign-out", { method: "POST", body: "{}" }).catch(
    () => null,
  );
  location.href = productPagePath("", locale);
}

const FOOTER_PAGES = [
  "custom-spelling-words-game",
  "weekly-spelling-practice",
  "sight-word-typing-game",
  "spelling-practice-for-parents",
  "spelling-assignments-for-teachers",
];
const FOOTER_SECONDARY_PAGES = [
  "pricing",
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
  const secondaryLinkGroup = document.createElement("span");
  secondaryLinkGroup.className = "footer-secondary-links";
  FOOTER_SECONDARY_PAGES.forEach((page, index) => {
    const link = document.createElement("a");
    link.href = productPagePath(page, locale);
    link.textContent = copy.footerSecondaryLinks[index];
    if (index) secondaryLinkGroup.append(" · ");
    secondaryLinkGroup.append(link);
  });
  paragraph.append(
    linkGroup,
    document.createElement("br"),
    secondaryLinkGroup,
    document.createElement("br"),
    `© 2026 My Spelling Game ${copy.footerRights}`,
  );
  element.append(paragraph);
  return element;
}

function workspaceIcon(name) {
  const icons = {
    overview:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></svg>',
    assignments:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg>',
    learners:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="7" r="3"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>',
    savedLists:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h8"/></svg>',
    progress:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4 16 6-6 4 4 7-7"/><path d="M15 7h6v6"/></svg>',
    billing:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/></svg>',
  };
  return icons[name] || "•";
}

function workspaceChevron(direction = "left") {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}"/></svg>`;
}

function workspaceSection(value, fallback = "overview") {
  if (value === "saved-lists") return "savedLists";
  return [
    "overview",
    "assignments",
    "learners",
    "savedLists",
    "progress",
  ].includes(value)
    ? value
    : fallback;
}

function workspaceRoute(pathname = location.pathname) {
  return (
    {
      "/teacher": "overview",
      "/teacher/assignments": "assignments",
      "/teacher/learners": "learners",
      "/teacher/saved-lists": "savedLists",
      "/teacher/progress": "progress",
    }[pathname] || null
  );
}

function workspacePath(section) {
  return (
    {
      overview: "/teacher",
      assignments: "/teacher/assignments",
      learners: "/teacher/learners",
      savedLists: "/teacher/saved-lists",
      progress: "/teacher/progress",
    }[section] || "/teacher"
  );
}

function updateWorkspaceActive(section = workspaceRoute()) {
  const active = workspaceSection(section);
  root
    .querySelectorAll(".workspace-sidebar-link[data-section]")
    .forEach((link) => {
      if (link.dataset.section === active)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
}

function invalidateWorkspaceCache() {
  workspaceCache.data = null;
  workspaceCache.reviewCounts = false;
}

async function refreshWorkspace(me) {
  invalidateWorkspaceCache();
  return renderDashboard(me, { force: true });
}

async function loadWorkspaceData(section, { force = false } = {}) {
  const needsReviewCounts = section === "overview" || section === "progress";
  if (
    !force &&
    workspaceCache.data &&
    (!needsReviewCounts || workspaceCache.reviewCounts)
  )
    return workspaceCache.data;
  if (!force && workspaceCache.promise) {
    await workspaceCache.promise;
    return loadWorkspaceData(section);
  }
  workspaceCache.promise = api("/api/assignments", {
    headers: needsReviewCounts
      ? { "x-workspace-review-counts": "1" }
      : undefined,
  })
    .then((data) => {
      workspaceCache.data = data;
      workspaceCache.reviewCounts = needsReviewCounts;
      return data;
    })
    .finally(() => {
      workspaceCache.promise = null;
    });
  return workspaceCache.promise;
}

function revalidateWorkspaceData(me, section) {
  if (
    !["overview", "progress"].includes(section) ||
    workspaceCache.reviewCounts
  )
    return;
  loadWorkspaceData(section)
    .then(() => {
      if (workspaceRoute() === section) renderDashboard(me);
    })
    .catch(() => null);
}

async function navigateWorkspace(section, { replace = false } = {}) {
  const path = workspacePath(section);
  const target = `${path}?lang=${encodeURIComponent(locale)}`;
  if (location.pathname !== path || location.search !== `?lang=${locale}`) {
    history[replace ? "replaceState" : "pushState"]({}, "", target);
  }
  updateWorkspaceActive(section);
  if (workspaceState?.me) await renderDashboard(workspaceState.me);
}

function bindWorkspaceNavigation() {
  if (workspaceNavigationBound) return;
  workspaceNavigationBound = true;
  window.addEventListener("popstate", () => {
    if (!workspaceState?.me) return;
    if (workspaceRoute()) renderDashboard(workspaceState.me);
    else renderTeacherRoute(workspaceState.me);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && workspaceState?.me && workspaceRoute())
      refreshWorkspace(workspaceState.me);
  });
}

function shell(me = null, activeSection = "overview") {
  document.body.classList.toggle("workspace-page", Boolean(me));
  if (me) {
    const existing = root.querySelector(".workspace-shell");
    if (existing) {
      const main = existing.querySelector(".teacher-main");
      updateWorkspaceActive(workspaceRoute() || activeSection);
      return main;
    }
  }
  root.replaceChildren();
  const wrapper = document.createElement("div");
  wrapper.className = `product-shell${me ? " workspace-shell" : ""}`;
  wrapper.append(nav({ workspace: Boolean(me), me }));
  if (!me) {
    const main = document.createElement("main");
    main.className = "product-main teacher-main";
    wrapper.append(main, footer());
    root.append(wrapper);
    return main;
  }
  const layout = document.createElement("div");
  layout.className = "workspace-layout";
  const sidebar = document.createElement("aside");
  sidebar.className = "workspace-sidebar";
  sidebar.setAttribute("aria-label", copy.dashboardTitle);
  const planLearners = workspaceLearnerLabel(me);
  const currentHash = location.hash.replace(/^#/, "");
  const requestedSection = new URLSearchParams(location.search).get("section");
  const current =
    workspaceRoute() ||
    workspaceSection(requestedSection || currentHash, activeSection);
  const dashboardHref = `/teacher?lang=${encodeURIComponent(locale)}`;
  const items = [
    ["overview", copy.overview, dashboardHref],
    [
      "assignments",
      copy.assignments,
      `/teacher/assignments?lang=${encodeURIComponent(locale)}`,
    ],
    [
      "learners",
      planLearners,
      `/teacher/learners?lang=${encodeURIComponent(locale)}`,
    ],
    [
      "savedLists",
      copy.savedLists,
      `/teacher/saved-lists?lang=${encodeURIComponent(locale)}`,
    ],
    [
      "progress",
      copy.freeProgress,
      `/teacher/progress?lang=${encodeURIComponent(locale)}`,
    ],
  ];
  const menu = document.createElement("div");
  menu.className = "workspace-sidebar-menu";
  for (const [key, label, href] of items) {
    const link = document.createElement(href ? "a" : "button");
    link.className = "workspace-sidebar-link";
    link.dataset.section = key;
    if (href) link.href = href;
    else link.type = "button";
    link.innerHTML = `<span class="workspace-sidebar-icon" aria-hidden="true">${workspaceIcon(key)}</span><span class="workspace-sidebar-label">${label}</span>`;
    link.setAttribute("aria-label", label);
    link.title = label;
    if (current === key || (key === "overview" && !current))
      link.setAttribute("aria-current", "page");
    link.addEventListener("click", (event) => {
      closeWorkspaceDrawer();
      event.preventDefault();
      navigateWorkspace(key);
    });
    menu.append(link);
  }
  const billing = document.createElement("a");
  billing.className = "workspace-sidebar-link workspace-sidebar-billing";
  billing.href = productPagePath("pricing", locale);
  billing.innerHTML = `<span class="workspace-sidebar-icon" aria-hidden="true">${workspaceIcon("billing")}</span><span class="workspace-sidebar-label">${copy.plansAndBilling}</span>`;
  billing.setAttribute("aria-label", copy.plansAndBilling);
  billing.title = copy.plansAndBilling;
  billing.addEventListener("click", closeWorkspaceDrawer);
  const websiteHome = document.createElement("a");
  websiteHome.className = "workspace-sidebar-link workspace-sidebar-home";
  websiteHome.href = productPagePath("", locale);
  websiteHome.innerHTML = `<span class="workspace-sidebar-icon" aria-hidden="true">${workspaceIcon("overview")}</span><span class="workspace-sidebar-label">${copy.homePage}</span>`;
  websiteHome.setAttribute("aria-label", copy.homePage);
  websiteHome.title = copy.homePage;
  const collapse = document.createElement("button");
  collapse.className = "workspace-sidebar-collapse";
  collapse.type = "button";
  collapse.setAttribute("aria-expanded", "true");
  collapse.setAttribute("aria-label", copy.collapseSidebar);
  collapse.innerHTML = `<span class="workspace-sidebar-icon">${workspaceChevron("left")}</span><span class="workspace-sidebar-label">${copy.collapseSidebar}</span>`;
  collapse.addEventListener("click", () => {
    const collapsed = sidebar.classList.toggle("is-collapsed");
    layout.classList.toggle("is-sidebar-collapsed", collapsed);
    collapse.setAttribute("aria-expanded", String(!collapsed));
    collapse.setAttribute(
      "aria-label",
      collapsed ? copy.expandSidebar : copy.collapseSidebar,
    );
    collapse.innerHTML = `<span class="workspace-sidebar-icon">${workspaceChevron(collapsed ? "right" : "left")}</span><span class="workspace-sidebar-label">${collapsed ? copy.expandSidebar : copy.collapseSidebar}</span>`;
    try {
      localStorage.setItem("workspaceSidebarCollapsed", collapsed ? "1" : "0");
    } catch {}
  });
  sidebar.append(menu, billing, websiteHome, collapse);
  try {
    if (localStorage.getItem("workspaceSidebarCollapsed") === "1")
      collapse.click();
  } catch {}
  layout.append(sidebar);
  const main = document.createElement("main");
  main.className = "product-main teacher-main";
  layout.append(main);
  wrapper.append(layout);
  const overlay = document.createElement("button");
  overlay.className = "workspace-drawer-overlay";
  overlay.type = "button";
  overlay.setAttribute("aria-label", copy.closeWorkspaceMenu);
  overlay.addEventListener("click", () => closeWorkspaceDrawer(true));
  wrapper.append(overlay, footer());
  root.append(wrapper);
  const toggle = wrapper.querySelector("#workspace-menu-toggle");
  const mobileWorkspace = matchMedia("(max-width: 800px)");
  toggle?.addEventListener("click", () => {
    const open = wrapper.classList.toggle("is-drawer-open");
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("workspace-drawer-active", open);
    sidebar.inert = mobileWorkspace.matches && !open;
    if (open) sidebar.querySelector('[aria-current="page"]')?.focus();
  });
  function closeWorkspaceDrawer(restoreFocus = false) {
    const wasOpen = wrapper.classList.contains("is-drawer-open");
    wrapper.classList.remove("is-drawer-open");
    toggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("workspace-drawer-active");
    sidebar.inert = mobileWorkspace.matches;
    if (restoreFocus && wasOpen) toggle?.focus();
  }
  wrapper.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeWorkspaceDrawer(true);
  });
  const syncWorkspaceMode = () => {
    if (!mobileWorkspace.matches) closeWorkspaceDrawer();
    sidebar.inert =
      mobileWorkspace.matches && !wrapper.classList.contains("is-drawer-open");
  };
  mobileWorkspace.addEventListener("change", syncWorkspaceMode);
  syncWorkspaceMode();
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

function showLockedFeaturePlan(host, message, ctaLocation) {
  root
    .querySelectorAll(".locked-feature-plan")
    .forEach((notice) => notice.remove());
  const notice = document.createElement("div");
  notice.className = "notice locked-feature-plan";
  const text = document.createElement("p");
  text.textContent = message;
  const feature = {
    sentence_library: "example_sentences",
    smart_review: "smart_review",
    todays_review: "todays_review",
    word_limit: "word_limit",
    saved_list_limit: "saved_list_limit",
    learner_limit: "learner_limit",
  }[ctaLocation];
  if (feature) trackLockedFeature(feature, workspaceState?.me?.plan || "free");
  notice.append(text, upgradeLink(ctaLocation));
  host.append(notice);
}

function saveAssignmentDraft(words, title = "", exampleSentences = "") {
  try {
    sessionStorage.setItem(
      "mySpellingTeacherDraftWords",
      words
        .map((word) => (typeof word === "string" ? word : word.word))
        .join("\n"),
    );
    sessionStorage.setItem(
      "mySpellingTeacherDraftSentences",
      typeof exampleSentences === "string"
        ? exampleSentences
        : exampleSentences.map((sentence) => sentence || "").join("\n"),
    );
    sessionStorage.setItem("mySpellingTeacherDraftTitle", title.slice(0, 80));
    sessionStorage.setItem("mySpellingTeacherDraftMode", "dictation");
  } catch {}
  setAssignmentEntryPoint("workspace");
  location.href = `/teacher/assignments/new?lang=${encodeURIComponent(locale)}`;
}

function teacherCallbackURL() {
  const pathname = /^\/teacher(?:\/|$)/.test(location.pathname)
    ? location.pathname
    : "/teacher";
  return `${pathname}?lang=${encodeURIComponent(locale)}`;
}

function teacherNewUserCallbackURL() {
  return `${teacherCallbackURL()}&signup=1`;
}

function focusTeacherSignIn() {
  const card = document.getElementById("teacher-sign-in");
  const button = card?.querySelector(
    ".social-sign-in:not(:disabled), .social-sign-in",
  );
  if (!card || !button) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  button.focus({ preventScroll: true });
}

async function renderLogin() {
  const config = await api("/api/config").catch(() => ({
    googleAuthConfigured: false,
    microsoftAuthConfigured: false,
  }));
  root.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "product-shell teacher-login-shell";
  wrapper.append(nav());
  const main = document.createElement("main");
  main.className = "product-main teacher-main teacher-login-main";
  const card = document.createElement("section");
  card.id = "teacher-sign-in";
  card.className = "product-card auth-card";
  const title = document.createElement("h1");
  title.textContent = copy.signInTitle;
  const text = document.createElement("p");
  text.textContent = copy.signInCopy;
  const benefitTitle = document.createElement("h2");
  benefitTitle.textContent = copy.workspaceBenefitTitle;
  const benefitText = document.createElement("p");
  benefitText.textContent = copy.workspaceBenefitCopy;
  const privacyNote = document.createElement("p");
  privacyNote.className = "notice";
  privacyNote.textContent = copy.workspacePrivacyNote;
  const cardCopy = document.createElement("div");
  cardCopy.className = "teacher-login-copy";
  cardCopy.append(title, text, benefitTitle, benefitText, privacyNote);
  const status = statusElement(card);
  const buttons = document.createElement("div");
  buttons.className = "social-sign-in-buttons";
  const providers = [
    {
      id: "google",
      label: copy.signIn,
      configured: config.googleAuthConfigured,
      icon: `<svg class="provider-logo" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.807.54-1.836.86-3.048.86-2.345 0-4.332-1.584-5.044-3.715H.95v2.332A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.956 10.707A5.4 5.4 0 0 1 3.674 9c0-.592.102-1.167.282-1.707V4.96H.95A9 9 0 0 0 0 9c0 1.454.348 2.832.95 4.04l3.006-2.333Z"/><path fill="#EA4335" d="M9 3.578c1.322 0 2.508.454 3.442 1.345l2.582-2.582C13.463.89 11.426 0 9 0A9 9 0 0 0 .95 4.96l3.006 2.333C4.668 5.162 6.655 3.578 9 3.578Z"/></svg>`,
    },
    {
      id: "microsoft",
      label: copy.signInMicrosoft,
      configured: config.microsoftAuthConfigured,
      icon: `<svg class="provider-logo" viewBox="0 0 18 18" aria-hidden="true"><path fill="#F25022" d="M0 0h8.5v8.5H0z"/><path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z"/><path fill="#00A4EF" d="M0 9.5h8.5V18H0z"/><path fill="#FFB900" d="M9.5 9.5H18V18H9.5z"/></svg>`,
    },
  ];
  for (const provider of providers) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `social-sign-in ${provider.id}-sign-in`;
    button.innerHTML = `${provider.icon}<span>${provider.label}</span>`;
    button.disabled = !provider.configured;
    button.addEventListener("click", async () => {
      const entryPoint = getAssignmentEntryPoint();
      trackEvent(
        "teacher_auth_started",
        entryPoint ? { entry_point: entryPoint } : {},
      );
      button.disabled = true;
      status.textContent = copy.loading;
      try {
        const response = await api("/api/auth/sign-in/social", {
          method: "POST",
          body: JSON.stringify({
            provider: provider.id,
            callbackURL: teacherCallbackURL(),
            newUserCallbackURL: teacherNewUserCallbackURL(),
          }),
        });
        if (!response.url) throw new Error(copy.error);
        try {
          sessionStorage.setItem(AUTH_PENDING_KEY, "1");
          sessionStorage.setItem(AUTH_PROVIDER_KEY, provider.id);
        } catch {}
        location.href = response.url;
      } catch (error) {
        status.textContent = error.message;
        status.className = "status error";
        button.disabled = false;
      }
    });
    buttons.append(button);
  }
  card.append(cardCopy, status, buttons);
  if (!config.googleAuthConfigured && !config.microsoftAuthConfigured) {
    status.textContent = copy.authMissing;
    status.className = "status error";
  }
  main.append(card);
  wrapper.append(main, footer());
  root.append(wrapper);
  if (location.hash === "#teacher-sign-in") focusTeacherSignIn();
}

function usageCards(data, me, needsReviewCount) {
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
      m(
        me.plan === "free"
          ? "freeLearnerUsage"
          : isParentPlan(me)
            ? "familyLearnerUsage"
            : "learnerUsage",
        {
          used: data.learnerProfiles,
          limit: data.limits.learnerProfiles,
        },
      ),
      "",
    ],
    [m("needsReviewWords", { count: needsReviewCount }), ""],
  ];
  for (const [text] of values) {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.textContent = text;
    grid.append(card);
  }
  return grid;
}

function submissionLimitNotice(data) {
  const { monthlyAttempts: used, limits } = data;
  const limit = limits.monthlyAttempts;
  if (limit === null || used < 6) return null;
  const reached = used >= limit;
  const notice = document.createElement("div");
  notice.className = "notice submission-limit-notice";
  const message = document.createElement("p");
  message.textContent = m(
    reached ? "submissionLimitReached" : "submissionLimitWarning",
    { used, limit },
  );
  notice.append(
    message,
    upgradeLink(
      reached ? "submission_limit_reached" : "submission_limit_warning",
    ),
  );
  return notice;
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

function renderSavedListsLegacy(me, savedLists) {
  const section = document.createElement("section");
  section.className = "product-card";
  section.id = "saved-lists";
  const heading = document.createElement("h2");
  heading.textContent = copy.freeSavedLists;
  const intro = document.createElement("p");
  intro.textContent = copy.savedListsCopy;
  const form = document.createElement("form");
  form.className = "product-form compact-form";
  form.innerHTML = `
    <div class="field"><label for="saved-list-title">${copy.listTitle}</label><input id="saved-list-title" maxlength="80" required placeholder="${copy.listTitlePlaceholder}"></div>
    <div class="field"><label for="saved-list-words">${copy.words}</label><textarea id="saved-list-words" required spellcheck="false" placeholder="${copy.wordsHelp}"></textarea></div>
    <div class="field"><label for="saved-list-sentences">${copy.exampleSentences}</label><textarea id="saved-list-sentences" maxlength="30000" spellcheck="true" placeholder="${copy.exampleSentencesHelp}"></textarea></div>
    <div class="actions"><button type="submit">${copy.saveList}</button></div>`;
  attachSentenceLibraryControls(
    form,
    me,
    "#saved-list-words",
    "#saved-list-sentences",
  );
  attachWordLimit(form, me, "#saved-list-words");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.querySelector('[aria-invalid="true"]')) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api("/api/saved-lists", {
        method: "POST",
        body: JSON.stringify({
          title: form.querySelector("#saved-list-title").value,
          words: form.querySelector("#saved-list-words").value,
          exampleSentences: form.querySelector("#saved-list-sentences").value,
        }),
      });
      await refreshWorkspace(me);
    } catch (error) {
      button.disabled = form.querySelector('[aria-invalid="true"]') !== null;
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
      saveAssignmentDraft(
        savedList.words,
        savedList.title,
        (savedList.word_details || []).map((word) => word.example_sentence),
      ),
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
      const sentencesValue = prompt(
        copy.exampleSentencesPrompt,
        (savedList.word_details || [])
          .map((word) => word.example_sentence || "")
          .join("\n"),
      );
      if (sentencesValue === null) return;
      let editedSentences = sentencesValue;
      if (isPlusPlan(me) && confirm(copy.fillSentenceLibrary)) {
        try {
          const matches = await api("/api/sentence-library/match", {
            method: "POST",
            body: JSON.stringify({ words: wordsValue, difficulty: "simple" }),
          });
          const existing = editedSentences.split(/\r?\n/);
          editedSentences = wordsValue
            .split(/\r?\n/)
            .map(
              (word, index) =>
                existing[index]?.trim() ||
                matches.matches[word.trim().toLowerCase()] ||
                "",
            )
            .join("\n");
        } catch (error) {
          showSectionError(section, error);
          return;
        }
      }
      try {
        await api(`/api/saved-lists/${savedList.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: titleValue,
            words: wordsValue,
            exampleSentences: editedSentences,
          }),
        });
        await refreshWorkspace(me);
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
            exampleSentences: (savedList.word_details || []).map(
              (word) => word.example_sentence,
            ),
          }),
        });
        await refreshWorkspace(me);
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
      await refreshWorkspace(me);
    });
    actions.append(use, edit, duplicate, remove);
    row.append(body, actions);
    list.append(row);
  }
  if (savedLists.length) section.append(list);
  return section;
}

function renderSavedLists(me, savedLists) {
  const section = document.createElement("section");
  section.className = "product-card saved-lists-card";
  section.id = "saved-lists";
  void renderSavedListsLegacy;
  const newListLabel = locale === "zh" ? "新建词表" : copy.saveList;
  const editListLabel = locale === "zh" ? "编辑词表" : copy.edit;
  const backListLabel =
    locale === "zh" ? "← 返回已保存词表" : "← " + copy.freeSavedLists;
  let mode = "list";
  let editingList = null;
  const render = () => {
    section.replaceChildren();
    if (mode === "list") {
      const heading = document.createElement("div");
      heading.className = "saved-lists-heading";
      const copyBlock = document.createElement("div");
      const title = document.createElement("h1");
      title.textContent = copy.freeSavedLists;
      const intro = document.createElement("p");
      intro.textContent = copy.savedListsCopy;
      copyBlock.append(title, intro);
      const add = document.createElement("button");
      add.type = "button";
      add.className = "saved-lists-add";
      add.textContent = "+ " + newListLabel;
      add.addEventListener("click", () => {
        mode = "new";
        editingList = null;
        render();
      });
      heading.append(copyBlock, add);
      section.append(heading);
      if (!savedLists.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state saved-lists-empty";
        const emptyTitle = document.createElement("strong");
        emptyTitle.textContent =
          locale === "zh" ? "还没有保存词表" : copy.freeSavedLists;
        const emptyCopy = document.createElement("p");
        emptyCopy.textContent =
          locale === "zh"
            ? "保存常用单词后，可以快速创建新的拼写作业。"
            : copy.savedListsCopy;
        const emptyAction = document.createElement("button");
        emptyAction.type = "button";
        emptyAction.textContent = "+ " + newListLabel;
        emptyAction.addEventListener("click", () => {
          mode = "new";
          editingList = null;
          render();
        });
        empty.append(emptyTitle, emptyCopy, emptyAction);
        section.append(empty);
        return;
      }
      const list = document.createElement("div");
      list.className = "assignment-list workspace-list saved-lists-grid";
      for (const savedList of savedLists) {
        const row = document.createElement("article");
        row.className = "assignment-row saved-list-row";
        const body = document.createElement("div");
        const itemTitle = document.createElement("h2");
        itemTitle.textContent = savedList.title;
        const summary = document.createElement("p");
        summary.className = "assignment-meta";
        const preview = savedList.words.slice(0, 4).join(" · ");
        summary.textContent = [
          m("wordCount", { count: savedList.words.length }),
          preview + (savedList.words.length > 4 ? " · ..." : ""),
        ]
          .filter(Boolean)
          .join(" · ");
        body.append(itemTitle, summary);
        const actions = document.createElement("div");
        actions.className = "actions compact-actions saved-list-actions";
        const use = document.createElement("button");
        use.type = "button";
        use.textContent = copy.useList;
        use.addEventListener("click", () =>
          saveAssignmentDraft(
            savedList.words,
            savedList.title,
            (savedList.word_details || []).map((word) => word.example_sentence),
          ),
        );
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "button-secondary";
        edit.textContent = editListLabel;
        edit.addEventListener("click", () => {
          mode = "edit";
          editingList = savedList;
          render();
        });
        actions.append(use, edit);
        const duplicate = document.createElement("button");
        duplicate.type = "button";
        duplicate.className = "button-secondary";
        duplicate.textContent = copy.copyList;
        duplicate.addEventListener("click", async () => {
          try {
            await api("/api/saved-lists", {
              method: "POST",
              body: JSON.stringify({
                title: m("copyListTitle", { title: savedList.title }).slice(
                  0,
                  80,
                ),
                words: savedList.words,
                exampleSentences: (savedList.word_details || []).map(
                  (word) => word.example_sentence,
                ),
              }),
            });
            trackEvent("saved_list_created");
            await refreshWorkspace(me);
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
          await api("/api/saved-lists/" + savedList.id, { method: "DELETE" });
          await refreshWorkspace(me);
        });
        actions.append(duplicate, remove);
        row.append(body, actions);
        list.append(row);
      }
      section.append(list);
      return;
    }
    const heading = document.createElement("div");
    heading.className = "saved-lists-form-heading";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "button-secondary";
    back.textContent = backListLabel;
    back.addEventListener("click", () => {
      mode = "list";
      editingList = null;
      render();
    });
    const title = document.createElement("h1");
    title.textContent = mode === "edit" ? editListLabel : newListLabel;
    heading.append(back, title);
    const form = document.createElement("form");
    form.className = "product-form compact-form saved-list-form";
    form.innerHTML =
      '<div class="field"><label for="saved-list-title">' +
      copy.listTitle +
      '</label><input id="saved-list-title" maxlength="80" required placeholder="' +
      copy.listTitlePlaceholder +
      '"></div><div class="field saved-list-words-field"><label for="saved-list-words">' +
      copy.words +
      '</label><textarea id="saved-list-words" required spellcheck="false" placeholder="' +
      copy.wordsHelp +
      '"></textarea></div><div class="field saved-list-sentences-field"><div class="saved-list-field-heading"><label for="saved-list-sentences">' +
      copy.exampleSentences +
      '</label></div><textarea id="saved-list-sentences" maxlength="30000" spellcheck="true" placeholder="' +
      copy.exampleSentencesHelp +
      '"></textarea></div><div class="actions saved-list-form-actions"><button type="button" class="button-secondary saved-list-cancel">' +
      copy.cancel +
      '</button><button type="submit">' +
      copy.saveList +
      "</button></div>";
    if (editingList) {
      form.querySelector("#saved-list-title").value = editingList.title;
      form.querySelector("#saved-list-words").value =
        editingList.words.join("\n");
      form.querySelector("#saved-list-sentences").value = (
        editingList.word_details || []
      )
        .map((word) => word.example_sentence || "")
        .join("\n");
    }
    attachSentenceLibraryControls(
      form,
      me,
      "#saved-list-words",
      "#saved-list-sentences",
    );
    attachWordLimit(form, me, "#saved-list-words");
    form.querySelector(".saved-list-cancel").addEventListener("click", () => {
      mode = "list";
      editingList = null;
      render();
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.querySelector('[aria-invalid="true"]')) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      const payload = {
        title: form.querySelector("#saved-list-title").value,
        words: form.querySelector("#saved-list-words").value,
        exampleSentences: form.querySelector("#saved-list-sentences").value,
      };
      try {
        await api(
          editingList
            ? "/api/saved-lists/" + editingList.id
            : "/api/saved-lists",
          {
            method: editingList ? "PATCH" : "POST",
            body: JSON.stringify(payload),
          },
        );
        if (!editingList) trackEvent("saved_list_created");
        await refreshWorkspace(me);
      } catch (error) {
        button.disabled = form.querySelector('[aria-invalid="true"]') !== null;
        showSectionError(
          section,
          error,
          error.code === "saved_list_limit" ? "saved_list_limit" : null,
        );
      }
    });
    section.append(heading, form);
    form.querySelector("#saved-list-title").focus();
  };
  render();
  return section;
}

function renderLearnersLegacy(me, learners) {
  const section = document.createElement("section");
  section.className = "product-card";
  section.id = "learners";
  const learnerCopy =
    me.plan === "free"
      ? {
          heading: m("freeLearners"),
          intro: m("freeLearnersCopy"),
          name: m("freeLearnerName"),
          placeholder: m("freeLearnerNamePlaceholder"),
          add: m("freeAddLearner"),
          progress: m("freeProgress"),
          namePrompt: m("freeLearnerNamePrompt"),
        }
      : isParentPlan(me)
        ? {
            heading: m("familyLearners"),
            intro: m("familyLearnersCopy"),
            name: m("familyLearnerName"),
            placeholder: m("familyLearnerNamePlaceholder"),
            add: m("addChild"),
            progress: copy.freeProgress,
            namePrompt: copy.familyLearnerNamePrompt,
          }
        : {
            heading: copy.learners,
            intro: copy.learnersCopy,
            name: copy.learnerName,
            placeholder: copy.learnerNamePlaceholder,
            add: copy.addLearner,
            progress: copy.freeProgress,
            namePrompt: copy.learnerNamePrompt,
          };
  const heading = document.createElement("h2");
  heading.textContent = learnerCopy.heading;
  const intro = document.createElement("p");
  intro.textContent = learnerCopy.intro;
  const classUrl =
    isTeacherPlan(me) && me.classPublicId
      ? `${location.origin}/join/${me.classPublicId}`
      : null;
  const join = document.createElement("div");
  if (classUrl) {
    join.className = "notice workspace-class-join";
    const label = document.createElement("strong");
    label.textContent = copy.classJoin;
    const url = document.createElement("p");
    url.textContent = `${copy.classJoinUrl}: ${classUrl}`;
    const copyUrl = document.createElement("button");
    copyUrl.type = "button";
    copyUrl.className = "button-secondary";
    copyUrl.setAttribute("aria-live", "polite");
    copyUrl.textContent = copy.copyClassUrl;
    copyUrl.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(classUrl);
        copyUrl.textContent = copy.classUrlCopied;
        copyUrl.classList.add("is-success");
      } catch {
        prompt(copy.copyClassUrl, classUrl);
      }
    });
    join.append(label, url, copyUrl);
  }
  const form = document.createElement("form");
  form.className = "product-form compact-form inline-form";
  form.innerHTML = `<div class="field"><label for="learner-name">${learnerCopy.name}</label><input id="learner-name" maxlength="32" required placeholder="${learnerCopy.placeholder}"></div><div class="actions"><button type="submit">${learnerCopy.add}</button></div>`;
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
      await refreshWorkspace(me);
    } catch (error) {
      button.disabled = false;
      showSectionError(
        section,
        error,
        error.code === "learner_limit" ? "learner_limit" : null,
      );
    }
  });
  section.append(heading, intro);
  if (classUrl) section.append(join);
  section.append(form);
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
    } else {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = copy.active;
      titleRow.append(badge);
    }
    const summary = document.createElement("p");
    summary.className = "assignment-meta";
    summary.textContent = m("learnerSummary", {
      count: learner.completed_attempts,
      accuracy: learner.accuracy,
    });
    body.append(titleRow, summary);
    if (isTeacherPlan(me) && !learner.archived && learner.join_pin) {
      const pin = document.createElement("p");
      pin.className = "assignment-meta";
      pin.textContent = `${copy.studentPin}: ${learner.join_pin}`;
      body.append(pin);
    }
    const actions = document.createElement("div");
    actions.className = "actions compact-actions";
    const open = document.createElement("a");
    open.className = "button-link button-secondary";
    open.href = `/teacher/learners/${learner.id}?lang=${encodeURIComponent(locale)}`;
    open.textContent = learnerCopy.progress;
    const copyPin = document.createElement("button");
    copyPin.type = "button";
    copyPin.className = "button-secondary";
    copyPin.setAttribute("aria-live", "polite");
    copyPin.textContent = copy.copyPin;
    copyPin.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(learner.join_pin);
        copyPin.textContent = copy.pinCopied;
        copyPin.classList.add("is-success");
      } catch {
        prompt(copy.copyPin, learner.join_pin);
      }
    });
    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "button-secondary";
    rename.textContent = copy.rename;
    rename.addEventListener("click", async () => {
      const name = prompt(learnerCopy.namePrompt, learner.name);
      if (name === null) return;
      try {
        await api(`/api/learners/${learner.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        await refreshWorkspace(me);
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
      try {
        await api(`/api/learners/${learner.id}`, {
          method: "PATCH",
          body: JSON.stringify({ archived: !learner.archived }),
        });
        await refreshWorkspace(me);
      } catch (error) {
        showSectionError(
          section,
          error,
          error.code === "learner_limit" ? "learner_limit" : null,
        );
      }
    });
    actions.append(open);
    if (isTeacherPlan(me) && !learner.archived && learner.join_pin)
      actions.append(copyPin);
    actions.append(rename, archive);
    row.append(body, actions);
    list.append(row);
  }
  if (learners.length) section.append(list);
  return section;
}

function renderLearners(me, learners) {
  const section = document.createElement("section");
  section.className = "product-card learners-card";
  section.id = "learners";
  void renderLearnersLegacy;
  const learnerCopy =
    me.plan === "free"
      ? {
          heading: m("freeLearners"),
          intro: m("freeLearnersCopy"),
          name: m("freeLearnerName"),
          placeholder: m("freeLearnerNamePlaceholder"),
          add: m("freeAddLearner"),
          progress: m("freeProgress"),
          namePrompt: m("freeLearnerNamePrompt"),
        }
      : isParentPlan(me)
        ? {
            heading: m("familyLearners"),
            intro: m("familyLearnersCopy"),
            name: m("familyLearnerName"),
            placeholder: m("familyLearnerNamePlaceholder"),
            add: m("addChild"),
            progress: copy.freeProgress,
            namePrompt: copy.familyLearnerNamePrompt,
          }
        : {
            heading: copy.learners,
            intro: copy.learnersCopy,
            name: copy.learnerName,
            placeholder: copy.learnerNamePlaceholder,
            add: copy.addLearner,
            progress: copy.freeProgress,
            namePrompt: copy.learnerNamePrompt,
          };
  const heading = document.createElement("div");
  heading.className = "learners-heading";
  const headingCopy = document.createElement("div");
  const title = document.createElement("h1");
  title.textContent = learnerCopy.heading;
  const intro = document.createElement("p");
  intro.textContent = learnerCopy.intro;
  headingCopy.append(title, intro);
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "learners-add";
  addButton.textContent = "+ " + learnerCopy.add;
  heading.append(headingCopy, addButton);
  section.append(heading);

  const dialog = document.createElement("dialog");
  dialog.className = "learner-dialog";
  const dialogTitle = document.createElement("h2");
  dialogTitle.textContent = learnerCopy.add;
  const form = document.createElement("form");
  form.className = "product-form compact-form";
  form.method = "dialog";
  form.innerHTML = `<div class="field"><label for="learner-name">${learnerCopy.name}</label><input id="learner-name" maxlength="32" required placeholder="${learnerCopy.placeholder}"></div><div class="actions learner-dialog-actions"><button type="button" class="button-secondary learner-dialog-cancel">${copy.cancel}</button><button type="submit">${learnerCopy.add}</button></div>`;
  const picker = avatarPicker();
  form.querySelector(".learner-dialog-actions").before(picker.element);
  const closeDialog = () => dialog.close();
  form
    .querySelector(".learner-dialog-cancel")
    .addEventListener("click", closeDialog);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api("/api/learners", {
        method: "POST",
        body: JSON.stringify({
          name: form.querySelector("#learner-name").value,
          avatar: picker.value(),
        }),
      });
      trackEvent("learner_created");
      dialog.close();
      await refreshWorkspace(me);
    } catch (error) {
      button.disabled = false;
      showSectionError(
        section,
        error,
        error.code === "learner_limit" ? "learner_limit" : null,
      );
    }
  });
  dialog.append(dialogTitle, form);
  section.append(dialog);
  addButton.addEventListener("click", () => {
    form.reset();
    picker.reset();
    dialog.showModal();
    form.querySelector("#learner-name").focus();
  });

  const classUrl =
    isTeacherPlan(me) && me.classPublicId
      ? `${location.origin}/join/${me.classPublicId}`
      : null;
  if (classUrl) {
    const join = document.createElement("div");
    join.className = "notice workspace-class-join";
    const label = document.createElement("strong");
    label.textContent = copy.classJoin;
    const url = document.createElement("p");
    url.textContent = `${copy.classJoinUrl}: ${classUrl}`;
    const copyUrl = document.createElement("button");
    copyUrl.type = "button";
    copyUrl.className = "button-secondary";
    copyUrl.setAttribute("aria-live", "polite");
    copyUrl.textContent = copy.copyClassUrl;
    copyUrl.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(classUrl);
        copyUrl.textContent = copy.classUrlCopied;
        copyUrl.classList.add("is-success");
      } catch {
        prompt(copy.copyClassUrl, classUrl);
      }
    });
    join.append(label, url, copyUrl);
    section.append(join);
  }

  if (!learners.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state learners-empty";
    const emptyTitle = document.createElement("strong");
    emptyTitle.textContent = learnerCopy.heading;
    const emptyCopy = document.createElement("p");
    emptyCopy.textContent = learnerCopy.intro;
    const emptyAction = document.createElement("button");
    emptyAction.type = "button";
    emptyAction.textContent = "+ " + learnerCopy.add;
    emptyAction.addEventListener("click", () => addButton.click());
    empty.append(emptyTitle, emptyCopy, emptyAction);
    section.append(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "assignment-list workspace-list learners-list";
  for (const learner of learners) {
    const row = document.createElement("article");
    row.className = "assignment-row learner-row";
    const body = document.createElement("div");
    const rowTitle = document.createElement("div");
    rowTitle.className = "assignment-title-row";
    const learnerTitle = document.createElement("h2");
    learnerTitle.textContent = learner.name;
    rowTitle.append(learnerTitle);
    if (learner.archived) {
      const badge = document.createElement("span");
      badge.className = "badge closed";
      badge.textContent = copy.archived;
      rowTitle.append(badge);
    }
    body.append(rowTitle);
    if (learner.last_practiced_at) {
      const activity = document.createElement("p");
      activity.className = "assignment-meta learner-activity";
      activity.textContent = date(learner.last_practiced_at);
      body.append(activity);
    }
    const actions = document.createElement("div");
    actions.className = "actions compact-actions learner-actions";
    const open = document.createElement("a");
    open.className = "button-link learner-progress-link";
    open.href = `/teacher/learners/${learner.id}?lang=${encodeURIComponent(locale)}`;
    open.textContent = m("viewLearner") + " >";
    const menu = document.createElement("details");
    menu.className = "learner-menu";
    const menuSummary = document.createElement("summary");
    menuSummary.textContent = "…";
    menuSummary.title = learnerCopy.namePrompt;
    const menuItems = document.createElement("div");
    menuItems.className = "learner-menu-items";
    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "button-secondary";
    rename.textContent = copy.rename;
    rename.addEventListener("click", async () => {
      const name = prompt(learnerCopy.namePrompt, learner.name);
      if (name === null) return;
      try {
        await api(`/api/learners/${learner.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        await refreshWorkspace(me);
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
      try {
        await api(`/api/learners/${learner.id}`, {
          method: "PATCH",
          body: JSON.stringify({ archived: !learner.archived }),
        });
        await refreshWorkspace(me);
      } catch (error) {
        showSectionError(
          section,
          error,
          error.code === "learner_limit" ? "learner_limit" : null,
        );
      }
    });
    menuItems.append(rename, archive);
    if (isTeacherPlan(me) && !learner.archived && learner.join_pin) {
      const copyPin = document.createElement("button");
      copyPin.type = "button";
      copyPin.className = "button-secondary";
      copyPin.textContent = copy.copyPin;
      copyPin.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(learner.join_pin);
          copyPin.textContent = copy.pinCopied;
        } catch {
          prompt(copy.copyPin, learner.join_pin);
        }
      });
      menuItems.append(copyPin);
    }
    menu.append(menuSummary, menuItems);
    actions.append(open, menu);
    const profile = document.createElement("div");
    profile.className = "learner-profile-summary";
    profile.append(learnerAvatar(learner), body);
    row.append(profile, actions);
    row.addEventListener("click", (event) => {
      if (event.target.closest("a,button,summary,details")) return;
      location.href = open.href;
    });
    list.append(row);
  }
  section.append(list);
  return section;
}

function renderAssignmentsCard(
  me,
  assignments,
  {
    limit = null,
    id = "assignments",
    heading = copy.assignments,
    fullPage = false,
    showViewAll = false,
  } = {},
) {
  const listCard = document.createElement("section");
  listCard.className = "product-card";
  listCard.id = id;
  const listHeading = document.createElement(fullPage ? "h1" : "h2");
  listHeading.textContent = heading;
  if (fullPage) {
    const headingRow = document.createElement("div");
    headingRow.className = "assignment-list-heading";
    const headingCopy = document.createElement("div");
    const intro = document.createElement("p");
    intro.textContent = copy.assignmentsPageCopy;
    const create = document.createElement("a");
    create.className = "button-link";
    create.href = `/teacher/assignments/new?lang=${encodeURIComponent(locale)}`;
    create.textContent = copy.newAssignment;
    create.addEventListener("click", () =>
      setAssignmentEntryPoint("workspace"),
    );
    headingCopy.append(listHeading, intro);
    headingRow.append(headingCopy, create);
    listCard.append(headingRow);
  } else {
    listCard.append(listHeading);
  }
  const visibleAssignments = limit ? assignments.slice(0, limit) : assignments;
  if (!visibleAssignments.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = copy.noAssignments;
    listCard.append(empty);
  } else {
    const list = document.createElement("div");
    list.className = "assignment-list";
    for (const assignment of visibleAssignments) {
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
        m(
          me.plan === "free"
            ? "freeLearnerCount"
            : isParentPlan(me)
              ? "children"
              : "students",
          { count: assignment.student_count },
        ),
        m("attempts", { count: assignment.attempt_count }),
        m("average", { count: assignment.average_accuracy }),
        m("due", { date: date(assignment.expires_at) }),
        assignment.assigned_learner_names
          ? m("assignedToSummary", {
              learners: assignment.assigned_learner_names,
            })
          : m("linkOnly"),
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
  if (showViewAll && assignments.length) {
    const viewAll = document.createElement("a");
    viewAll.className = "button-link button-secondary";
    viewAll.href = `/teacher/assignments?lang=${encodeURIComponent(locale)}`;
    viewAll.textContent = copy.viewAllAssignments;
    listCard.append(viewAll);
  }
  return listCard;
}

function renderProgressCard(
  learners,
  {
    recentOnly = false,
    masteryOnly = false,
    headingText = null,
    id = "progress",
    plain = false,
  } = {},
) {
  const card = document.createElement("section");
  card.className = plain ? "progress-section" : "product-card";
  card.id = id;
  const heading = document.createElement("h2");
  heading.textContent =
    headingText || (recentOnly ? copy.recentProgress : copy.freeProgress);
  card.append(heading);
  const progressLearners = [...learners]
    .filter((learner) => !recentOnly || learner.last_practiced_at)
    .sort((a, b) =>
      String(b.last_practiced_at || "").localeCompare(
        String(a.last_practiced_at || ""),
      ),
    );
  const visibleLearners = recentOnly
    ? progressLearners.slice(0, 5)
    : progressLearners;
  if (!visibleLearners.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = copy.noRecentProgress;
    card.append(empty);
    return card;
  }
  const list = document.createElement("div");
  list.className = "assignment-list workspace-list";
  for (const learner of visibleLearners) {
    const row = document.createElement("article");
    row.className = "assignment-row";
    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = learner.name;
    const summary = document.createElement("p");
    summary.className = "assignment-meta";
    if (masteryOnly) {
      summary.className = "assignment-meta mastery-summary";
      const mastery = learner.mastery || {};
      for (const [label, value] of [
        [copy.mastered, mastery.mastered || 0],
        [copy.learning, mastery.learning || 0],
        [copy.needsReview, mastery.needsReview || 0],
      ]) {
        const item = document.createElement("span");
        item.textContent = `${label} ${value}`;
        summary.append(item);
      }
    } else {
      summary.textContent = m("learnerSummary", {
        count: learner.completed_attempts,
        accuracy: learner.accuracy,
      });
    }
    if (!masteryOnly) {
      const review = document.createElement("p");
      review.className = "assignment-meta";
      review.textContent = m("needsReviewWords", {
        count: learner.needs_review_count || 0,
      });
      body.append(title, summary, review);
    } else {
      body.append(title, summary);
    }
    const open = document.createElement("a");
    open.className = "button-link button-secondary";
    open.href = `/teacher/learners/${learner.id}?lang=${encodeURIComponent(locale)}`;
    open.textContent = copy.viewLearner;
    row.append(body, open);
    list.append(row);
  }
  card.append(list);
  return card;
}

function progressLearnerRows(learners, { reviewActions = false } = {}) {
  const list = document.createElement("div");
  list.className = "assignment-list workspace-list";
  for (const learner of learners) {
    const row = document.createElement("article");
    row.className = "assignment-row";
    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = learner.name;
    const summary = document.createElement("p");
    summary.className = "assignment-meta";
    summary.textContent = reviewActions
      ? m("needsReviewWords", { count: learner.needs_review_count || 0 })
      : m("learnerSummary", {
          count: learner.completed_attempts,
          accuracy: learner.accuracy,
        });
    body.append(title, summary);
    const actions = document.createElement("div");
    actions.className = "actions compact-actions";
    const open = document.createElement("a");
    open.className = "button-link button-secondary";
    open.href = `/teacher/learners/${learner.id}?lang=${encodeURIComponent(locale)}`;
    open.textContent = copy.viewLearner;
    actions.append(open);
    if (reviewActions) {
      const create = document.createElement("button");
      create.type = "button";
      create.textContent = copy.createReview;
      const status = statusElement(actions);
      create.addEventListener("click", async () => {
        create.disabled = true;
        try {
          const result = await api(`/api/learners/${learner.id}/review`, {
            method: "POST",
            body: "{}",
          });
          if (!result.words.length) {
            status.textContent = copy.noReviewWords;
            return;
          }
          saveAssignmentDraft(
            result.words,
            m("reviewDraftTitle", { name: learner.name }),
          );
        } catch (error) {
          status.textContent = error.message;
          status.className = "status error";
        } finally {
          create.disabled = false;
        }
      });
      actions.prepend(create);
    }
    row.append(body, actions);
    list.append(row);
  }
  return list;
}

async function renderProgressCenter(me, data, main = shell(me, "progress")) {
  const learners = data.learners || [];
  const completed = learners.reduce(
    (sum, learner) => sum + Number(learner.completed_attempts || 0),
    0,
  );
  const practiced = learners.filter((learner) => learner.completed_attempts);
  const accuracy = practiced.length
    ? Math.round(
        practiced.reduce(
          (sum, learner) => sum + Number(learner.accuracy || 0),
          0,
        ) / practiced.length,
      )
    : 0;
  const needsReview = learners.reduce(
    (sum, learner) => sum + Number(learner.needs_review_count || 0),
    0,
  );

  const page = document.createElement("section");
  page.className = "product-card progress-center-card";
  page.id = "progress-center";
  const header = document.createElement("div");
  header.className = "progress-center-heading";
  const title = document.createElement("h1");
  title.textContent = copy.freeProgress;
  const historyCopy = document.createElement("p");
  historyCopy.textContent = m("historyWindow", {
    days: me.plan === "free" ? 14 : 365,
  });
  header.append(title, historyCopy);
  page.append(header);

  const overview = document.createElement("section");
  overview.className = "progress-section progress-overview-section";
  const overviewTitle = document.createElement("h2");
  overviewTitle.textContent = copy.progressOverview;
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.append(
    statCard(copy.completedPractices, completed),
    statCard(copy.summaryAverage, `${accuracy}%`),
    statCard(copy.needsReview, needsReview),
  );
  overview.append(overviewTitle, grid);
  page.append(overview);

  page.append(
    renderProgressCard(learners, {
      headingText: copy.mastery,
      masteryOnly: true,
      id: "progress-mastery",
      plain: true,
    }),
    renderProgressCard(learners, {
      recentOnly: true,
      id: "recent-progress",
      plain: true,
    }),
  );

  const missed = document.createElement("section");
  missed.className = "progress-section";
  const missedTitle = document.createElement("h2");
  missedTitle.textContent = copy.commonMisses;
  missed.append(missedTitle);
  const missedWords = Array.isArray(data.missedWords) ? data.missedWords : null;
  if (missedWords?.length) {
    const list = document.createElement("div");
    list.className = "word-list";
    for (const item of missedWords) {
      const chip = document.createElement("span");
      chip.className = "word-chip";
      chip.textContent = `${item.word} · ${item.misses}`;
      list.append(chip);
    }
    missed.append(list);
  } else if (missedWords === null && isTeacherPlan(me)) {
    const details = await Promise.all(
      (data.assignments || [])
        .slice(0, 5)
        .map((assignment) =>
          api(`/api/assignments/${assignment.id}`).catch(() => null),
        ),
    );
    const counts = new Map();
    for (const detail of details)
      for (const item of detail?.missedWordStats || [])
        counts.set(item.word, (counts.get(item.word) || 0) + item.misses);
    const list = document.createElement("div");
    list.className = "word-list";
    for (const [word, count] of [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)) {
      const chip = document.createElement("span");
      chip.className = "word-chip";
      chip.textContent = `${word} · ${count}`;
      list.append(chip);
    }
    if (list.children.length) missed.append(list);
    else {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = copy.noReviewWords;
      missed.append(empty);
    }
  } else {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = copy.noReviewWords;
    missed.append(empty);
  }
  page.append(missed);

  const smartReview = document.createElement("section");
  smartReview.className = "progress-section";
  const smartReviewTitle = document.createElement("h2");
  smartReviewTitle.textContent = copy.smartReview;
  const smartReviewCopy = document.createElement("p");
  smartReviewCopy.textContent = copy.smartReviewValue;
  smartReview.append(smartReviewTitle, smartReviewCopy);
  if (!isPlusPlan(me) && needsReview) {
    const preview = document.createElement("p");
    preview.textContent = m("needsReviewWords", { count: needsReview });
    const locked = document.createElement("button");
    locked.type = "button";
    locked.className = "button-secondary";
    locked.textContent = copy.createReview;
    locked.addEventListener("click", () =>
      showLockedFeaturePlan(
        smartReview,
        copy.smartReviewUpgrade,
        "smart_review",
      ),
    );
    smartReview.append(preview, locked);
  } else if (learners.length) {
    smartReview.append(progressLearnerRows(learners, { reviewActions: true }));
  } else {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = copy.noRecentProgress;
    smartReview.append(empty);
  }
  const showSmartReview = isPlusPlan(me) || needsReview > 0;
  if (showSmartReview) page.append(smartReview);
  main.append(page);
}

async function renderDashboard(me, { force = false } = {}) {
  const params = new URLSearchParams(location.search);
  const section = workspaceSection(
    workspaceRoute() ||
      params.get("section") ||
      location.hash.replace(/^#/, ""),
  );
  const main = shell(me, section);
  main.classList.toggle("workspace-overview-main", section === "overview");
  let data = workspaceCache.data;
  if (!data || force) {
    let loading = main.querySelector(".workspace-loading");
    if (!loading) {
      loading = document.createElement("p");
      loading.className = "workspace-loading workspace-inline-loading";
      loading.setAttribute("role", "status");
      loading.textContent = copy.loading;
      main.append(loading);
    }
    try {
      data = await loadWorkspaceData(section, { force });
    } catch (error) {
      if (workspaceRoute() !== section) return;
      loading.className = "workspace-loading workspace-inline-loading error";
      loading.textContent = error.message;
      return;
    }
    if (workspaceRoute() !== section) return;
    main.replaceChildren();
  }
  if (data && !force) main.replaceChildren();
  if (section === "savedLists") {
    main.append(renderSavedLists(me, data.savedLists || []));
    return;
  }
  if (section === "learners") {
    main.append(renderLearners(me, data.learners || []));
    return;
  }
  if (section === "progress") {
    await renderProgressCenter(me, data, main);
    revalidateWorkspaceData(me, section);
    return;
  }
  if (section === "assignments") {
    main.append(
      renderAssignmentsCard(me, data.assignments || [], { fullPage: true }),
    );
    return;
  }
  const needsReviewCount = (data.learners || []).reduce(
    (sum, learner) => sum + Number(learner.needs_review_count || 0),
    0,
  );
  const card = document.createElement("section");
  card.className = "product-card teacher-dashboard-card";
  card.id = "overview";
  const heading = document.createElement("h1");
  heading.textContent = copy.dashboardTitle;
  const greeting = document.createElement("p");
  greeting.textContent = m("greeting", { name: me.user.name });
  const plan = document.createElement("span");
  plan.className = `badge teacher-plan-badge ${isPlusPlan(me) ? "pro" : ""}`;
  plan.textContent = isParentPlan(me)
    ? copy.parentPlan
    : isTeacherPlan(me) || isPlusPlan(me)
      ? copy.teacherPlan
      : copy.freePlan;
  const submissionNotice = submissionLimitNotice(data.usage);
  card.append(
    heading,
    greeting,
    plan,
    usageCards(data.usage, me, needsReviewCount),
  );
  if (submissionNotice) card.append(submissionNotice);
  main.append(card);
  main.append(
    renderAssignmentsCard(me, data.assignments || [], {
      limit: 5,
      id: "recent-assignments",
      heading: copy.recentAssignments,
      showViewAll: true,
    }),
    renderProgressCard(data.learners || [], { recentOnly: true }),
  );
  revalidateWorkspaceData(me, section);
}

async function startCheckout(interval, plan = "teacher") {
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_LOCALE_KEY, locale);
    sessionStorage.setItem("pendingCheckoutPlan", plan);
    sessionStorage.setItem("pendingCheckoutInterval", interval);
  } catch {}
  try {
    trackEvent("checkout_started", { plan, billing_interval: interval });
    const checkout = await api("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan, interval, locale }),
    });
    if (!checkout?.url) {
      const error = new Error(copy.error);
      error.code = "checkout_unavailable";
      throw error;
    }
    trackEvent("checkout_redirected", { plan, billing_interval: interval });
    try {
      sessionStorage.removeItem("pendingCheckoutInterval");
      sessionStorage.removeItem(PURCHASE_RECORDED_KEY);
    } catch {}
    location.href = checkout.url;
  } catch (error) {
    trackEvent("checkout_failed", {
      plan,
      billing_interval: interval,
      error_code: error.code || "checkout_unavailable",
    });
    throw error;
  }
}

function showCheckoutRetry(interval, plan, error) {
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
      await startCheckout(interval, plan);
    } catch (retryError) {
      status.textContent = retryError.message;
      status.className = "status error";
      retry.disabled = false;
    }
  });
  notice.append(message, retry, status);
  main.prepend(notice);
}

async function renderAssignmentForm(me, { assignment = null } = {}) {
  const editing = Boolean(assignment);
  const main = shell(me, "assignments");
  const card = document.createElement("section");
  card.className = "product-card assignment-form-card";
  const heading = document.createElement("h1");
  heading.textContent = editing ? copy.editAssignment : copy.newTitle;
  const headingRow = document.createElement("div");
  headingRow.className = "assignment-form-heading";
  const backLink = document.createElement("a");
  backLink.className = "button-link button-secondary";
  backLink.href = editing
    ? `/teacher/assignments/${assignment.id}?lang=${encodeURIComponent(locale)}`
    : `/teacher/assignments?lang=${encodeURIComponent(locale)}`;
  backLink.textContent = editing ? copy.cancel : copy.backToDashboard;
  const backWrap = document.createElement("div");
  backWrap.className = "assignment-form-back";
  backWrap.append(backLink);
  headingRow.append(heading, backWrap);
  const form = document.createElement("form");
  form.className = "product-form";
  const defaultDeadline = new Date(
    editing ? assignment.expires_at : Date.now() + 7 * 86_400_000,
  );
  defaultDeadline.setSeconds(0, 0);
  let draftWords = assignment?.words?.map((word) => word.word).join("\n") || "";
  let draftTitle = assignment?.title || "";
  let draftSentences =
    assignment?.words?.map((word) => word.example_sentence || "").join("\n") ||
    "";
  let draftMode = assignment?.mode || "dictation";
  if (!editing) {
    try {
      draftWords = sessionStorage.getItem("mySpellingTeacherDraftWords") || "";
      draftTitle = sessionStorage.getItem("mySpellingTeacherDraftTitle") || "";
      draftSentences =
        sessionStorage.getItem("mySpellingTeacherDraftSentences") || "";
      draftMode =
        sessionStorage.getItem("mySpellingTeacherDraftMode") || "dictation";
    } catch {}
  }
  form.innerHTML = `
    <div class="assignment-form-layout">
      <div class="assignment-content-column">
        <div class="field"><label for="assignment-title">${copy.assignmentTitle}</label><input id="assignment-title" maxlength="80" required placeholder="${copy.titlePlaceholder}"></div>
        <div class="field"><label for="assignment-words">${copy.words}</label><textarea id="assignment-words" required spellcheck="false"></textarea><small>${copy.wordsHelp}</small></div>
        <div class="field assignment-sentences-field"><label for="assignment-sentences">${copy.exampleSentences}</label><textarea id="assignment-sentences" maxlength="30000" spellcheck="true" placeholder="${copy.exampleSentencesHelp}"></textarea></div>
      </div>
      <aside class="assignment-settings-panel">
        <fieldset class="assignment-mode-field"><legend>${copy.mode}</legend><div class="radio-row assignment-mode-options"><label class="assignment-mode-option"><input type="radio" name="mode" value="dictation"><span class="assignment-mode-icon" aria-hidden="true">◉</span><span>${copy.dictation}</span><span class="assignment-target-check" aria-hidden="true">✓</span></label><label class="assignment-mode-option"><input type="radio" name="mode" value="typing"><span class="assignment-mode-icon" aria-hidden="true">⌨</span><span>${copy.typing}</span><span class="assignment-target-check" aria-hidden="true">✓</span></label></div></fieldset>
        <fieldset id="assignment-learners-field"><legend>${m("assignTo")}</legend><div class="radio-row assignment-target-options"><label class="assignment-target-option" data-target-option="all"><input type="radio" name="learnerTarget" value="all"><span class="assignment-target-icon" aria-hidden="true">◉</span><span class="assignment-target-copy"><strong>${m(me.plan === "free" ? "allLearners" : isParentPlan(me) ? "allChildren" : "allStudents")}</strong><small>${m("allLearnersHelp")}</small></span><span class="assignment-target-check" aria-hidden="true">✓</span></label><label class="assignment-target-option" data-target-option="selected"><input type="radio" name="learnerTarget" value="selected"><span class="assignment-target-icon" aria-hidden="true">☷</span><span class="assignment-target-copy"><strong>${m(me.plan === "free" ? "freeSelectedLearners" : isParentPlan(me) ? "selectedChildren" : "selectedStudents")}</strong><small>${m("selectedLearnersHelp")}</small></span><span class="assignment-target-check" aria-hidden="true">✓</span></label><label class="assignment-target-option" data-target-option="anyone"><input type="radio" name="learnerTarget" value="anyone" checked><span class="assignment-target-icon" aria-hidden="true">↗</span><span class="assignment-target-copy"><strong>${m("linkOnly")}</strong><small>${m("linkOnlyHelp")}</small></span><span class="assignment-target-check" aria-hidden="true">✓</span></label></div><div id="assignment-learner-list"></div></fieldset>
        <div class="assignment-settings-fields"><div class="field"><label for="assignment-deadline">${copy.deadline}</label><input id="assignment-deadline" type="datetime-local" required></div><div class="field"><label for="assignment-max">${copy.maxAttempts}</label><select id="assignment-max">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option>${n}</option>`).join("")}</select></div></div>
        <div class="actions assignment-submit-actions"><button type="submit">${editing ? copy.saveChanges : copy.publish}</button></div>
      </aside>
    </div>`;
  attachSentenceLibraryControls(
    form,
    me,
    "#assignment-words",
    "#assignment-sentences",
    'input[name="mode"]',
  );
  const roster = (await api("/api/assignments")).learners || [];
  const learnerField = form.querySelector("#assignment-learners-field");
  const learnerList = form.querySelector("#assignment-learner-list");
  const learnerOptions = learnerField.querySelector(".radio-row");
  const activeLearners = roster.filter((learner) => !learner.archived);
  let learnerAssignmentChanged = !editing;
  let learnerError = null;
  if (!activeLearners.length) {
    learnerOptions.hidden = true;
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = m("noLearnersForAssignment");
    const add = document.createElement("a");
    add.className = "button-link button-secondary";
    add.href = `/teacher/learners?lang=${encodeURIComponent(locale)}`;
    add.textContent = m(
      me.plan === "free"
        ? "freeAddLearner"
        : isParentPlan(me)
          ? "addChild"
          : "addLearner",
    );
    learnerList.replaceChildren(empty, add);
  } else {
    const picker = document.createElement("details");
    picker.className = "learner-picker";
    const pickerSummary = document.createElement("summary");
    pickerSummary.className = "learner-picker-summary";
    const pickerPopover = document.createElement("div");
    pickerPopover.className = "learner-picker-popover";
    const search = document.createElement("input");
    search.type = "search";
    search.className = "learner-picker-search";
    search.placeholder = m("searchLearners");
    search.setAttribute("aria-label", m("searchLearners"));
    const options = document.createElement("div");
    options.className = "learner-picker-options";
    const pickerFooter = document.createElement("div");
    pickerFooter.className = "learner-picker-footer";
    const pickerCount = document.createElement("span");
    const pickerDone = document.createElement("button");
    pickerDone.type = "button";
    pickerDone.className = "button-secondary";
    pickerDone.textContent = m("done");
    pickerFooter.append(pickerCount, pickerDone);
    pickerPopover.append(search, options, pickerFooter);
    picker.append(pickerSummary, pickerPopover);
    learnerList.replaceChildren(picker);
    activeLearners.forEach((learner) => {
      const label = document.createElement("label");
      label.className = "learner-picker-option";
      label.dataset.learnerName = learner.name.toLocaleLowerCase(locale);
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "learnerId";
      input.value = learner.id;
      const avatar = learnerAvatar(learner, "learner-picker-avatar");
      const name = document.createElement("span");
      name.className = "learner-picker-name";
      name.textContent = learner.name;
      label.append(input, avatar, name);
      options.append(label);
    });
    const selectedRadio = form.querySelector(
      'input[name="learnerTarget"][value="selected"]',
    );
    const checkboxes = [
      ...learnerList.querySelectorAll('input[name="learnerId"]'),
    ];
    const assignedIds = new Set(
      (assignment?.assignedLearners || []).map((learner) => learner.id),
    );
    if (editing && assignedIds.size) {
      selectedRadio.checked = true;
      checkboxes.forEach((input) => {
        input.checked = assignedIds.has(input.value);
      });
    }
    const updatePickerSummary = () => {
      const selected = checkboxes
        .filter((input) => input.checked)
        .map(
          (input) =>
            input.closest("label")?.querySelector(".learner-picker-name")
              ?.textContent || "",
        )
        .filter(Boolean);
      pickerSummary.textContent = selected.length
        ? selected.length === 1
          ? m("selectedLearnersCount", { count: 1 })
          : m("selectedLearnersPlus", {
              name: selected[0],
              count: selected.length - 1,
            })
        : m("selectLearners");
      pickerCount.textContent = m("selectedLearnersCount", {
        count: selected.length,
      });
      options.querySelectorAll(".learner-picker-option").forEach((option) => {
        option.classList.toggle(
          "is-selected",
          option.querySelector('input[name="learnerId"]')?.checked === true,
        );
      });
    };
    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase(locale);
      options.querySelectorAll(".learner-picker-option").forEach((option) => {
        option.hidden = !option.dataset.learnerName.includes(query);
      });
    });
    pickerDone.addEventListener("click", () => {
      picker.open = false;
    });
    learnerError = document.createElement("small");
    learnerError.className = "assignment-learners-error";
    learnerError.setAttribute("role", "alert");
    learnerError.textContent = m("selectAtLeastOneLearner");
    learnerField.append(learnerError);
    const updateLearnerValidation = () => {
      const invalid =
        learnerAssignmentChanged &&
        form.querySelector('input[name="learnerTarget"]:checked').value ===
          "selected" &&
        !learnerList.querySelector('input[name="learnerId"]:checked');
      learnerField.setAttribute("aria-invalid", String(invalid));
      learnerError.hidden = !invalid;
      syncFormSubmit(form);
    };
    const updateLearnerVisibility = () => {
      learnerList.hidden =
        form.querySelector('input[name="learnerTarget"]:checked').value !==
        "selected";
    };
    form.addEventListener("change", (event) => {
      if (
        event.target.name === "learnerTarget" ||
        event.target.name === "learnerId"
      ) {
        learnerAssignmentChanged = true;
      }
      if (event.target.name === "learnerTarget" && event.target.value === "all")
        checkboxes.forEach((input) => (input.checked = true));
      updatePickerSummary();
      updateLearnerVisibility();
      updateLearnerValidation();
    });
    updateLearnerVisibility();
    updatePickerSummary();
    updateLearnerValidation();
  }
  form.querySelector("#assignment-words").value = draftWords;
  form.querySelector("#assignment-sentences").value = draftSentences;
  form.querySelector("#assignment-title").value = draftTitle;
  form.querySelector("#assignment-max").value = String(
    editing ? assignment.max_attempts : 1,
  );
  form.querySelector(
    `input[name="mode"][value="${draftMode === "typing" ? "typing" : "dictation"}"]`,
  ).checked = true;
  if (editing && assignment.hasAttempts) {
    const lock = document.createElement("small");
    lock.className = "field-lock";
    lock.textContent = copy.assignmentHasResults;
    form.querySelector("#assignment-words").disabled = true;
    form.querySelector("#assignment-sentences").disabled = true;
    form.querySelectorAll('input[name="mode"]').forEach((input) => {
      input.disabled = true;
    });
    form.querySelector("#assignment-words").closest(".field").append(lock);
    form
      .querySelector("#assignment-sentences")
      .closest(".field")
      .append(lock.cloneNode(true));
    const modeField = form
      .querySelector('input[name="mode"]')
      .closest("fieldset");
    modeField.append(lock.cloneNode(true));
    form
      .querySelectorAll(
        ".sentence-library-controls button, .sentence-library-controls select",
      )
      .forEach((control) => {
        control.disabled = true;
      });
  }
  attachWordLimit(form, me, "#assignment-words", {
    locked: editing && assignment.hasAttempts,
  });
  const local = new Date(
    defaultDeadline.getTime() - defaultDeadline.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16);
  form.querySelector("#assignment-deadline").value = local;
  const status = statusElement(
    form.querySelector(".assignment-submit-actions"),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const learnerTarget = form.querySelector(
      'input[name="learnerTarget"]:checked',
    )?.value;
    if (
      learnerTarget === "selected" &&
      !learnerList.querySelector('input[name="learnerId"]:checked') &&
      learnerAssignmentChanged
    ) {
      learnerField.setAttribute("aria-invalid", "true");
      if (learnerError) learnerError.hidden = false;
      syncFormSubmit(form);
      return;
    }
    if (form.querySelector('[aria-invalid="true"]')) return;
    form.querySelector(".section-error")?.remove();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = editing ? copy.savingChanges : copy.creating;
    try {
      const mode = form.querySelector('input[name="mode"]:checked').value;
      const learnerIds =
        learnerTarget === "all"
          ? [...learnerList.querySelectorAll('input[name="learnerId"]')].map(
              (input) => input.value,
            )
          : learnerTarget === "selected"
            ? [...form.querySelectorAll('input[name="learnerId"]:checked')].map(
                (input) => input.value,
              )
            : [];
      const body = {
        title: form.querySelector("#assignment-title").value,
        expiresAt: new Date(
          form.querySelector("#assignment-deadline").value,
        ).toISOString(),
        maxAttempts: Number(form.querySelector("#assignment-max").value),
      };
      if (learnerAssignmentChanged) body.learnerIds = learnerIds;
      if (!editing || !assignment.hasAttempts) {
        body.words = form.querySelector("#assignment-words").value;
        body.exampleSentences = form.querySelector(
          "#assignment-sentences",
        ).value;
        body.mode = mode;
      }
      const result = await api(
        editing ? `/api/assignments/${assignment.id}` : "/api/assignments",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(body),
        },
      );
      if (editing) {
        location.href = `/teacher/assignments/${assignment.id}?lang=${encodeURIComponent(locale)}`;
        return;
      }
      try {
        sessionStorage.removeItem("mySpellingTeacherDraftWords");
        sessionStorage.removeItem("mySpellingTeacherDraftSentences");
        sessionStorage.removeItem("mySpellingTeacherDraftTitle");
        sessionStorage.removeItem("mySpellingTeacherDraftMode");
      } catch {}
      const entryPoint = getAssignmentEntryPoint();
      trackEvent("assignment_created", {
        mode,
        word_count: String(form.querySelector("#assignment-words").value)
          .split(/\s+/)
          .filter(Boolean).length,
        ...(entryPoint ? { entry_point: entryPoint } : {}),
      });
      clearAssignmentEntryPoint();
      location.href = `/teacher/assignments/${result.id}?lang=${encodeURIComponent(locale)}`;
    } catch (error) {
      if (error.code === "active_assignment_limit") {
        status.textContent = "";
        showSectionError(form, error, "active_assignment_limit");
      } else {
        status.textContent = error.message;
        status.className = "status error";
      }
      button.disabled = form.querySelector('[aria-invalid="true"]') !== null;
      button.textContent = editing ? copy.saveChanges : copy.publish;
    }
  });
  card.append(headingRow, form);
  main.append(card);
}

async function renderNew(me) {
  return renderAssignmentForm(me);
}

async function renderEdit(me, id) {
  const data = await api(`/api/assignments/${id}`);
  return renderAssignmentForm(me, { assignment: data });
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
  const main = shell(me, "assignments");
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
  backLink.href = `/teacher/assignments?lang=${encodeURIComponent(locale)}`;
  backLink.textContent = copy.backToDashboard;
  headingRow.append(titleRow, backLink);
  const linkLabel = document.createElement("h2");
  linkLabel.textContent =
    me.plan === "free" || isParentPlan(me)
      ? copy.freeAssignmentLink
      : copy.studentLink;
  const assignedLearners = data.assignedLearners || [];
  const linkPanel = document.createElement("div");
  const copyText =
    me.plan === "free"
      ? copy.freeCopyLearnerLink
      : isParentPlan(me)
        ? copy.familyCopyChildLink
        : copy.copyLink;
  const copiedText =
    me.plan === "free"
      ? copy.freeLearnerLinkCopied
      : isParentPlan(me)
        ? copy.familyChildLinkCopied
        : copy.copied;
  const bindCopy = (button, url, successText = copiedText) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(url);
      button.textContent = successText;
      button.classList.add("is-success");
      trackEvent("assignment_link_copied", {
        mode: data.mode,
        word_count: data.words.length,
      });
    });
  };
  if (assignedLearners.length) {
    linkPanel.className = "assignment-learner-links";
    const audience = document.createElement("p");
    audience.className = "assignment-meta";
    audience.textContent = m("assignedToSummary", {
      learners: assignedLearners.map((learner) => learner.name).join(", "),
    });
    linkPanel.append(audience);
    for (const learner of assignedLearners) {
      const learnerPanel = document.createElement("div");
      learnerPanel.className = "assignment-student-link";
      const learnerName = document.createElement("strong");
      learnerName.textContent = learner.name;
      const learnerUrl = `${location.origin}/a/${data.public_id}?learner=${encodeURIComponent(learner.public_id)}&lang=${encodeURIComponent(locale)}`;
      const learnerLink = document.createElement("a");
      learnerLink.href = learnerUrl;
      learnerLink.textContent = learnerUrl;
      learnerLink.rel = "noreferrer";
      const learnerActions = document.createElement("div");
      learnerActions.className = "actions";
      const learnerCopyButton = document.createElement("button");
      learnerCopyButton.type = "button";
      learnerCopyButton.className = "button-secondary";
      learnerCopyButton.setAttribute("aria-live", "polite");
      learnerCopyButton.textContent = copyText;
      bindCopy(learnerCopyButton, learnerUrl);
      learnerActions.append(learnerCopyButton);
      learnerPanel.append(learnerName, learnerLink, learnerActions);
      linkPanel.append(learnerPanel);
    }
  } else {
    linkPanel.className = "assignment-student-link";
    const studentUrl = `${location.origin}/a/${data.public_id}?lang=${encodeURIComponent(locale)}`;
    const link = document.createElement("a");
    link.href = studentUrl;
    link.textContent = studentUrl;
    link.rel = "noreferrer";
    linkPanel.append(link);
    const audience = document.createElement("p");
    audience.className = "assignment-meta";
    audience.textContent = m("linkOnly");
    linkPanel.append(audience);
  }
  const actions = document.createElement("div");
  actions.className = "actions";
  const studentUrl = `${location.origin}/a/${data.public_id}?lang=${encodeURIComponent(locale)}`;
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.setAttribute("aria-live", "polite");
  copyButton.textContent =
    me.plan === "free" || isParentPlan(me) ? copy.freeCopyLink : copy.copyLink;
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
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "button-secondary";
  edit.textContent = copy.editAssignment;
  edit.addEventListener("click", () => {
    location.href = `/teacher/assignments/${id}/edit?lang=${encodeURIComponent(locale)}`;
  });
  bindCopy(
    copyButton,
    studentUrl,
    me.plan === "free" || isParentPlan(me) ? copy.freeLinkCopied : copy.copied,
  );
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
    location.href = `/teacher/assignments?lang=${encodeURIComponent(locale)}`;
  });
  saveList.addEventListener("click", async () => {
    try {
      await api("/api/saved-lists", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          words: data.words.map((word) => word.word),
          exampleSentences: data.words.map((word) => word.example_sentence),
        }),
      });
      trackEvent("saved_list_created");
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
  if (!assignedLearners.length) actions.append(copyButton);
  actions.append(edit, saveList, toggle);
  if (isTeacherPlan(me)) {
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
  summaryTitle.textContent =
    me.plan === "free" || isParentPlan(me)
      ? copy.freeProgress
      : copy.detailTitle;
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.append(
    statCard(
      me.plan === "free"
        ? copy.freeLearners
        : isParentPlan(me)
          ? copy.familyLearners
          : copy.summaryStudents,
      data.summary.students,
    ),
    statCard(copy.summaryAverage, `${data.summary.averageAccuracy}%`),
    statCard(copy.summarySubmissions, data.summary.attempts),
  );
  summary.append(summaryTitle, grid);
  main.append(summary);
  const hasMissedWords = data.attempts.some(
    (attempt) => attempt.missed_words?.length,
  );
  const review = document.createElement("section");
  review.className = "product-card";
  const reviewTitle = document.createElement("h2");
  reviewTitle.textContent = copy.smartReview;
  const reviewCopy = document.createElement("p");
  reviewCopy.textContent = copy.smartReviewValue;
  review.append(reviewTitle, reviewCopy);
  if (isPlusPlan(me)) {
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
      } finally {
        createReview.disabled = false;
      }
    });
  } else {
    const locked = document.createElement("button");
    locked.type = "button";
    locked.className = "button-secondary";
    locked.textContent = copy.createReview;
    locked.addEventListener("click", () =>
      showLockedFeaturePlan(review, copy.smartReviewUpgrade, "smart_review"),
    );
    review.append(locked);
  }
  if (isPlusPlan(me) || hasMissedWords) main.append(review);
  const results = document.createElement("section");
  results.className = "product-card";
  const resultTitle = document.createElement("h2");
  resultTitle.textContent =
    me.plan === "free" || isParentPlan(me) ? copy.freeProgress : copy.results;
  results.append(resultTitle);
  if (!data.attempts.length) {
    const empty = document.createElement("p");
    empty.textContent =
      me.plan === "free"
        ? copy.freeNoResults
        : isParentPlan(me)
          ? copy.familyNoResults
          : copy.noResults;
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
  if (isTeacherPlan(me)) {
    const misses = document.createElement("section");
    misses.className = "product-card";
    const missesTitle = document.createElement("h2");
    missesTitle.textContent = copy.commonMisses;
    misses.append(missesTitle);
    const list = document.createElement("div");
    list.className = "word-list";
    for (const item of data.missedWordStats || []) {
      const chip = document.createElement("span");
      chip.className = "word-chip";
      chip.textContent = `${item.word} · ${item.misses}`;
      list.append(chip);
    }
    misses.append(list);
    main.append(misses);
  }
}

async function renderLearner(me, id) {
  const data = await api(`/api/learners/${id}`);
  const reviewData = data.todaysReview || { count: 0, words: null };
  const main = shell(me, "progress");
  const card = document.createElement("section");
  card.className = "product-card";
  const headingRow = document.createElement("div");
  headingRow.className = "assignment-detail-heading";
  const titleRow = document.createElement("div");
  titleRow.className = "assignment-title-row";
  const heading = document.createElement("h1");
  heading.textContent = data.learner.name;
  titleRow.append(
    learnerAvatar(data.learner, "learner-avatar learner-avatar-large"),
    heading,
  );
  if (data.learner.archived) {
    const badge = document.createElement("span");
    badge.className = "badge closed";
    badge.textContent = copy.archived;
    titleRow.append(badge);
  }
  const back = document.createElement("a");
  back.className = "button-link button-secondary";
  back.href = `/teacher/progress?lang=${encodeURIComponent(locale)}`;
  back.textContent = copy.backToDashboard;
  const headingActions = document.createElement("div");
  headingActions.className = "actions compact-actions";
  if (data.learner.public_id) {
    const learnerLink = `${location.origin}/l/${data.learner.public_id}?lang=${encodeURIComponent(locale)}`;
    const copyLearnerLink = document.createElement("button");
    copyLearnerLink.type = "button";
    copyLearnerLink.className = "button-secondary";
    copyLearnerLink.setAttribute("aria-live", "polite");
    copyLearnerLink.textContent =
      me.plan === "free"
        ? copy.freeCopyLearnerLink
        : isParentPlan(me)
          ? copy.familyCopyChildLink
          : copy.copyLearnerLink;
    copyLearnerLink.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(learnerLink);
        copyLearnerLink.textContent =
          me.plan === "free"
            ? copy.freeLearnerLinkCopied
            : isParentPlan(me)
              ? copy.familyChildLinkCopied
              : copy.learnerLinkCopied;
        copyLearnerLink.classList.add("is-success");
      } catch {
        copyLearnerLink.textContent = copy.learnerLinkCopied;
      }
    });
    headingActions.append(copyLearnerLink);
  }
  headingActions.append(back);
  headingRow.append(titleRow, headingActions);
  const history = document.createElement("p");
  history.textContent = m("historyWindow", { days: data.historyDays });
  card.append(headingRow, history);
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

  const todaysReview = document.createElement("section");
  todaysReview.className = "product-card";
  const todaysReviewTitle = document.createElement("h2");
  todaysReviewTitle.textContent = copy.todaysReview;
  const todaysReviewCount = document.createElement("p");
  todaysReviewCount.textContent = reviewData.count
    ? m("todaysReviewCount", { count: reviewData.count })
    : copy.todaysReviewEmpty;
  todaysReview.append(todaysReviewTitle, todaysReviewCount);
  if (data.smartReview && reviewData.words?.length) {
    const list = document.createElement("div");
    list.className = "word-list";
    for (const item of reviewData.words) {
      const word = document.createElement("span");
      word.className = "word-chip";
      word.textContent = `${item.word} · ${m("todaysReviewMisses", {
        count: item.recentMissCount,
        date: date(item.lastPracticedAt),
      })}`;
      list.append(word);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = copy.createTodaysReview;
    button.addEventListener("click", () => {
      saveAssignmentDraft(
        reviewData.words,
        m("todaysReviewDraftTitle", { name: data.learner.name }),
        reviewData.words.map((word) => word.exampleSentence),
      );
    });
    todaysReview.append(list, button);
  } else if (!data.smartReview && reviewData.count) {
    const locked = document.createElement("button");
    locked.type = "button";
    locked.className = "button-secondary";
    locked.textContent = copy.createTodaysReview;
    locked.addEventListener("click", () =>
      showLockedFeaturePlan(
        todaysReview,
        copy.todaysReviewUpgrade,
        "todays_review",
      ),
    );
    todaysReview.append(locked);
  }
  main.append(todaysReview);

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
      } finally {
        button.disabled = false;
      }
    });
  } else {
    if (data.summary.needsReview) {
      const locked = document.createElement("button");
      locked.type = "button";
      locked.className = "button-secondary";
      locked.textContent = copy.createReview;
      locked.addEventListener("click", () =>
        showLockedFeaturePlan(review, copy.smartReviewUpgrade, "smart_review"),
      );
      review.append(locked);
    }
  }
  if (data.smartReview || data.summary.needsReview) main.append(review);

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

function checkoutPlanIsActive(me, plan) {
  return plan === "parent"
    ? me.plan === "parent"
    : plan === "teacher"
      ? me.plan === "teacher"
      : ["teacher", "plus", "pro"].includes(me.plan);
}

function checkoutPlanLabel(plan) {
  return plan === "parent" ? copy.parentPlan : copy.teacherPlan;
}

async function pollForPlan(plan) {
  for (let attempt = 0; attempt < ACTIVATION_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    try {
      const me = await api("/api/me");
      if (checkoutPlanIsActive(me, plan)) return me;
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
  if (!shouldRecord || me.subscriptionStatus !== "active") return;
  const billingInterval = me.billingInterval === "year" ? "year" : "month";
  trackEvent("subscription_started", {
    plan: me.plan,
    billing_interval: billingInterval,
  });
  trackEvent("purchase", {
    plan: me.plan,
    billing_interval: billingInterval,
    value:
      me.plan === "parent"
        ? billingInterval === "year"
          ? 49.99
          : 4.99
        : me.plan === "teacher"
          ? billingInterval === "year"
            ? 99.99
            : 9.99
          : billingInterval === "year"
            ? 49.99
            : 5.99,
    currency: "USD",
  });
}

function clearCheckoutParam() {
  const url = new URL(location.href);
  url.searchParams.set("lang", locale);
  url.searchParams.delete("checkout");
  url.searchParams.delete("interval");
  url.searchParams.delete("plan");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_LOCALE_KEY);
    sessionStorage.removeItem("pendingCheckoutPlan");
  } catch {}
}

async function renderTeacherRoute(me) {
  workspaceState = { me };
  bindWorkspaceNavigation();
  const detail = location.pathname.match(
    /^\/teacher\/assignments\/([0-9a-f-]{36})$/i,
  );
  const editAssignment = location.pathname.match(
    /^\/teacher\/assignments\/([0-9a-f-]{36})\/edit$/i,
  );
  const learner = location.pathname.match(
    /^\/teacher\/learners\/([0-9a-f-]{36})$/i,
  );
  try {
    if (location.pathname === "/teacher/assignments/new") await renderNew(me);
    else if (editAssignment) await renderEdit(me, editAssignment[1]);
    else if (detail) await renderDetail(me, detail[1]);
    else if (learner) await renderLearner(me, learner[1]);
    else await renderDashboard(me);
  } catch (error) {
    const main = shell(me, "overview");
    const card = document.createElement("section");
    card.className = "product-card error-card";
    const title = document.createElement("h1");
    title.textContent = error.message;
    card.append(title);
    main.append(card);
  }
}

async function finishPlanActivation(me) {
  recordPurchase(me);
  clearCheckoutParam();
  await renderTeacherRoute(me);
  const main = root.querySelector(".product-main");
  if (main) {
    const notice = document.createElement("p");
    notice.className = "notice pro-activation-notice";
    notice.setAttribute("role", "status");
    notice.textContent =
      me.plan === "parent" || me.plan === "teacher"
        ? m("planActive", {
            plan: me.plan === "parent" ? copy.parentPlan : copy.teacherPlan,
          })
        : copy.proActive;
    main.prepend(notice);
  }
}

function showActivationTimeout(plan) {
  const card = activationCard(
    plan !== "legacy"
      ? m("activationDelayedPlan", { plan: checkoutPlanLabel(plan) })
      : copy.activationDelayed,
  );
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "button-secondary";
  retry.textContent = copy.checkAgain;
  retry.addEventListener("click", async () => {
    activationCard(
      plan !== "legacy"
        ? m("activatingPlan", { plan: checkoutPlanLabel(plan) })
        : copy.activatingPro,
    );
    const me = await pollForPlan(plan);
    if (me) await finishPlanActivation(me);
    else showActivationTimeout(plan);
  });
  card.append(retry);
}

async function init() {
  const loading = document.createElement("p");
  loading.className = "workspace-loading";
  loading.setAttribute("role", "status");
  loading.textContent = copy.loading;
  root.replaceChildren(loading);
  let me;
  try {
    me = await api("/api/me");
  } catch (error) {
    if (error.status === 401) return renderLogin();
    loading.className = "workspace-loading error";
    loading.textContent = error.message;
    return;
  }
  try {
    if (sessionStorage.getItem(AUTH_PENDING_KEY) === "1") {
      const entryPoint = getAssignmentEntryPoint();
      const provider = sessionStorage.getItem(AUTH_PROVIDER_KEY);
      trackEvent(
        "teacher_auth_completed",
        entryPoint ? { entry_point: entryPoint } : {},
      );
      if (
        (provider === "google" || provider === "microsoft") &&
        new URLSearchParams(location.search).get("signup") === "1"
      ) {
        trackEvent("sign_up", {
          provider,
          workspace_type:
            me.workspaceType ||
            (me.plan === "parent" ||
            sessionStorage.getItem("pendingCheckoutPlan") === "parent"
              ? "family"
              : "teacher"),
        });
      }
      sessionStorage.removeItem(AUTH_PENDING_KEY);
      sessionStorage.removeItem(AUTH_PROVIDER_KEY);
      const url = new URL(location.href);
      url.searchParams.delete("signup");
      history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {}
  workspaceState = { me };
  bindWorkspaceNavigation();
  let pendingInterval = null;
  let pendingPlan = "teacher";
  let pendingCheckoutError = null;
  try {
    pendingInterval = sessionStorage.getItem("pendingCheckoutInterval");
    pendingPlan =
      sessionStorage.getItem("pendingCheckoutPlan") === "parent"
        ? "parent"
        : "teacher";
  } catch {}
  if (pendingInterval === "month" || pendingInterval === "year") {
    try {
      await startCheckout(pendingInterval, pendingPlan);
      return;
    } catch (error) {
      pendingCheckoutError = error;
    }
  }
  const params = new URLSearchParams(location.search);
  if (params.get("checkout") === "success") {
    const requestedPlan = params.get("plan");
    const checkoutPlan =
      requestedPlan === "parent" || requestedPlan === "teacher"
        ? requestedPlan
        : "legacy";
    if (!checkoutPlanIsActive(me, checkoutPlan)) {
      activationCard(
        checkoutPlan !== "legacy"
          ? m("activatingPlan", { plan: checkoutPlanLabel(checkoutPlan) })
          : copy.activatingPro,
      );
      me = await pollForPlan(checkoutPlan);
      if (!me) {
        showActivationTimeout(checkoutPlan);
        return;
      }
    }
    await finishPlanActivation(me);
  } else {
    await renderTeacherRoute(me);
  }
  if (pendingCheckoutError)
    showCheckoutRetry(pendingInterval, pendingPlan, pendingCheckoutError);
}

init();
