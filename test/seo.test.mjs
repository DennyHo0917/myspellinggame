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
});

test('home, weekly, and custom pages have one H1 and distinct metadata per locale', () => {
  for (const locale of locales) {
    const files = ['index.html', 'weekly-spelling-practice.html', 'custom-spelling-words-game.html']
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
  }
});
