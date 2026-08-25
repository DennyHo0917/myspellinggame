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
    title: "Assignment Plans & Pricing | My Spelling Game",
    description:
      "Spelling assignment plans for teachers and parents to share practice and review results.",
    heading: "Save weekly lists. Track real progress.",
    intro:
      "Reuse word lists, follow each learner across assignments, and turn missed words into focused review practice.",
    free: "Free",
    freePrice: "$0",
    freeBilling: "Free forever",
    freeItems: [
      "2 active assignments",
      "30 learner submissions per month",
      "30-day mastery history",
      "3 saved lists",
      "3 learner profiles",
      "Basic progress",
    ],
    pro: "Pro",
    month: "$5.99 / month",
    year: "$4.17 / month",
    proItems: [
      "20 active assignments",
      "Unlimited learner submissions",
      "Unlimited saved lists",
      "Up to 150 learner profiles",
      "365-day mastery history",
      "Smart missed-word review across assignments",
      "CSV export",
      "Group-wide missed-word statistics",
    ],
    proValue:
      "Save setup time and always know what each learner should practice next.",
    monthly: "Monthly plan",
    yearly: "Yearly plan",
    monthlyBilling:
      "First 30 days free for new subscribers. $0 today. Card required. Then $5.99/month automatically unless canceled before the trial ends.",
    yearlyBilling:
      "First 30 days free for new subscribers. $0 today. Card required. Then $49.99/year automatically unless canceled before the trial ends.",
    monthlyBillingImmediate:
      "$5.99 charged today, then monthly until canceled.",
    yearlyBillingImmediate: "$49.99 charged today, then yearly until canceled.",
    yearlySavings: "Save 30%",
    billingPeriod: "Billing period",
    confirmMonthly: "Start 30-day free trial · Monthly",
    confirmYearly: "Start 30-day free trial · Yearly",
    subscribe: "Subscribe",
    signIn: "Workspace sign in",
    practice: "Free practice",
    freeTeacher: "Create free account",
    currentPlan: "Current plan",
    secureCheckout: "Secure checkout by Stripe · Cancel anytime",
    language: "Language",
    note: "Free custom spelling practice stays free. Learners can still join by link without creating an account.",
  },
  es: {
    title: "Planes y precios para tareas | My Spelling Game",
    description:
      "Planes de tareas de spelling para docentes y familias que quieren compartir prácticas y consultar resultados.",
    heading: "Guarda las listas semanales y sigue el progreso real",
    intro:
      "Reutiliza listas de palabras, sigue a cada aprendiz entre tareas y convierte los errores en prácticas de repaso específicas.",
    free: "Gratis",
    freePrice: "$0",
    freeBilling: "Gratis para siempre",
    freeItems: [
      "2 tareas activas",
      "30 entregas de aprendices al mes",
      "30 días de historial de dominio",
      "3 listas guardadas",
      "3 perfiles de aprendiz",
      "Progreso básico",
    ],
    pro: "Pro",
    month: "$5.99 al mes",
    year: "$4,17 al mes",
    proItems: [
      "20 tareas activas",
      "Entregas de aprendices ilimitadas",
      "Listas guardadas ilimitadas",
      "Hasta 150 perfiles de aprendiz",
      "365 días de historial de dominio",
      "Repaso inteligente de errores entre tareas",
      "Exportación CSV",
      "Estadísticas de errores de todo el grupo",
    ],
    proValue:
      "Ahorra tiempo de preparación y sabe siempre qué debe practicar cada aprendiz.",
    monthly: "Plan mensual",
    yearly: "Plan anual",
    monthlyBilling:
      "Los primeros 30 días son gratis para nuevos suscriptores. Hoy pagas $0 y debes registrar una tarjeta. Después se cobrarán automáticamente $5.99 al mes, salvo que canceles antes de que termine la prueba.",
    yearlyBilling:
      "Los primeros 30 días son gratis para nuevos suscriptores. Hoy pagas $0 y debes registrar una tarjeta. Después se cobrarán automáticamente $49,99 al año, salvo que canceles antes de que termine la prueba.",
    monthlyBillingImmediate:
      "$5.99 cobrados hoy y después cada mes hasta que canceles.",
    yearlyBillingImmediate:
      "$49,99 cobrados hoy y después cada año hasta que canceles.",
    yearlySavings: "Ahorra un 30 %",
    billingPeriod: "Periodo de facturación",
    confirmMonthly: "Iniciar prueba gratis de 30 días · Mensual",
    confirmYearly: "Iniciar prueba gratis de 30 días · Anual",
    subscribe: "Suscribirse",
    signIn: "Acceder al espacio de trabajo",
    practice: "Práctica gratuita",
    freeTeacher: "Crear una cuenta gratis",
    currentPlan: "Plan actual",
    secureCheckout: "Pago seguro con Stripe · Cancela cuando quieras",
    language: "Idioma",
    note: "La práctica personalizada gratuita seguirá siendo gratis. Los aprendices pueden entrar mediante un enlace sin crear una cuenta.",
  },
  "pt-BR": {
    title: "Planos e preços para tarefas | My Spelling Game",
    description:
      "Planos de atividades de spelling para professores e responsáveis compartilharem práticas e acompanharem resultados.",
    heading: "Salve listas semanais e acompanhe o progresso real",
    intro:
      "Reutilize listas de palavras, acompanhe cada aprendiz em várias tarefas e transforme erros em práticas de revisão focadas.",
    free: "Grátis",
    freePrice: "$0",
    freeBilling: "Grátis para sempre",
    freeItems: [
      "2 tarefas ativas",
      "30 envios de aprendizes por mês",
      "30 dias de histórico de domínio",
      "3 listas salvas",
      "3 perfis de aprendiz",
      "Progresso básico",
    ],
    pro: "Pro",
    month: "$5.99 por mês",
    year: "$4,17 por mês",
    proItems: [
      "20 tarefas ativas",
      "Envios de aprendizes ilimitados",
      "Listas salvas ilimitadas",
      "Até 150 perfis de aprendiz",
      "365 dias de histórico de domínio",
      "Revisão inteligente de erros entre tarefas",
      "Exportação CSV",
      "Estatísticas de erros do grupo",
    ],
    proValue:
      "Economize tempo de preparação e saiba sempre o que cada aprendiz deve praticar em seguida.",
    monthly: "Plano mensal",
    yearly: "Plano anual",
    monthlyBilling:
      "Os primeiros 30 dias são grátis para novos assinantes. Hoje você paga $0 e precisa cadastrar um cartão. Depois, a cobrança automática será de $5.99 por mês, a menos que você cancele antes do fim do teste.",
    yearlyBilling:
      "Os primeiros 30 dias são grátis para novos assinantes. Hoje você paga $0 e precisa cadastrar um cartão. Depois, a cobrança automática será de $49,99 por ano, a menos que você cancele antes do fim do teste.",
    monthlyBillingImmediate:
      "$5.99 cobrados hoje e depois mensalmente até o cancelamento.",
    yearlyBillingImmediate:
      "$49,99 cobrados hoje e depois anualmente até o cancelamento.",
    yearlySavings: "Economize 30%",
    billingPeriod: "Periodicidade",
    confirmMonthly: "Iniciar teste grátis de 30 dias · Mensal",
    confirmYearly: "Iniciar teste grátis de 30 dias · Anual",
    subscribe: "Assinar",
    signIn: "Acessar espaço de trabalho",
    practice: "Prática grátis",
    freeTeacher: "Criar conta grátis",
    currentPlan: "Plano atual",
    secureCheckout: "Checkout seguro pelo Stripe · Cancele quando quiser",
    language: "Idioma",
    note: "A prática personalizada gratuita continuará grátis. Aprendizes ainda podem entrar por link sem criar uma conta.",
  },
  fr: {
    title: "Offres et tarifs pour les devoirs | My Spelling Game",
    description:
      "Des offres de devoirs d’orthographe pour les enseignants et les parents qui souhaitent partager des exercices et suivre les résultats.",
    heading: "Enregistrez vos listes et suivez les vrais progrès",
    intro:
      "Réutilisez vos listes de mots, suivez chaque apprenant d’un devoir à l’autre et transformez les erreurs en exercices de révision ciblés.",
    free: "Gratuit",
    freePrice: "0 $",
    freeBilling: "Gratuit pour toujours",
    freeItems: [
      "2 devoirs actifs",
      "30 remises d’apprenants par mois",
      "30 jours d’historique de maîtrise",
      "3 listes enregistrées",
      "3 profils d’apprenant",
      "Progression essentielle",
    ],
    pro: "Pro",
    month: "5,99 $ par mois",
    year: "4,17 $ par mois",
    proItems: [
      "20 devoirs actifs",
      "Remises d’apprenants illimitées",
      "Listes enregistrées illimitées",
      "Jusqu’à 150 profils d’apprenant",
      "365 jours d’historique de maîtrise",
      "Révision intelligente des erreurs entre devoirs",
      "Export CSV",
      "Statistiques des mots manqués du groupe",
    ],
    proValue:
      "Gagnez du temps de préparation et sachez toujours ce que chaque apprenant doit réviser ensuite.",
    monthly: "Offre mensuelle",
    yearly: "Offre annuelle",
    monthlyBilling:
      "Les 30 premiers jours sont gratuits pour les nouveaux abonnés. 0 $ aujourd’hui, carte requise. Ensuite, 5,99 $ seront prélevés automatiquement chaque mois, sauf résiliation avant la fin de l’essai.",
    yearlyBilling:
      "Les 30 premiers jours sont gratuits pour les nouveaux abonnés. 0 $ aujourd’hui, carte requise. Ensuite, 49,99 $ seront prélevés automatiquement chaque année, sauf résiliation avant la fin de l’essai.",
    monthlyBillingImmediate:
      "5,99 $ prélevés aujourd’hui, puis chaque mois jusqu’à résiliation.",
    yearlyBillingImmediate:
      "49,99 $ prélevés aujourd’hui, puis chaque année jusqu’à résiliation.",
    yearlySavings: "Économisez 30 %",
    billingPeriod: "Période de facturation",
    confirmMonthly: "Démarrer l’essai gratuit de 30 jours · Mensuel",
    confirmYearly: "Démarrer l’essai gratuit de 30 jours · Annuel",
    subscribe: "S’abonner",
    signIn: "Ouvrir l’espace de travail",
    practice: "Entraînement gratuit",
    freeTeacher: "Créer un compte gratuit",
    currentPlan: "Offre actuelle",
    secureCheckout: "Paiement sécurisé par Stripe · Résiliable à tout moment",
    language: "Langue",
    note: "Les exercices personnalisés gratuits resteront gratuits. Les apprenants peuvent toujours participer par lien sans créer de compte.",
  },
  id: {
    title: "Paket dan harga tugas | My Spelling Game",
    description:
      "Paket tugas spelling bagi guru dan orang tua untuk membagikan latihan dan melihat hasilnya.",
    heading: "Simpan daftar mingguan dan pantau perkembangan nyata",
    intro:
      "Gunakan kembali daftar kata, ikuti perkembangan setiap pelajar di berbagai tugas, dan ubah kata yang salah menjadi latihan ulasan terarah.",
    free: "Gratis",
    freePrice: "$0",
    freeBilling: "Gratis selamanya",
    freeItems: [
      "2 tugas aktif",
      "30 kiriman pelajar per bulan",
      "Riwayat penguasaan 30 hari",
      "3 daftar tersimpan",
      "3 profil pelajar",
      "Perkembangan dasar",
    ],
    pro: "Pro",
    month: "$5.99 per bulan",
    year: "$4.17 per bulan",
    proItems: [
      "20 tugas aktif",
      "Kiriman pelajar tanpa batas",
      "Daftar tersimpan tanpa batas",
      "Hingga 150 profil pelajar",
      "Riwayat penguasaan 365 hari",
      "Ulasan pintar kata yang salah dari berbagai tugas",
      "Ekspor CSV",
      "Statistik kata yang salah untuk seluruh kelompok",
    ],
    proValue:
      "Hemat waktu persiapan dan selalu ketahui apa yang perlu dilatih setiap pelajar berikutnya.",
    monthly: "Paket bulanan",
    yearly: "Paket tahunan",
    monthlyBilling:
      "30 hari pertama gratis untuk pelanggan baru. Bayar $0 hari ini dan kartu wajib didaftarkan. Setelah itu, $5.99 ditagih otomatis setiap bulan kecuali dibatalkan sebelum masa uji coba berakhir.",
    yearlyBilling:
      "30 hari pertama gratis untuk pelanggan baru. Bayar $0 hari ini dan kartu wajib didaftarkan. Setelah itu, $49.99 ditagih otomatis setiap tahun kecuali dibatalkan sebelum masa uji coba berakhir.",
    monthlyBillingImmediate:
      "$5.99 ditagih hari ini, lalu setiap bulan sampai dibatalkan.",
    yearlyBillingImmediate:
      "$49.99 ditagih hari ini, lalu setiap tahun sampai dibatalkan.",
    yearlySavings: "Hemat 30%",
    billingPeriod: "Periode tagihan",
    confirmMonthly: "Mulai uji coba gratis 30 hari · Bulanan",
    confirmYearly: "Mulai uji coba gratis 30 hari · Tahunan",
    subscribe: "Berlangganan",
    signIn: "Masuk ke ruang kerja",
    practice: "Latihan gratis",
    freeTeacher: "Buat akun gratis",
    currentPlan: "Paket saat ini",
    secureCheckout: "Checkout aman oleh Stripe · Batalkan kapan saja",
    language: "Bahasa",
    note: "Latihan spelling khusus yang gratis akan tetap gratis. Pelajar tetap dapat bergabung melalui link tanpa membuat akun.",
  },
  zh: {
    title: "作业方案与价格 | My Spelling Game",
    description: "面向教师和家长的拼写作业方案，可分享练习并查看学习结果。",
    heading: "保存每周词表，持续追踪真实进步",
    intro:
      "重复使用词表，跨作业查看每位学习者的进度，并把错词转成针对性的复习练习。",
    free: "免费版",
    freePrice: "$0",
    freeBilling: "永久免费",
    freeItems: [
      "最多 2 个活跃作业",
      "每月 30 份学习者提交",
      "30 天掌握度历史",
      "保存 3 个词表",
      "创建 3 个学习者档案",
      "查看基础进度",
    ],
    pro: "Pro",
    month: "每月 $5.99",
    year: "折合每月 $4.17",
    proItems: [
      "最多 20 个活跃作业",
      "学习者提交不限量",
      "保存词表不限量",
      "最多 150 个学习者档案",
      "365 天掌握度历史",
      "跨作业智能错词复习",
      "导出 CSV",
      "查看群组错词统计",
    ],
    proValue: "节省每次准备词表的时间，并随时知道每位学习者接下来该练什么。",
    monthly: "月付方案",
    yearly: "年付方案",
    monthlyBilling:
      "新订阅用户首 30 天免费。今天支付 $0，需绑定付款方式。30 天后自动扣取每月 $5.99，除非在试用结束前取消。",
    yearlyBilling:
      "新订阅用户首 30 天免费。今天支付 $0，需绑定付款方式。30 天后自动扣取每年 $49.99，除非在试用结束前取消。",
    monthlyBillingImmediate: "今天扣取 $5.99，之后按月自动续费，直至取消。",
    yearlyBillingImmediate: "今天扣取 $49.99，之后按年自动续费，直至取消。",
    yearlySavings: "立省 30%",
    billingPeriod: "计费周期",
    confirmMonthly: "开始 30 天免费试用 · 月付",
    confirmYearly: "开始 30 天免费试用 · 年付",
    subscribe: "订阅",
    signIn: "登录工作台",
    practice: "免费练习",
    freeTeacher: "免费创建账号",
    currentPlan: "当前套餐",
    secureCheckout: "Stripe 安全结账 · 可随时取消",
    language: "语言",
    note: "免费的自定义拼写练习仍然免费。学习者无需创建账号，仍可通过链接直接加入。",
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
        <section class="product-card pricing-card"><div class="pricing-card-heading"><h2>${escape(c.free)}</h2></div><div class="selected-plan"><p class="price">${escape(c.freePrice)}</p><p class="plan-description">${escape(c.freeBilling)}</p></div><ul>${c.freeItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><a class="button-link button-secondary" data-free-teacher-cta data-current-plan-label="${escape(c.currentPlan)}" href="/teacher?lang=${encodeURIComponent(locale.code)}#teacher-sign-in">${escape(c.freeTeacher)}</a></section>
        <section class="product-card pricing-card"><div class="pricing-card-heading"><h2>${escape(c.pro)}</h2><div class="plan-selector" role="group" aria-label="${escape(c.billingPeriod)}"><button type="button" class="plan-option" data-plan-option="month" aria-pressed="true">${escape(c.monthly)}</button><button type="button" class="plan-option" data-plan-option="year" aria-pressed="false">${escape(c.yearly)}</button></div></div><div class="selected-plan" aria-live="polite"><p class="price" id="selected-plan-price" data-month="${escape(c.month)}" data-year="${escape(c.year)}">${escape(c.month)}</p><p class="plan-description" id="selected-plan-description" data-month="${escape(c.monthlyBilling)}" data-year="${escape(c.yearlyBilling)}" data-month-immediate="${escape(c.monthlyBillingImmediate)}" data-year-immediate="${escape(c.yearlyBillingImmediate)}">${escape(c.monthlyBilling)}</p><p class="plan-savings" id="selected-plan-savings" data-month="" data-year="${escape(c.yearlySavings)}" hidden></p></div><ul>${c.proItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ul><p class="plan-description">${escape(c.proValue)}</p><div class="actions"><button type="button" class="checkout-confirm" data-confirm-checkout data-checkout="month" data-confirm-month="${escape(c.confirmMonthly)}" data-confirm-year="${escape(c.confirmYearly)}" data-confirm-immediate="${escape(c.subscribe)}">${escape(c.confirmMonthly)}</button></div><p class="checkout-security">${escape(c.secureCheckout)}</p><p class="status" id="pricing-status" role="status"></p></section>
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
