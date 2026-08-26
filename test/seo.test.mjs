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
  assert.equal(byUrl.get('https://myspellinggame.com/'), '2026-08-23');
  assert.equal(byUrl.get('https://myspellinggame.com/homeschool-spelling-practice'), '2026-08-23');
  assert.equal(byUrl.get('https://myspellinggame.com/es/about'), '2026-08-23');
  assert.equal(byUrl.get('https://myspellinggame.com/zh/contact'), '2026-08-23');
  assert.equal(byUrl.get('https://myspellinggame.com/pricing'), '2026-08-23');
  assert.equal(byUrl.get('https://myspellinggame.com/contact'), '2026-08-23');
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

test('all public pages keep the My Spelling Game brand untranslated', () => {
  const forbidden = /My (?:ortografía|orthographe|ortografia|ejaan|拼写) Game/i;
  for (const file of publicHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, forbidden, file);
    for (const match of html.matchAll(/my\s+([^<>"\n]{1,30}?)\s+game/gi)) {
      assert.equal(match[0], 'My Spelling Game', file);
    }
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

test('workspace navigation and assignment pricing stay role-inclusive in every locale', () => {
  const expected = {
    '': ['Workspace', 'Save weekly lists. Track real progress.'],
    es: ['Espacio de trabajo', 'Guarda las listas semanales y sigue el progreso real'],
    'pt-br': ['Espaço de trabalho', 'Salve listas semanais e acompanhe o progresso real'],
    fr: ['Espace de travail', 'Enregistrez vos listes et suivez les vrais progrès'],
    id: ['Ruang kerja', 'Simpan daftar mingguan dan pantau perkembangan nyata'],
    zh: ['工作台', '保存每周词表，持续追踪真实进步'],
  };
  for (const [locale, [workspace, heading]] of Object.entries(expected)) {
    const home = fs.readFileSync(path.join(root, locale, 'index.html'), 'utf8');
    const pricing = fs.readFileSync(path.join(root, locale, 'pricing.html'), 'utf8');
    assert.ok(home.includes(`>${workspace}</a>`), locale || 'en');
    assert.ok(pricing.includes(`<h1>${heading}</h1>`), locale || 'en');
  }
});

test('pricing explains the complete 30-day trial in every locale', () => {
  const expected = {
    '': ['30', '$0', 'Card required', '$5.99/month', '$49.99/year', 'automatically', 'cancel'],
    es: ['30', '$0', 'tarjeta', '$5.99', '$49,99', 'automáticamente', 'canceles'],
    'pt-br': ['30', '$0', 'cartão', '$5.99', '$49,99', 'automática', 'cancelar'],
    fr: ['30', '0 $', 'carte requise', '5,99 $', '49,99 $', 'automatiquement', 'résiliation'],
    id: ['30', '$0', 'kartu wajib', '$5.99', '$49.99', 'otomatis', 'dibatalkan'],
    zh: ['30 天', '$0', '付款方式', '$5.99', '$49.99', '自动', '取消'],
  };
  for (const [locale, terms] of Object.entries(expected)) {
    const pricing = fs.readFileSync(path.join(root, locale, 'pricing.html'), 'utf8');
    for (const term of terms) assert.ok(pricing.includes(term), `${locale || 'en'}: ${term}`);
  }
});

test('pricing pages use student terminology in every locale', () => {
  for (const locale of locales) {
    const pricing = fs.readFileSync(path.join(root, locale, 'pricing.html'), 'utf8');
    assert.doesNotMatch(
      pricing,
      /learner|learners|aprendiz|apprenant|pelajar|学习者/i,
      locale || 'en',
    );
  }
});
