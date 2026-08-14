const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'sitemap.xml');
const publicDirs = ['', 'es', 'pt-br', 'fr', 'id', 'zh'];
const baseUrl = 'https://myspellinggame.com';
const baselineLastmod = '2026-06-28';
const currentContentLastmod = '2026-08-14';

const substantivePaths = new Set(['/homeschool-spelling-practice']);
for (const dir of publicDirs) {
  const prefix = dir ? `/${dir}` : '';
  substantivePaths.add(prefix ? `${prefix}/` : '/');
  for (const slug of ['about', 'privacy', 'custom-spelling-words-game', 'weekly-spelling-practice']) {
    substantivePaths.add(`${prefix}/${slug}`);
  }
  if (dir) substantivePaths.add(`${prefix}/contact`);
}

function htmlFiles() {
  return publicDirs.flatMap((dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(root, dir, entry.name)));
}

function match(html, expression) {
  return html.match(expression)?.[1] || '';
}

function lastModified(canonical, html) {
  const structuredDate = match(html, /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  if (structuredDate) return structuredDate;
  return substantivePaths.has(new URL(canonical, baseUrl).pathname) ? currentContentLastmod : baselineLastmod;
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const pages = htmlFiles().map((file) => {
  const html = fs.readFileSync(file, 'utf8');
  const canonical = match(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  if (!canonical) return null;
  const alternates = [...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/gi)]
    .map((item) => ({ hreflang: item[1], href: item[2] }));
  return { canonical, alternates, lastmod: lastModified(canonical, html) };
}).filter(Boolean).sort((a, b) => a.canonical.localeCompare(b.canonical));

const seen = new Set();
for (const page of pages) {
  if (seen.has(page.canonical)) throw new Error(`Duplicate canonical URL: ${page.canonical}`);
  if (/\.html(?:$|[?#])/.test(page.canonical)) throw new Error(`Non-final canonical URL: ${page.canonical}`);
  seen.add(page.canonical);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map((page) => `  <url>
    <loc>${escapeXml(page.canonical)}</loc>
    <lastmod>${page.lastmod}</lastmod>
${page.alternates.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}" />`).join('\n')}
  </url>`).join('\n')}
</urlset>
`;

if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== xml) fs.writeFileSync(output, xml, 'utf8');
console.log(`Generated sitemap.xml with ${pages.length} canonical URLs`);
