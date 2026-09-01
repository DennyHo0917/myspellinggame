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
    "Custom Words",
    "Weekly Practice",
    "Sight Words",
    "For Parents",
    "For Teachers",
  ],
  es: [
    "Palabras personalizadas",
    "Práctica semanal",
    "Palabras frecuentes",
    "Para familias",
    "Para docentes",
  ],
  "pt-BR": [
    "Palavras personalizadas",
    "Prática semanal",
    "Palavras frequentes",
    "Para pais",
    "Para professores",
  ],
  fr: [
    "Mots personnalisés",
    "Pratique hebdomadaire",
    "Mots fréquents",
    "Pour les parents",
    "Pour les enseignants",
  ],
  id: [
    "Kata kustom",
    "Latihan mingguan",
    "Kata umum",
    "Untuk orang tua",
    "Untuk guru",
  ],
  zh: ["自定义单词", "每周练习", "高频词", "家长练习", "教师作业"],
};
const footerSecondaryLinks = {
  en: ["Pricing", "FAQ", "Privacy", "About", "Contact"],
  es: [
    "Precios",
    "Preguntas frecuentes",
    "Privacidad",
    "Acerca de",
    "Contacto",
  ],
  "pt-BR": [
    "Preços",
    "Perguntas frequentes",
    "Privacidade",
    "Sobre",
    "Contato",
  ],
  fr: [
    "Tarifs",
    "Questions fréquentes",
    "Confidentialité",
    "À propos",
    "Contact",
  ],
  id: ["Harga", "Pertanyaan umum", "Privasi", "Tentang", "Kontak"],
  zh: ["价格", "常见问题", "隐私", "关于", "联系"],
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
    title: "Assignment Plans & Pricing | My Spelling Game",
    description:
      "Spelling assignment plans for teachers and parents to share practice and review results.",
    heading: "Save weekly lists. Track real progress.",
    intro:
      "Reuse word lists, follow each student across assignments, and turn missed words into focused review practice.",
    free: "Free Plan",
    freePrice: "$0",
    freeBilling: "Free forever",
    freeItems: [
      "Up to 30 words per assignment",
      "1 active assignment",
      "1 saved list",
      "1 learner",
      "8 tracked submissions per month",
      "14-day progress history",
      "Smart Review not included",
    ],
    parent: "Parent Plan",
    parentMonth: "$4.99 / month",
    parentYear: "$49.99 / year",
    parentItems: [
      "Up to 40 words per assignment",
      "Up to 5 children",
      "3 active assignments",
      "Unlimited tracked submissions",
      "Unlimited saved lists",
      "365-day progress history",
      "Smart Review",
      "Today's Review",
      "Photo import for school spelling lists",
      "Automatic example sentences from the curated library",
    ],
    teacher: "Teacher Plan",
    teacherMonth: "$9.99 / month",
    teacherYear: "$99.99 / year",
    teacherItems: [
      "Up to 40 words per assignment",
      "Up to 40 students",
      "5 active assignments",
      "Unlimited tracked submissions",
      "Unlimited saved lists",
      "365-day progress history",
      "Smart Review",
      "Today's Review",
      "Photo import for school spelling lists",
      "Automatic example sentences from the curated library",
      "Class Join and Student PINs",
      "CSV export",
      "Class-wide missed-word statistics",
    ],
    monthly: "Monthly plan",
    yearly: "Yearly plan",
    billingPeriod: "Billing period",
    selectParent: "Select Parent Plan",
    selectTeacher: "Select Teacher Plan",
    signIn: "Workspace",
    practice: "Home",
    freeTeacher: "Create free account",
    currentPlan: "Current plan",
    secureCheckout: "Secure checkout by Stripe · Cancel anytime",
    language: "Language",
    note: "Parents and teachers sign in. Students need no account or password. Anonymous practice needs no account, supports up to 20 words per list, and does not save Workspace tracking history.",
  },
  es: {
    title: "Planes y precios para tareas | My Spelling Game",
    description:
      "Planes de tareas de spelling para docentes y familias que quieren compartir prácticas y consultar resultados.",
    heading: "Guarda las listas semanales y sigue el progreso real",
    intro:
      "Reutiliza listas de palabras, sigue a cada estudiante entre tareas y convierte los errores en prácticas de repaso específicas.",
    free: "Plan Gratis",
    freePrice: "$0",
    freeBilling: "Gratis para siempre",
    freeItems: [
      "Hasta 30 palabras por tarea",
      "1 tarea activa",
      "1 lista guardada",
      "1 estudiante",
      "8 entregas registradas al mes",
      "14 días de historial de progreso",
      "Sin repaso inteligente",
    ],
    parent: "Plan para familias",
    parentMonth: "$4.99 al mes",
    parentYear: "$49,99 al año",
    parentItems: [
      "Hasta 40 palabras por tarea",
      "Hasta 5 hijos",
      "3 tareas activas",
      "Entregas registradas ilimitadas",
      "Listas guardadas ilimitadas",
      "365 días de historial de progreso",
      "Repaso inteligente",
      "Repaso de hoy",
      "Importación por foto de listas escolares",
      "Frases de ejemplo automáticas de la biblioteca seleccionada",
    ],
    teacher: "Plan para docentes",
    teacherMonth: "$9.99 al mes",
    teacherYear: "$99,99 al año",
    teacherItems: [
      "Hasta 40 palabras por tarea",
      "Hasta 40 estudiantes",
      "5 tareas activas",
      "Entregas registradas ilimitadas",
      "Listas guardadas ilimitadas",
      "365 días de historial de progreso",
      "Repaso inteligente",
      "Repaso de hoy",
      "Importación por foto de listas escolares",
      "Frases de ejemplo automáticas de la biblioteca seleccionada",
      "Acceso a clase y PIN de estudiante",
      "Exportación CSV",
      "Estadísticas de errores de toda la clase",
    ],
    monthly: "Plan mensual",
    yearly: "Plan anual",
    billingPeriod: "Periodo de facturación",
    selectParent: "Elegir plan para familias",
    selectTeacher: "Elegir plan para docentes",
    signIn: "Espacio de trabajo",
    practice: "Inicio",
    freeTeacher: "Crear una cuenta gratis",
    currentPlan: "Plan actual",
    secureCheckout: "Pago seguro con Stripe · Cancela cuando quieras",
    language: "Idioma",
    note: "Las familias y los docentes inician sesión. Los estudiantes no necesitan cuenta ni contraseña. La práctica anónima no requiere cuenta, admite hasta 20 palabras por lista y no guarda el historial de seguimiento del espacio de trabajo.",
  },
  "pt-BR": {
    title: "Planos e preços para tarefas | My Spelling Game",
    description:
      "Planos de atividades de spelling para professores e responsáveis compartilharem práticas e acompanharem resultados.",
    heading: "Salve listas semanais e acompanhe o progresso real",
    intro:
      "Reutilize listas de palavras, acompanhe cada aluno em várias tarefas e transforme erros em práticas de revisão focadas.",
    free: "Plano Grátis",
    freePrice: "$0",
    freeBilling: "Grátis para sempre",
    freeItems: [
      "Até 30 palavras por tarefa",
      "1 tarefa ativa",
      "1 lista salva",
      "1 aluno",
      "8 envios acompanhados por mês",
      "14 dias de histórico de progresso",
      "Sem revisão inteligente",
    ],
    parent: "Plano para Pais",
    parentMonth: "$4.99 por mês",
    parentYear: "$49,99 por ano",
    parentItems: [
      "Até 40 palavras por tarefa",
      "Até 5 filhos",
      "3 tarefas ativas",
      "Envios acompanhados ilimitados",
      "Listas salvas ilimitadas",
      "365 dias de histórico de progresso",
      "Revisão inteligente",
      "Revisão de hoje",
      "Importação por foto de listas da escola",
      "Frases de exemplo automáticas da biblioteca selecionada",
    ],
    teacher: "Plano para Professores",
    teacherMonth: "$9.99 por mês",
    teacherYear: "$99,99 por ano",
    teacherItems: [
      "Até 40 palavras por tarefa",
      "Até 40 alunos",
      "5 tarefas ativas",
      "Envios acompanhados ilimitados",
      "Listas salvas ilimitadas",
      "365 dias de histórico de progresso",
      "Revisão inteligente",
      "Revisão de hoje",
      "Importação por foto de listas da escola",
      "Frases de exemplo automáticas da biblioteca selecionada",
      "Entrada na turma e PIN do aluno",
      "Exportação CSV",
      "Estatísticas de erros da turma",
    ],
    monthly: "Plano mensal",
    yearly: "Plano anual",
    billingPeriod: "Periodicidade",
    selectParent: "Escolher Plano para Pais",
    selectTeacher: "Escolher Plano para Professores",
    signIn: "Espaço de trabalho",
    practice: "Início",
    freeTeacher: "Criar conta grátis",
    currentPlan: "Plano atual",
    secureCheckout: "Checkout seguro pelo Stripe · Cancele quando quiser",
    language: "Idioma",
    note: "Responsáveis e professores entram com sua conta. Os alunos não precisam de conta nem senha. A prática anônima não exige conta, aceita até 20 palavras por lista e não salva o histórico de acompanhamento do espaço de trabalho.",
  },
  fr: {
    title: "Offres et tarifs pour les devoirs | My Spelling Game",
    description:
      "Des offres de devoirs d’orthographe pour les enseignants et les parents qui souhaitent partager des exercices et suivre les résultats.",
    heading: "Enregistrez vos listes et suivez les vrais progrès",
    intro:
      "Réutilisez vos listes de mots, suivez chaque élève d’un devoir à l’autre et transformez les erreurs en exercices de révision ciblés.",
    free: "Offre gratuite",
    freePrice: "0 $",
    freeBilling: "Gratuit pour toujours",
    freeItems: [
      "Jusqu’à 30 mots par devoir",
      "1 devoir actif",
      "1 liste enregistrée",
      "1 élève",
      "8 remises suivies par mois",
      "14 jours d’historique de progression",
      "Sans révision intelligente",
    ],
    parent: "Offre Parents",
    parentMonth: "4,99 $ par mois",
    parentYear: "49,99 $ par an",
    parentItems: [
      "Jusqu’à 40 mots par devoir",
      "Jusqu’à 5 enfants",
      "3 devoirs actifs",
      "Remises suivies illimitées",
      "Listes enregistrées illimitées",
      "365 jours d’historique de progression",
      "Révision intelligente",
      "Révision du jour",
      "Import de listes scolaires par photo",
      "Phrases d’exemple automatiques de la bibliothèque sélectionnée",
    ],
    teacher: "Offre Enseignants",
    teacherMonth: "9,99 $ par mois",
    teacherYear: "99,99 $ par an",
    teacherItems: [
      "Jusqu’à 40 mots par devoir",
      "Jusqu’à 40 élèves",
      "5 devoirs actifs",
      "Remises suivies illimitées",
      "Listes enregistrées illimitées",
      "365 jours d’historique de progression",
      "Révision intelligente",
      "Révision du jour",
      "Import de listes scolaires par photo",
      "Phrases d’exemple automatiques de la bibliothèque sélectionnée",
      "Accès classe et PIN élève",
      "Export CSV",
      "Statistiques des mots manqués de la classe",
    ],
    monthly: "Offre mensuelle",
    yearly: "Offre annuelle",
    billingPeriod: "Période de facturation",
    selectParent: "Choisir l’offre Parents",
    selectTeacher: "Choisir l’offre Enseignants",
    signIn: "Espace de travail",
    practice: "Accueil",
    freeTeacher: "Créer un compte gratuit",
    currentPlan: "Offre actuelle",
    secureCheckout: "Paiement sécurisé par Stripe · Résiliable à tout moment",
    language: "Langue",
    note: "Les parents et les enseignants se connectent. Les élèves n’ont besoin ni de compte ni de mot de passe. La pratique anonyme ne demande aucun compte, accepte jusqu’à 20 mots par liste et n’enregistre pas l’historique de suivi de l’espace de travail.",
  },
  id: {
    title: "Paket dan harga tugas | My Spelling Game",
    description:
      "Paket tugas spelling bagi guru dan orang tua untuk membagikan latihan dan melihat hasilnya.",
    heading: "Simpan daftar mingguan dan pantau perkembangan nyata",
    intro:
      "Gunakan kembali daftar kata, ikuti perkembangan setiap siswa di berbagai tugas, dan ubah kata yang salah menjadi latihan ulasan terarah.",
    free: "Paket Gratis",
    freePrice: "$0",
    freeBilling: "Gratis selamanya",
    freeItems: [
      "Hingga 30 kata per tugas",
      "1 tugas aktif",
      "1 daftar tersimpan",
      "1 siswa",
      "8 kiriman terlacak per bulan",
      "Riwayat perkembangan 14 hari",
      "Tanpa Ulasan Pintar",
    ],
    parent: "Paket Orang Tua",
    parentMonth: "$4.99 per bulan",
    parentYear: "$49.99 per tahun",
    parentItems: [
      "Hingga 40 kata per tugas",
      "Hingga 5 anak",
      "3 tugas aktif",
      "Kiriman terlacak tanpa batas",
      "Daftar tersimpan tanpa batas",
      "Riwayat perkembangan 365 hari",
      "Ulasan Pintar",
      "Ulasan hari ini",
      "Impor foto daftar ejaan sekolah",
      "Kalimat contoh otomatis dari pustaka pilihan",
    ],
    teacher: "Paket Guru",
    teacherMonth: "$9.99 per bulan",
    teacherYear: "$99.99 per tahun",
    teacherItems: [
      "Hingga 40 kata per tugas",
      "Hingga 40 siswa",
      "5 tugas aktif",
      "Kiriman terlacak tanpa batas",
      "Daftar tersimpan tanpa batas",
      "Riwayat perkembangan 365 hari",
      "Ulasan Pintar",
      "Ulasan hari ini",
      "Impor foto daftar ejaan sekolah",
      "Kalimat contoh otomatis dari pustaka pilihan",
      "Gabung Kelas dan PIN Siswa",
      "Ekspor CSV",
      "Statistik kata yang salah untuk seluruh kelas",
    ],
    monthly: "Paket bulanan",
    yearly: "Paket tahunan",
    billingPeriod: "Periode tagihan",
    selectParent: "Pilih Paket Orang Tua",
    selectTeacher: "Pilih Paket Guru",
    signIn: "Ruang kerja",
    practice: "Beranda",
    freeTeacher: "Buat akun gratis",
    currentPlan: "Paket saat ini",
    secureCheckout: "Checkout aman oleh Stripe · Batalkan kapan saja",
    language: "Bahasa",
    note: "Orang tua dan guru masuk ke akun mereka. Siswa tidak memerlukan akun atau kata sandi. Latihan anonim tidak memerlukan akun, mendukung hingga 20 kata per daftar, dan tidak menyimpan riwayat pelacakan ruang kerja.",
  },
  zh: {
    title: "作业方案与价格 | My Spelling Game",
    description: "面向教师和家长的拼写作业方案，可分享练习并查看学习结果。",
    heading: "保存每周词表，持续追踪真实进步",
    intro:
      "重复使用词表，跨作业查看每位学生的进度，并把错词转成针对性的复习练习。",
    free: "免费方案",
    freePrice: "$0",
    freeBilling: "永久免费",
    freeItems: [
      "每份作业最多 30 个单词",
      "最多 1 个活跃作业",
      "保存 1 个词表",
      "创建 1 个学习者档案",
      "每月追踪 8 次提交",
      "查看 14 天学习记录",
      "不含智能复习",
    ],
    parent: "家长方案",
    parentMonth: "每月 $4.99",
    parentYear: "每年 $49.99",
    parentItems: [
      "每份作业最多 40 个单词",
      "最多 5 个孩子",
      "最多 3 个活跃作业",
      "提交追踪不限量",
      "保存词表不限量",
      "查看 365 天学习记录",
      "智能复习",
      "今日复习",
      "拍照导入学校词表",
      "从精选例句库自动填充例句",
    ],
    teacher: "教师方案",
    teacherMonth: "每月 $9.99",
    teacherYear: "每年 $99.99",
    teacherItems: [
      "每份作业最多 40 个单词",
      "最多 40 个学生",
      "最多 5 个活跃作业",
      "提交追踪不限量",
      "保存词表不限量",
      "查看 365 天学习记录",
      "智能复习",
      "今日复习",
      "拍照导入学校词表",
      "从精选例句库自动填充例句",
      "班级加入与学生 PIN",
      "导出 CSV",
      "查看班级错词统计",
    ],
    monthly: "月付方案",
    yearly: "年付方案",
    billingPeriod: "计费周期",
    selectParent: "选择家长方案",
    selectTeacher: "选择教师方案",
    signIn: "工作台",
    practice: "首页",
    freeTeacher: "免费创建账号",
    currentPlan: "当前方案",
    secureCheckout: "Stripe 安全结账 · 可随时取消",
    language: "语言",
    note: "家长和教师登录，学生无需账号或密码。匿名练习无需账号，每份最多 20 个词，也不会保存 Workspace 追踪历史。",
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
    `<a href="${prefix}/custom-spelling-words-game">${footerLinks[locale.code][0]}</a>`,
    `<a href="${prefix}/weekly-spelling-practice">${footerLinks[locale.code][1]}</a>`,
    `<a href="${prefix}/sight-word-typing-game">${footerLinks[locale.code][2]}</a>`,
    `<a href="${prefix}/spelling-practice-for-parents">${footerLinks[locale.code][3]}</a>`,
    `<a href="${prefix}/spelling-assignments-for-teachers">${footerLinks[locale.code][4]}</a>`,
  ].join(" &middot; ");
  const secondaryLinks = [
    `<a href="${prefix}/pricing" aria-label="${escape(footerSecondaryLinks[locale.code][0])}">${footerSecondaryLinks[locale.code][0]}</a>`,
    `<a href="${prefix}/faq" aria-label="${escape(footerSecondaryLinks[locale.code][1])}">${footerSecondaryLinks[locale.code][1]}</a>`,
    `<a href="${prefix}/privacy" aria-label="${escape(footerSecondaryLinks[locale.code][2])}">${footerSecondaryLinks[locale.code][2]}</a>`,
    `<a href="${prefix}/about" aria-label="${escape(footerSecondaryLinks[locale.code][3])}">${footerSecondaryLinks[locale.code][3]}</a>`,
    `<a href="${prefix}/contact" aria-label="${escape(footerSecondaryLinks[locale.code][4])}">${footerSecondaryLinks[locale.code][4]}</a>`,
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
  <link rel="stylesheet" href="/src/css/main.css">
  <link rel="stylesheet" href="/src/css/product.css?v=pricing-header2">
  <script src="/src/js/localeRedirect.js"></script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF1V40KVS"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-VYF1V40KVS',{page_location: window.location.origin + window.location.pathname,page_path: window.location.pathname});</script>
  <script type="module" src="/src/js/analytics.mjs"></script>
</head>
<body class="product-page" data-product-locale="${locale.code}">
  <div class="product-shell">
    <header class="top-right-nav"><a class="brand-link" href="${locale.dir ? `/${locale.dir}/` : "/"}" aria-label="My Spelling Game home"><img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt=""><span class="brand-name">My Spelling Game</span></a><details class="language-switcher"><summary class="lang-btn" aria-label="${escape(c.language)}">${escape(c.language)}</summary><div class="lang-menu">${languageOptions}</div></details><a class="teacher-nav-link" href="/workspace?lang=${encodeURIComponent(locale.code)}">${escape(c.signIn)}</a><a class="header-home-link" href="${locale.dir ? `/${locale.dir}/` : "/"}">${escape(c.practice)}</a></header>
    <main class="product-main">
      <section class="product-card"><h1>${escape(c.heading)}</h1><p>${escape(c.intro)}</p><p class="notice">${escape(c.note)}</p></section>
      <div class="subscription-status" data-subscription-status hidden role="status"><span data-subscription-message></span><button type="button" class="button-secondary" data-renew-subscription hidden></button></div>
      <div class="pricing-toolbar"><div class="plan-selector" role="group" aria-label="${escape(c.billingPeriod)}"><button type="button" class="plan-option" data-plan-option="month" aria-pressed="true">${escape(c.monthly)}</button><button type="button" class="plan-option" data-plan-option="year" aria-pressed="false">${escape(c.yearly)}</button></div></div>
      <div class="pricing-grid">
        <section class="product-card pricing-card" data-plan-card="free"><div class="pricing-card-heading"><h2>${escape(c.free)}</h2></div><div class="selected-plan"><p class="price">${escape(c.freePrice)}</p><p class="plan-description">${escape(c.freeBilling)}</p></div><ul>${c.freeItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><a class="button-link button-secondary" data-plan-cta="free" data-free-teacher-cta data-current-plan-label="${escape(c.currentPlan)}" href="/workspace?lang=${encodeURIComponent(locale.code)}#teacher-sign-in">${escape(c.freeTeacher)}</a></section>
        <section class="product-card pricing-card" data-plan-card="parent"><div class="pricing-card-heading"><h2>${escape(c.parent)}</h2></div><div class="selected-plan" aria-live="polite"><p class="price" data-plan-price data-month="${escape(c.parentMonth)}" data-year="${escape(c.parentYear)}">${escape(c.parentMonth)}</p></div><ul>${c.parentItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><button type="button" class="button-secondary plan-choice" data-plan-choice="parent" data-plan-cta="parent" data-current-plan-label="${escape(c.currentPlan)}" aria-pressed="false">${escape(c.selectParent)}</button></section>
        <section class="product-card pricing-card" data-plan-card="teacher"><div class="pricing-card-heading"><h2>${escape(c.teacher)}</h2></div><div class="selected-plan" aria-live="polite"><p class="price" data-plan-price data-month="${escape(c.teacherMonth)}" data-year="${escape(c.teacherYear)}">${escape(c.teacherMonth)}</p></div><ul>${c.teacherItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><button type="button" class="button-secondary plan-choice" data-plan-choice="teacher" data-plan-cta="teacher" data-current-plan-label="${escape(c.currentPlan)}" aria-pressed="false">${escape(c.selectTeacher)}</button></section>
      </div>
    </main>
    <footer class="product-footer"><p><span class="footer-links">${links}</span><br><span class="footer-secondary-links">${secondaryLinks}</span><br>&copy; 2026 My Spelling Game ${footerRights[locale.code]}</p></footer>
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
