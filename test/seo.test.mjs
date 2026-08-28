import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["", "es", "pt-br", "fr", "id", "zh"];
const hreflangs = ["en", "es", "pt-BR", "fr", "id", "zh-CN", "x-default"];

function publicHtmlFiles() {
  return locales.flatMap((locale) =>
    fs
      .readdirSync(path.join(root, locale))
      .filter((name) => name.endsWith(".html"))
      .map((name) => path.join(root, locale, name)),
  );
}

function tagContent(html, expression) {
  return html.match(expression)?.[1] || "";
}

function gitDate(file) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  return execFileSync("git", ["log", "-1", "--format=%cs", "--", relative], {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

test("sitemap contains each extensionless canonical exactly once with complete hreflang", () => {
  execFileSync(
    process.execPath,
    [path.join(root, "scripts/generate-sitemap.js")],
    { cwd: root },
  );
  const xml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  execFileSync(
    process.execPath,
    [path.join(root, "scripts/generate-sitemap.js")],
    { cwd: root },
  );
  assert.equal(fs.readFileSync(path.join(root, "sitemap.xml"), "utf8"), xml);
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(
    (match) => match[1],
  );
  const sitemapUrls = blocks.map((block) =>
    tagContent(block, /<loc>([^<]+)<\/loc>/),
  );
  const canonicals = publicHtmlFiles().map((file) =>
    tagContent(
      fs.readFileSync(file, "utf8"),
      /<link rel="canonical" href="([^"]+)">/,
    ),
  );

  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length);
  assert.deepEqual([...sitemapUrls].sort(), [...canonicals].sort());
  assert.equal(
    sitemapUrls.some((url) => url.includes(".html")),
    false,
  );
  for (const block of blocks) {
    const found = [...block.matchAll(/hreflang="([^"]+)"/g)]
      .map((match) => match[1])
      .sort();
    assert.deepEqual(found, [...hreflangs].sort());
  }

  const lastmods = blocks.map((block) =>
    tagContent(block, /<lastmod>([^<]+)<\/lastmod>/),
  );
  const today = new Date().toISOString().slice(0, 10);
  for (const lastmod of lastmods) {
    assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(lastmod <= today, lastmod);
  }
  assert.ok(new Set(lastmods).size > 1);
  const byUrl = new Map(
    blocks.map((block) => [
      tagContent(block, /<loc>([^<]+)<\/loc>/),
      tagContent(block, /<lastmod>([^<]+)<\/lastmod>/),
    ]),
  );
  for (const file of publicHtmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    const canonical = tagContent(html, /<link rel="canonical" href="([^"]+)">/);
    assert.equal(byUrl.get(canonical), gitDate(file), file);
  }

  const generator = fs.readFileSync(
    path.join(root, "scripts/generate-sitemap.js"),
    "utf8",
  );
  assert.doesNotMatch(generator, /baselineLastmod|currentContentLastmod/);
});

test("home and remaining long-tail pages have one H1 and distinct metadata per locale", () => {
  for (const locale of locales) {
    const files = [
      "index.html",
      "homeschool-spelling-practice.html",
      "sight-word-typing-game.html",
    ].map((name) => path.join(root, locale, name));
    const pages = files.map((file) => fs.readFileSync(file, "utf8"));
    for (const html of pages)
      assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    const titles = pages.map((html) =>
      tagContent(html, /<title>([^<]+)<\/title>/),
    );
    const descriptions = pages.map((html) =>
      tagContent(html, /<meta name="description" content="([^"]+)">/),
    );
    assert.equal(new Set(titles).size, 3);
    assert.equal(new Set(descriptions).size, 3);
  }
});

test("all public pages use clean GA configuration and final URL signals", () => {
  for (const file of publicHtmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    assert.match(
      html,
      /page_location: window\.location\.origin \+ window\.location\.pathname/,
    );
    assert.match(
      html,
      /<script type="module" src="\/src\/js\/analytics\.mjs"><\/script>/,
    );
    assert.doesNotMatch(
      html,
      /<(?:a|link)\b[^>]+(?:href)="[^"]+\.html(?:[?#][^"]*)?"/,
    );
    assert.doesNotMatch(html, /(?:href|action)="[^"]*\?words=/);
  }
});

