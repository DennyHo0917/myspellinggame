import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rules = fs.readFileSync(path.join(root, '.assetsignore'), 'utf8')
  .split(/\r?\n/)
  .map((rule) => rule.trim())
  .filter(Boolean);

function ignored(file) {
  return rules.some((rule) => rule.endsWith('/**')
    ? file === rule.slice(0, -3) || file.startsWith(rule.slice(0, -2))
    : file === rule);
}

test('Cloudflare excludes repository-only files from static assets', () => {
  for (const file of [
    '.git/config',
    '.cursor/rules/project-overview.mdc',
    '.wrangler/state/v3/d1/miniflare-D1DatabaseObject',
    'test/seo.test.mjs',
    'scripts/generate-sitemap.js',
    'AGENTS.md',
    'README.md',
    'GA4_SETUP.md',
    'DEPLOYMENT.md',
    'run_server.bat',
    'wrangler.json',
  ]) assert.equal(ignored(file), true, file);
});

test('Cloudflare keeps required website assets public', () => {
  for (const file of [
    'index.html',
    'es/index.html',
    'src/js/index.js',
    'src/css/main.css',
    'images/icon-32.png',
    'sitemap.xml',
    'robots.txt',
    'manifest.json',
    '_headers',
    '_redirects',
  ]) assert.equal(ignored(file), false, file);
});
