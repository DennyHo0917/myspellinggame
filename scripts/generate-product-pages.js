const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const baseUrl = "https://myspellinggame.com";
const locales = [
  { code: "en", html: "en", dir: "", label: "English" },
  { code: "es", html: "es", dir: "es", label: "Español" },
  { code: "pt-BR", html: "pt-BR", dir: "pt-br", label: "Português" },
  { code: "fr", html: "fr", dir: "fr", label: "Français" },
  { code: "id", html: "id", dir: "id", label: "Bahasa Indonesia" },
  { code: "zh", html: "zh-CN", dir: "zh", label: "中文" },
];

const copy = {
  en: {
    title: "Teacher Pricing | My Spelling Game",
    description:
      "Simple teacher assignment plans for spelling practice and student reports.",
    heading: "Teacher plans",
    intro:
      "Keep the free spelling game for everyone. Upgrade only when you need more assignments, longer history, class insights, and CSV export.",
    free: "Free",
    freePrice: "$0",
    freeItems: [
      "2 active assignments",
      "30 student submissions per month",
      "30-day result history",
      "Basic student results",
    ],
    pro: "Pro",
    month: "$5.99 / month",
    year: "$49 / year",
    proItems: [
      "20 active assignments",
      "Up to 150 student nicknames",
      "365-day result history",
      "CSV export",
      "Class-wide missed-word statistics",
    ],
    monthly: "Choose monthly",
    yearly: "Choose yearly",
    signIn: "Teacher sign in",
    practice: "Free practice",
    note: "The ordinary spelling game, custom lists, practice links, dictation, Typing Rain, and missed-word replay stay free.",
  },
  es: {
    title: "Precios para docentes | My Spelling Game",
    description:
      "Planes sencillos para tareas de spelling e informes de estudiantes.",
    heading: "Planes para docentes",
    intro:
      "El juego gratuito sigue disponible para todos. Mejora el plan solo si necesitas más tareas, historial, información de la clase y exportación CSV.",
    free: "Gratis",
    freePrice: "$0",
    freeItems: [
      "2 tareas activas",
      "30 entregas de estudiantes al mes",
      "Historial durante 30 días",
      "Resultados básicos",
    ],
    pro: "Pro",
    month: "$5.99 al mes",
    year: "$49 al año",
    proItems: [
      "20 tareas activas",
      "Hasta 150 apodos de estudiantes",
      "Historial durante 365 días",
      "Exportación CSV",
      "Palabras más falladas de toda la clase",
    ],
    monthly: "Elegir mensual",
    yearly: "Elegir anual",
    signIn: "Acceso docente",
    practice: "Práctica gratuita",
    note: "El juego normal, las listas propias, los enlaces de práctica, el dictado, la lluvia de palabras y el repaso de errores siguen siendo gratis.",
  },
  "pt-BR": {
    title: "Planos para professores | My Spelling Game",
    description:
      "Planos simples para tarefas de spelling e relatórios dos alunos.",
    heading: "Planos para professores",
    intro:
      "O jogo gratuito continua disponível para todos. Assine apenas quando precisar de mais tarefas, histórico, dados da turma e CSV.",
    free: "Grátis",
    freePrice: "$0",
    freeItems: [
      "2 tarefas ativas",
      "30 envios de alunos por mês",
      "Histórico por 30 dias",
      "Resultados básicos",
    ],
    pro: "Pro",
    month: "$5.99 por mês",
    year: "$49 por ano",
    proItems: [
      "20 tarefas ativas",
      "Até 150 apelidos de alunos",
      "Histórico por 365 dias",
      "Exportação CSV",
      "Estatísticas de erros da turma",
    ],
    monthly: "Escolher mensal",
    yearly: "Escolher anual",
    signIn: "Acesso do professor",
    practice: "Prática grátis",
    note: "O jogo comum, listas próprias, links de prática, ditado, chuva de palavras e revisão de erros continuam grátis.",
  },
  fr: {
    title: "Tarifs enseignants | My Spelling Game",
    description:
      "Des offres simples pour les devoirs d’orthographe et les rapports élèves.",
    heading: "Offres pour enseignants",
    intro:
      "Le jeu d’orthographe reste gratuit pour tous. Passez à Pro uniquement pour davantage de devoirs, d’historique, d’analyses et l’export CSV.",
    free: "Gratuit",
    freePrice: "0 $",
    freeItems: [
      "2 devoirs actifs",
      "30 remises d’élèves par mois",
      "Résultats conservés 30 jours",
      "Résultats essentiels",
    ],
    pro: "Pro",
    month: "5,99 $ par mois",
    year: "49 $ par an",
    proItems: [
      "20 devoirs actifs",
      "Jusqu’à 150 pseudonymes",
      "Résultats conservés 365 jours",
      "Export CSV",
      "Statistiques des mots manqués par la classe",
    ],
    monthly: "Choisir l’abonnement mensuel",
    yearly: "Choisir l’abonnement annuel",
    signIn: "Connexion enseignant",
    practice: "Entraînement gratuit",
    note: "Le jeu classique, les listes personnalisées, les liens, la dictée, la pluie de mots et la reprise des erreurs restent gratuits.",
  },
  id: {
    title: "Harga untuk guru | My Spelling Game",
    description:
      "Paket sederhana untuk tugas spelling dan laporan latihan siswa.",
    heading: "Paket guru",
    intro:
      "Game spelling gratis tetap tersedia untuk semua orang. Naik ke Pro hanya saat membutuhkan lebih banyak tugas, riwayat, analisis kelas, dan ekspor CSV.",
    free: "Gratis",
    freePrice: "$0",
    freeItems: [
      "2 tugas aktif",
      "30 kiriman siswa per bulan",
      "Riwayat hasil 30 hari",
      "Hasil dasar siswa",
    ],
    pro: "Pro",
    month: "$5.99 per bulan",
    year: "$49 per tahun",
    proItems: [
      "20 tugas aktif",
      "Hingga 150 nama panggilan siswa",
      "Riwayat hasil 365 hari",
      "Ekspor CSV",
      "Statistik kata yang salah untuk seluruh kelas",
    ],
    monthly: "Pilih bulanan",
    yearly: "Pilih tahunan",
    signIn: "Login guru",
    practice: "Latihan gratis",
    note: "Game biasa, daftar sendiri, link latihan, dikte, hujan kata, dan latihan ulang kata yang salah tetap gratis.",
  },
  zh: {
    title: "教师版价格 | My Spelling Game",
    description: "用于布置拼写作业和查看学生报告的简单教师方案。",
    heading: "教师版方案",
    intro:
      "普通拼写游戏继续对所有人免费。只有需要更多作业、更长成绩记录、全班分析和 CSV 导出时才升级。",
    free: "免费版",
    freePrice: "$0",
    freeItems: [
      "最多 2 个活跃作业",
      "每月 30 份学生提交",
      "成绩保存 30 天",
      "查看基础成绩",
    ],
    pro: "Pro",
    month: "每月 $5.99",
    year: "每年 $49",
    proItems: [
      "最多 20 个活跃作业",
      "最多 150 个学生昵称",
      "成绩保存 365 天",
      "导出 CSV",
      "查看全班错词统计",
    ],
    monthly: "选择月付",
    yearly: "选择年付",
    signIn: "教师登录",
    practice: "免费练习",
    note: "普通拼写游戏、自定义词表、练习链接、听写、单词雨和错词重练都继续免费。",
  },
};

