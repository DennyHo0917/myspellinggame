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

const footerLinks = {
  en: [
    "Sight Words",
    "Homeschool",
    "Vocabulary",
    "FAQ",
    "Privacy",
    "About",
    "Contact",
  ],
  es: [
    "Palabras frecuentes",
    "En casa",
    "Vocabulario",
    "Preguntas frecuentes",
    "Privacidad",
    "Acerca de",
    "Contacto",
  ],
  "pt-BR": [
    "Palavras frequentes",
    "Em casa",
    "Vocabulário",
    "Perguntas frequentes",
    "Privacidade",
    "Sobre",
    "Contato",
  ],
  fr: [
    "Mots fréquents",
    "À la maison",
    "Vocabulaire",
    "Questions fréquentes",
    "Confidentialité",
    "À propos",
    "Contact",
  ],
  id: [
    "Kata umum",
    "Di rumah",
    "Kosakata",
    "Pertanyaan umum",
    "Privasi",
    "Tentang",
    "Kontak",
  ],
  zh: [
    "高频词练习",
    "家庭学习",
    "词汇练习",
    "常见问题",
    "隐私",
    "关于",
    "联系",
  ],
};
const footerRights = {
  en: "All rights reserved.",
  es: "Todos los derechos reservados.",
  "pt-BR": "Todos os direitos reservados.",
  fr: "Tous droits réservés.",
  id: "Hak cipta dilindungi.",
  zh: "版权所有。",
};

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
    year: "$4.17 / month",
    proItems: [
      "20 active assignments",
      "Unlimited student submissions",
      "Up to 150 student nicknames",
      "365-day result history",
      "CSV export",
      "Class-wide missed-word statistics",
    ],
    monthly: "Monthly plan",
    yearly: "Yearly plan",
    monthlyBilling: "Billed monthly",
    yearlyBilling: "Billed $49.99 yearly",
    yearlySavings: "Save 30%",
    billingPeriod: "Billing period",
    confirmMonthly: "Continue with monthly plan · $5.99 / month",
    confirmYearly: "Continue with yearly plan · $49.99 / year",
    signIn: "Teacher sign in",
    practice: "Free practice",
    freeTeacher: "Start free teacher account",
    currentPlan: "Current plan",
    secureCheckout: "Secure checkout by Stripe · Cancel anytime",
    language: "Language",
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
    year: "$4,17 al mes",
    proItems: [
      "20 tareas activas",
      "Entregas de estudiantes ilimitadas",
      "Hasta 150 apodos de estudiantes",
      "Historial durante 365 días",
      "Exportación CSV",
      "Palabras más falladas de toda la clase",
    ],
    monthly: "Plan mensual",
    yearly: "Plan anual",
    monthlyBilling: "Facturación mensual",
    yearlyBilling: "Facturación anual de $49,99",
    yearlySavings: "Ahorra un 30 %",
    billingPeriod: "Periodo de facturación",
    confirmMonthly: "Continuar con el plan mensual · $5.99 al mes",
    confirmYearly: "Continuar con el plan anual · $49,99 al año",
    signIn: "Acceso docente",
    practice: "Práctica gratuita",
    freeTeacher: "Crear una cuenta docente gratis",
    currentPlan: "Plan actual",
    secureCheckout: "Pago seguro con Stripe · Cancela cuando quieras",
    language: "Idioma",
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
    year: "$4,17 por mês",
    proItems: [
      "20 tarefas ativas",
      "Envios de alunos ilimitados",
      "Até 150 apelidos de alunos",
      "Histórico por 365 dias",
      "Exportação CSV",
      "Estatísticas de erros da turma",
    ],
    monthly: "Plano mensal",
    yearly: "Plano anual",
    monthlyBilling: "Cobrança mensal",
    yearlyBilling: "Cobrança anual de $49,99",
    yearlySavings: "Economize 30%",
    billingPeriod: "Periodicidade",
    confirmMonthly: "Continuar com o plano mensal · $5.99 por mês",
    confirmYearly: "Continuar com o plano anual · $49,99 por ano",
    signIn: "Acesso do professor",
    practice: "Prática grátis",
    freeTeacher: "Criar conta grátis de professor",
    currentPlan: "Plano atual",
    secureCheckout: "Checkout seguro pelo Stripe · Cancele quando quiser",
    language: "Idioma",
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
    year: "4,17 $ par mois",
    proItems: [
      "20 devoirs actifs",
      "Remises d’élèves illimitées",
      "Jusqu’à 150 pseudonymes",
      "Résultats conservés 365 jours",
      "Export CSV",
      "Statistiques des mots manqués par la classe",
    ],
    monthly: "Offre mensuelle",
    yearly: "Offre annuelle",
    monthlyBilling: "Facturation mensuelle",
    yearlyBilling: "Facturé 49,99 $ par an",
    yearlySavings: "Économisez 30 %",
    billingPeriod: "Période de facturation",
    confirmMonthly: "Continuer avec l’offre mensuelle · 5,99 $ / mois",
    confirmYearly: "Continuer avec l’offre annuelle · 49,99 $ / an",
    signIn: "Connexion enseignant",
    practice: "Entraînement gratuit",
    freeTeacher: "Créer un compte enseignant gratuit",
    currentPlan: "Offre actuelle",
    secureCheckout: "Paiement sécurisé par Stripe · Résiliable à tout moment",
    language: "Langue",
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
    year: "$4.17 per bulan",
    proItems: [
      "20 tugas aktif",
      "Kiriman siswa tanpa batas",
      "Hingga 150 nama panggilan siswa",
      "Riwayat hasil 365 hari",
      "Ekspor CSV",
      "Statistik kata yang salah untuk seluruh kelas",
    ],
    monthly: "Paket bulanan",
    yearly: "Paket tahunan",
    monthlyBilling: "Ditagih bulanan",
    yearlyBilling: "Ditagih $49.99 per tahun",
    yearlySavings: "Hemat 30%",
    billingPeriod: "Periode tagihan",
    confirmMonthly: "Lanjutkan dengan paket bulanan · $5.99 per bulan",
    confirmYearly: "Lanjutkan dengan paket tahunan · $49.99 per tahun",
    signIn: "Login guru",
    practice: "Latihan gratis",
    freeTeacher: "Buat akun guru gratis",
    currentPlan: "Paket saat ini",
    secureCheckout: "Checkout aman oleh Stripe · Batalkan kapan saja",
    language: "Bahasa",
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
    year: "折合每月 $4.17",
    proItems: [
      "最多 20 个活跃作业",
      "学生提交不限量",
      "最多 150 个学生昵称",
      "成绩保存 365 天",
      "导出 CSV",
      "查看全班错词统计",
    ],
    monthly: "月付方案",
    yearly: "年付方案",
    monthlyBilling: "按月收费",
    yearlyBilling: "每年收费 $49.99",
    yearlySavings: "立省 30%",
    billingPeriod: "计费周期",
    confirmMonthly: "继续月付 · 每月 $5.99",
    confirmYearly: "继续年付 · 每年 $49.99",
    signIn: "教师登录",
    practice: "免费练习",
    freeTeacher: "免费创建教师账号",
    currentPlan: "当前套餐",
    secureCheckout: "Stripe 安全结账 · 可随时取消",
    language: "语言",
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
  const prefix = locale.dir ? `/${locale.dir}` : "";
  const links = [
    `<a href="${prefix}/sight-word-typing-game">${footerLinks[locale.code][0]}</a>`,
    `<a href="${prefix}/homeschool-spelling-practice">${footerLinks[locale.code][1]}</a>`,
    `<a href="${prefix}/vocabulary-typing-game">${footerLinks[locale.code][2]}</a>`,
    `<a href="${prefix}/faq">${footerLinks[locale.code][3]}</a>`,
    `<a href="${prefix}/privacy">${footerLinks[locale.code][4]}</a>`,
    `<a href="${prefix}/about">${footerLinks[locale.code][5]}</a>`,
    `<a href="${prefix}/contact">${footerLinks[locale.code][6]}</a>`,
  ].join(" &middot; ");
  const alternates = locales
    .map(
      (item) =>
        `<link rel="alternate" hreflang="${item.html}" href="${baseUrl}${pagePath(item)}">`,
    )
    .join("\n    ");
  const languageOptions = locales
    .map(
      (item) =>
        `<a class="lang-option" href="${pagePath(item)}" hreflang="${item.html}"${item.code === locale.code ? ' aria-current="page"' : ""}>${item.label}</a>`,
    )
    .join("");
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
  <link rel="stylesheet" href="/src/css/product.css?v=teacher-shell3">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF1V40KVS"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-VYF1V40KVS',{page_location: window.location.origin + window.location.pathname,page_path: window.location.pathname});</script>
  <script type="module" src="/src/js/analytics.mjs"></script>
