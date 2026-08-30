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
    const committedDate = gitDate(file);
    if (committedDate) assert.equal(byUrl.get(canonical), committedDate, file);
  }

  const generator = fs.readFileSync(
    path.join(root, "scripts/generate-sitemap.js"),
    "utf8",
  );
  assert.doesNotMatch(generator, /baselineLastmod|currentContentLastmod/);
});

test("retired long-tail URLs redirect once to localized canonical pages", () => {
  const redirects = fs.readFileSync(path.join(root, "_redirects"), "utf8");
  for (const locale of locales) {
    const prefix = locale ? `/${locale}` : "";
    const expected = [
      [
        `${prefix}/homeschool-spelling-practice`,
        `${prefix}/spelling-practice-for-parents`,
      ],
      [
        `${prefix}/vocabulary-typing-game`,
        `${prefix}/custom-spelling-words-game`,
      ],
    ];
    for (const [from, to] of expected) {
      assert.match(redirects, new RegExp(`^${from} ${to} 301$`, "m"));
      assert.match(redirects, new RegExp(`^${from}\\.html ${to} 301$`, "m"));
      assert.equal(fs.existsSync(path.join(root, `${from}.html`)), false, from);
    }
  }
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  assert.doesNotMatch(
    sitemap,
    /homeschool-spelling-practice|vocabulary-typing-game/,
  );
  for (const file of publicHtmlFiles()) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      /href="[^"]*(?:homeschool-spelling-practice|vocabulary-typing-game)/,
      file,
    );
  }
});

test("every public footer links to the localized teacher landing page", () => {
  const labels = {
    "": "For Teachers",
    es: "Para docentes",
    "pt-br": "Para professores",
    fr: "Pour les enseignants",
    id: "Untuk guru",
    zh: "教师作业",
  };
  for (const [locale, label] of Object.entries(labels)) {
    const prefix = locale ? `/${locale}` : "";
    const link = `<a href="${prefix}/spelling-assignments-for-teachers">${label}</a>`;
    for (const file of fs
      .readdirSync(path.join(root, locale))
      .filter((name) => name.endsWith(".html"))) {
      const html = fs.readFileSync(path.join(root, locale, file), "utf8");
      const footer = html.match(/<footer(?:\s[^>]*)?>[\s\S]*?<\/footer>/)?.[0];
      assert.ok(footer?.includes(link), `${locale || "en"}/${file}`);
    }
  }
});

