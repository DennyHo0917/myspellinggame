const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const baseUrl = "https://myspellinggame.com";
const locales = {
  en: {
    html: "en",
    dir: "",
    language: "Language",
    home: "Home",
    teacher: "For teachers",
    title: "FAQ | My Spelling Game",
    heading: "Frequently asked questions",
    intro:
      "Answers about word lists, practice modes, sharing, accounts, and teacher assignments.",
    questions: [
      [
        "Can I use my own spelling words?",
        "Yes. Paste a weekly list and the game uses those exact words in Spelling Test or Typing Rain.",
      ],
      [
        "What is the difference between the two modes?",
        "Spelling Test reads one hidden word at a time. Typing Rain shows falling words that must be typed before they reach the bottom.",
      ],
      [
        "Can I practice only missed words?",
        "Yes. At the end of a round, start a focused retry round with only the words that were missed.",
      ],
      [
        "Do students need an account?",
        "No. Student practice works in the browser without a login. Teacher accounts are only needed for assignments and reports.",
      ],
      [
        "Can I share a list with students?",
        "Yes. Copy a practice link and students can open the same list without creating an account.",
      ],
      [
        "Are paid teacher subscriptions recurring?",
        "Yes. A paid plan renews automatically each billing period until canceled through the billing portal.",
      ],
      [
        "How do I practice a weekly spelling list?",
        "Paste this week's words on the home page, choose Spelling Test or Typing Rain, and start immediately.",
      ],
      [
        "Can I use a custom list instead of a fixed word bank?",
        "Yes. The game uses only the words you paste, so the practice matches the list from school, home, or tutoring.",
      ],
      [
        "How do I replay missed words?",
        "After a round ends, choose the missed-word replay option to practice only the words that need more work.",
      ],
    ],
  },
  es: {
    html: "es",
    dir: "es",
    language: "Idioma",
    home: "Inicio",
    teacher: "Para docentes",
    title: "Preguntas frecuentes | My Spelling Game",
    heading: "Preguntas frecuentes",
    intro:
      "Respuestas sobre listas, modos de práctica, enlaces, cuentas y tareas docentes.",
    questions: [
      [
        "¿Puedo usar mis propias palabras?",
        "Sí. Pega la lista de la semana y el juego usará esas palabras en la prueba de spelling o Typing Rain.",
      ],
      [
        "¿Qué diferencia hay entre los dos modos?",
        "La prueba lee una palabra oculta y comprueba la respuesta. Typing Rain muestra palabras que caen y hay que escribirlas antes de que lleguen abajo.",
      ],
      [
        "¿Puedo practicar solo las palabras falladas?",
        "Sí. Al terminar puedes iniciar una ronda centrada únicamente en las palabras falladas.",
      ],
      [
        "¿Los alumnos necesitan una cuenta?",
        "No. La práctica funciona en el navegador sin iniciar sesión. Las cuentas docentes sirven para tareas e informes.",
      ],
      [
        "¿Puedo compartir una lista?",
        "Sí. Copia el enlace de práctica y los alumnos abrirán la misma lista sin crear una cuenta.",
      ],
      [
        "¿Las suscripciones se renuevan?",
        "Sí. Un plan docente de pago se renueva automáticamente hasta que se cancela desde el portal de facturación.",
      ],
      [
        "¿Cómo practico la lista de spelling de esta semana?",
        "Pega las palabras en la página de inicio, elige la prueba de spelling o Typing Rain y empieza al momento.",
      ],
      [
        "¿Puedo usar una lista personalizada en vez de palabras fijas?",
        "Sí. El juego utiliza solo las palabras que pegas, para que la práctica coincida con la lista de clase, casa o tutoría.",
      ],
      [
        "¿Cómo repaso las palabras falladas?",
        "Cuando termina una ronda, elige la opción de repetir fallos para practicar solo las palabras que necesitan más trabajo.",
      ],
    ],
  },
  "pt-br": {
    html: "pt-BR",
    dir: "pt-br",
    language: "Idioma",
    home: "Início",
    teacher: "Para professores",
    title: "Perguntas frequentes | My Spelling Game",
    heading: "Perguntas frequentes",
    intro:
      "Respostas sobre listas, modos de prática, links, contas e tarefas para professores.",
    questions: [
      [
        "Posso usar minhas próprias palavras?",
        "Sim. Cole a lista da semana e o jogo usará essas palavras no teste de spelling ou no Typing Rain.",
      ],
      [
        "Qual é a diferença entre os modos?",
        "O teste lê uma palavra escondida e confere a resposta. O Typing Rain mostra palavras caindo para serem digitadas antes do fim.",
      ],
      [
        "Posso praticar só as palavras erradas?",
        "Sim. Ao terminar, você pode iniciar uma rodada focada nas palavras erradas.",
      ],
      [
        "Os alunos precisam de conta?",
        "Não. A prática funciona no navegador sem login. Contas de professor servem para tarefas e relatórios.",
      ],
      [
        "Posso compartilhar uma lista?",
        "Sim. Copie o link de prática e os alunos abrirão a mesma lista sem criar uma conta.",
      ],
      [
        "As assinaturas são recorrentes?",
        "Sim. Um plano pago é renovado automaticamente até ser cancelado no portal de cobrança.",
      ],
      [
        "Como pratico a lista de spelling da semana?",
        "Cole as palavras na página inicial, escolha o teste de spelling ou o Typing Rain e comece na hora.",
      ],
      [
        "Posso usar uma lista personalizada em vez de palavras fixas?",
        "Sim. O jogo usa apenas as palavras coladas, acompanhando a lista da escola, de casa ou da tutoria.",
      ],
      [
        "Como repasso as palavras erradas?",
        "Quando a rodada termina, escolha a opção de repetir erros para praticar apenas as palavras que precisam de mais atenção.",
      ],
    ],
  },
  fr: {
    html: "fr",
    dir: "fr",
    language: "Langue",
    home: "Accueil",
    teacher: "Espace enseignant",
    title: "Questions fréquentes | My Spelling Game",
    heading: "Questions fréquentes",
    intro:
      "Réponses sur les listes, les modes de pratique, les liens, les comptes et les devoirs.",
    questions: [
      [
        "Puis-je utiliser mes propres mots ?",
        "Oui. Collez la liste de la semaine et le jeu utilise ces mots dans le test audio ou Typing Rain.",
      ],
      [
        "Quelle est la différence entre les modes ?",
        "Le test audio lit un mot caché et vérifie la réponse. Typing Rain affiche des mots qui tombent à taper avant la fin.",
      ],
      [
        "Puis-je reprendre seulement les mots manqués ?",
        "Oui. À la fin, lancez une partie ciblée avec les mots manqués.",
      ],
      [
        "Les élèves doivent-ils créer un compte ?",
        "Non. La pratique fonctionne sans connexion. Les comptes enseignants servent aux devoirs et rapports.",
      ],
      [
        "Puis-je partager une liste ?",
        "Oui. Copiez le lien de pratique pour ouvrir la même liste sans compte.",
      ],
      [
        "Les abonnements sont-ils récurrents ?",
        "Oui. Une offre payante se renouvelle jusqu’à son annulation dans le portail de facturation.",
      ],
      [
        "Comment pratiquer la liste de mots de la semaine ?",
        "Collez les mots sur la page d’accueil, choisissez le test audio ou Typing Rain, puis commencez immédiatement.",
      ],
      [
        "Puis-je utiliser une liste personnalisée plutôt qu’une liste fixe ?",
        "Oui. Le jeu utilise uniquement les mots collés, selon la liste de l’école, de la maison ou du soutien scolaire.",
      ],
      [
        "Comment reprendre les mots manqués ?",
        "À la fin d’une partie, choisissez la reprise des mots manqués pour vous concentrer sur ceux qui demandent encore du travail.",
      ],
    ],
  },
  id: {
    html: "id",
    dir: "id",
    language: "Bahasa",
    home: "Beranda",
    teacher: "Untuk guru",
    title: "Pertanyaan umum | My Spelling Game",
    heading: "Pertanyaan umum",
    intro:
      "Jawaban tentang daftar kata, mode latihan, link, akun, dan tugas guru.",
    questions: [
      [
        "Bisa memakai kata sendiri?",
        "Bisa. Tempel daftar minggu ini dan game memakai kata itu dalam Spelling Test atau Typing Rain.",
      ],
      [
        "Apa beda kedua mode?",
        "Spelling Test membacakan kata tersembunyi. Typing Rain menampilkan kata jatuh untuk diketik sebelum mencapai bawah.",
      ],
      [
        "Bisa mengulang hanya kata yang salah?",
        "Bisa. Setelah selesai, mulai ronde khusus untuk kata yang terlewat.",
      ],
      [
        "Apakah siswa perlu akun?",
        "Tidak. Latihan berjalan di browser tanpa login. Akun guru diperlukan untuk tugas dan laporan.",
      ],
      [
        "Bisa membagikan daftar?",
        "Bisa. Salin link latihan agar siswa membuka daftar yang sama tanpa akun.",
      ],
      [
        "Apakah langganan diperpanjang otomatis?",
        "Ya. Paket berbayar diperpanjang sampai dibatalkan melalui portal penagihan.",
      ],
      [
        "Bagaimana cara berlatih dengan daftar kata minggu ini?",
        "Tempel kata-kata di halaman utama, pilih Spelling Test atau Typing Rain, lalu mulai segera.",
      ],
      [
        "Bisa memakai daftar sendiri, bukan kata-kata tetap?",
        "Bisa. Game hanya memakai kata yang Anda tempel, sesuai daftar dari sekolah, rumah, atau les.",
      ],
      [
        "Bagaimana mengulang kata yang salah?",
        "Setelah ronde selesai, pilih opsi pengulangan kata salah untuk berlatih hanya pada kata yang masih sulit.",
      ],
    ],
  },
  zh: {
    html: "zh-CN",
    dir: "zh",
    language: "语言",
    home: "首页",
    teacher: "教师工作台",
    title: "常见问题 | My Spelling Game",
    heading: "常见问题",
    intro: "集中说明单词表、练习模式、分享链接、账号和教师作业功能。",
    questions: [
      [
        "可以使用自己的单词吗？",
        "可以。粘贴本周单词表后，拼写测试和单词雨都会使用这些单词。",
      ],
      [
        "两种模式有什么区别？",
        "拼写测试会读出隐藏单词并检查答案；单词雨会显示下落单词，需要在它们落到底部前输入。",
      ],
      [
        "可以只重练错词吗？",
        "可以。练习结束后，可以只用错词开始一轮针对性重练。",
      ],
      [
        "学生需要注册账号吗？",
        "不需要。学生直接在浏览器中练习即可，教师账号只用于发布作业和查看报告。",
      ],
      [
        "可以把单词表分享给学生吗？",
        "可以。复制练习链接，学生无需创建账号就能打开同一份单词表。",
      ],
      [
        "订阅会自动续费吗？",
        "会。付费教师方案会自动续费，直到在账单门户中取消。",
      ],
      [
        "如何练习本周单词表？",
        "在主页粘贴本周单词，选择拼写测试或单词雨，然后立即开始练习。",
      ],
      [
        "可以使用自定义单词，而不是固定词库吗？",
        "可以。游戏只使用你粘贴的单词，适合学校、家庭或辅导课程的实际单词表。",
      ],
      [
        "如何重练错词？",
        "一轮练习结束后，选择错词重练，只练习还需要加强的单词。",
      ],
    ],
  },
};