function pagePath(locale) {
  return locale.dir ? `/${locale.dir}/pricing` : "/pricing";
}
function escape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function render(locale) {
  const c = copy[locale.code];
  const alternates = locales
    .map(
      (item) =>
        `<link rel="alternate" hreflang="${item.html}" href="${baseUrl}${pagePath(item)}">`,
    )
    .join("\n    ");
  const languages = locales
    .map(
      (item) =>
        `<a class="product-nav-language" href="${pagePath(item)}" hreflang="${item.html}"${item.code === locale.code ? ' aria-current="page"' : ""}>${item.label}</a>`,
    )
    .join(" · ");
  return `<!doctype html>
<html lang="${locale.html}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(c.title)}</title>
  <meta name="description" content="${escape(c.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${baseUrl}${pagePath(locale)}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${baseUrl}/pricing">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="stylesheet" href="/src/css/product.css">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF1V40KVS"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-VYF1V40KVS',{page_location: window.location.origin + window.location.pathname,page_path: window.location.pathname});</script>
  <script type="module" src="/src/js/analytics.mjs"></script>
</head>
<body class="product-page" data-product-locale="${locale.code}">
  <div class="product-shell">
    <nav class="product-nav"><a class="product-brand" href="${locale.dir ? `/${locale.dir}/` : "/"}">My Spelling Game</a><a class="product-nav-link" href="${locale.dir ? `/${locale.dir}/` : "/"}">${escape(c.practice)}</a><a class="product-nav-link" href="/teacher?lang=${encodeURIComponent(locale.code)}">${escape(c.signIn)}</a><span class="product-nav-spacer"></span><span class="product-nav-languages">${languages}</span></nav>
    <main class="product-main">
      <section class="product-card"><h1>${escape(c.heading)}</h1><p>${escape(c.intro)}</p><p class="notice">${escape(c.note)}</p></section>
      <div class="pricing-grid">
        <section class="product-card pricing-card"><h2>${escape(c.free)}</h2><p class="price">${escape(c.freePrice)}</p><ul>${c.freeItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><a class="button-link button-secondary" href="${locale.dir ? `/${locale.dir}/` : "/"}">${escape(c.practice)}</a></section>
        <section class="product-card pricing-card"><span class="badge pro">Pro</span><h2>${escape(c.pro)}</h2><p class="price">${escape(c.month)}</p><p>${escape(c.year)}</p><ul>${c.proItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><div class="actions"><button type="button" data-checkout="month">${escape(c.monthly)}</button><button type="button" class="button-secondary" data-checkout="year">${escape(c.yearly)}</button></div><p class="status" id="pricing-status" role="status"></p></section>
      </div>
    </main>
  </div>
  <script type="module" src="/src/js/pricingApp.mjs"></script>
</body>
</html>\n`;
}

for (const locale of locales) {
  const directory = path.join(root, locale.dir);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "pricing.html"),
    render(locale),
    "utf8",
  );
}

console.log(`Generated ${locales.length} pricing pages`);