test("all public pages keep the My Spelling Game brand untranslated", () => {
  const forbidden = /My (?:ortografía|orthographe|ortografia|ejaan|拼写) Game/i;
  for (const file of publicHtmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(html, forbidden, file);
    for (const match of html.matchAll(/my\s+([^<>"\n]{1,30}?)\s+game/gi)) {
      assert.equal(match[0], "My Spelling Game", file);
    }
  }
});

test("localized legal pages keep SEO links inside the active locale", () => {
  for (const locale of locales.filter(Boolean)) {
    for (const page of ["about.html", "contact.html", "privacy.html"]) {
      const html = fs.readFileSync(path.join(root, locale, page), "utf8");
      assert.match(html, new RegExp(`href="/${locale}/faq"`));
      assert.doesNotMatch(
        html,
        /(?:custom-spelling-words-game|spelling-list-game|weekly-spelling-practice)/,
      );
    }
  }
});

test("workspace navigation and assignment pricing stay role-inclusive in every locale", () => {
  const expected = {
    "": ["Workspace", "Save weekly lists. Track real progress."],
    es: [
      "Espacio de trabajo",
      "Guarda las listas semanales y sigue el progreso real",
    ],
    "pt-br": [
      "Espaço de trabalho",
      "Salve listas semanais e acompanhe o progresso real",
    ],
    fr: [
      "Espace de travail",
      "Enregistrez vos listes et suivez les vrais progrès",
    ],
    id: ["Ruang kerja", "Simpan daftar mingguan dan pantau perkembangan nyata"],
    zh: ["工作台", "保存每周词表，持续追踪真实进步"],
  };
  for (const [locale, [workspace, heading]] of Object.entries(expected)) {
    const home = fs.readFileSync(path.join(root, locale, "index.html"), "utf8");
    const pricing = fs.readFileSync(
      path.join(root, locale, "pricing.html"),
      "utf8",
    );
    assert.ok(home.includes(`>${workspace}</a>`), locale || "en");
    assert.ok(pricing.includes(`<h1>${heading}</h1>`), locale || "en");
  }
});

test("pricing shows the Free, Parent, and Teacher plans in every locale", () => {
  const expected = {
    "": [
      "Free Plan",
      "Parent Plan",
      "Teacher Plan",
      "$4.99 / month",
      "$49.99 / year",
      "$9.99 / month",
      "$99.99 / year",
      "Up to 30 words per assignment",
      "Up to 5 children",
      "Up to 40 students",
    ],
    es: [
      "Plan Gratis",
      "Plan para familias",
      "Plan para docentes",
      "$4.99 al mes",
      "$49,99 al año",
      "$9.99 al mes",
      "$99,99 al año",
    ],
    "pt-br": [
      "Plano Grátis",
      "Plano para Pais",
      "Plano para Professores",
      "$4.99 por mês",
      "$49,99 por ano",
      "$9.99 por mês",
      "$99,99 por ano",
    ],
    fr: [
      "Offre gratuite",
      "Offre Parents",
      "Offre Enseignants",
      "4,99 $ par mois",
      "49,99 $ par an",
      "9,99 $ par mois",
      "99,99 $ par an",
    ],
    id: [
      "Paket Gratis",
      "Paket Orang Tua",
      "Paket Guru",
      "$4.99 per bulan",
      "$49.99 per tahun",
      "$9.99 per bulan",
      "$99.99 per tahun",
    ],
    zh: [
      "免费套餐",
      "家长套餐",
      "教师套餐",
      "每月 $4.99",
      "每年 $49.99",
      "每月 $9.99",
      "每年 $99.99",
    ],
  };
  for (const [locale, terms] of Object.entries(expected)) {
    const pricing = fs.readFileSync(
      path.join(root, locale, "pricing.html"),
      "utf8",
    );
    for (const term of terms)
      assert.ok(pricing.includes(term), `${locale || "en"}: ${term}`);
    assert.doesNotMatch(
      pricing,
      /Plus|\bPro\b|Family Plus|Teacher Plus/,
      locale || "en",
    );
    assert.equal(
      (pricing.match(/class="product-card pricing-card"/g) || []).length,
      3,
    );
  }
});

test("localized home pages expose the Workspace section without changing practice SEO", () => {
  const workspaceTerms = {
    "": [
      "For parents and teachers",
      "save lists",
      "student accounts",
      "track progress",
      "review",
    ],
    es: [
      "Para familias y docentes",
      "guardar listas",
      "cuentas de estudiantes",
      "seguir el progreso",
      "repaso",
    ],
    "pt-br": [
      "Para responsáveis e professores",
      "salvar listas",
      "contas de alunos",
      "acompanhar o progresso",
      "revisão",
    ],
    fr: [
      "Pour les parents et les enseignants",
      "enregistrer les listes",
      "compte élève",
      "suivre les progrès",
      "revoir",
    ],
    id: [
      "Untuk orang tua dan guru",
      "menyimpan daftar",
      "akun siswa",
      "memantau kemajuan",
      "diulas",
    ],
    zh: ["适合家长和老师", "保存词表", "学生账号", "追踪", "复习"],
  };
  for (const [locale, terms] of Object.entries(workspaceTerms)) {
    const html = fs.readFileSync(path.join(root, locale, "index.html"), "utf8");
    for (const term of terms)
      assert.ok(html.includes(term), `${locale || "en"}: ${term}`);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
  }
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(
    home,
    /<title>Free Spelling Test With Your Own Words — No Login<\/title>/,
  );
  assert.match(home, /<h1[^>]*>Free Spelling Test With Your Own Words<\/h1>/);
  assert.doesNotMatch(home, /365 days on P(?:ro)/);
});

test("FAQ, About, and Homeschool pages describe current product capabilities", () => {
  const faq = fs.readFileSync(path.join(root, "faq.html"), "utf8");
  for (const term of [
    "Today's Review",
    "mastered",
    "example sentences",
    "student accounts",
    "progress",
  ]) {
    assert.ok(faq.includes(term), term);
  }
  const about = fs.readFileSync(path.join(root, "about.html"), "utf8");
  for (const term of ["workspace", "assignments", "progress"])
    assert.ok(about.includes(term), term);
  assert.doesNotMatch(
    about,
    /A small, no-login spelling practice tool|product goal is intentionally narrow/,
  );
  const homeschool = fs.readFileSync(
    path.join(root, "homeschool-spelling-practice.html"),
    "utf8",
  );
  for (const term of [
    "Track Progress Across the Week",
    "progress",
    "review",
    "mastered",
    "Today's Review",
  ]) {
    assert.ok(homeschool.includes(term), term);
  }
});

test("FAQ visible questions and JSON-LD entities stay synchronized", () => {
  for (const locale of locales) {
    const html = fs.readFileSync(path.join(root, locale, "faq.html"), "utf8");
    const visible = [
      ...html.matchAll(
        /<details class="faq-item"><summary>([^<]+)<\/summary>/g,
      ),
    ].map((match) => match[1]);
    const json = JSON.parse(
      html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )?.[1] || "{}",
    );
    assert.deepEqual(
      json.mainEntity.map((item) => item.name),
      visible,
      locale || "en",
    );
  }
});

test("llms.txt publishes the current product summary and canonical sources", () => {
  const content = fs.readFileSync(path.join(root, "llms.txt"), "utf8");
  for (const text of [
    "# My Spelling Game",
    "## What My Spelling Game Does",
    "## Accounts",
    "## Today's Review",
    "## Mastery",
    "## Plans",
    "1 active assignment",
    "8 student submissions per month",
    "1 saved list",
    "1 student profile",
    "14 days of progress and mastery history",
    "## Primary Pages",
    "https://myspellinggame.com/",
    "https://myspellinggame.com/faq",
    "https://myspellinggame.com/pricing",
    "https://myspellinggame.com/about",
    "https://myspellinggame.com/privacy",
  ])
    assert.ok(content.includes(text), text);
  assert.ok(!content.includes("15 student submissions per month"));
  assert.ok(!content.includes("free trial"));
  assert.ok(content.includes("up to 20 words"));
  assert.ok(content.includes("up to 40 words"));
  assert.ok(!content.includes("up to 80 words"));
  const anonymousIndex = content.indexOf("### Anonymous practice");
  const freeIndex = content.indexOf("### Free");
  const parentIndex = content.indexOf("### Parent Plan");
  const teacherIndex = content.indexOf("### Teacher Plan");
  const workspaceIndex = content.indexOf("Free workspace includes:");
  assert.ok(anonymousIndex >= 0 && anonymousIndex < freeIndex);
  assert.ok(freeIndex < parentIndex && parentIndex < teacherIndex);
  assert.ok(freeIndex < workspaceIndex && workspaceIndex < parentIndex);
  assert.ok(!content.includes("30 days of progress history"));
  assert.doesNotMatch(content, /\b(?:Plus|Pro)\b/);
  assert.doesNotMatch(content, /workers\.dev|localhost|\.html/);
});

test("public pages contain no legacy paid product names", () => {
  for (const locale of locales) {
    for (const file of [
      "index.html",
      "faq.html",
      "privacy.html",
      "homeschool-spelling-practice.html",
    ]) {
      const content = fs.readFileSync(path.join(root, locale, file), "utf8");
      assert.doesNotMatch(
        content,
        /\b(?:Plus|Pro)\b|Family Plus|Teacher Plus/,
        `${locale || "en"}/${file}`,
      );
    }
  }
});