</head>
<body class="product-page" data-product-locale="${locale.code}">
  <div class="product-shell">
    <nav class="product-nav"><a class="product-brand" href="${locale.dir ? `/${locale.dir}/` : "/"}"><img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt=""><span>My Spelling Game</span></a><div class="product-nav-center"><a class="product-nav-link" href="${locale.dir ? `/${locale.dir}/` : "/"}">${escape(c.practice)}</a><a class="product-nav-link" href="/teacher?lang=${encodeURIComponent(locale.code)}">${escape(c.signIn)}</a></div><div class="product-nav-actions"><details class="language-switcher"><summary class="lang-btn" aria-label="${escape(c.language)}">${escape(c.language)}</summary><div class="lang-menu">${languageOptions}</div></details></div></nav>
    <main class="product-main">
      <section class="product-card"><h1>${escape(c.heading)}</h1><p>${escape(c.intro)}</p><p class="notice">${escape(c.note)}</p></section>
      <div class="pricing-grid">
        <section class="product-card pricing-card"><h2>${escape(c.free)}</h2><p class="price">${escape(c.freePrice)}</p><ul>${c.freeItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><a class="button-link button-secondary" data-free-teacher-cta data-current-plan-label="${escape(c.currentPlan)}" href="/teacher?lang=${encodeURIComponent(locale.code)}#teacher-sign-in">${escape(c.freeTeacher)}</a></section>
        <section class="product-card pricing-card"><h2>${escape(c.pro)}</h2><div class="plan-selector" role="group" aria-label="${escape(c.billingPeriod)}"><button type="button" class="plan-option" data-plan-option="month" aria-pressed="true">${escape(c.monthly)}</button><button type="button" class="plan-option" data-plan-option="year" aria-pressed="false">${escape(c.yearly)}</button></div><div class="selected-plan" aria-live="polite"><p class="price" id="selected-plan-price" data-month="${escape(c.month)}" data-year="${escape(c.year)}">${escape(c.month)}</p><p id="selected-plan-description" data-month="${escape(c.monthlyBilling)}" data-year="${escape(c.yearlyBilling)}">${escape(c.monthlyBilling)}</p><p class="plan-savings" id="selected-plan-savings" data-month="" data-year="${escape(c.yearlySavings)}" hidden></p></div><ul>${c.proItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><div class="actions"><button type="button" class="checkout-confirm" data-confirm-checkout data-checkout="month" data-confirm-month="${escape(c.confirmMonthly)}" data-confirm-year="${escape(c.confirmYearly)}">${escape(c.confirmMonthly)}</button></div><p class="checkout-security">${escape(c.secureCheckout)}</p><p class="status" id="pricing-status" role="status"></p></section>
      </div>
    </main>
    <footer class="product-footer"><p><span class="footer-links">${links}</span><br>&copy; 2026 My Spelling Game ${footerRights[locale.code]}</p></footer>
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
