import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = ['', 'es', 'pt-br', 'fr', 'id', 'zh'];
const hreflangs = ['en', 'es', 'pt-BR', 'fr', 'id', 'zh-CN', 'x-default'];

function publicHtmlFiles() {
  return locales.flatMap((locale) => fs.readdirSync(path.join(root, locale))
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(root, locale, name)));
}

function tagContent(html, expression) {
  return html.match(expression)?.[1] || '';
}

test('sitemap contains each extensionless canonical exactly once with complete hreflang', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  const sitemapUrls = blocks.map((block) => tagContent(block, /<loc>([^<]+)<\/loc>/));
  const canonicals = publicHtmlFiles().map((file) => tagContent(
    fs.readFileSync(file, 'utf8'),
    /<link rel="canonical" href="([^"]+)">/,
  ));

  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length);
  assert.deepEqual([...sitemapUrls].sort(), [...canonicals].sort());
  assert.equal(sitemapUrls.some((url) => url.includes('.html')), false);
  for (const block of blocks) {
    const found = [...block.matchAll(/hreflang="([^"]+)"/g)].map((match) => match[1]).sort();
    assert.deepEqual(found, [...hreflangs].sort());
  }

  const lastmods = blocks.map((block) => tagContent(block, /<lastmod>([^<]+)<\/lastmod>/));
  assert.ok(new Set(lastmods).size > 1);
  const byUrl = new Map(blocks.map((block) => [
    tagContent(block, /<loc>([^<]+)<\/loc>/),
    tagContent(block, /<lastmod>([^<]+)<\/lastmod>/),
  ]));
  assert.equal(byUrl.get('https://myspellinggame.com/'), '2026-08-14');
  assert.equal(byUrl.get('https://myspellinggame.com/homeschool-spelling-practice'), '2026-08-14');
  assert.equal(byUrl.get('https://myspellinggame.com/es/about'), '2026-08-14');
  assert.equal(byUrl.get('https://myspellinggame.com/zh/contact'), '2026-08-14');
  assert.equal(byUrl.get('https://myspellinggame.com/contact'), '2026-06-28');
  assert.equal(byUrl.get('https://myspellinggame.com/es/sight-word-typing-game'), '2026-06-28');
  assert.equal(byUrl.get('https://myspellinggame.com/sight-word-typing-game'), '2026-06-22');

  for (const file of publicHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    const dateModified = tagContent(html, /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    if (!dateModified) continue;
    const canonical = tagContent(html, /<link rel="canonical" href="([^"]+)">/);
    assert.equal(byUrl.get(canonical), dateModified);
  }
});

test('home and remaining long-tail pages have one H1 and distinct metadata per locale', () => {
  for (const locale of locales) {
    const files = ['index.html', 'homeschool-spelling-practice.html', 'sight-word-typing-game.html']
      .map((name) => path.join(root, locale, name));
    const pages = files.map((file) => fs.readFileSync(file, 'utf8'));
    for (const html of pages) assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    const titles = pages.map((html) => tagContent(html, /<title>([^<]+)<\/title>/));
    const descriptions = pages.map((html) => tagContent(html, /<meta name="description" content="([^"]+)">/));
    assert.equal(new Set(titles).size, 3);
    assert.equal(new Set(descriptions).size, 3);
  }
});

test('all public pages use clean GA configuration and final URL signals', () => {
  for (const file of publicHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /page_location: window\.location\.origin \+ window\.location\.pathname/);
    assert.match(html, /<script type="module" src="\/src\/js\/analytics\.mjs"><\/script>/);
    assert.doesNotMatch(html, /<(?:a|link)\b[^>]+(?:href)="[^"]+\.html(?:[?#][^"]*)?"/);
    assert.doesNotMatch(html, /(?:href|action)="[^"]*\?words=/);
  }
});

test('localized legal pages keep SEO links inside the active locale', () => {
  for (const locale of locales.filter(Boolean)) {
    for (const page of ['about.html', 'contact.html', 'privacy.html']) {
      const html = fs.readFileSync(path.join(root, locale, page), 'utf8');
      assert.match(html, new RegExp(`href="/${locale}/faq"`));
      assert.doesNotMatch(html, /(?:custom-spelling-words-game|spelling-list-game|weekly-spelling-practice)/);
    }
  }
});
