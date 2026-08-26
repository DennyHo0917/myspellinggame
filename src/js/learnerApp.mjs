import {
  PRODUCT_LOCALES,
  productPagePath,
  productLocale,
  productMessage,
  productMessages,
} from "./productLocale.mjs";

const root = document.getElementById("product-app");
const locale = productLocale();
const copy = productMessages(locale);
const publicId =
  location.pathname.match(/^\/l\/([A-Za-z0-9_-]{24})$/)?.[1] || "";

document.documentElement.lang = locale;
document.title = copy.learnerHome;

function m(key, vars) {
  return productMessage(key, vars, locale);
}

function request(path) {
  return fetch(path).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        data.error === "learner_not_found" ? copy.learnerNotFound : copy.error,
      );
      error.code = data.error;
      throw error;
    }
    return data;
  });
}

function footer() {
  const element = document.createElement("footer");
  element.className = "product-footer";
  const links = [
    "sight-word-typing-game",
    "homeschool-spelling-practice",
    "vocabulary-typing-game",
    "faq",
    "privacy",
    "about",
    "contact",
  ].map((page, index) => {
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
  const nav = document.createElement("nav");
  nav.className = "product-nav teacher-product-nav";
  const brand = document.createElement("a");
  brand.className = "product-brand";
  brand.href = productPagePath("", locale);
  brand.innerHTML = `<img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt=""><span>${copy.brand}</span>`;
  const actions = document.createElement("div");
  actions.className = "product-nav-actions";
  const language = document.createElement("details");
  language.className = "language-switcher";
  const summary = document.createElement("summary");
  summary.className = "lang-btn";
  summary.setAttribute("aria-label", copy.language);
  summary.textContent = copy.language;
  const menu = document.createElement("div");
  menu.className = "lang-menu";
  for (const [value, label] of PRODUCT_LOCALES) {
    const link = document.createElement("a");
    const url = new URL(location.href);
    url.searchParams.set("lang", value);
    link.className = "lang-option";
    link.href = url.toString();
    link.hreflang =
      value === "pt-BR" ? "pt-BR" : value === "zh" ? "zh-CN" : value;
    link.textContent = label;
    if (value === locale) link.setAttribute("aria-current", "page");
    menu.append(link);
  }
  language.append(summary, menu);
  const home = document.createElement("a");
  home.className = "button-link button-secondary";
  home.href = productPagePath("", locale);
  home.textContent = copy.homePage;
  actions.append(language, home);
  nav.append(brand, actions);
  wrapper.append(nav);
  const main = document.createElement("main");
  main.className = "product-main teacher-main learner-main";
  wrapper.append(main, footer());
  root.append(wrapper);
  return main;
}

function renderError(error) {
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card error-card";
  const heading = document.createElement("h1");
  heading.textContent = error.message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = copy.retry;
  retry.addEventListener("click", init);
  card.append(heading, retry);
  main.append(card);
}

function render(data) {
  const main = shell();
  const card = document.createElement("section");
  card.className = "product-card";
  const heading = document.createElement("h1");
  heading.textContent = m("learnerGreeting", { name: data.learner.name });
  const intro = document.createElement("p");
  intro.textContent = copy.yourAssignments;
  card.append(heading, intro);
  if (!data.assignments.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = copy.noActiveAssignments;
    card.append(empty);
    main.append(card);
    return;
  }
  const list = document.createElement("div");
  list.className = "assignment-list";
  for (const assignment of data.assignments) {
    const row = document.createElement("article");
    row.className = "assignment-row";
    const body = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = assignment.title;
    const meta = document.createElement("p");
    meta.className = "assignment-meta";
    meta.textContent = `${assignment.mode === "dictation" ? copy.dictation : copy.typing} · ${m("due", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(assignment.expires_at)) })}`;
    body.append(title, meta);
    const start = document.createElement("a");
    start.className = "button-link";
    start.href = `/a/${assignment.public_id}?learner=${encodeURIComponent(publicId)}&lang=${encodeURIComponent(locale)}`;
    start.textContent = copy.startAssignment;
    row.append(body, start);
    list.append(row);
  }
  card.append(list);
  main.append(card);
}

async function init() {
  root.textContent = copy.loading;
  try {
    render(await request(`/api/public/learners/${publicId}`));
  } catch (error) {
    renderError(error);
  }
}

init();