const all = Object.entries(locales).map(([code, item]) => ({ code, ...item }));
const labels = {
  en: "English",
  es: "Español",
  "pt-br": "Português",
  fr: "Français",
  id: "Bahasa Indonesia",
  zh: "中文",
};
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
  "pt-br": [
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
  "pt-br": "Todos os direitos reservados.",
  fr: "Tous droits réservés.",
  id: "Hak cipta dilindungi.",
  zh: "版权所有。",
};
function pagePath(item) {
  return `${item.dir ? `/${item.dir}` : ""}/faq`;
}
function homePath(item) {
  return item.dir ? `/${item.dir}/` : "/";
}
function escape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

const legacyTermTranslations = {
  en: [],
  es: [
    [/Typing Rain/gi, "lluvia de palabras"],
    [/Spelling Test/gi, "prueba de ortografía"],
    [/ESL/gi, "aprendizaje de inglés"],
    [/(?<!My )spelling(?! Game)/gi, "ortografía"],
    [/login/gi, "cuenta"],
  ],
  "pt-br": [
    [/Typing Rain/gi, "chuva de palavras"],
    [/Spelling Test/gi, "teste de ortografia"],
    [/ESL/gi, "aprendizagem de inglês"],
    [/(?<!My )spelling(?! Game)/gi, "ortografia"],
    [/login/gi, "conta"],
  ],
  fr: [
    [/Typing Rain/gi, "pluie de mots"],
    [/Spelling Test/gi, "test d’orthographe"],
    [/ESL/gi, "apprentissage de l’anglais"],
    [/(?<!My )spelling(?! Game)/gi, "orthographe"],
    [/login/gi, "connexion"],
  ],
  id: [
    [/Typing Rain/gi, "hujan kata"],
    [/Spelling Test/gi, "tes ejaan"],
    [/ESL/gi, "pembelajaran bahasa Inggris"],
    [/(?<!My )spelling(?! Game)/gi, "ejaan"],
    [/login/gi, "akun"],
  ],
  zh: [
    [/Typing Rain/gi, "单词雨"],
    [/Spelling Test/gi, "听写测试"],
    [/ESL/gi, "英语学习"],
    [/(?<!My )spelling(?! Game)/gi, "拼写"],
    [/login/gi, "账号"],
  ],
};

