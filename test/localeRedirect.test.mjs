import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../src/js/localeRedirect.js", import.meta.url),
  "utf8",
);

function run({
  pathname = "/",
  search = "",
  hash = "#words=red%2Cblue",
  browserLocale = "en-US",
  storedLocale = "",
  links = [],
} = {}) {
  const listeners = {};
  const stored = new Map();
  if (storedLocale) stored.set("mySpellingGamePreferredLocale", storedLocale);
  const calls = { replace: [] };
  const context = {
    URL,
    URLSearchParams,
    navigator: { language: browserLocale, languages: [browserLocale] },
    localStorage: {
      getItem: (key) => stored.get(key) || null,
      setItem: (key, value) => stored.set(key, value),
    },
    document: {
      readyState: "loading",
      addEventListener: (name, listener) => {
        listeners[name] = listener;
      },
      querySelectorAll: () => links,
    },
    window: {
      location: {
        origin: "https://myspellinggame.com",
        pathname,
        search,
        hash,
      },
    },
  };
  context.window.location.replace = (url) => calls.replace.push(url);
  vm.runInNewContext(source, context);
  return { listeners, stored, calls };
}

function link(attributes) {
  const values = new Map(Object.entries(attributes));
  return {
    getAttribute: (name) => values.get(name),
    setAttribute: (name, value) => values.set(name, value),
    matches: (selector) =>
      selector === ".lang-option[hreflang]" &&
      values.get("class") === "lang-option" &&
      values.has("hreflang"),
    values,
  };
}

test("browser language selects localized pages when no preference exists", () => {
  const { calls } = run({ browserLocale: "zh-CN", pathname: "/about" });
  assert.deepEqual(calls.replace, ["/zh/about#words=red%2Cblue"]);
});

test("a saved manual choice overrides browser and current path languages", () => {
  const { calls } = run({
    browserLocale: "en-US",
    storedLocale: "zh",
    pathname: "/fr/privacy",
  });
  assert.deepEqual(calls.replace, ["/zh/privacy#words=red%2Cblue"]);
});

test("language choices are remembered before navigation", () => {
  const { listeners, stored } = run();
  const choice = link({
    class: "lang-option",
    hreflang: "pt-BR",
    href: "/pt-br/",
  });
  listeners.click({ target: { closest: () => choice } });
  assert.equal(stored.get("mySpellingGamePreferredLocale"), "pt-BR");
  assert.equal(choice.values.get("href"), "/pt-br/#words=red%2Cblue");
});

test("lang query becomes the manual preference and redirects cleanly", () => {
  const { stored, calls } = run({ search: "?lang=fr&words=legacy" });
  assert.equal(stored.get("mySpellingGamePreferredLocale"), "fr");
  assert.deepEqual(calls.replace, ["/fr/?words=legacy#words=red%2Cblue"]);
});

test("internal footer links inherit the selected locale", () => {
  const footerLink = link({ href: "/privacy" });
  const { listeners, calls } = run({
    storedLocale: "zh",
    pathname: "/zh/",
    links: [footerLink],
  });
  assert.deepEqual(calls.replace, []);
  listeners.DOMContentLoaded();
  assert.equal(footerLink.values.get("href"), "/zh/privacy");
});
