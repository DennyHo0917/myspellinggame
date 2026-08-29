(function () {
  const PREF_KEY = "mySpellingGamePreferredLocale";
  const LOCALE_DIRS = {
    en: "",
    es: "es",
    "pt-BR": "pt-br",
    fr: "fr",
    id: "id",
    zh: "zh",
  };
  const LOCALIZED_DIRS = new Set(Object.values(LOCALE_DIRS).filter(Boolean));
  const APP_PATH = /^\/(?:teacher|admin|a|l|join)(?:\/|$)/;

  function normalizeLocale(locale) {
    const value = String(locale || "").toLowerCase();
    if (value.startsWith("zh")) return "zh";
    if (value.startsWith("pt")) return "pt-BR";
    if (value.startsWith("es")) return "es";
    if (value.startsWith("fr")) return "fr";
    if (value.startsWith("id") || value.startsWith("in")) return "id";
    return "en";
  }

  function supportedLocale(locale) {
    const value = String(locale || "").toLowerCase();
    return /^(?:en|es|fr|id|in|pt|zh)(?:-|$)/.test(value)
      ? normalizeLocale(value)
      : "";
  }

  function readStoredLocale() {
    try {
      const locale = localStorage.getItem(PREF_KEY);
      return supportedLocale(locale);
    } catch (_) {
      return "";
    }
  }

  function writeStoredLocale(locale) {
    const normalized = normalizeLocale(locale);
    try {
      localStorage.setItem(PREF_KEY, normalized);
    } catch (_) {
      // Storage can be blocked in private or hardened browsers.
    }
    return normalized;
  }

  function pathLocale(pathname) {
    const directory = String(pathname || "/")
      .split("/")[1]
      .toLowerCase();
    if (!LOCALIZED_DIRS.has(directory)) return "";
    return directory === "pt-br" ? "pt-BR" : directory;
  }

  function stripLocale(pathname) {
    const parts = String(pathname || "/").split("/");
    if (LOCALIZED_DIRS.has(parts[1].toLowerCase())) parts.splice(1, 1);
    return parts.join("/") || "/";
  }

  function localizedPath(pathname, locale) {
    const base = stripLocale(pathname);
    if (APP_PATH.test(base)) return base;
    const directory = LOCALE_DIRS[locale];
    if (!directory) return base;
    return `/${directory}${base === "/" ? "/" : base}`;
  }

  function localizedHref(href, locale) {
    if (!href || href.startsWith("#")) return "";
    const target = new URL(href, window.location.origin);
    if (target.origin !== window.location.origin) return "";
    const base = stripLocale(target.pathname);
    if (APP_PATH.test(base)) target.searchParams.set("lang", locale);
    else target.pathname = localizedPath(target.pathname, locale);
    return target.pathname + target.search + target.hash;
  }

  function localizeLinks(locale) {
    for (const link of document.querySelectorAll("a[href]:not(.lang-option)")) {
      const href = localizedHref(link.getAttribute("href"), locale);
      if (href) link.setAttribute("href", href);
    }
  }

  const params = new URLSearchParams(window.location.search);
  const queryLocale = supportedLocale(params.get("lang"));
  const selectedLocale = queryLocale
    ? writeStoredLocale(queryLocale)
    : readStoredLocale() ||
      pathLocale(window.location.pathname) ||
      normalizeLocale(
        (typeof navigator !== "undefined" &&
          (navigator.languages?.[0] || navigator.language)) ||
          "en",
      );

  params.delete("lang");
  const targetPath = localizedPath(window.location.pathname, selectedLocale);
  const targetQuery = params.toString();
  const target =
    targetPath + (targetQuery ? `?${targetQuery}` : "") + window.location.hash;
  const current =
    window.location.pathname + window.location.search + window.location.hash;
  if (target !== current) {
    window.location.replace(target);
    return;
  }

  document.addEventListener("click", function (event) {
    for (const menu of document.querySelectorAll(
      "details.language-switcher[open]",
    )) {
      if (menu.contains && !menu.contains(event.target)) menu.open = false;
    }
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    if (link.matches(".lang-option[hreflang]")) {
      writeStoredLocale(link.getAttribute("hreflang"));
      const query = new URLSearchParams(window.location.search);
      query.delete("lang");
      const targetUrl = new URL(
        link.getAttribute("href"),
        window.location.origin,
      );
      targetUrl.search = query.toString();
      targetUrl.hash = window.location.hash;
      link.setAttribute(
        "href",
        targetUrl.pathname + targetUrl.search + targetUrl.hash,
      );
      return;
    }
    const href = localizedHref(link.getAttribute("href"), selectedLocale);
    if (href) link.setAttribute("href", href);
  });

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () =>
      localizeLinks(selectedLocale),
    );
  else localizeLinks(selectedLocale);
})();