function localizeTerms(value, code) {
  return (legacyTermTranslations[code] || []).reduce(
    (text, [pattern, replacement]) =>
      String(text).replace(pattern, replacement),
    String(value),
  );
}

function render(code, item) {
  const languageLinks = all
    .map(
      (alt) =>
        `<a class="lang-option" href="${pagePath(alt)}" hreflang="${alt.html}"${alt.code === code ? ' aria-current="page"' : ""}>${labels[alt.code]}</a>`,
    )
    .join("");
  const alternates = all
    .map(
      (alt) =>
        `    <link rel="alternate" hreflang="${alt.html}" href="${baseUrl}${pagePath(alt)}">`,
    )
    .join("\n");
  const questions = item.questions
    .map(
      ([question, answer]) =>
        `            <details class="faq-item"><summary>${escape(localizeTerms(question, code))}</summary><p>${escape(localizeTerms(answer, code))}</p></details>`,
    )
    .join("\n");
  const entities = item.questions.map(([question, answer]) => ({
    "@type": "Question",
    name: localizeTerms(question, code),
    acceptedAnswer: { "@type": "Answer", text: localizeTerms(answer, code) },
  }));
  const home = homePath(item);
  return `<!doctype html>\n<html lang="${item.html}">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${escape(item.title)}</title>\n    <meta name="description" content="${escape(item.intro)}">\n    <meta name="robots" content="index, follow">\n    <link rel="canonical" href="${baseUrl}${pagePath(item)}">\n${alternates}\n    <link rel="alternate" hreflang="x-default" href="${baseUrl}/faq">\n    <link rel="icon" href="/favicon.ico" sizes="any">\n    <link rel="stylesheet" href="/src/css/main.css">\n</head>\n<body>\n    <header class="top-right-nav">\n        <a class="brand-link" href="${home}" aria-label="My Spelling Game home"><img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt=""><span class="brand-name">My Spelling Game</span></a>\n        <details class="language-switcher"><summary class="lang-btn" aria-label="${escape(item.language)}">${escape(item.language)}</summary><div class="lang-menu">${languageLinks}</div></details>\n        <a class="teacher-nav-link" href="/teacher?lang=${code}">${escape(item.teacher)}</a>\n        <a class="lang-btn" href="${home}">${escape(item.home)}</a>\n    </header>\n    <main class="seo-landing content-page faq-page">\n        <section class="seo-hero"><h1>${escape(item.heading)}</h1><p>${escape(item.intro)}</p></section>\n        <section class="faq-list" aria-label="${escape(item.heading)}">\n${questions}\n        </section>\n    </main>\n    <footer><p><span class="footer-links"><a href="${home}">${escape(item.home)}</a> &middot; <a href="${home}custom-spelling-words-game">Custom Spelling Game</a> &middot; <a href="${pagePath(item)}">${escape(item.heading)}</a> &middot; <a href="${home}privacy">Privacy</a> &middot; <a href="${home}contact">Contact</a></span><br>&copy; 2026 My Spelling Game All rights reserved.</p></footer>\n    <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", name: item.title, url: `${baseUrl}${pagePath(item)}`, inLanguage: item.html, mainEntity: entities })}</script>\n</body>\n</html>\n`;
}