test("home and remaining long-tail pages have one H1 and distinct metadata per locale", () => {
  for (const locale of locales) {
    const files = [
      "index.html",
      "custom-spelling-words-game.html",
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

test("custom spelling pages emphasize own words and launch without login", () => {
  const expected = {
    "": [
      "Enter Your Own Spelling Words and Start Instantly",
      "Your own spelling words",
      "Start Instantly",
      "No login needed",
    ],
    es: [
      "Escribe tus propias palabras y empieza al instante",
      "Tus propias palabras de ortografía",
      "Empezar ahora",
      "Sin iniciar sesión",
    ],
    "pt-br": [
      "Digite suas próprias palavras e comece na hora",
      "Suas próprias palavras de ortografia",
      "Começar agora",
      "Sem conta",
    ],
    fr: [
      "Saisissez vos propres mots et commencez tout de suite",
      "Vos propres mots d’orthographe",
      "Commencer maintenant",
      "Sans compte",
    ],
    id: [
      "Masukkan kata sendiri dan langsung mulai",
      "Kata ejaan sendiri",
      "Mulai sekarang",
      "Tanpa akun",
    ],
    zh: [
      "输入自己的英语单词，立即开始",
      "你自己的英语拼写单词",
      "立即开始游戏",
      "无需登录",
    ],
  };
  for (const [locale, terms] of Object.entries(expected)) {
    const html = fs.readFileSync(
      path.join(root, locale, "custom-spelling-words-game.html"),
      "utf8",
    );
    assert.match(html, /<form class="landing-launcher"[^>]*data-mode="typing"/);
    assert.match(html, /placeholder="because&#10;friend&#10;beautiful"/);
    for (const term of terms) assert.ok(html.includes(term), term);
  }
});

test("sight-word pages launch a localized no-login typing game", () => {
  const expected = {
    "": ["Sight words", "Start Typing Game", "No login needed"],
    es: [
      "Palabras frecuentes (sight words)",
      "Empezar el juego de mecanografía",
      "Sin iniciar sesión",
    ],
    "pt-br": [
      "Palavras frequentes (sight words)",
      "Começar o jogo de digitação",
      "Sem conta",
    ],
    fr: [
      "Mots fréquents (sight words)",
      "Lancer le jeu de frappe",
      "Sans connexion",
    ],
    id: ["Sight words (kata umum)", "Mulai game mengetik", "Tanpa akun"],
    zh: ["Sight words 高频词", "开始打字游戏", "无需登录"],
  };
  for (const [locale, terms] of Object.entries(expected)) {
    const html = fs.readFileSync(
      path.join(root, locale, "sight-word-typing-game.html"),
      "utf8",
    );
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.match(html, /<form class="landing-launcher"[^>]*data-mode="typing"/);
    assert.match(html, /placeholder="the&#10;and&#10;you&#10;said"/);
    for (const term of terms) assert.ok(html.includes(term), term);
    for (const hreflang of [
      "en",
      "es",
      "pt-BR",
      "fr",
      "id",
      "zh-CN",
      "x-default",
    ]) {
      assert.match(html, new RegExp(`hreflang="${hreflang}"`));
    }
  }
});

test("weekly spelling pages launch exact-list dictation practice", () => {
  const expected = {
    "": [
      "Practice This Week's Spelling Words",
      "This week's spelling words",
      "Start This Week's Practice",
      "No login needed",
      "Use This Week's Exact Spelling List",
      "Missed-Word Retry",
      "Parent and Teacher Workspace",
    ],
    es: [
      "Practica las palabras de ortografía de esta semana",
      "Palabras de ortografía de esta semana",
      "Empezar la práctica semanal",
      "Sin iniciar sesión",
      "Usa la lista exacta de esta semana",
      "Repite las palabras falladas",
    ],
    "pt-br": [
      "Pratique as palavras de ortografia desta semana",
      "Palavras de ortografia desta semana",
      "Começar a prática da semana",
      "Sem conta",
      "Use a lista exata desta semana",
      "Repita as palavras erradas",
    ],
    fr: [
      "Pratiquez les mots d’orthographe de cette semaine",
      "Mots d’orthographe de cette semaine",
      "Commencer la pratique de la semaine",
      "Sans compte",
      "Utilisez la liste exacte de la semaine",
      "Reprenez les mots manqués",
    ],
    id: [
      "Latih kata ejaan minggu ini",
      "Kata ejaan minggu ini",
      "Mulai latihan minggu ini",
      "Tanpa akun",
      "Gunakan daftar persis minggu ini",
      "Ulangi kata yang salah",
    ],
    zh: [
      "练习本周英语拼写单词",
      "本周英语拼写单词",
      "开始本周练习",
      "无需登录",
      "使用本周完整词表",
      "重练漏掉的单词",
    ],
  };
  for (const [locale, terms] of Object.entries(expected)) {
    const html = fs.readFileSync(
      path.join(root, locale, "weekly-spelling-practice.html"),
      "utf8",
    );
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.match(html, /<form class="landing-launcher"[^>]*data-mode="dictation"/);
    assert.match(html, /placeholder="because&#10;friend&#10;beautiful"/);
    for (const term of terms)
      assert.ok(html.includes(term), `${locale || "en"}: ${term}`);
    for (const hreflang of hreflangs)
      assert.ok(html.includes(`hreflang="${hreflang}"`), `${locale || "en"}: ${hreflang}`);
  }
});

test("parent landing pages launch practice and expose localized workspace value", () => {
  const expected = {
    "": [
      "Learner",
      "Progress",
      "Mastery",
      "Today's Review",
      "Smart Review",
      "Parent Plan",
    ],
    es: [
      "Perfil del estudiante",
      "Progreso",
      "Dominio",
      "Repaso de hoy",
      "Repaso inteligente",
      "Plan para familias",
    ],
    "pt-br": [
      "Perfil do aluno",
      "Progresso",
      "Domínio",
      "Revisão de hoje",
      "Revisão inteligente",
      "Plano para Pais",
    ],
    fr: [
      "Profil élève",
      "Progression",
      "Maîtrise",
      "Révision du jour",
      "Révision intelligente",
      "Offre Parents",
    ],
    id: [
      "Profil pelajar",
      "Perkembangan",
      "Penguasaan",
      "Ulasan hari ini",
      "Ulasan pintar",
      "Paket Orang Tua",
    ],
    zh: [
      "学习者档案",
      "学习进度",
      "掌握度",
      "今日复习",
      "智能复习",
      "家长方案",
    ],
  };
  for (const [locale, terms] of Object.entries(expected)) {
    const html = fs.readFileSync(
      path.join(root, locale, "spelling-practice-for-parents.html"),
      "utf8",
    );
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.match(html, /class="landing-launcher"[^>]+data-mode="dictation"/);
    assert.match(html, /href="\/teacher\?lang=/);
    assert.match(html, /href="[^"]*\/pricing"/);
    for (const term of terms)
      assert.ok(html.includes(term), `${locale || "en"}: ${term}`);
    for (const hreflang of hreflangs)
      assert.ok(
        html.includes(`hreflang="${hreflang}"`),
        `${locale || "en"}: ${hreflang}`,
      );
  }
});

test("teacher landing pages launch practice and expose localized assignment value", () => {
  const expected = {
    "": [
      "Paste your spelling list → Share one link → Track results",
      "Try it now",
      "No student accounts",
      "Assignments",
      "Progress",
      "Mastery",
      "Smart Review",
      "Class Join/PIN",
      "CSV",
      "Teacher Plan",
    ],
    es: ["Probar ahora", "Sin cuentas para alumnos", "Tareas", "Progreso"],
    "pt-br": [
      "Testar agora",
      "Sem contas de alunos",
      "Atividades",
      "Progresso",
    ],
    fr: ["Tester maintenant", "Sans compte élève", "Devoirs", "Progression"],
    id: ["Coba sekarang", "Tanpa akun siswa", "Tugas", "Perkembangan"],
    zh: ["立即试用", "无需学生账号", "作业", "学习进度"],
  };
  for (const [locale, terms] of Object.entries(expected)) {
    const html = fs.readFileSync(
      path.join(root, locale, "spelling-assignments-for-teachers.html"),
      "utf8",
    );
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.match(html, /class="landing-launcher"[^>]+data-mode="dictation"/);
    assert.match(html, /href="\/teacher\?lang=/);
    assert.match(html, /href="[^"]*\/pricing"/);
    for (const term of terms)
      assert.ok(html.includes(term), `${locale || "en"}: ${term}`);
    for (const hreflang of hreflangs)
      assert.ok(
        html.includes(`hreflang="${hreflang}"`),
        `${locale || "en"}: ${hreflang}`,
      );
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
        /spelling-list-game/,
      );
      assert.match(html, new RegExp(`href="/${locale}/weekly-spelling-practice"`));
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
      "免费方案",
      "家长方案",
      "教师方案",
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

test("FAQ, About, and Parent pages describe current product capabilities", () => {
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
  const parent = fs.readFileSync(
    path.join(root, "spelling-practice-for-parents.html"),
    "utf8",
  );
  for (const term of ["Progress", "Mastery", "Today's Review", "Smart Review"])
    assert.ok(parent.includes(term), term);
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
      "spelling-practice-for-parents.html",
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