for (const [code, item] of Object.entries(locales)) {
  const directory = path.join(root, item.dir);
  fs.mkdirSync(directory, { recursive: true });
  const analytics =
    "<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-VYF1V40KVS\"></script><script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-VYF1V40KVS', { page_location: window.location.origin + window.location.pathname, page_path: window.location.pathname });</script>";
  const links = [
    `            <a href="${homePath(item)}sight-word-typing-game">${footerLinks[code][0]}</a>`,
    `            <a href="${homePath(item)}homeschool-spelling-practice">${footerLinks[code][1]}</a>`,
    `            <a href="${homePath(item)}vocabulary-typing-game">${footerLinks[code][2]}</a>`,
    `            <a href="${pagePath(item)}">${footerLinks[code][3]}</a>`,
    `            <a href="${homePath(item)}privacy">${footerLinks[code][4]}</a>`,
    `            <a href="${homePath(item)}about">${footerLinks[code][5]}</a>`,
    `            <a href="${homePath(item)}contact">${footerLinks[code][6]}</a>`,
  ].join(" &middot; ");
  const footer = `    <footer>\n        <p>\n            <span class="footer-links">${links}</span><br>\n            &copy; 2026 My Spelling Game ${footerRights[code]}\n        </p>\n    </footer>`;
  const html = render(code, item)
    .replace(/\s{4}<footer>[\s\S]*?<\/footer>/, footer)
    .replace("</head>", `${analytics}\n    </head>`)
    .replace(
      "</body>",
      '    <script type="module" src="/src/js/analytics.mjs"></script>\n</body>',
    );
  fs.writeFileSync(path.join(directory, "faq.html"), html, "utf8");
}
console.log("Generated localized FAQ pages");
