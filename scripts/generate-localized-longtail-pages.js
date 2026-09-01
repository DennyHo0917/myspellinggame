const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const baseUrl = "https://myspellinggame.com";
const ogImage = `${baseUrl}/images/my-spelling-game-og.png`;

const languages = [
  {
    code: "en",
    htmlLang: "en",
    hreflang: "en",
    label: "English",
    dir: "",
    nav: "Language",
    home: "Home",
    privacy: "Privacy",
    about: "About",
    contact: "Contact",
  },
  {
    code: "es",
    htmlLang: "es",
    hreflang: "es",
    label: "Español",
    dir: "es",
    nav: "Idioma",
    home: "Inicio",
    privacy: "Privacidad",
    about: "Acerca de",
    contact: "Contacto",
  },
  {
    code: "pt-BR",
    htmlLang: "pt-BR",
    hreflang: "pt-BR",
    label: "Português",
    dir: "pt-br",
    nav: "Idioma",
    home: "Início",
    privacy: "Privacidade",
    about: "Sobre",
    contact: "Contato",
  },
  {
    code: "fr",
    htmlLang: "fr",
    hreflang: "fr",
    label: "Français",
    dir: "fr",
    nav: "Langue",
    home: "Accueil",
    privacy: "Confidentialité",
    about: "À propos",
    contact: "Contact",
  },
  {
    code: "id",
    htmlLang: "id",
    hreflang: "id",
    label: "Bahasa Indonesia",
    dir: "id",
    nav: "Bahasa",
    home: "Beranda",
    privacy: "Privasi",
    about: "Tentang",
    contact: "Kontak",
  },
  {
    code: "zh",
    htmlLang: "zh-CN",
    hreflang: "zh-CN",
    label: "中文",
    dir: "zh",
    nav: "语言",
    home: "首页",
    privacy: "隐私",
    about: "关于",
    contact: "联系",
  },
];

const seoSlugs = [
  "custom-spelling-words-game",
  "sight-word-typing-game",
  "spelling-practice-for-parents",
  "weekly-spelling-practice",
];
const footerSlugs = [
  "custom-spelling-words-game",
  "weekly-spelling-practice",
  "sight-word-typing-game",
  "spelling-practice-for-parents",
  "spelling-assignments-for-teachers",
];
const footerSecondarySlugs = ["pricing", "faq", "privacy", "about", "contact"];
const newLongtailSlugs = [
  "custom-spelling-words-game",
  "sight-word-typing-game",
  "spelling-assignments-for-teachers",
  "spelling-practice-for-parents",
  "weekly-spelling-practice",
];
const existingLocalizedSlugs = [];
const legalSlugs = ["about", "contact", "privacy"];
const faqLabels = {
  en: "FAQ",
  es: "Preguntas frecuentes",
  "pt-BR": "Perguntas frequentes",
  fr: "Questions fréquentes",
  id: "Pertanyaan umum",
  zh: "常见问题",
};

const labels = {
  en: {
    related: "Related Practice Pages",
    continuePractice: "Keep practicing",
    faq: "Quick FAQ",
    start: "Start Practice",
    links: {
      "custom-spelling-words-game": "Custom Spelling Words Game",
      "spelling-practice-for-parents": "Spelling Practice for Parents",
      "spelling-list-game": "Spelling List Game",
      "weekly-spelling-practice": "Weekly Spelling Practice",
      "homeschool-spelling-practice": "Homeschool Spelling Practice",
      "sight-word-typing-game": "Sight Word Typing Game",
      "vocabulary-typing-game": "Vocabulary Typing Game",
    },
  },
  es: {
    related: "Páginas de práctica relacionadas",
    continuePractice: "Sigue practicando",
    faq: "Preguntas rápidas",
    start: "Empezar práctica",
    links: {
      "custom-spelling-words-game": "Juego con tus palabras",
      "spelling-practice-for-parents": "Práctica para familias",
      "spelling-list-game": "Juego con lista de spelling",
      "weekly-spelling-practice": "Práctica semanal",
      "homeschool-spelling-practice": "Spelling para educación en casa",
      "sight-word-typing-game": "Práctica de sight words",
      "vocabulary-typing-game": "Juego de vocabulario",
    },
  },
  "pt-BR": {
    related: "Páginas de prática relacionadas",
    continuePractice: "Continue praticando",
    faq: "Perguntas rápidas",
    start: "Começar prática",
    links: {
      "custom-spelling-words-game": "Jogo com suas palavras",
      "spelling-practice-for-parents": "Prática para pais",
      "spelling-list-game": "Jogo com lista de palavras",
      "weekly-spelling-practice": "Prática semanal",
      "homeschool-spelling-practice": "Spelling para homeschool",
      "sight-word-typing-game": "Prática de sight words",
      "vocabulary-typing-game": "Jogo de vocabulário",
    },
  },
  fr: {
    related: "Pages de pratique liées",
    continuePractice: "Continuez à pratiquer",
    faq: "Questions rapides",
    start: "Commencer",
    links: {
      "custom-spelling-words-game": "Jeu avec vos mots",
      "spelling-practice-for-parents": "Exercices pour les parents",
      "spelling-list-game": "Jeu avec liste de mots",
      "weekly-spelling-practice": "Pratique hebdomadaire",
      "homeschool-spelling-practice": "Orthographe anglaise à la maison",
      "sight-word-typing-game": "Pratique des sight words",
      "vocabulary-typing-game": "Jeu de vocabulaire",
    },
  },
  id: {
    related: "Halaman latihan terkait",
    continuePractice: "Lanjut berlatih",
    faq: "Pertanyaan singkat",
    start: "Mulai latihan",
    links: {
      "custom-spelling-words-game": "Game dengan kata sendiri",
      "spelling-practice-for-parents": "Latihan untuk orang tua",
      "spelling-list-game": "Game daftar kata",
      "weekly-spelling-practice": "Latihan mingguan",
      "homeschool-spelling-practice": "Latihan spelling di rumah",
      "sight-word-typing-game": "Latihan sight words",
      "vocabulary-typing-game": "Game kosakata",
    },
  },
  zh: {
    related: "相关练习页面",
    continuePractice: "继续练习",
    faq: "常见问题",
    start: "开始练习",
    links: {
      "custom-spelling-words-game": "自定义单词拼写游戏",
      "spelling-practice-for-parents": "家长英语拼写练习",
      "spelling-list-game": "单词表拼写游戏",
      "weekly-spelling-practice": "每周拼写练习",
      "homeschool-spelling-practice": "家庭英语拼写练习",
      "sight-word-typing-game": "Sight Words 打字练习",
      "vocabulary-typing-game": "英语词汇打字游戏",
    },
  },
};

const footerLinks = {
  en: {
    "custom-spelling-words-game": "Custom Words",
    "weekly-spelling-practice": "Weekly Practice",
    "sight-word-typing-game": "Sight Words",
    "spelling-practice-for-parents": "For Parents",
    "spelling-assignments-for-teachers": "For Teachers",
  },
  es: {
    "custom-spelling-words-game": "Palabras personalizadas",
    "weekly-spelling-practice": "Práctica semanal",
    "sight-word-typing-game": "Palabras frecuentes",
    "spelling-practice-for-parents": "Para familias",
    "spelling-assignments-for-teachers": "Para docentes",
  },
  "pt-BR": {
    "custom-spelling-words-game": "Palavras personalizadas",
    "weekly-spelling-practice": "Prática semanal",
    "sight-word-typing-game": "Palavras frequentes",
    "spelling-practice-for-parents": "Para pais",
    "spelling-assignments-for-teachers": "Para professores",
  },
  fr: {
    "custom-spelling-words-game": "Mots personnalisés",
    "weekly-spelling-practice": "Pratique hebdomadaire",
    "sight-word-typing-game": "Mots fréquents",
    "spelling-practice-for-parents": "Pour les parents",
    "spelling-assignments-for-teachers": "Pour les enseignants",
  },
  id: {
    "custom-spelling-words-game": "Kata kustom",
    "weekly-spelling-practice": "Latihan mingguan",
    "sight-word-typing-game": "Kata umum",
    "spelling-practice-for-parents": "Untuk orang tua",
    "spelling-assignments-for-teachers": "Untuk guru",
  },
  zh: {
    "custom-spelling-words-game": "自定义单词",
    "weekly-spelling-practice": "每周练习",
    "sight-word-typing-game": "高频词",
    "spelling-practice-for-parents": "家长练习",
    "spelling-assignments-for-teachers": "教师作业",
  },
};
const footerSecondaryLinks = {
  en: { pricing: "Pricing", faq: "FAQ", privacy: "Privacy", about: "About", contact: "Contact" },
  es: { pricing: "Precios", faq: "Preguntas frecuentes", privacy: "Privacidad", about: "Acerca de", contact: "Contacto" },
  "pt-BR": { pricing: "Preços", faq: "Perguntas frequentes", privacy: "Privacidade", about: "Sobre", contact: "Contato" },
  fr: { pricing: "Tarifs", faq: "Questions fréquentes", privacy: "Confidentialité", about: "À propos", contact: "Contact" },
  id: { pricing: "Harga", faq: "Pertanyaan umum", privacy: "Privasi", about: "Tentang", contact: "Kontak" },
  zh: { pricing: "价格", faq: "常见问题", privacy: "隐私", about: "关于", contact: "联系" },
};
const footerRights = {
  en: "All rights reserved.",
  es: "Todos los derechos reservados.",
  "pt-BR": "Todos os direitos reservados.",
  fr: "Tous droits réservés.",
  id: "Hak cipta dilindungi.",
  zh: "版权所有。",
};

const legacyTermTranslations = {
  en: [],
  es: [
    [/Typing Rain/gi, "lluvia de palabras"],
    [/Spelling Test/gi, "prueba de ortografía"],
    [/ESL/gi, "aprendizaje de inglés"],
    [/homeschool/gi, "educación en casa"],
    [/no-login/gi, "sin cuenta"],
    [/login/gi, "inicio de sesión"],
    [/(?<!My )spelling(?! Game)/gi, "ortografía"],
    [/Advertisement/g, "Publicidad"],
  ],
  "pt-BR": [
    [/Typing Rain/gi, "chuva de palavras"],
    [/Spelling Test/gi, "teste de ortografia"],
    [/ESL/gi, "aprendizagem de inglês"],
    [/homeschool/gi, "educação em casa"],
    [/no-login/gi, "sem conta"],
    [/login/gi, "conta"],
    [/(?<!My )spelling(?! Game)/gi, "ortografia"],
    [/Advertisement/g, "Anúncio"],
  ],
  fr: [
    [/Typing Rain/gi, "pluie de mots"],
    [/Spelling Test/gi, "test d’orthographe"],
    [/ESL/gi, "apprentissage de l’anglais"],
    [/homeschool/gi, "école à la maison"],
    [/no-login/gi, "sans compte"],
    [/login/gi, "connexion"],
    [/(?<!My )spelling(?! Game)/gi, "orthographe"],
    [/Advertisement/g, "Publicité"],
  ],
  id: [
    [/Typing Rain/gi, "hujan kata"],
    [/Spelling Test/gi, "tes ejaan"],
    [/ESL/gi, "pembelajaran bahasa Inggris"],
    [/homeschool/gi, "belajar di rumah"],
    [/no-login/gi, "tanpa akun"],
    [/login/gi, "akun"],
    [/(?<!My )spelling(?! Game)/gi, "ejaan"],
    [/Advertisement/g, "Iklan"],
  ],
  zh: [
    [/Typing Rain/gi, "单词雨"],
    [/Spelling Test/gi, "听写测试"],
    [/ESL/gi, "英语学习"],
    [/homeschool/gi, "家庭教育"],
    [/no-login/gi, "无需账号"],
    [/login/gi, "登录"],
    [/(?<!My )spelling(?! Game)/gi, "拼写"],
    [/Advertisement/g, "广告"],
  ],
};

function localizeLegacyTerms(value, langCode) {
  return (legacyTermTranslations[langCode] || []).reduce(
    (text, [pattern, replacement]) =>
      String(text).replace(pattern, replacement),
    String(value),
  );
}

const pages = {
  en: {
    "custom-spelling-words-game": {
      title:
        "Custom Spelling Words Game With Your Own Words | My Spelling Game",
      description:
        "Enter your own spelling words and start instantly. Create a custom spelling words game, replay missed words, and practice with no login.",
      ogDescription:
        "Enter your own spelling words and start a custom no-login game instantly.",
      h1: "Enter Your Own Spelling Words and Start Instantly",
      intro:
        "Paste custom spelling words below to launch a no-login Typing Rain game using only your own words.",
      panels: [
        [
          "Use Your Own Words, Not A Random Word Bank",
          "Paste homework words, a teacher list, vocabulary, or any custom spelling words. Every round uses the exact words you enter.",
        ],
        [
          "Custom Spelling Practice With No Login",
          "Enter your words, start instantly, and replay the words you miss. You can also share the same no-login practice link without setting up student accounts.",
        ],
      ],
      faq: [
        [
          "Can I make a spelling game with my own words?",
          "Yes. Paste your own spelling words and the game will use that list for the practice round.",
        ],
        [
          "Can teachers use it for a class spelling test?",
          "Yes. Paste the class list, run a quick round, and share the same no-login link with students.",
        ],
        [
          "Does it replay missed words?",
          "Yes. Missed words can be replayed so practice focuses on the words that still need work.",
        ],
      ],
    },
    "homeschool-spelling-practice": {
      title: "Homeschool Spelling Practice Lists | My Spelling Game",
      description:
        "Homeschool spelling practice with your own curriculum words. Paste a custom word list, run a quick spelling test, replay missed words, and reuse the link.",
      ogDescription:
        "Paste homeschool curriculum words, share a no-login link, and replay missed words.",
      h1: "Homeschool Spelling Practice With Custom Lists",
      intro:
        "Turn homeschool curriculum words or grade-level lists into a short spelling game that is easy to reuse each week.",
      panels: [
        [
          "Custom Lists For Homeschool Lessons",
          "Homeschool spelling work often follows a curriculum, workbook, or parent-made list. The game stays useful because it uses the exact words you paste.",
        ],
        [
          "Small Enough To Reuse Every Week",
          "No platform setup. Paste the lesson words, play a round, and use missed-word replay before the weekly spelling check.",
        ],
      ],
      faq: [
        [
          "Can I use homeschool curriculum words?",
          "Yes. Paste words from a curriculum, workbook, or parent-made list.",
        ],
        [
          "Can I run a spelling test with my own words?",
          "Yes. Start a short round with the exact words you entered.",
        ],
        [
          "Does it require a homeschool platform account?",
          "No. It works in the browser with a shareable no-login link.",
        ],
      ],
    },
    "sight-word-typing-game": {
      title: "Sight Word Typing Game With Your List | My Spelling Game",
      description:
        "Paste a teacher-provided sight word list and play a simple typing game. Great for classroom or home practice, missed-word replay, and no student login.",
      ogDescription:
        "Paste a custom sight word list and play a no-login typing game with missed-word replay.",
      h1: "Sight Word Typing Game With Your Own List",
      intro:
        "Paste the exact sight words your student is learning and turn them into a short typing round for class, home, or early-grade practice.",
      panels: [
        [
          "Good For Short Custom Word Lists",
          "Sight word practice works best when the list is small and repeated. Missed words can come back for another quick round.",
        ],
        [
          "Simple Classroom Or Home Use",
          "Use it for classroom centers, homework, homeschool reading practice, or a small Dolch-style or Fry-style list.",
        ],
      ],
      faq: [
        [
          "Can I use my own sight word list?",
          "Yes. Paste the sight words your student is practicing right now.",
        ],
        [
          "Is it good for classroom centers?",
          "Yes. Share the same no-login link for a short independent typing round.",
        ],
        [
          "Can students retry missed sight words?",
          "Yes. Missed words can be replayed after the round.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      title: "Vocabulary Typing Game With Your List | My Spelling Game",
      description:
        "Paste a vocabulary list for ESL, tutoring, test prep, or class practice. Students type your exact words, replay missed words, and use a no-login link.",
      ogDescription:
        "Paste an ESL, tutoring, or class vocabulary list and replay missed words with no login.",
      h1: "Vocabulary Typing Game With Your Own Word List",
      intro:
        "Use your own vocabulary list for ESL, tutoring, test prep, or classroom review, then replay the words students miss.",
      panels: [
        [
          "Use Your Own Vocabulary Word List",
          "Vocabulary practice is more useful when it matches the current lesson. Paste academic words, science terms, ESL words, or test prep vocabulary.",
        ],
        [
          "Good For Repeated Practice",
          "The same link can be reused for short tutoring sessions, class review, or focused missed-word practice.",
        ],
      ],
      faq: [
        [
          "Can I paste my own vocabulary list?",
          "Yes. Paste ESL, tutoring, class, or test prep vocabulary and play immediately.",
        ],
        [
          "Do students need an account?",
          "No. The practice link works without student login.",
        ],
        [
          "Can students repeat missed vocabulary words?",
          "Yes. Missed words can be replayed for focused review.",
        ],
      ],
    },
  },
  es: {
    "custom-spelling-words-game": {
      title: "Juego de Ortografía con Tus Propias Palabras | My Spelling Game",
      description:
        "Escribe tus propias palabras de ortografía y empieza al instante. Crea un juego personalizado, repite los fallos y practica sin iniciar sesión.",
      ogDescription:
        "Escribe tus propias palabras y empieza un juego personalizado sin cuenta.",
      h1: "Escribe tus propias palabras y empieza al instante",
      intro:
        "Pega tus palabras de ortografía personalizadas y abre una lluvia de palabras sin cuenta que use solo tu lista.",
      panels: [
        [
          "Tus propias palabras, no una lista aleatoria",
          "Pega palabras de tarea, una lista del profesor, vocabulario o cualquier lista personalizada. Cada ronda usa exactamente lo que escribes.",
        ],
        [
          "Práctica personalizada sin iniciar sesión",
          "Escribe las palabras, empieza al instante y repite las que falles. También puedes compartir el mismo enlace sin crear cuentas de estudiante.",
        ],
      ],
      faq: [
        [
          "¿Puedo usar mis propias palabras?",
          "Sí. Pega tu lista y el juego usará solo esas palabras.",
        ],
        [
          "¿Sirve para una prueba de spelling?",
          "Sí. Puedes usar una ronda corta como práctica antes de la prueba.",
        ],
        [
          "¿Los alumnos necesitan cuenta?",
          "No. El enlace de práctica se abre sin login.",
        ],
      ],
    },
    "homeschool-spelling-practice": {
      title: "Spelling en casa | My Spelling Game",
      description:
        "Practica spelling en casa con palabras del currículo, workbook o lista familiar. Pega la lista, juega una ronda y repite las falladas.",
      ogDescription:
        "Convierte tu lista de casa en práctica de spelling sin cuenta.",
      h1: "Práctica de spelling en casa",
      intro:
        "Usa las palabras del currículo, del workbook o de una lista creada en casa y conviértelas en una práctica semanal sencilla.",
      panels: [
        [
          "Listas hechas por la familia",
          "En casa la lista suele venir de un plan propio. Por eso el juego acepta cualquier lista y no impone palabras genéricas.",
        ],
        [
          "Una rutina corta",
          "Pega las palabras de la lección, juega una ronda y vuelve a practicar solo lo que salió mal antes de cerrar la semana.",
        ],
      ],
      faq: [
        [
          "¿Puedo usar palabras de mi currículo?",
          "Sí. Pega palabras de un currículo, workbook o lista hecha por la familia.",
        ],
        [
          "¿Sirve como prueba rápida?",
          "Sí. La ronda usa exactamente las palabras que pegaste.",
        ],
        [
          "¿Hace falta una plataforma educativa?",
          "No. Funciona en el navegador con un enlace sin cuenta.",
        ],
      ],
    },
    "sight-word-typing-game": {
      title: "Juego para practicar palabras frecuentes | My Spelling Game",
      description:
        "Pega una lista de palabras frecuentes en inglés y conviértela en una práctica corta de typing. Útil para clase, casa y repaso sin cuenta.",
      ogDescription:
        "Practica palabras frecuentes con una lista propia y repite las palabras falladas.",
      h1: "Juego para practicar palabras frecuentes",
      intro:
        "Pega las palabras frecuentes que el niño está trabajando ahora y conviértelas en una ronda corta de escritura.",
      panels: [
        [
          "Mejor con listas pequeñas",
          "Las palabras frecuentes suelen necesitar repetición breve. Una lista corta funciona mejor que una actividad larga.",
        ],
        [
          "Para clase, casa o lectura temprana",
          "Úsalo con listas tipo Dolch o Fry, palabras dadas por el profesor o una lista propia de lectura.",
        ],
      ],
      faq: [
        [
          "¿Puedo pegar mi propia lista de palabras frecuentes?",
          "Sí. Usa la lista que el estudiante está practicando ahora.",
        ],
        [
          "¿Sirve para centros de clase?",
          "Sí. Puedes compartir el mismo enlace sin crear cuentas.",
        ],
        [
          "¿Se repiten las palabras falladas?",
          "Sí. Las palabras falladas pueden volver en otra ronda.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      title: "Juego de vocabulario en inglés | My Spelling Game",
      description:
        "Pega vocabulario de inglés, ESL, tutoría o examen y practica escribiendo las palabras. Sin cuenta y con repaso de errores.",
      ogDescription:
        "Convierte una lista de vocabulario en inglés en un juego corto de typing.",
      h1: "Juego de vocabulario en inglés",
      intro:
        "Pega vocabulario de una clase, tutoría, examen o lección ESL y practica solo esas palabras.",
      panels: [
        [
          "Vocabulario de la lección actual",
          "La práctica funciona mejor cuando coincide con lo que el estudiante acaba de ver en clase o tutoría.",
        ],
        [
          "Repaso con intención",
          "Después de una ronda, las palabras falladas se pueden repetir para concentrar el esfuerzo donde hace falta.",
        ],
      ],
      faq: [
        [
          "¿Puedo pegar mi propia lista de vocabulario?",
          "Sí. Pega vocabulario de clase, ESL, tutoría o examen.",
        ],
        [
          "¿Hace falta cuenta?",
          "No. El enlace de práctica funciona sin login.",
        ],
        [
          "¿Sirve para repasar errores?",
          "Sí. Las palabras falladas se pueden repetir en otra ronda.",
        ],
      ],
    },
  },
  "pt-BR": {
    "custom-spelling-words-game": {
      title: "Jogo de Ortografia com Suas Próprias Palavras | My Spelling Game",
      description:
        "Digite suas próprias palavras de ortografia e comece na hora. Crie um jogo personalizado, revise os erros e pratique sem conta.",
      ogDescription:
        "Digite suas próprias palavras e comece um jogo personalizado sem conta.",
      h1: "Digite suas próprias palavras e comece na hora",
      intro:
        "Cole suas palavras de ortografia personalizadas e abra uma chuva de palavras sem conta que use somente a sua lista.",
      panels: [
        [
          "Suas palavras, não um banco aleatório",
          "Cole palavras da tarefa, uma lista do professor, vocabulário ou qualquer lista personalizada. Cada rodada usa exatamente o que você digitar.",
        ],
        [
          "Prática personalizada sem conta",
          "Digite as palavras, comece na hora e repita as que errar. Você também pode compartilhar o mesmo link sem criar contas de aluno.",
        ],
      ],
      faq: [
        [
          "Posso usar minhas próprias palavras?",
          "Sim. Cole sua lista e o jogo usa apenas essas palavras.",
        ],
        [
          "Serve para revisar antes da prova?",
          "Sim. A rodada curta ajuda a praticar a lista antes do teste.",
        ],
        ["Aluno precisa criar conta?", "Não. O link abre direto no navegador."],
      ],
    },
    "homeschool-spelling-practice": {
      title: "Spelling em casa em inglês | My Spelling Game",
      description:
        "Pratique spelling em casa com palavras do currículo, apostila ou lista da família. Cole a lista, jogue e revise os erros.",
      ogDescription:
        "Transforme palavras estudadas em casa em prática de spelling sem conta.",
      h1: "Prática de spelling em casa",
      intro:
        "Use palavras do currículo, de uma apostila ou de uma lista feita em casa para criar uma rotina simples de spelling.",
      panels: [
        [
          "A lista vem do seu plano",
          "No estudo em casa, a sequência de palavras nem sempre segue um banco pronto. Por isso a prática começa com a sua lista.",
        ],
        [
          "Rotina de poucos minutos",
          "Cole as palavras da semana, jogue uma rodada e revise só o que ficou difícil.",
        ],
      ],
      faq: [
        [
          "Posso usar palavras do currículo?",
          "Sim. Cole palavras do currículo, apostila ou lista criada pela família.",
        ],
        [
          "Dá para fazer um teste rápido?",
          "Sim. A rodada usa exatamente as palavras coladas.",
        ],
        [
          "Precisa de uma plataforma escolar?",
          "Não. Funciona no navegador com link sem conta.",
        ],
      ],
    },
    "sight-word-typing-game": {
      title: "Jogo para praticar palavras frequentes | My Spelling Game",
      description:
        "Cole uma lista de palavras frequentes em inglês e pratique digitando. Útil para escola, casa e leitura inicial, sem login de aluno.",
      ogDescription:
        "Pratique palavras frequentes com lista própria e revisão de erros.",
      h1: "Jogo para praticar palavras frequentes",
      intro:
        "Cole as palavras frequentes que a criança está aprendendo agora e transforme a lista em uma rodada curta de digitação.",
      panels: [
        [
          "Listas curtas funcionam melhor",
          "Palavras frequentes pedem repetição frequente. Uma rodada curta ajuda sem cansar.",
        ],
        [
          "Para aula ou casa",
          "Use com listas do professor, listas Dolch/Fry ou palavras de leitura inicial.",
        ],
      ],
      faq: [
        [
          "Posso usar minha lista de palavras frequentes?",
          "Sim. Cole a lista que a criança está praticando.",
        ],
        [
          "Serve para atividade independente?",
          "Sim. Compartilhe o mesmo link sem criar contas.",
        ],
        [
          "Dá para repetir os erros?",
          "Sim. Palavras erradas podem voltar em outra rodada.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      title: "Jogo de vocabulário em inglês | My Spelling Game",
      description:
        "Cole vocabulário de inglês, ESL, reforço ou prova e pratique digitando. Sem conta, com revisão das palavras erradas.",
      ogDescription:
        "Transforme uma lista de vocabulário em inglês em jogo curto de digitação.",
      h1: "Jogo de vocabulário em inglês",
      intro:
        "Cole palavras de uma aula, prova, reforço ou lição de ESL e pratique exatamente esse vocabulário.",
      panels: [
        [
          "Vocabulário da aula atual",
          "A prática fica mais útil quando acompanha o conteúdo que o aluno acabou de estudar.",
        ],
        [
          "Revisão focada",
          "Depois da rodada, as palavras erradas podem ser repetidas para concentrar o estudo.",
        ],
      ],
      faq: [
        [
          "Posso colar minha lista de vocabulário?",
          "Sim. Use vocabulário de aula, ESL, reforço ou prova.",
        ],
        ["Precisa criar conta?", "Não. O link de prática funciona sem login."],
        [
          "Dá para revisar palavras erradas?",
          "Sim. As palavras erradas podem ser repetidas em outra rodada.",
        ],
      ],
    },
  },
  fr: {
    "custom-spelling-words-game": {
      title: "Jeu d’Orthographe avec Vos Propres Mots | My Spelling Game",
      description:
        "Saisissez vos propres mots d’orthographe et commencez tout de suite. Créez un jeu personnalisé, révisez les erreurs et pratiquez sans compte.",
      ogDescription:
        "Saisissez vos propres mots et lancez immédiatement un jeu personnalisé sans compte.",
      h1: "Saisissez vos propres mots et commencez tout de suite",
      intro:
        "Collez vos mots d’orthographe personnalisés et lancez une pluie de mots sans compte qui utilise uniquement votre liste.",
      panels: [
        [
          "Vos mots, pas une liste aléatoire",
          "Collez les mots d’un devoir, une liste du professeur, du vocabulaire ou toute autre liste personnalisée. Chaque partie utilise exactement ces mots.",
        ],
        [
          "Pratique personnalisée sans compte",
          "Saisissez les mots, commencez tout de suite et reprenez ceux qui posent problème. Le même lien se partage sans créer de comptes élèves.",
        ],
      ],
      faq: [
        [
          "Puis-je utiliser mes propres mots ?",
          "Oui. Collez votre liste et le jeu utilisera seulement ces mots.",
        ],
        [
          "Est-ce utile avant un contrôle ?",
          "Oui. Une partie courte peut servir de révision juste avant le contrôle.",
        ],
        [
          "Faut-il créer un compte ?",
          "Non. Le lien s’ouvre directement dans le navigateur.",
        ],
      ],
    },
    "homeschool-spelling-practice": {
      title: "Orthographe anglaise à la maison | My Spelling Game",
      description:
        "Pratiquez l’orthographe anglaise à la maison avec les mots du programme, du cahier ou d’une liste familiale.",
      ogDescription:
        "Transformez une liste maison en pratique d’orthographe anglaise sans compte.",
      h1: "Pratique d’orthographe anglaise à la maison",
      intro:
        "Utilisez les mots d’un programme, d’un cahier ou d’une liste familiale pour créer une pratique simple chaque semaine.",
      panels: [
        [
          "Une liste qui suit votre rythme",
          "À la maison, la progression ne suit pas toujours une banque de mots prête à l’emploi. Ici, la pratique commence avec votre liste.",
        ],
        [
          "Quelques minutes suffisent",
          "Collez les mots, jouez une partie courte et reprenez seulement les mots manqués.",
        ],
      ],
      faq: [
        [
          "Puis-je utiliser les mots de mon programme ?",
          "Oui. Collez les mots d’un programme, d’un cahier ou d’une liste familiale.",
        ],
        [
          "Peut-on faire un petit test ?",
          "Oui. La partie utilise exactement les mots collés.",
        ],
        [
          "Faut-il une plateforme spécialisée ?",
          "Non. Tout fonctionne dans le navigateur avec un lien sans compte.",
        ],
      ],
    },
    "sight-word-typing-game": {
      title: "Jeu pour pratiquer les mots fréquents | My Spelling Game",
      description:
        "Collez une liste de mots fréquents en anglais et lancez une courte pratique de frappe. Utile en classe, à la maison et sans compte.",
      ogDescription:
        "Pratiquez les mots fréquents avec une liste personnalisée et révisez les mots manqués.",
      h1: "Jeu pour pratiquer les mots fréquents",
      intro:
        "Collez les mots fréquents que l’enfant apprend en ce moment et transformez-les en courte partie de frappe.",
      panels: [
        [
          "Mieux avec une petite liste",
          "Les mots fréquents demandent des répétitions courtes et fréquentes. Une partie brève suffit souvent.",
        ],
        [
          "Pour la classe ou la maison",
          "Utilisez une liste du professeur, une liste Dolch/Fry ou des mots de lecture débutante.",
        ],
      ],
      faq: [
        [
          "Puis-je coller ma liste de mots fréquents ?",
          "Oui. Utilisez la liste travaillée en ce moment.",
        ],
        [
          "Est-ce adapté aux ateliers en classe ?",
          "Oui. Partagez le même lien sans créer de comptes.",
        ],
        [
          "Peut-on refaire les mots manqués ?",
          "Oui. Les mots manqués peuvent revenir dans une autre partie.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      title: "Jeu de vocabulaire anglais | My Spelling Game",
      description:
        "Collez une liste de vocabulaire anglais, ESL, tutorat ou contrôle et pratiquez la frappe avec révision des erreurs.",
      ogDescription:
        "Transformez une liste de vocabulaire anglais en courte pratique de frappe.",
      h1: "Jeu de vocabulaire anglais",
      intro:
        "Collez le vocabulaire d’un cours, d’un contrôle, d’un tutorat ou d’une leçon ESL et pratiquez ces mots précis.",
      panels: [
        [
          "Le vocabulaire du moment",
          "La pratique est plus utile quand elle suit le chapitre ou la leçon en cours.",
        ],
        [
          "Révision ciblée",
          "Après une partie, les mots manqués peuvent être refaits pour concentrer l’effort.",
        ],
      ],
      faq: [
        [
          "Puis-je coller ma propre liste de vocabulaire ?",
          "Oui. Utilisez une liste de cours, ESL, tutorat ou contrôle.",
        ],
        [
          "Faut-il un compte ?",
          "Non. Le lien de pratique fonctionne sans login.",
        ],
        [
          "Peut-on reprendre les erreurs ?",
          "Oui. Les mots manqués peuvent être rejoués.",
        ],
      ],
    },
  },
  id: {
    "custom-spelling-words-game": {
      title: "Game Ejaan Kustom dengan Kata Sendiri | My Spelling Game",
      description:
        "Masukkan kata ejaan sendiri dan langsung mulai. Buat game ejaan kustom, ulangi kata yang salah, dan berlatih tanpa akun.",
      ogDescription:
        "Masukkan kata sendiri dan langsung mulai game kustom tanpa akun.",
      h1: "Masukkan kata sendiri dan langsung mulai",
      intro:
        "Tempel kata ejaan kustom lalu buka hujan kata tanpa akun yang hanya memakai daftar milikmu.",
      panels: [
        [
          "Kata milikmu, bukan bank kata acak",
          "Tempel kata tugas, daftar dari guru, kosakata, atau daftar kustom apa pun. Setiap ronde memakai persis kata yang kamu masukkan.",
        ],
        [
          "Latihan kustom tanpa akun",
          "Masukkan kata, langsung mulai, lalu ulangi yang salah. Link latihan yang sama juga bisa dibagikan tanpa membuat akun siswa.",
        ],
      ],
      faq: [
        [
          "Bisa memakai kata sendiri?",
          "Bisa. Tempel daftar kata dan game hanya memakai kata itu.",
        ],
        [
          "Bisa untuk latihan sebelum kuis?",
          "Bisa. Ronde pendek cocok untuk mengecek daftar sebelum kuis.",
        ],
        [
          "Siswa perlu akun?",
          "Tidak. Link latihan langsung terbuka di browser.",
        ],
      ],
    },
    "homeschool-spelling-practice": {
      title: "Latihan spelling di rumah | My Spelling Game",
      description:
        "Latih spelling bahasa Inggris di rumah dengan kata dari kurikulum, buku, atau daftar buatan keluarga. Tanpa akun.",
      ogDescription:
        "Ubah daftar belajar di rumah menjadi latihan spelling tanpa akun.",
      h1: "Latihan spelling bahasa Inggris di rumah",
      intro:
        "Gunakan kata dari kurikulum, buku latihan, atau daftar buatan keluarga untuk rutinitas spelling mingguan.",
      panels: [
        [
          "Mengikuti daftar keluarga",
          "Belajar di rumah sering punya urutan kata sendiri. Karena itu latihan dimulai dari daftar yang kamu tempel.",
        ],
        [
          "Singkat dan bisa diulang",
          "Tempel kata minggu ini, mainkan satu ronde, lalu ulangi hanya kata yang masih salah.",
        ],
      ],
      faq: [
        [
          "Bisa memakai kata dari kurikulum?",
          "Bisa. Tempel kata dari kurikulum, buku, atau daftar keluarga.",
        ],
        [
          "Bisa menjadi tes singkat?",
          "Bisa. Ronde memakai kata yang persis kamu masukkan.",
        ],
        ["Perlu platform khusus?", "Tidak. Cukup browser dan link tanpa akun."],
      ],
    },
    "sight-word-typing-game": {
      title: "Game latihan kata umum | My Spelling Game",
      description:
        "Tempel daftar kata umum bahasa Inggris dan jadikan latihan mengetik singkat. Cocok untuk kelas, rumah, dan latihan membaca awal.",
      ogDescription:
        "Latih kata umum dari daftar sendiri dan ulangi kata yang salah.",
      h1: "Game latihan kata umum",
      intro:
        "Tempel kata umum yang sedang dipelajari anak dan ubah menjadi ronde mengetik singkat.",
      panels: [
        [
          "Lebih enak dengan daftar pendek",
          "Kata umum biasanya perlu pengulangan singkat. Ronde kecil membuat latihan terasa ringan.",
        ],
        [
          "Untuk kelas atau rumah",
          "Gunakan daftar dari guru, daftar Dolch/Fry, atau kata-kata membaca awal.",
        ],
      ],
      faq: [
        [
          "Bisa memakai daftar kata umum sendiri?",
          "Bisa. Tempel daftar yang sedang dipelajari siswa.",
        ],
        [
          "Cocok untuk aktivitas mandiri?",
          "Cocok. Bagikan link yang sama tanpa membuat akun.",
        ],
        [
          "Bisa mengulang kata yang salah?",
          "Bisa. Kata yang salah dapat dimainkan lagi.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      title: "Game kosakata bahasa Inggris | My Spelling Game",
      description:
        "Tempel daftar kosakata bahasa Inggris, ESL, tutor, atau persiapan tes dan latih dengan game mengetik tanpa akun.",
      ogDescription:
        "Ubah daftar kosakata bahasa Inggris menjadi game mengetik singkat.",
      h1: "Game kosakata bahasa Inggris",
      intro:
        "Tempel kosakata dari kelas, tutor, tes, atau pelajaran ESL dan latihan dengan kata yang sama.",
      panels: [
        [
          "Kosakata sesuai pelajaran",
          "Latihan lebih berguna ketika sesuai dengan materi yang baru dipelajari siswa.",
        ],
        [
          "Review yang fokus",
          "Setelah ronde selesai, kata yang salah bisa diulang supaya latihan lebih tepat sasaran.",
        ],
      ],
      faq: [
        [
          "Bisa tempel daftar kosakata sendiri?",
          "Bisa. Gunakan daftar dari kelas, ESL, tutor, atau tes.",
        ],
        ["Perlu akun?", "Tidak. Link latihan bekerja tanpa login."],
        [
          "Bisa mengulang kosakata yang salah?",
          "Bisa. Kata yang salah dapat dimainkan lagi.",
        ],
      ],
    },
  },
  zh: {
    "custom-spelling-words-game": {
      title: "用自己的单词玩自定义英语拼写游戏 | My Spelling Game",
      description:
        "输入自己的英语拼写单词，立即开始自定义游戏。只练你的词表，支持漏词重练，全程无需登录。",
      ogDescription: "输入自己的英语单词，立即开始无需登录的自定义拼写游戏。",
      h1: "输入自己的英语单词，立即开始",
      intro:
        "在下方粘贴自定义英语拼写词表，无需登录，单词雨只使用你输入的单词。",
      panels: [
        [
          "用自己的单词，不用随机词库",
          "作业单词、老师词表、英语词汇或任意自定义单词都可以。每一轮只使用你输入的这份词表。",
        ],
        [
          "无需登录的自定义拼写练习",
          "输入单词后立即开始，漏掉的词可以单独重练。分享同一个练习链接也不需要学生注册账号。",
        ],
      ],
      faq: [
        [
          "可以用自己的英语单词吗？",
          "可以。粘贴单词表后，游戏只使用这份单词。",
        ],
        ["能当作测验前练习吗？", "可以。短轮次适合在测验前快速检查。"],
        ["学生需要登录吗？", "不需要。打开练习链接即可。"],
      ],
    },
    "homeschool-spelling-practice": {
      title: "家庭英语拼写练习 | My Spelling Game",
      description:
        "用教材、练习册或家长自选词表做家庭英语拼写练习。粘贴单词，开始练习，漏词自动重练。",
      ogDescription: "把家庭学习词表变成无需登录的英语拼写练习。",
      h1: "家庭英语拼写练习",
      intro:
        "用教材、练习册或家长自己整理的单词表，做一套每周都能复用的拼写练习。",
      panels: [
        [
          "跟着自己的学习节奏",
          "家庭学习的词表不一定来自固定词库，所以这里从你粘贴的真实单词开始。",
        ],
        ["几分钟一轮", "粘贴本周单词，练一轮，再只重练还没掌握的词。"],
      ],
      faq: [
        ["可以用教材里的词吗？", "可以。教材、练习册或家长自选词都可以。"],
        ["可以做快速拼写测试吗？", "可以。练习轮次会使用你输入的原始词表。"],
        ["需要学习平台账号吗？", "不需要。浏览器打开链接即可练习。"],
      ],
    },
    "sight-word-typing-game": {
      title: "高频词打字练习 | My Spelling Game",
      description:
        "粘贴英语高频词词表，生成短轮次打字练习。适合课堂、家庭阅读启蒙和错词重练，无需学生登录。",
      ogDescription: "用自己的英语高频词词表做打字练习，支持错词重练。",
      h1: "高频词打字练习",
      intro: "把孩子正在学习的英语高频词粘贴进来，变成一轮简短的英文打字练习。",
      panels: [
        [
          "短词表更适合反复练",
          "高频词需要经常重复，短轮次比长任务更容易坚持。",
        ],
        [
          "适合课堂或家庭",
          "可以用老师给的词表、Dolch/Fry 风格词表，或家庭阅读启蒙词表。",
        ],
      ],
      faq: [
        [
          "可以用自己的英语高频词词表吗？",
          "可以。粘贴孩子当前正在练的词即可。",
        ],
        ["适合课堂小组练习吗？", "适合。分享同一个链接即可，不需要账号。"],
        ["能重练漏掉的词吗？", "可以。漏掉的词可以进入下一轮。"],
      ],
    },
    "vocabulary-typing-game": {
      title: "英语词汇打字游戏 | My Spelling Game",
      description:
        "粘贴英语词汇表，做 ESL、课堂、辅导或测验前打字练习。无需账号，支持错词重练。",
      ogDescription: "把英语词汇表变成短轮次打字练习，错词可重练。",
      h1: "英语词汇打字游戏",
      intro: "把课堂、ESL、辅导或测验前要复习的词汇贴进来，只练这份词表。",
      panels: [
        [
          "贴合当前课程",
          "词汇练习最有用的时候，是它正好对应学生刚学过的内容。",
        ],
        [
          "错词集中复习",
          "一轮结束后，漏掉的词可以单独再练，时间用在真正薄弱的地方。",
        ],
      ],
      faq: [
        ["可以粘贴自己的词汇表吗？", "可以。课堂、ESL、辅导或测验词表都可以。"],
        ["需要账号吗？", "不需要。练习链接无需登录。"],
        ["能重练错词吗？", "可以。漏掉的词可以再次进入练习。"],
      ],
    },
  },
};

const longtailContentBoosts = {
  en: {
    "homeschool-spelling-practice": {
      panels: [
        [
          "A Weekly Homeschool Routine",
          "Use the page at the start of the week to preview new words, then return for short review rounds before the final check. A parent can paste the same list again, or keep the practice link for the child to open during independent work. Short sessions work best: one list, one round, then a quick talk about the words that were missed.",
        ],
        [
          "How Many Words To Practice",
          "For younger students, eight to twelve words is usually enough for one round. Older students can handle a longer curriculum list, but the practice still works best when the goal is clear. If the list has many tricky words, split it into two rounds so the student can notice patterns instead of rushing through everything.",
        ],
        [
          "Using Missed Words",
          "Missed-word replay is useful for homeschool because it turns the round into feedback. Instead of asking whether the child studied, you can see which words need one more look. Read the missed words aloud, talk about syllables or letter patterns, then replay only those words while they are still fresh.",
        ],
        [
          "Parent-Led Without Extra Setup",
          "The page does not try to replace your curriculum. It is a small practice tool for the repeated job of the week: take the words you already chose, make the child type them carefully, and focus the next round on the weak spots. No class roster, lesson builder, or student account is needed.",
        ],
      ],
      faq: [
        [
          "How often should we use it during the week?",
          "Two or three short rounds usually work better than one long session. Use the first round to find weak words and later rounds to review them.",
        ],
        [
          "Can I split a long homeschool list?",
          "Yes. Paste half the list for one round, then use the rest in another round so the practice stays focused.",
        ],
        [
          "Should I leave easy mode on?",
          "Use easy mode when the goal is careful spelling. Turn it off when the student is ready for a faster check.",
        ],
      ],
    },
    "sight-word-typing-game": {
      panels: [
        [
          "When Sight Word Typing Helps",
          "Sight words need fast recognition, but typing also asks the student to look closely at every letter. This page works well after a child has already seen the words in reading practice and needs a light way to repeat them. Keep the list small so the child can finish with confidence.",
        ],
        [
          "A Five-Minute Practice Flow",
          "Start with five to ten words from the current reader, homework sheet, or classroom list. Let the student play one round, then look at the missed words together. Read each missed word aloud, use it in a sentence, and replay only those words. That small loop is usually more useful than adding a bigger list.",
        ],
        [
          "Good Lists To Try",
          "Use teacher-provided sight words, early reader words, Dolch-style words, Fry-style words, color words, number words, or short high-frequency phrases broken into single words. Avoid mixing too many new words at once. Familiar words should become quick wins, while missed words show what still needs practice.",
        ],
        [
          "For Classroom Centers And Home",
          "The no-login link makes the page easy to use during a reading center, homework routine, tutoring session, or homeschool lesson. A teacher can share one list with a small group, while a parent can keep a short list for daily reading practice on the same device.",
        ],
      ],
      faq: [
        [
          "How many sight words should I put in one round?",
          "Five to ten words is a good starting point for early readers. Add more only when the student finishes comfortably.",
        ],
        [
          "Is this a replacement for reading practice?",
          "No. Use it as a quick typing and recognition activity alongside real reading, read-aloud time, and word work.",
        ],
        [
          "Can I use teacher sight words from school?",
          "Yes. Paste the exact words from the teacher so practice matches the current classroom list.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      panels: [
        [
          "Vocabulary That Matches The Lesson",
          "Vocabulary practice is strongest when it uses words from the current unit. Paste science terms, history words, ESL vocabulary, spelling-vocabulary words, or test-prep terms that students already need to review. The game keeps the attention on the exact list instead of pulling from a random word bank.",
        ],
        [
          "For ESL, Tutoring, And Review",
          "Tutors can use the page at the end of a lesson to check which words still feel unfamiliar. ESL learners can repeat a short list several times, especially when the words are new academic or classroom vocabulary. Teachers can share the same link for a warm-up, review station, or homework practice.",
        ],
        [
          "What To Do With Missed Vocabulary",
          "After the round, missed words should become the study list. Ask the student to say the word, type it again, and explain or use it in a sentence if the meaning matters. Then replay the missed words so spelling and recognition are reviewed while the context is still fresh.",
        ],
        [
          "Keeping Practice Focused",
          "A long vocabulary chapter can be split into smaller groups: key terms, confusing words, review words, and test words. Short groups make it easier to notice patterns, such as prefixes, endings, silent letters, or words that look similar but mean different things.",
        ],
      ],
      faq: [
        [
          "What kind of vocabulary list works best?",
          "Current lesson words work best: ESL words, academic terms, unit vocabulary, or words from a tutoring session.",
        ],
        [
          "Can I use it before a quiz?",
          "Yes. Paste the quiz words, play one round, and replay missed words for a focused final review.",
        ],
        [
          "Does the game teach definitions?",
          "No. It focuses on recognition and spelling. Pair it with discussion, flashcards, or sentence practice when definitions matter.",
        ],
      ],
    },
  },
  es: {
    "homeschool-spelling-practice": {
      panels: [
        [
          "Rutina semanal en casa",
          "Usa la página al empezar la semana para presentar las palabras nuevas y vuelve después con rondas cortas antes de la revisión final. La familia puede pegar la misma lista o guardar el enlace para trabajo independiente. Lo importante es que la práctica sea breve: una lista, una ronda y luego mirar qué palabras fallaron.",
        ],
        [
          "Cuántas palabras poner",
          "Para estudiantes pequeños, ocho a doce palabras suelen bastar. Si la lista del currículum es larga, conviene dividirla en dos rondas. Así el niño puede notar patrones de letras, sonidos o terminaciones sin sentir que la actividad se vuelve demasiado pesada.",
        ],
        [
          "Qué hacer con los errores",
          "Las palabras falladas sirven como una mini lista de estudio. Léelas en voz alta, comenta la parte difícil y vuelve a jugar solo con esas palabras. Esa repetición inmediata ayuda más que repetir toda la lista sin mirar dónde estuvo el problema.",
        ],
        [
          "Sin plataforma extra",
          "La página no reemplaza tu plan de homeschool. Solo resuelve una tarea repetida: tomar las palabras que ya elegiste, convertirlas en práctica y enfocar el repaso en los puntos débiles. No hace falta crear clases, perfiles ni cuentas de estudiante.",
        ],
      ],
      faq: [
        [
          "¿Cuántas veces conviene practicar en la semana?",
          "Dos o tres rondas cortas suelen funcionar mejor que una sesión larga. La primera encuentra errores y las siguientes los repasan.",
        ],
        [
          "¿Puedo dividir una lista larga?",
          "Sí. Pega una parte para una ronda y deja el resto para otra sesión.",
        ],
        [
          "¿Cuándo uso el modo fácil?",
          "Úsalo cuando buscas spelling cuidadoso. Quítalo cuando el estudiante esté listo para una revisión más rápida.",
        ],
      ],
    },
    "sight-word-typing-game": {
      panels: [
        [
          "Cuándo ayuda esta práctica",
          "Las palabras frecuentes deben reconocerse rápido, pero escribirlas también obliga a mirar cada letra. Esta página funciona bien después de que el niño ya vio las palabras en lectura y necesita repetirlas de forma ligera. Una lista corta suele dar mejores resultados que una lista enorme.",
        ],
        [
          "Flujo de cinco minutos",
          "Empieza con cinco a diez palabras del lector, tarea o lista del profesor. Juega una ronda, revisa las palabras falladas y léelas juntos. Después usa cada palabra en una frase sencilla y repite solo esas palabras. Ese ciclo pequeño mantiene la práctica clara.",
        ],
        [
          "Listas que funcionan",
          "Puedes usar palabras frecuentes dadas por el profesor, listas estilo Dolch o Fry, palabras de colores, números o palabras comunes de un libro inicial. Evita mezclar demasiadas palabras nuevas. Las palabras conocidas dan confianza y las falladas muestran qué falta practicar.",
        ],
        [
          "Para clase o casa",
          "El enlace sin cuenta sirve para centros de lectura, tarea, tutoría o práctica en casa. Un profesor puede compartir la misma lista con un grupo pequeño y una familia puede mantener una lista breve para repasar durante la semana.",
        ],
      ],
      faq: [
        [
          "¿Cuántas palabras frecuentes pongo?",
          "Cinco a diez palabras es un buen inicio para lectores tempranos. Agrega más solo si la ronda resulta cómoda.",
        ],
        [
          "¿Reemplaza la lectura?",
          "No. Úsalo como apoyo junto con lectura real, lectura en voz alta y trabajo de palabras.",
        ],
        [
          "¿Puedo usar la lista del colegio?",
          "Sí. Pega exactamente las palabras del profesor para que la práctica coincida con la clase.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      panels: [
        [
          "Vocabulario de la lección actual",
          "La práctica vale más cuando usa palabras de la unidad que el estudiante está viendo. Pega términos de ciencias, historia, ESL, tutoría o preparación de examen. Así el juego se mantiene enfocado en la lista real, no en palabras aleatorias.",
        ],
        [
          "Para ESL, tutoría y repaso",
          "Un tutor puede usar la página al final de una sesión para detectar qué palabras siguen inseguras. Un estudiante ESL puede repetir una lista corta varias veces, sobre todo si son palabras académicas nuevas. En clase también sirve como calentamiento o estación de repaso.",
        ],
        [
          "Cómo usar las palabras falladas",
          "Después de la ronda, las palabras falladas deberían convertirse en la lista principal. Pide al estudiante que diga la palabra, la escriba otra vez y la use en una frase si el significado importa. Luego repite solo esas palabras.",
        ],
        [
          "Mantener la lista enfocada",
          "Un capítulo largo se puede dividir en grupos: términos clave, palabras confusas, palabras de repaso y palabras de examen. Los grupos pequeños ayudan a notar prefijos, terminaciones, letras silenciosas o palabras parecidas.",
        ],
      ],
      faq: [
        [
          "¿Qué vocabulario funciona mejor?",
          "Las palabras de la lección actual: ESL, términos académicos, vocabulario de unidad o palabras de tutoría.",
        ],
        [
          "¿Sirve antes de un quiz?",
          "Sí. Pega las palabras del quiz, juega una ronda y repite las falladas.",
        ],
        [
          "¿El juego enseña definiciones?",
          "No. Se centra en reconocer y escribir. Combínalo con frases, tarjetas o conversación cuando el significado sea importante.",
        ],
      ],
    },
  },
  "pt-BR": {
    "homeschool-spelling-practice": {
      panels: [
        [
          "Rotina semanal em casa",
          "Use a página no começo da semana para apresentar as palavras e volte depois para rodadas curtas antes da revisão final. A família pode colar a mesma lista ou guardar o link para estudo independente. O melhor é manter simples: uma lista, uma rodada e uma conversa rápida sobre os erros.",
        ],
        [
          "Quantas palavras praticar",
          "Para crianças menores, oito a doze palavras costumam bastar. Se a lista do currículo for longa, divida em duas rodadas. Assim o aluno percebe padrões de letras, sons ou finais sem transformar a prática em uma tarefa cansativa.",
        ],
        [
          "Como usar os erros",
          "As palavras erradas viram uma lista pequena de estudo. Leia em voz alta, converse sobre a parte difícil e jogue outra rodada só com essas palavras. Essa repetição logo depois do erro ajuda mais do que repetir tudo sem foco.",
        ],
        [
          "Sem plataforma extra",
          "A página não tenta substituir seu currículo. Ela resolve uma tarefa simples da semana: usar as palavras que você já escolheu, criar uma prática rápida e revisar onde ainda há dificuldade. Não precisa criar turma, perfil ou conta de aluno.",
        ],
      ],
      faq: [
        [
          "Quantas vezes usar durante a semana?",
          "Duas ou três rodadas curtas costumam funcionar melhor que uma sessão longa.",
        ],
        [
          "Posso dividir uma lista grande?",
          "Sim. Cole metade da lista em uma rodada e deixe o restante para outra sessão.",
        ],
        [
          "Quando usar o modo fácil?",
          "Use quando o foco for escrever com cuidado. Desative quando o aluno estiver pronto para uma revisão mais rápida.",
        ],
      ],
    },
    "sight-word-typing-game": {
      panels: [
        [
          "Quando essa prática ajuda",
          "Palavras frequentes precisam ser reconhecidas rápido, mas digitar também faz a criança olhar cada letra. Use depois que a palavra já apareceu na leitura. Uma lista pequena e repetida costuma ser melhor que uma lista grande com muitas novidades.",
        ],
        [
          "Fluxo de cinco minutos",
          "Comece com cinco a dez palavras do livro, tarefa ou lista do professor. Jogue uma rodada, veja as palavras erradas e leia cada uma em voz alta. Depois use as palavras em frases simples e jogue outra rodada só com os erros.",
        ],
        [
          "Boas listas para testar",
          "Use listas do professor, palavras estilo Dolch ou Fry, cores, números ou palavras comuns de leitores iniciantes. Evite misturar muitas palavras novas de uma vez. Palavras familiares dão confiança e os erros mostram o que precisa voltar.",
        ],
        [
          "Para escola ou casa",
          "O link sem conta facilita o uso em estações de leitura, lição de casa, tutoria ou homeschool. O professor pode compartilhar uma lista com um grupo pequeno, e a família pode manter uma lista curta para a semana.",
        ],
      ],
      faq: [
        [
          "Quantas palavras frequentes devo colocar?",
          "Cinco a dez palavras é um bom começo para leitores iniciantes.",
        ],
        [
          "Isso substitui a leitura?",
          "Não. Use como apoio junto com leitura real, leitura em voz alta e trabalho com palavras.",
        ],
        [
          "Posso usar a lista da escola?",
          "Sim. Cole exatamente as palavras do professor para manter a prática alinhada.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      panels: [
        [
          "Vocabulário da lição atual",
          "A prática fica mais útil quando usa palavras da unidade em estudo. Cole termos de ciências, história, ESL, reforço ou preparação para prova. Assim o jogo fica preso à lista real, sem puxar palavras aleatórias.",
        ],
        [
          "Para ESL, reforço e revisão",
          "Um tutor pode usar a página no fim da aula para ver quais palavras ainda causam dúvida. Um aluno de ESL pode repetir uma lista curta várias vezes, principalmente com vocabulário acadêmico novo. Em sala, também serve como aquecimento ou estação de revisão.",
        ],
        [
          "O que fazer com os erros",
          "Depois da rodada, as palavras erradas devem virar a lista principal. Peça ao aluno para dizer a palavra, digitá-la de novo e usar em uma frase se o significado for importante. Depois repita só essas palavras.",
        ],
        [
          "Manter o foco",
          "Um capítulo grande pode virar grupos menores: termos principais, palavras parecidas, revisão e palavras de prova. Grupos curtos ajudam a perceber prefixos, finais, letras silenciosas e palavras que confundem.",
        ],
      ],
      faq: [
        [
          "Que tipo de vocabulário funciona melhor?",
          "Palavras da lição atual: ESL, termos acadêmicos, vocabulário de unidade ou lista de reforço.",
        ],
        [
          "Serve antes de uma prova?",
          "Sim. Cole as palavras da prova, jogue uma rodada e revise os erros.",
        ],
        [
          "O jogo ensina definições?",
          "Não. Ele foca reconhecimento e spelling. Combine com frases ou cartões quando o significado importar.",
        ],
      ],
    },
  },
  fr: {
    "homeschool-spelling-practice": {
      panels: [
        [
          "Routine hebdomadaire à la maison",
          "Utilisez la page au début de la semaine pour découvrir les mots, puis revenez pour de petites parties avant la vérification finale. Le parent peut recoller la même liste ou garder le lien pour un travail autonome. Le format le plus utile reste court: une liste, une partie, puis un échange sur les mots manqués.",
        ],
        [
          "Combien de mots pratiquer",
          "Pour les plus jeunes, huit à douze mots suffisent souvent. Si la liste du programme est longue, séparez-la en deux parties. L'élève peut alors repérer les sons, les terminaisons ou les lettres difficiles sans se perdre dans une activité trop lourde.",
        ],
        [
          "Utiliser les mots manqués",
          "Les mots manqués deviennent une petite liste de révision. Lisez-les à voix haute, observez la partie difficile, puis relancez une partie avec seulement ces mots. Cette reprise immédiate est plus utile qu'une répétition complète sans priorité.",
        ],
        [
          "Sans plateforme supplémentaire",
          "La page ne remplace pas votre programme. Elle sert à une tâche simple et répétée: prendre les mots déjà choisis, créer une courte pratique, puis concentrer la suite sur ce qui résiste encore. Pas de classe à créer, pas de profil élève, pas de compte.",
        ],
      ],
      faq: [
        [
          "Combien de fois l’utiliser dans la semaine ?",
          "Deux ou trois petites parties fonctionnent souvent mieux qu’une longue séance.",
        ],
        [
          "Puis-je diviser une longue liste ?",
          "Oui. Utilisez une partie de la liste pour une première partie, puis le reste plus tard.",
        ],
        [
          "Quand utiliser le mode facile ?",
          "Gardez-le quand le but est une orthographe attentive. Retirez-le pour une vérification plus rapide.",
        ],
      ],
    },
    "sight-word-typing-game": {
      panels: [
        [
          "Quand cette pratique aide",
          "Les mots fréquents doivent être reconnus vite, mais les taper oblige aussi à regarder chaque lettre. Utilisez cette page après une activité de lecture, quand l'enfant connaît déjà les mots et doit les revoir légèrement. Une petite liste répétée est souvent préférable.",
        ],
        [
          "Un rythme de cinq minutes",
          "Commencez avec cinq à dix mots du livre, du devoir ou de la liste du professeur. Jouez une partie, regardez les mots manqués, puis lisez-les ensemble. Utilisez chaque mot dans une phrase simple et relancez seulement les mots manqués.",
        ],
        [
          "Listes adaptées",
          "Essayez une liste donnée par le professeur, des mots de type Dolch ou Fry, des couleurs, des nombres ou des mots fréquents d'un premier lecteur. Évitez trop de mots nouveaux en même temps. Les mots connus donnent confiance et les erreurs montrent quoi reprendre.",
        ],
        [
          "Pour la classe ou la maison",
          "Le lien sans compte convient aux ateliers de lecture, aux devoirs, au tutorat ou à l'école à la maison. Un enseignant peut partager la même liste avec un petit groupe, tandis qu'une famille garde une liste courte pour la semaine.",
        ],
      ],
      faq: [
        [
          "Combien de mots fréquents mettre ?",
          "Cinq à dix mots sont un bon début pour les jeunes lecteurs.",
        ],
        [
          "Est-ce que cela remplace la lecture ?",
          "Non. Utilisez-le comme complément à la vraie lecture, à la lecture à voix haute et au travail sur les mots.",
        ],
        [
          "Puis-je utiliser la liste de l’école ?",
          "Oui. Collez les mots du professeur pour rester aligné avec la classe.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      panels: [
        [
          "Le vocabulaire de la leçon",
          "La pratique est plus utile quand elle suit l'unité en cours. Collez des termes de sciences, d'histoire, d'ESL, de tutorat ou de préparation à un contrôle. Le jeu reste alors centré sur la vraie liste, pas sur une banque aléatoire.",
        ],
        [
          "Pour ESL, tutorat et révision",
          "Un tuteur peut utiliser la page en fin de séance pour voir les mots encore hésitants. Un apprenant ESL peut répéter une courte liste plusieurs fois, surtout avec du vocabulaire académique nouveau. En classe, la page peut servir d'échauffement ou d'atelier.",
        ],
        [
          "Que faire des erreurs",
          "Après la partie, les mots manqués deviennent la liste de travail. Demandez à l'élève de dire le mot, de le retaper et de l'utiliser dans une phrase si le sens compte. Relancez ensuite seulement ces mots.",
        ],
        [
          "Garder une pratique ciblée",
          "Un long chapitre peut être divisé en groupes: mots clés, mots confus, mots de révision et mots de contrôle. Les petits groupes aident à repérer préfixes, terminaisons, lettres muettes ou mots proches.",
        ],
      ],
      faq: [
        [
          "Quel vocabulaire fonctionne le mieux ?",
          "Les mots de la leçon actuelle: ESL, termes académiques, vocabulaire d’un chapitre ou liste de tutorat.",
        ],
        [
          "Est-ce utile avant un contrôle ?",
          "Oui. Collez les mots du contrôle, jouez une partie, puis reprenez les erreurs.",
        ],
        [
          "Le jeu enseigne-t-il les définitions ?",
          "Non. Il travaille la reconnaissance et l’orthographe. Ajoutez phrases ou cartes quand le sens compte.",
        ],
      ],
    },
  },
  id: {
    "homeschool-spelling-practice": {
      panels: [
        [
          "Rutinitas mingguan di rumah",
          "Gunakan halaman ini di awal minggu untuk mengenalkan kata baru, lalu kembali untuk ronde pendek sebelum cek terakhir. Orang tua bisa menempel daftar yang sama atau menyimpan link untuk latihan mandiri. Format terbaik tetap singkat: satu daftar, satu ronde, lalu lihat kata yang masih salah.",
        ],
        [
          "Berapa kata dalam satu ronde",
          "Untuk anak yang lebih kecil, delapan sampai dua belas kata biasanya cukup. Kalau daftar dari kurikulum panjang, bagi menjadi dua ronde. Dengan begitu anak bisa melihat pola huruf, bunyi, atau akhiran tanpa merasa latihan terlalu berat.",
        ],
        [
          "Memakai kata yang salah",
          "Kata yang salah menjadi daftar belajar kecil. Baca kata itu dengan suara, bahas bagian yang sulit, lalu mainkan lagi hanya dengan kata tersebut. Ulangan langsung seperti ini lebih berguna daripada mengulang seluruh daftar tanpa fokus.",
        ],
        [
          "Tanpa platform tambahan",
          "Halaman ini tidak menggantikan kurikulum. Fungsinya sederhana: memakai kata yang sudah dipilih, membuat latihan singkat, dan membantu orang tua melihat bagian yang masih perlu diulang. Tidak perlu kelas, profil siswa, atau akun.",
        ],
      ],
      faq: [
        [
          "Seberapa sering dipakai dalam seminggu?",
          "Dua atau tiga ronde pendek biasanya lebih baik daripada satu sesi panjang.",
        ],
        [
          "Bisa membagi daftar panjang?",
          "Bisa. Pakai sebagian daftar untuk satu ronde dan sisanya untuk sesi lain.",
        ],
        [
          "Kapan memakai mode mudah?",
          "Pakai saat fokusnya spelling yang teliti. Matikan saat siswa siap untuk cek yang lebih cepat.",
        ],
      ],
    },
    "sight-word-typing-game": {
      panels: [
        [
          "Kapan latihan ini membantu",
          "Kata umum perlu dikenali cepat, tetapi mengetik membuat anak memperhatikan setiap huruf. Gunakan setelah anak sudah melihat kata itu dalam bacaan. Daftar pendek yang diulang biasanya lebih baik daripada daftar besar dengan banyak kata baru.",
        ],
        [
          "Alur lima menit",
          "Mulai dengan lima sampai sepuluh kata dari buku, PR, atau daftar guru. Mainkan satu ronde, lihat kata yang salah, lalu baca bersama. Pakai kata itu dalam kalimat sederhana dan ulangi hanya kata yang salah.",
        ],
        [
          "Daftar yang cocok",
          "Gunakan daftar dari guru, kata gaya Dolch atau Fry, warna, angka, atau kata umum dari bacaan awal. Jangan mencampur terlalu banyak kata baru sekaligus. Kata yang sudah dikenal memberi rasa percaya diri, sedangkan kesalahan menunjukkan apa yang perlu diulang.",
        ],
        [
          "Untuk kelas atau rumah",
          "Link tanpa akun membuat latihan mudah dipakai untuk pusat membaca, PR, tutor, atau belajar di rumah. Guru bisa membagikan daftar yang sama untuk kelompok kecil, dan keluarga bisa menyimpan daftar pendek untuk minggu itu.",
        ],
      ],
      faq: [
        [
          "Berapa banyak kata umum dalam satu ronde?",
          "Lima sampai sepuluh kata adalah awal yang baik untuk pembaca awal.",
        ],
        [
          "Apakah ini menggantikan membaca?",
          "Tidak. Pakai sebagai tambahan bersama membaca sungguhan, membaca nyaring, dan latihan kata.",
        ],
        [
          "Bisa memakai daftar dari sekolah?",
          "Bisa. Tempel kata dari guru agar latihan sesuai dengan kelas.",
        ],
      ],
    },
    "vocabulary-typing-game": {
      panels: [
        [
          "Kosakata dari pelajaran sekarang",
          "Latihan paling berguna saat memakai kata dari unit yang sedang dipelajari. Tempel istilah sains, sejarah, ESL, tutor, atau persiapan tes. Game tetap fokus pada daftar asli, bukan mengambil kata acak.",
        ],
        [
          "Untuk ESL, tutor, dan review",
          "Tutor bisa memakai halaman ini di akhir sesi untuk melihat kata mana yang masih ragu. Pelajar ESL bisa mengulang daftar pendek beberapa kali, terutama kosakata akademik baru. Di kelas, halaman ini juga cocok untuk pemanasan atau stasiun review.",
        ],
        [
          "Apa yang dilakukan setelah salah",
          "Setelah ronde, kata yang salah menjadi daftar utama. Minta siswa mengucapkan kata, mengetiknya lagi, dan membuat kalimat jika makna kata penting. Setelah itu ulangi hanya kata tersebut.",
        ],
        [
          "Menjaga latihan tetap fokus",
          "Bab panjang bisa dibagi menjadi kelompok kecil: istilah penting, kata yang mirip, kata review, dan kata untuk tes. Kelompok kecil membantu siswa melihat awalan, akhiran, huruf diam, atau kata yang mudah tertukar.",
        ],
      ],
      faq: [
        [
          "Daftar kosakata apa yang paling cocok?",
          "Kata dari pelajaran sekarang: ESL, istilah akademik, kosakata unit, atau daftar tutor.",
        ],
        [
          "Bisa dipakai sebelum kuis?",
          "Bisa. Tempel kata kuis, main satu ronde, lalu ulangi kata yang salah.",
        ],
        [
          "Apakah game mengajarkan definisi?",
          "Tidak. Fokusnya pengenalan dan spelling. Tambahkan kalimat atau flashcard jika arti kata penting.",
        ],
      ],
    },
  },
  zh: {
    "homeschool-spelling-practice": {
      panels: [
        [
          "每周家庭练习流程",
          "可以在一周开始时先用这页熟悉新单词，之后在小测前做几轮短练习。家长可以重新粘贴同一份词表，也可以保存练习链接给孩子独立完成。最有效的节奏通常很简单：一份词表，一轮练习，然后一起看漏掉了哪些词。",
        ],
        [
          "一次练多少词合适",
          "低年级孩子一次练八到十二个词就够了。如果教材词表很长，建议拆成两轮。这样孩子更容易注意到字母组合、发音规律或容易混淆的结尾，而不是为了完成一大串单词而匆忙输入。",
        ],
        [
          "怎么用错词重练",
          "错词重练适合家庭学习，因为它把练习结果变成了下一步任务。家长可以把漏掉的词读一遍，指出难点，比如音节、双写字母或不发音字母，然后只重练这些词。这样比把整张词表机械重复一遍更有针对性。",
        ],
        [
          "不替代教材，只补上练习环节",
          "这个页面不试图替代你的 homeschool 教材。它只是处理每周都会出现的小任务：把已经选好的单词变成可操作的练习，让孩子认真输入，并把下一轮时间用在还没掌握的词上。无需课程平台、班级名单或学生账号。",
        ],
      ],
      faq: [
        [
          "一周练几次比较好？",
          "两到三次短练习通常比一次很长的练习更有效。第一轮找出薄弱词，后面几轮复习它们。",
        ],
        [
          "很长的家庭词表可以拆开吗？",
          "可以。先练一半，下一次再练另一半，孩子更容易保持注意力。",
        ],
        [
          "什么时候开简单模式？",
          "如果目标是认真拼写，可以打开简单模式。准备做速度检查时再关闭。",
        ],
      ],
    },
    "sight-word-typing-game": {
      panels: [
        [
          "什么时候适合练高频词",
          "英语高频词需要快速认读，但打字练习会让孩子重新注意每一个字母。这个页面适合放在阅读练习之后使用：孩子已经见过这些词，现在需要用轻量的方式多重复几次。词表越短，完成感越强。",
        ],
        [
          "五分钟练习流程",
          "先放五到十个正在学的词，可以来自老师词表、阅读材料或家庭作业。玩一轮后，和孩子一起看漏掉的词。把每个错词读出来，放进一个简单句子里，然后只重练这些词。这个小循环通常比不断加新词更有效。",
        ],
        [
          "适合放哪些词",
          "可以放老师给的 sight words、Dolch/Fry 风格高频词、颜色词、数字词，或早期读物里反复出现的词。不要一次混入太多陌生词。熟悉的词帮助建立信心，错词则告诉你下一步该练什么。",
        ],
        [
          "课堂和家庭都能用",
          "无登录链接适合阅读角、课堂小组、家庭作业、辅导课或家庭英语启蒙。老师可以把同一份词表发给小组，家长也可以保存一份短词表，在一周里反复练。",
        ],
      ],
      faq: [
        [
          "一轮放多少个高频词？",
          "早期阅读阶段建议五到十个词起步。孩子能轻松完成后再增加。",
        ],
        [
          "它能替代阅读吗？",
          "不能。它更适合作为认读和拼写的小练习，应该配合真实阅读、朗读和词卡使用。",
        ],
        [
          "可以用学校老师给的词表吗？",
          "可以。直接粘贴老师给的词，练习内容就能和课堂保持一致。",
        ],
      ],
    },
    "vocabulary-typing-game": {
      panels: [
        [
          "贴合当前课程的词汇",
          "词汇练习最有用的时候，是它正好对应学生最近在学的内容。可以粘贴科学术语、历史词汇、ESL 课堂词汇、辅导课词表或测验前要复习的词。这样练习会围绕真实词表，而不是随机词库。",
        ],
        [
          "适合 ESL、辅导和复习",
          "辅导老师可以在课程最后用它快速看出哪些词还不熟。ESL 学生可以把短词表重复几轮，尤其是刚学的学术词汇。课堂上也可以作为热身、复习站或作业链接。",
        ],
        [
          "错词应该怎么处理",
          "一轮结束后，漏掉的词就是下一份学习清单。可以让学生先读出这个词，再重新输入，如果这个词的意思很重要，还可以造一个简单句。随后只重练错词，让时间花在真正需要复习的地方。",
        ],
        [
          "把长词表拆成小组",
          "如果一个单元词汇很多，可以拆成关键词、易混词、复习词和测验词。小组练习更容易看出前缀、后缀、不发音字母，或拼写相近但意思不同的词。",
        ],
      ],
      faq: [
        [
          "什么词汇表最适合？",
          "当前正在学习的词最适合，比如 ESL 词汇、学科术语、单元词汇或辅导课词表。",
        ],
        ["可以测验前使用吗？", "可以。粘贴测验词表，练一轮，再集中重练错词。"],
        [
          "这个游戏会教单词释义吗？",
          "不会。它主要练认读和拼写。如果需要理解意思，建议搭配造句、词卡或口头解释。",
        ],
      ],
    },
  },
};

const weeklyPageCopy = {
  en: {
    title: "Weekly Spelling Practice With Your Exact List | My Spelling Game",
    description:
      "Paste this week's exact spelling words and start practice immediately. Replay missed words and use the list without student login.",
    ogDescription:
      "Practice this week's exact spelling list with missed-word retry and no login.",
    h1: "Practice This Week's Spelling Words",
    intro:
      "Paste the exact spelling list for this week and start a short practice round without login.",
    panels: [
      [
        "Use This Week's Exact Spelling List",
        "Paste the words from the teacher, workbook, or family plan. The round uses the exact weekly list you enter, not a random word bank.",
      ],
      [
        "Missed-Word Retry",
        "After each round, missed words are ready to replay. Keep the weekly practice short and spend the next attempt on the words that still need work.",
      ],
      [
        "Parent and Teacher Workspace",
        "Use the no-login practice now, then save the weekly list in Parent or Teacher Workspace to share assignments, track progress, and see mastery over time.",
      ],
    ],
    faq: [
      [
        "Can I use the exact list for this week?",
        "Yes. Paste this week's spelling list and the practice uses those exact words.",
      ],
      [
        "Do students need a login?",
        "No. Students can start from the shared link without an account.",
      ],
      [
        "Can I retry missed words?",
        "Yes. Missed words are collected for a focused retry round.",
      ],
    ],
  },
  es: {
    title:
      "Práctica semanal de ortografía con tu lista exacta | My Spelling Game",
    description:
      "Pega las palabras exactas de ortografía de esta semana y empieza al instante. Repite los fallos sin iniciar sesión.",
    ogDescription:
      "Practica la lista exacta de esta semana, repite los fallos y no crees una cuenta.",
    h1: "Practica las palabras de ortografía de esta semana",
    intro:
      "Pega la lista exacta de esta semana y empieza una ronda corta sin iniciar sesión.",
    panels: [
      [
        "Usa la lista exacta de esta semana",
        "Pega las palabras del profesor, del workbook o del plan familiar. La ronda usa exactamente tu lista semanal, no un banco aleatorio.",
      ],
      [
        "Repite las palabras falladas",
        "Al terminar, las palabras falladas quedan listas para otra ronda. Mantén la práctica breve y céntrate en lo que todavía cuesta.",
      ],
      [
        "Espacio de trabajo para familias y docentes",
        "Empieza sin cuenta y después guarda la lista semanal en el espacio de trabajo para compartir tareas, seguir el progreso y ver el dominio con el tiempo.",
      ],
    ],
    faq: [
      [
        "¿Puedo usar la lista exacta de esta semana?",
        "Sí. Pega la lista y la práctica usa esas mismas palabras.",
      ],
      [
        "¿Los alumnos necesitan iniciar sesión?",
        "No. Pueden abrir el enlace compartido sin crear una cuenta.",
      ],
      [
        "¿Se pueden repetir las palabras falladas?",
        "Sí. Se reúnen para una ronda de repaso centrada.",
      ],
    ],
  },
  "pt-BR": {
    title:
      "Prática semanal de ortografia com sua lista exata | My Spelling Game",
    description:
      "Cole as palavras exatas de ortografia desta semana e comece na hora. Repita os erros sem fazer login.",
    ogDescription:
      "Pratique a lista exata da semana, revise os erros e comece sem conta.",
    h1: "Pratique as palavras de ortografia desta semana",
    intro:
      "Cole a lista exata desta semana e comece uma rodada curta sem fazer login.",
    panels: [
      [
        "Use a lista exata desta semana",
        "Cole as palavras do professor, da apostila ou do plano da família. A rodada usa exatamente a sua lista semanal, sem banco aleatório.",
      ],
      [
        "Repita as palavras erradas",
        "No fim da rodada, as palavras erradas ficam prontas para outra tentativa. Mantenha a prática curta e foque no que ainda precisa de atenção.",
      ],
      [
        "Espaço de trabalho para pais e professores",
        "Comece sem conta e depois salve a lista semanal no espaço de trabalho para compartilhar tarefas, acompanhar o progresso e ver o domínio ao longo do tempo.",
      ],
    ],
    faq: [
      [
        "Posso usar a lista exata desta semana?",
        "Sim. Cole a lista e a prática usa essas mesmas palavras.",
      ],
      [
        "O aluno precisa fazer login?",
        "Não. Ele pode abrir o link compartilhado sem criar conta.",
      ],
      [
        "Dá para repetir as palavras erradas?",
        "Sim. Elas ficam reunidas para uma rodada de revisão focada.",
      ],
    ],
  },
  fr: {
    title:
      "Pratique d’orthographe hebdomadaire avec votre liste exacte | My Spelling Game",
    description:
      "Collez les mots d’orthographe exacts de la semaine et commencez tout de suite. Reprenez les mots manqués sans compte.",
    ogDescription:
      "Travaillez la liste exacte de la semaine, reprenez les mots manqués, sans connexion.",
    h1: "Pratiquez les mots d’orthographe de cette semaine",
    intro:
      "Collez la liste exacte de la semaine et lancez une courte séance sans connexion.",
    panels: [
      [
        "Utilisez la liste exacte de la semaine",
        "Collez les mots du professeur, du cahier ou du programme familial. La partie utilise exactement votre liste hebdomadaire, pas une banque aléatoire.",
      ],
      [
        "Reprenez les mots manqués",
        "À la fin de chaque partie, les mots manqués sont prêts à être rejoués. Gardez une séance courte et concentrez-vous sur les mots encore difficiles.",
      ],
      [
        "Espace de travail pour parents et enseignants",
        "Commencez sans compte, puis enregistrez la liste dans l’espace de travail pour partager des devoirs, suivre les progrès et voir la maîtrise au fil du temps.",
      ],
    ],
    faq: [
      [
        "Puis-je utiliser la liste exacte de cette semaine ?",
        "Oui. Collez la liste et la pratique utilise ces mêmes mots.",
      ],
      [
        "Les élèves doivent-ils se connecter ?",
        "Non. Le lien partagé s’ouvre sans créer de compte.",
      ],
      [
        "Peut-on reprendre les mots manqués ?",
        "Oui. Ils sont regroupés pour une courte reprise ciblée.",
      ],
    ],
  },
  id: {
    title: "Latihan ejaan mingguan dengan daftar yang sama | My Spelling Game",
    description:
      "Tempel kata ejaan persis dari minggu ini dan langsung mulai. Ulangi kata yang salah tanpa login.",
    ogDescription:
      "Latih daftar ejaan minggu ini, ulangi kata yang salah, tanpa akun.",
    h1: "Latih kata ejaan minggu ini",
    intro:
      "Tempel daftar ejaan yang sama untuk minggu ini dan mulai ronde singkat tanpa login.",
    panels: [
      [
        "Gunakan daftar persis minggu ini",
        "Tempel kata dari guru, buku latihan, atau rencana keluarga. Ronde memakai daftar mingguan yang Anda masukkan, bukan bank kata acak.",
      ],
      [
        "Ulangi kata yang salah",
        "Setelah ronde selesai, kata yang salah siap dimainkan lagi. Buat latihan tetap singkat dan fokus pada kata yang masih sulit.",
      ],
      [
        "Ruang kerja untuk orang tua dan guru",
        "Mulai tanpa akun, lalu simpan daftar mingguan di ruang kerja untuk membagikan tugas, memantau kemajuan, dan melihat penguasaan dari waktu ke waktu.",
      ],
    ],
    faq: [
      [
        "Bisa memakai daftar persis minggu ini?",
        "Bisa. Tempel daftar dan latihan memakai kata yang sama.",
      ],
      [
        "Apakah siswa perlu login?",
        "Tidak. Link bersama dapat dibuka tanpa membuat akun.",
      ],
      [
        "Bisa mengulang kata yang salah?",
        "Bisa. Kata tersebut dikumpulkan untuk ronde ulang yang terarah.",
      ],
    ],
  },
  zh: {
    title: "使用本周完整词表进行英语拼写练习 | My Spelling Game",
    description:
      "粘贴本周完整英语拼写单词，立即开始练习。无需登录，并可重练漏掉的单词。",
    ogDescription: "使用本周完整词表练习，集中重练错词，无需登录。",
    h1: "练习本周英语拼写单词",
    intro: "粘贴本周完整词表，立即开始一轮短练习，无需登录。",
    panels: [
      [
        "使用本周完整词表",
        "粘贴老师、教材或家庭计划中的单词。每轮只使用你输入的本周完整词表，不会混入随机词汇。",
      ],
      [
        "重练漏掉的单词",
        "每轮结束后，漏掉的单词会整理好，方便马上再练。保持练习短小，把时间用在仍然不稳的词上。",
      ],
      [
        "家长和教师工作台",
        "现在无需登录即可开始；之后可把本周词表保存到家长或教师工作台，分享作业、追踪进度并查看长期掌握度。",
      ],
    ],
    faq: [
      ["可以使用本周完整词表吗？", "可以。粘贴词表后，练习只使用这些单词。"],
      ["学生需要登录吗？", "不需要。学生打开分享链接即可开始，无需注册账号。"],
      ["能重练漏掉的单词吗？", "可以。漏词会集中整理到下一轮练习中。"],
    ],
  },
};

const homeschoolProgressPanels = {
  en: [
    "Track Progress Across the Week",
    "For repeated weekly practice, a parent can use a workspace to save the list, track progress, and keep completed results connected to the same student profile. Start the week by finding difficult words, review missed words later, and use cross-day results to distinguish words still being learned from words confirmed as mastered. Today's Review in Parent and Teacher Plans can surface missed words when they are due again.",
  ],
  es: [
    "Seguir el progreso durante la semana",
    "Para practicar cada semana, una familia puede guardar la lista en un espacio de trabajo y vincular los resultados al mismo perfil del estudiante. Primero identifica las palabras difíciles, luego repasa los fallos y usa los resultados de distintos días para distinguir lo que aún se aprende de lo que ya está dominado. Today's Review de los planes para familias y docentes muestra los fallos cuando toca repetirlos.",
  ],
  "pt-BR": [
    "Acompanhar o progresso durante a semana",
    "Para a prática semanal, um responsável pode salvar a lista no espaço de trabalho e manter os resultados ligados ao mesmo perfil de aluno. Comece encontrando as palavras difíceis, revise os erros depois e use resultados de dias diferentes para distinguir o que ainda está sendo aprendido do que já foi dominado. O Today's Review dos planos para Pais e Professores mostra os erros quando chega a hora de praticá-los novamente.",
  ],
  fr: [
    "Suivre les progrès pendant la semaine",
    "Pour une pratique hebdomadaire, un parent peut enregistrer la liste dans un espace de travail et relier les résultats au même profil d’élève. Repérez d’abord les mots difficiles, revoyez les mots manqués plus tard et utilisez les résultats de plusieurs jours pour distinguer les mots en cours d’apprentissage de ceux qui sont maîtrisés. Today's Review des offres Parents et Enseignants propose les mots manqués lorsqu’ils doivent revenir.",
  ],
  id: [
    "Pantau kemajuan sepanjang minggu",
    "Untuk latihan mingguan berulang, orang tua dapat menyimpan daftar di ruang kerja dan menghubungkan hasil yang selesai ke profil siswa yang sama. Temukan kata sulit di awal minggu, ulas kata yang salah kemudian, lalu gunakan hasil dari beberapa hari untuk membedakan kata yang masih dipelajari dari kata yang sudah dikuasai. Today's Review pada Paket Orang Tua dan Guru menampilkan kata salah saat waktunya berlatih lagi.",
  ],
  zh: [
    "追踪一周中的练习进度",
    "进行每周重复练习时，家长可以在工作台保存词表，并把完成结果关联到同一个学生档案。先找出困难单词，之后复习错词，再利用不同日期的结果区分仍在学习的单词和已经确认掌握的单词。家长方案和教师方案中的 Today's Review 会在错词需要再次练习时把它们找出来。",
  ],
};

for (const [langCode, boosts] of Object.entries(longtailContentBoosts)) {
  for (const [slug, boost] of Object.entries(boosts)) {
    const page = pages[langCode] && pages[langCode][slug];
    if (!page) continue;
    page.panels.push(...boost.panels);
    page.faq.push(...boost.faq);
  }
}

const longtailFollowupPanels = {
  en: {
    "homeschool-spelling-practice": [
      [
        "A Quick Parent Checklist",
        "Before the round, make sure the list is current, short enough, and free of extra punctuation. During the round, let the child type without correcting every letter aloud. After the round, use the missed words as the teaching moment. That rhythm keeps the page from becoming another worksheet.",
      ],
      [
        "When To Change The List",
        "Keep a word on the list while it still causes hesitation. Remove it when the student can spell it correctly in more than one round and can also use it in reading or writing. Add new words slowly so review and confidence stay part of the routine.",
      ],
      [
        "Low-Pressure Review",
        "Homeschool spelling can feel personal because a parent is often the teacher. A short game round gives both sides a little distance: the page shows what was missed, and the next round becomes practice rather than criticism. That makes it easier to repeat hard words without turning the lesson into an argument.",
      ],
    ],
    "sight-word-typing-game": [
      [
        "Watch For Look-Alike Words",
        "Sight word lists often include words that look similar, such as where, were, there, their, then, and than. A typing round makes these differences visible. If a child misses one of these words, pause after the round and compare the pair slowly before replaying the missed words.",
      ],
      [
        "Keep The Round Playful",
        "Early readers do not need a long score session. A short list, a quick round, and one retry is enough. Celebrate fluent words as much as corrected words. The goal is for common words to feel familiar in reading and writing, not for the practice to feel like a timed exam.",
      ],
      [
        "Read The Words After Typing",
        "After typing practice, ask the child to read the same words from a book, sentence strip, or flashcard. This connects keyboard recognition back to real reading. If a word was easy to type but hard to read in context, keep it in the next short list.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Example Word Groups",
        "Try grouping vocabulary by topic instead of pasting every word at once. A science list might use habitat, predator, energy, and classify. A history list might use colony, treaty, empire, and reform. Smaller groups help students remember where each word belongs.",
      ],
      [
        "Pair Typing With Meaning",
        "The game checks spelling and recognition, but vocabulary also needs meaning. After a round, choose three missed words and ask the student to explain them, draw them, or use them in a sentence. Then replay those words so spelling and understanding reinforce each other.",
      ],
      [
        "Before And After A Quiz",
        "Before a quiz, use the page to find words that still need attention. After a quiz, paste only the words that were missed or guessed. That makes the tool useful for both preparation and correction, without asking students to repeat a full chapter every time.",
      ],
    ],
  },
  es: {
    "homeschool-spelling-practice": [
      [
        "Lista rápida para padres",
        "Antes de empezar, revisa que la lista sea actual, corta y sin signos extraños. Durante la ronda, deja que el niño escriba sin corregir cada letra en voz alta. Después, usa las palabras falladas como punto de enseñanza. Así la práctica no se convierte en otra ficha.",
      ],
      [
        "Cuándo cambiar la lista",
        "Mantén una palabra mientras todavía cause duda. Quítala cuando el estudiante pueda escribirla bien en más de una ronda y también reconocerla al leer o escribir. Agrega palabras nuevas poco a poco para que la confianza siga presente.",
      ],
      [
        "Repaso con menos presión",
        "En casa, spelling puede sentirse personal porque el padre también enseña. Una ronda corta da distancia: la página muestra qué faltó y la siguiente ronda es práctica, no crítica. Eso ayuda a repetir palabras difíciles sin convertir la lección en pelea.",
      ],
    ],
    "sight-word-typing-game": [
      [
        "Cuidado con palabras parecidas",
        "Las listas de palabras frecuentes pueden incluir palabras muy similares, como where, were, there, their, then y than. Al escribirlas, las diferencias se ven mejor. Si una palabra falla, compárala despacio con su pareja antes de repetirla.",
      ],
      [
        "Mantenerlo ligero",
        "Un lector temprano no necesita una sesión larga de puntos. Una lista corta, una ronda rápida y un intento más bastan. Celebra las palabras fluidas y también las corregidas. La meta es que las palabras comunes se sientan familiares, no que parezca un examen.",
      ],
      [
        "Leer después de escribir",
        "Después de la ronda, pide al niño que lea esas mismas palabras en un libro, una frase o una tarjeta. Así la práctica vuelve a la lectura real. Si una palabra fue fácil de escribir pero difícil de leer en contexto, mantenla en la próxima lista.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Ejemplos de grupos de palabras",
        "Prueba agrupar el vocabulario por tema en lugar de pegar todo el capítulo. Una lista de ciencias puede tener habitat, predator, energy y classify. Una de historia puede tener colony, treaty, empire y reform. Los grupos pequeños ayudan a recordar el contexto.",
      ],
      [
        "Unir escritura y significado",
        "El juego revisa spelling y reconocimiento, pero el vocabulario también necesita significado. Después de una ronda, elige tres palabras falladas y pide al estudiante que las explique, dibuje o use en una frase. Luego repite esas palabras.",
      ],
      [
        "Antes y después de un quiz",
        "Antes de un quiz, usa la página para encontrar palabras débiles. Después del quiz, pega solo las palabras falladas o dudosas. Así la herramienta sirve para preparar y corregir sin repetir siempre todo el capítulo.",
      ],
    ],
  },
  "pt-BR": {
    "homeschool-spelling-practice": [
      [
        "Checklist rápido para pais",
        "Antes da rodada, veja se a lista está atual, curta e sem pontuação extra. Durante a prática, deixe a criança digitar sem corrigir cada letra em voz alta. Depois, use as palavras erradas como momento de ensino. Isso evita que a prática vire só mais uma ficha.",
      ],
      [
        "Quando trocar a lista",
        "Mantenha uma palavra enquanto ela ainda causa hesitação. Retire quando o aluno conseguir escrever certo em mais de uma rodada e também reconhecer a palavra na leitura ou na escrita. Adicione palavras novas aos poucos para manter revisão e confiança.",
      ],
      [
        "Revisão com menos pressão",
        "No estudo em casa, spelling pode ficar pessoal porque o pai ou mãe também ensina. Uma rodada curta cria distância: a página mostra o que faltou e a próxima rodada vira prática, não crítica. Isso ajuda a repetir palavras difíceis sem briga.",
      ],
    ],
    "sight-word-typing-game": [
      [
        "Atenção a palavras parecidas",
        "Listas de palavras frequentes podem ter palavras muito parecidas, como where, were, there, their, then e than. A digitação mostra melhor essas diferenças. Se a criança errar uma delas, compare o par devagar antes de repetir a rodada.",
      ],
      [
        "Deixar a rodada leve",
        "Leitores iniciantes não precisam de uma sessão longa de pontuação. Uma lista curta, uma rodada rápida e uma tentativa extra já bastam. Celebre palavras fluentes e palavras corrigidas. O objetivo é familiaridade, não sensação de prova cronometrada.",
      ],
      [
        "Ler depois de digitar",
        "Depois da prática, peça para a criança ler as mesmas palavras em um livro, frase ou cartão. Isso liga a digitação à leitura real. Se uma palavra foi fácil de digitar mas difícil no contexto, mantenha na próxima lista curta.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Exemplos de grupos",
        "Agrupe o vocabulário por tema em vez de colar o capítulo inteiro. Uma lista de ciências pode usar habitat, predator, energy e classify. Uma de história pode usar colony, treaty, empire e reform. Grupos menores ajudam o aluno a lembrar o contexto.",
      ],
      [
        "Juntar digitação e significado",
        "O jogo confere spelling e reconhecimento, mas vocabulário também precisa de sentido. Depois de uma rodada, escolha três palavras erradas e peça ao aluno para explicar, desenhar ou usar em uma frase. Depois repita essas palavras.",
      ],
      [
        "Antes e depois da prova",
        "Antes da prova, use a página para encontrar palavras que ainda precisam de atenção. Depois, cole apenas as palavras erradas ou chutadas. Assim a ferramenta serve para preparar e corrigir sem repetir sempre o capítulo inteiro.",
      ],
    ],
  },
  fr: {
    "homeschool-spelling-practice": [
      [
        "Petite liste pour le parent",
        "Avant la partie, vérifiez que la liste est actuelle, courte et sans ponctuation inutile. Pendant la partie, laissez l'enfant taper sans corriger chaque lettre à voix haute. Après la partie, utilisez les mots manqués comme point d'enseignement. La pratique reste alors plus légère qu'une fiche.",
      ],
      [
        "Quand changer la liste",
        "Gardez un mot tant qu'il provoque une hésitation. Retirez-le quand l'élève peut l'écrire correctement dans plusieurs parties et le reconnaître en lecture ou en écriture. Ajoutez les nouveaux mots lentement pour garder révision et confiance.",
      ],
      [
        "Réviser sans trop de pression",
        "À la maison, l'orthographe peut vite devenir personnelle parce que le parent enseigne aussi. Une courte partie met un peu de distance: la page montre les mots manqués et la partie suivante devient une pratique, pas une critique.",
      ],
    ],
    "sight-word-typing-game": [
      [
        "Observer les mots proches",
        "Les listes de mots fréquents contiennent parfois des mots très proches, comme where, were, there, their, then et than. La frappe rend ces différences visibles. Si l'enfant en manque un, comparez lentement les deux mots avant de relancer.",
      ],
      [
        "Garder une activité légère",
        "Un jeune lecteur n'a pas besoin d'une longue séance de score. Une petite liste, une partie rapide et une reprise suffisent. Valorisez les mots fluides autant que les mots corrigés. Le but est la familiarité, pas l'impression d'un contrôle chronométré.",
      ],
      [
        "Lire après avoir tapé",
        "Après la frappe, demandez à l'enfant de relire les mêmes mots dans un livre, une phrase ou une carte. Cela relie le clavier à la vraie lecture. Si un mot est facile à taper mais difficile en contexte, gardez-le dans la prochaine liste.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Exemples de groupes",
        "Regroupez le vocabulaire par thème plutôt que de coller tout le chapitre. Une liste de sciences peut utiliser habitat, predator, energy et classify. Une liste d'histoire peut utiliser colony, treaty, empire et reform. Les petits groupes aident à garder le contexte.",
      ],
      [
        "Associer frappe et sens",
        "Le jeu vérifie la reconnaissance et l'orthographe, mais le vocabulaire demande aussi le sens. Après une partie, choisissez trois mots manqués et demandez à l'élève de les expliquer, les dessiner ou les employer dans une phrase. Puis relancez ces mots.",
      ],
      [
        "Avant et après un contrôle",
        "Avant un contrôle, utilisez la page pour trouver les mots fragiles. Après le contrôle, collez seulement les mots manqués ou devinés. L'outil sert alors à préparer et à corriger sans répéter tout le chapitre.",
      ],
    ],
  },
  id: {
    "homeschool-spelling-practice": [
      [
        "Checklist singkat untuk orang tua",
        "Sebelum ronde, pastikan daftar masih sesuai, tidak terlalu panjang, dan tidak berisi tanda baca yang mengganggu. Saat ronde berjalan, biarkan anak mengetik tanpa dikoreksi setiap huruf. Setelah selesai, gunakan kata yang salah sebagai bahan mengajar.",
      ],
      [
        "Kapan mengganti daftar",
        "Pertahankan kata selama masih membuat anak ragu. Hapus ketika siswa bisa mengeja benar dalam lebih dari satu ronde dan mengenalinya saat membaca atau menulis. Tambahkan kata baru pelan-pelan agar review dan rasa percaya diri tetap ada.",
      ],
      [
        "Review tanpa tekanan besar",
        "Belajar spelling di rumah bisa terasa personal karena orang tua juga menjadi guru. Ronde singkat memberi jarak: halaman menunjukkan kata yang salah, lalu ronde berikutnya menjadi latihan, bukan kritik. Ini membuat pengulangan kata sulit lebih tenang.",
      ],
    ],
    "sight-word-typing-game": [
      [
        "Perhatikan kata yang mirip",
        "Daftar kata umum sering berisi kata yang terlihat mirip, seperti where, were, there, their, then, dan than. Saat diketik, perbedaannya lebih terlihat. Jika anak salah, bandingkan pelan-pelan sebelum memainkan ulang kata itu.",
      ],
      [
        "Buat ronde tetap ringan",
        "Pembaca awal tidak perlu sesi skor yang panjang. Daftar pendek, satu ronde cepat, dan satu percobaan lagi sudah cukup. Rayakan kata yang lancar dan kata yang berhasil diperbaiki. Tujuannya familiar, bukan ujian cepat.",
      ],
      [
        "Baca lagi setelah mengetik",
        "Setelah mengetik, minta anak membaca kata yang sama di buku, kalimat, atau kartu. Ini menghubungkan latihan keyboard kembali ke membaca sungguhan. Jika kata mudah diketik tetapi sulit dibaca dalam konteks, masukkan lagi ke daftar berikutnya.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Contoh kelompok kata",
        "Kelompokkan kosakata berdasarkan topik, bukan langsung satu bab penuh. Daftar sains bisa memakai habitat, predator, energy, dan classify. Daftar sejarah bisa memakai colony, treaty, empire, dan reform. Kelompok kecil membantu siswa mengingat konteks.",
      ],
      [
        "Gabungkan mengetik dan makna",
        "Game mengecek spelling dan pengenalan, tetapi kosakata juga butuh arti. Setelah ronde, pilih tiga kata yang salah dan minta siswa menjelaskan, menggambar, atau membuat kalimat. Setelah itu ulangi kata tersebut.",
      ],
      [
        "Sebelum dan sesudah kuis",
        "Sebelum kuis, pakai halaman ini untuk menemukan kata yang masih lemah. Setelah kuis, tempel hanya kata yang salah atau ditebak. Dengan begitu latihan berguna untuk persiapan dan perbaikan tanpa mengulang semua kata.",
      ],
    ],
  },
  zh: {
    "homeschool-spelling-practice": [
      [
        "家长快速检查清单",
        "开始前先确认词表是本周正在学的内容，数量不要太多，也不要带多余标点。练习时尽量让孩子自己输入，不要每个字母都立刻纠正。结束后再把漏掉的词拿出来讲，这样练习不会变成另一张练习卷。",
      ],
      [
        "什么时候更换词表",
        "只要某个词还会让孩子犹豫，就可以继续留在词表里。当孩子能在不止一轮中拼对，并且在阅读或写作里也能认出这个词，再把它移出。新词慢慢加入，复习和信心都能保留下来。",
      ],
      [
        "降低家庭练习压力",
        "家长既是陪练又像老师，拼写练习有时容易变成压力。短游戏轮次能把问题客观化：页面显示哪些词漏掉了，下一轮只是练习，不是批评。这样反复练难词会轻松很多。",
      ],
    ],
    "sight-word-typing-game": [
      [
        "留意长得像的词",
        "高频词表里经常有看起来很像的词，比如 where、were、there、their、then 和 than。打字会让这些差异更明显。如果孩子漏掉其中一个，可以在重练前把两个词放在一起慢慢比较。",
      ],
      [
        "让练习保持轻松",
        "早期阅读阶段不需要很长的计分练习。短词表、一轮快速练习、一次错词重试就够了。熟练的词值得鼓励，改正的词也值得鼓励。目标是让常见词变熟，而不是制造考试感。",
      ],
      [
        "打完以后再读出来",
        "打字结束后，可以让孩子在书、句子条或词卡里再读一遍同样的词。这样能把键盘识别连接回真实阅读。如果某个词打得出来，但放在句子里还是读不顺，就继续留在下次短词表里。",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "按主题分组词汇",
        "不要总是一次粘贴整章词汇，可以按主题分组。科学词表可以放 habitat、predator、energy、classify，历史词表可以放 colony、treaty、empire、reform。小组练习更容易记住词汇所在的语境。",
      ],
      [
        "把拼写和意思连起来",
        "游戏主要检查认读和拼写，但词汇学习还需要理解意思。一轮结束后，可以挑三个错词，让学生解释、画出来或造句，然后再重练这些词。拼写和理解放在一起，复习会更扎实。",
      ],
      [
        "测验前后都能用",
        "测验前可以用它找出还不稳的词。测验后可以只粘贴答错或猜对的词，做一次针对性复盘。这样工具不仅能帮助准备，也能帮助订正，而不是每次都重复整章内容。",
      ],
    ],
  },
};

for (const [langCode, panelsBySlug] of Object.entries(longtailFollowupPanels)) {
  for (const [slug, panels] of Object.entries(panelsBySlug)) {
    const page = pages[langCode] && pages[langCode][slug];
    if (!page) continue;
    page.panels.push(...panels);
  }
}

const longtailFinalPanels = {
  en: {
    "sight-word-typing-game": [
      [
        "When A Word Stays Hard",
        "If the same sight word is missed again and again, do not keep adding new words. Keep the next list shorter, write the hard word on paper, compare it with a similar word, and replay it later. Repeated misses are useful signals, not failures.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Handling Long Or Technical Words",
        "Long vocabulary words are easier when students notice chunks: prefixes, roots, endings, and repeated letter patterns. If a term feels too hard, say it slowly, break it into parts, then type it again. This keeps technical vocabulary from becoming a memory-only exercise.",
      ],
    ],
  },
  es: {
    "sight-word-typing-game": [
      [
        "Cuando una palabra sigue costando",
        "Si la misma palabra frecuente falla varias veces, no agregues más palabras todavía. Haz la próxima lista más corta, escribe la palabra difícil en papel, compárala con una parecida y repítela después. Los errores repetidos son señales útiles, no fracasos.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Palabras largas o técnicas",
        "Las palabras largas son más fáciles cuando el estudiante ve partes: prefijos, raíces, terminaciones y patrones de letras. Si un término parece difícil, léelo despacio, divídelo y vuelve a escribirlo. Así el vocabulario técnico no depende solo de memoria.",
      ],
    ],
  },
  "pt-BR": {
    "sight-word-typing-game": [
      [
        "Quando uma palavra continua difícil",
        "Se a mesma palavra frequente aparece errada várias vezes, não adicione mais palavras ainda. Deixe a próxima lista menor, escreva a palavra difícil no papel, compare com uma parecida e repita depois. Erros repetidos são sinais úteis, não fracassos.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Palavras longas ou técnicas",
        "Palavras longas ficam mais fáceis quando o aluno percebe partes: prefixos, raízes, finais e padrões de letras. Se um termo parecer difícil, leia devagar, divida em pedaços e digite de novo. Assim o vocabulário técnico não vira só memória.",
      ],
    ],
  },
  fr: {
    "sight-word-typing-game": [
      [
        "Quand un mot reste difficile",
        "Si le même mot fréquent est manqué plusieurs fois, n'ajoutez pas encore de nouveaux mots. Gardez une liste plus courte, écrivez le mot difficile, comparez-le avec un mot proche et reprenez-le plus tard. Les erreurs répétées sont des indices utiles, pas des échecs.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Mots longs ou techniques",
        "Les mots longs deviennent plus accessibles quand l'élève voit les morceaux: préfixes, racines, terminaisons et lettres répétées. Si un terme semble difficile, lisez-le lentement, découpez-le, puis tapez-le de nouveau. Le vocabulaire technique devient moins mécanique.",
      ],
    ],
  },
  id: {
    "sight-word-typing-game": [
      [
        "Saat satu kata tetap sulit",
        "Jika kata umum yang sama salah berkali-kali, jangan langsung menambah kata baru. Buat daftar berikutnya lebih pendek, tulis kata sulit di kertas, bandingkan dengan kata yang mirip, lalu ulangi nanti. Kesalahan berulang adalah petunjuk, bukan kegagalan.",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "Kata panjang atau teknis",
        "Kata panjang lebih mudah saat siswa melihat bagian-bagiannya: awalan, akar kata, akhiran, dan pola huruf. Jika satu istilah terasa sulit, baca pelan-pelan, bagi menjadi bagian kecil, lalu ketik lagi. Kosakata teknis tidak hanya menjadi hafalan.",
      ],
    ],
  },
  zh: {
    "sight-word-typing-game": [
      [
        "某个词一直错怎么办",
        "如果同一个高频词反复漏掉，不要急着继续加新词。下一轮可以把词表缩短，把这个难词写在纸上，和相似词放在一起比较，过一会儿再重练。反复错不是失败，而是在提示下一步该练哪里。",
      ],
    ],
    "vocabulary-typing-game": [
      [
        "处理长词和术语",
        "长词和学科术语更适合拆开看，比如前缀、词根、后缀和重复字母组合。如果一个词太难，可以先慢慢读出来，拆成几段，再重新输入。这样技术词汇就不只是死记硬背。",
      ],
    ],
  },
};

for (const [langCode, panelsBySlug] of Object.entries(longtailFinalPanels)) {
  for (const [slug, panels] of Object.entries(panelsBySlug)) {
    const page = pages[langCode] && pages[langCode][slug];
    if (!page) continue;
    page.panels.push(...panels);
  }
}

// ponytail: keep only topic-specific blocks; common product questions live on FAQ.
const compactPanelIndexes = {
  "homeschool-spelling-practice": [2, 3, 4],
  "sight-word-typing-game": [2, 3, 4],
  "vocabulary-typing-game": [2, 3, 4],
};
for (const pagesBySlug of Object.values(pages)) {
  for (const [slug, indexes] of Object.entries(compactPanelIndexes)) {
    const page = pagesBySlug[slug];
    if (!page) continue;
    page.panels = indexes.map((index) => page.panels[index]);
    page.faq = page.faq.slice(-3);
  }
}

for (const [langCode, panel] of Object.entries(homeschoolProgressPanels)) {
  const page = pages[langCode]?.["homeschool-spelling-practice"];
  if (page) page.panels.push(panel);
}

const existingFaq = {
  es: {
    "spelling-list-game": {
      faq: [
        [
          "¿Puedo convertir cualquier lista en un juego?",
          "Sí. Pega la lista y My Spelling Game usa solo esas palabras.",
        ],
        [
          "¿Sirve para listas de clase?",
          "Sí. El profesor puede compartir el mismo enlace sin cuentas de estudiante.",
        ],
        [
          "¿Se pueden repetir las palabras falladas?",
          "Sí. Las palabras falladas quedan listas para otra ronda.",
        ],
      ],
      breadcrumb: "Juego con lista de spelling",
    },
    "weekly-spelling-practice": {
      faq: [
        [
          "¿Puedo usar la lista de esta semana?",
          "Sí. Pega la lista semanal y empieza una ronda corta.",
        ],
        [
          "¿Puedo reutilizar el enlace durante la semana?",
          "Sí. El enlace conserva la misma lista sin pedir cuenta.",
        ],
        [
          "¿Qué conviene repasar antes de la prueba?",
          "Las palabras falladas, porque muestran dónde falta práctica.",
        ],
      ],
      breadcrumb: "Práctica semanal de spelling",
    },
  },
  "pt-BR": {
    "spelling-list-game": {
      faq: [
        [
          "Posso transformar qualquer lista em jogo?",
          "Sim. Cole a lista e o jogo usa apenas essas palavras.",
        ],
        [
          "Serve para listas da escola?",
          "Sim. O professor pode compartilhar o mesmo link sem contas de aluno.",
        ],
        [
          "Dá para revisar palavras erradas?",
          "Sim. As palavras erradas ficam prontas para outra rodada.",
        ],
      ],
      breadcrumb: "Jogo com lista de palavras",
    },
    "weekly-spelling-practice": {
      faq: [
        [
          "Posso usar a lista desta semana?",
          "Sim. Cole a lista semanal e comece uma rodada curta.",
        ],
        [
          "Posso reutilizar o link durante a semana?",
          "Sim. O link mantém a mesma lista sem pedir conta.",
        ],
        [
          "O que revisar antes da prova?",
          "As palavras erradas, porque mostram onde ainda falta prática.",
        ],
      ],
      breadcrumb: "Prática semanal",
    },
  },
  fr: {
    "spelling-list-game": {
      faq: [
        [
          "Puis-je transformer n’importe quelle liste en jeu ?",
          "Oui. Collez la liste et le jeu utilise seulement ces mots.",
        ],
        [
          "Est-ce adapté aux listes de classe ?",
          "Oui. L’enseignant peut partager le même lien sans comptes élèves.",
        ],
        [
          "Peut-on refaire les mots manqués ?",
          "Oui. Les mots manqués sont prêts pour une autre partie.",
        ],
      ],
      breadcrumb: "Jeu avec liste de mots",
    },
    "weekly-spelling-practice": {
      faq: [
        [
          "Puis-je utiliser la liste de cette semaine ?",
          "Oui. Collez la liste hebdomadaire et lancez une partie courte.",
        ],
        [
          "Puis-je réutiliser le lien pendant la semaine ?",
          "Oui. Le lien garde la même liste sans demander de compte.",
        ],
        [
          "Que réviser avant le contrôle ?",
          "Les mots manqués, car ils indiquent ce qui demande encore du travail.",
        ],
      ],
      breadcrumb: "Pratique hebdomadaire",
    },
  },
  id: {
    "spelling-list-game": {
      faq: [
        [
          "Bisa mengubah daftar kata apa saja menjadi game?",
          "Bisa. Tempel daftar dan game hanya memakai kata itu.",
        ],
        [
          "Cocok untuk daftar dari guru?",
          "Cocok. Guru bisa membagikan link yang sama tanpa akun siswa.",
        ],
        [
          "Bisa ulangi kata yang salah?",
          "Bisa. Kata yang salah siap dimainkan lagi.",
        ],
      ],
      breadcrumb: "Game daftar kata",
    },
    "weekly-spelling-practice": {
      faq: [
        [
          "Bisa memakai daftar kata minggu ini?",
          "Bisa. Tempel daftar mingguan dan mulai ronde singkat.",
        ],
        [
          "Bisa pakai link yang sama sepanjang minggu?",
          "Bisa. Link menyimpan daftar yang sama tanpa akun.",
        ],
        [
          "Apa yang perlu diulang sebelum kuis?",
          "Kata yang salah, karena itu menunjukkan bagian yang masih perlu latihan.",
        ],
      ],
      breadcrumb: "Latihan mingguan",
    },
  },
  zh: {
    "spelling-list-game": {
      faq: [
        [
          "任何英语单词表都能变成游戏吗？",
          "可以。粘贴单词表后，游戏只使用这些词。",
        ],
        [
          "适合老师布置的词表吗？",
          "适合。老师可以分享同一个链接，不需要学生账号。",
        ],
        ["能重练漏掉的单词吗？", "可以。漏掉的词会整理出来进入下一轮。"],
      ],
      breadcrumb: "英语单词表拼写游戏",
    },
    "weekly-spelling-practice": {
      faq: [
        [
          "可以用本周英语单词表吗？",
          "可以。粘贴本周词表后直接开始短轮次练习。",
        ],
        [
          "一周里可以重复用同一个链接吗？",
          "可以。链接会保留同一份词表，不需要登录。",
        ],
        ["测验前应该重点练什么？", "优先练漏掉的词，因为它们最能暴露薄弱点。"],
      ],
      breadcrumb: "每周英语拼写练习",
    },
  },
};

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

const parentLandingCopy = {
  en: {
    title: "Spelling Practice for Parents | My Spelling Game",
    description:
      "Paste this week's school spelling words and start a no-login listening practice. Paid Parent tools add photo import, automatic example sentences, Today's Review, and long-term progress in Workspace.",
    ogDescription:
      "Turn this week's school words into independent spelling practice with optional photo import and sentence help, then track results and progress.",
    h1: "Spelling Practice Your Child Can Do Independently",
    eyebrow: "For busy parents",
    intro:
      "You do not have to read every word aloud. Paste the school's list, start a listening practice now, or use Workspace to share it and follow the results.",
    heroPoints: [
      "No child account or password",
      "Use this week's exact spelling list",
      "Retry missed words in short rounds",
    ],
    launcherLabel: "This week's spelling words",
    launcherButton: "Start Practice",
    launcherHelp: "No login needed · Up to 20 words",
    flowTitle: "From the school list to useful progress",
    flow: [
      "Enter this week's words",
      "Share the practice link",
      "Your child practices independently",
      "See results and long-term progress",
    ],
    featuresTitle: "Core tools for a calmer spelling routine",
    featuresIntro:
      "Start with the basics, then add focused review and faster list setup when you need it.",
    features: [
      [
        "Learner Profiles",
        "Give each child one profile and a simple practice link—no child account or password.",
      ],
      [
        "Learning Progress",
        "See completed practices, scores, missed words, and improvement across assignments.",
      ],
      [
        "Mastery",
        "Know which words are still being learned and which are consistently mastered.",
      ],
      [
        "Smart Review",
        "Turn real mistakes into focused follow-up practice instead of repeating the whole list.",
      ],
      [
        "Photo Import",
        "Bring in a school spelling list from a photo, then review the words before using them.",
      ],
      [
        "Automatic Example Sentences",
        "Fill known words with example sentences from the curated library, with editing before use.",
      ],
    ],
    planComparisonTitle: "Free Plan vs Parent Plan",
    planComparisonIntro:
      "Both plans keep practice simple for children. The Parent Plan adds the tools and history that make weekly routines easier to run.",
    freePlanFeatures: [
      "Learner profiles",
      "Learning progress and mastery",
      "Basic assignments and saved lists",
    ],
    paidPlanFeatures: [
      "Everything in Free Workspace",
      "Smart Review and Today's Review",
      "Photo Import and automatic example sentences",
      "Up to 5 children and 365-day history",
    ],
    ctaTitle: "Ready to stop running the spelling test yourself?",
    ctaText:
      "Open Workspace to create and share a tracked assignment, or compare the Parent Plan for a longer family history.",
    workspace: "Open Workspace",
    plan: "View Parent Plan",
    faq: [
      [
        "Can my child start without an account?",
        "Yes. The practice above opens immediately without a login. Workspace assignments also use a child-friendly link instead of a child account or password.",
      ],
      [
        "Will My Spelling Game read the words aloud?",
        "Yes. Listening practice uses browser speech so your child can hear each word and type it independently.",
      ],
      [
        "How do I see results over time?",
        "Create a learner in Workspace and share a tracked assignment. Completed results then stay connected to that learner's progress and mastery history.",
      ],
    ],
  },
  es: {
    title: "Práctica de ortografía para familias | My Spelling Game",
    description:
      "Pega las palabras de ortografía de esta semana y empieza una práctica de dictado sin cuenta. Los planes para familias añaden importación por foto, frases automáticas, Repaso de hoy y progreso en el espacio de trabajo.",
    ogDescription:
      "Convierte las palabras de la escuela en práctica independiente con importación por foto y frases de apoyo, y sigue el progreso.",
    h1: "Práctica de ortografía que tu hijo puede hacer solo",
    eyebrow: "Para familias con poco tiempo",
    intro:
      "No tienes que dictar cada palabra. Pega la lista de la escuela y empieza ahora, o compártela desde el espacio de trabajo para seguir los resultados.",
    heroPoints: [
      "Sin cuenta ni contraseña para tu hijo",
      "Usa exactamente la lista de esta semana",
      "Repite las palabras falladas en rondas cortas",
    ],
    launcherLabel: "Palabras de esta semana",
    launcherButton: "Empezar práctica",
    launcherHelp: "Sin iniciar sesión · Hasta 20 palabras",
    flowTitle: "De la lista escolar al progreso real",
    flow: [
      "Introduce las palabras de la semana",
      "Comparte el enlace de práctica",
      "Tu hijo practica de forma independiente",
      "Consulta resultados y progreso a largo plazo",
    ],
    featuresTitle: "Herramientas clave para una rutina más sencilla",
    featuresIntro:
      "Empieza con lo básico y añade repasos guiados y una preparación más rápida cuando lo necesites.",
    features: [
      [
        "Perfiles de estudiantes",
        "Cada niño tiene un perfil y un enlace sencillo, sin cuenta ni contraseña infantil.",
      ],
      [
        "Progreso de aprendizaje",
        "Consulta prácticas terminadas, resultados, errores y mejoras entre tareas.",
      ],
      [
        "Dominio",
        "Distingue las palabras que aún está aprendiendo de las que ya domina de forma constante.",
      ],
      [
        "Repaso inteligente",
        "Convierte errores reales en práctica específica sin repetir toda la lista.",
      ],
      [
        "Importar desde una foto",
        "Importa la lista de spelling de la escuela desde una foto y revisa las palabras antes de usarlas.",
      ],
      [
        "Frases de ejemplo automáticas",
        "Completa palabras conocidas con frases de la biblioteca seleccionada y edítalas antes de usarlas.",
      ],
    ],
    planComparisonTitle: "Plan gratuito vs Plan para familias",
    planComparisonIntro:
      "Ambos planes mantienen la práctica sencilla para los niños. El Plan para familias añade herramientas e historial para facilitar la rutina semanal.",
    freePlanFeatures: [
      "Perfiles de estudiantes",
      "Progreso de aprendizaje y dominio",
      "Tareas básicas y listas guardadas",
    ],
    paidPlanFeatures: [
      "Todo lo incluido en el espacio gratuito",
      "Repaso inteligente y Repaso de hoy",
      "Importación por foto y frases automáticas",
      "Hasta 5 hijos y 365 días de historial",
    ],
    ctaTitle: "¿Quieres dejar de hacer tú el dictado?",
    ctaText:
      "Abre el espacio de trabajo para crear una tarea con seguimiento o consulta el Plan para familias.",
    workspace: "Abrir espacio de trabajo",
    plan: "Ver Plan para familias",
    faq: [
      [
        "¿Mi hijo puede empezar sin una cuenta?",
        "Sí. La práctica de arriba se abre sin iniciar sesión. Las tareas del espacio de trabajo también usan un enlace, sin cuenta ni contraseña infantil.",
      ],
      [
        "¿My Spelling Game lee las palabras en voz alta?",
        "Sí. El modo de dictado usa la voz del navegador para que el niño escuche y escriba cada palabra por su cuenta.",
      ],
      [
        "¿Cómo veo los resultados a lo largo del tiempo?",
        "Crea un perfil en el espacio de trabajo y comparte una tarea con seguimiento. Los resultados quedarán vinculados a su progreso y dominio.",
      ],
    ],
  },
  "pt-BR": {
    title: "Prática de ortografia para pais | My Spelling Game",
    description:
      "Cole as palavras da escola desta semana e comece um ditado sem conta. O plano para Pais acrescenta importação por foto, frases automáticas, Revisão de hoje e progresso no espaço de trabalho.",
    ogDescription:
      "Transforme as palavras da escola em prática independente com importação por foto e frases de apoio, e acompanhe o progresso.",
    h1: "Prática de ortografia que seu filho faz sozinho",
    eyebrow: "Para responsáveis com pouco tempo",
    intro:
      "Você não precisa ditar cada palavra. Cole a lista da escola e comece agora, ou compartilhe pelo espaço de trabalho para acompanhar os resultados.",
    heroPoints: [
      "Sem conta ou senha para a criança",
      "Use exatamente a lista de ortografia da semana",
      "Repita palavras erradas em sessões curtas",
    ],
    launcherLabel: "Palavras desta semana",
    launcherButton: "Começar prática",
    launcherHelp: "Sem login · Até 20 palavras",
    flowTitle: "Da lista da escola ao progresso real",
    flow: [
      "Digite as palavras da semana",
      "Compartilhe o link da prática",
      "Seu filho pratica sozinho",
      "Veja resultados e progresso a longo prazo",
    ],
    featuresTitle: "Ferramentas essenciais para uma rotina mais tranquila",
    featuresIntro:
      "Comece com o básico e adicione revisão focada e preparação mais rápida quando precisar.",
    features: [
      [
        "Perfis de alunos",
        "Cada criança tem um perfil e um link simples, sem conta ou senha infantil.",
      ],
      [
        "Progresso de aprendizagem",
        "Veja práticas concluídas, resultados, erros e melhora entre atividades.",
      ],
      [
        "Domínio",
        "Saiba quais palavras ainda estão sendo aprendidas e quais já foram dominadas com consistência.",
      ],
      [
        "Revisão inteligente",
        "Transforme erros reais em prática focada sem repetir a lista inteira.",
      ],
      [
        "Importar por foto",
        "Importe a lista de ortografia da escola por foto e revise as palavras antes de usá-las.",
      ],
      [
        "Frases de exemplo automáticas",
        "Preencha palavras conhecidas com frases da biblioteca selecionada e edite-as antes de usar.",
      ],
    ],
    planComparisonTitle: "Plano gratuito vs Plano para Pais",
    planComparisonIntro:
      "Os dois planos mantêm a prática simples para as crianças. O Plano para Pais acrescenta ferramentas e histórico para facilitar a rotina semanal.",
    freePlanFeatures: [
      "Perfis de alunos",
      "Progresso de aprendizagem e domínio",
      "Atividades básicas e listas salvas",
    ],
    paidPlanFeatures: [
      "Tudo do Espaço de trabalho gratuito",
      "Revisão inteligente e Revisão de hoje",
      "Importação por foto e frases automáticas",
      "Até 5 filhos e histórico de 365 dias",
    ],
    ctaTitle: "Pronto para não precisar mais fazer o ditado?",
    ctaText:
      "Abra o espaço de trabalho para criar uma atividade acompanhada ou conheça o Plano para Pais.",
    workspace: "Abrir espaço de trabalho",
    plan: "Ver Plano para Pais",
    faq: [
      [
        "Meu filho pode começar sem uma conta?",
        "Sim. A prática acima abre sem login. As atividades do espaço de trabalho também usam um link, sem conta ou senha infantil.",
      ],
      [
        "O My Spelling Game fala as palavras?",
        "Sim. O modo ditado usa a voz do navegador para a criança ouvir e digitar cada palavra sozinha.",
      ],
      [
        "Como vejo os resultados ao longo do tempo?",
        "Crie um perfil no espaço de trabalho e compartilhe uma atividade acompanhada. Os resultados ficam ligados ao progresso e domínio desse perfil.",
      ],
    ],
  },
  fr: {
    title: "Exercices d’orthographe pour les parents | My Spelling Game",
    description:
      "Collez les mots de la semaine et lancez une dictée sans compte. L’offre Parents ajoute l’import photo, les phrases automatiques, la Révision du jour et le suivi dans l’espace de travail.",
    ogDescription:
      "Transformez la liste de l’école en exercice autonome avec import photo et phrases d’aide, puis suivez les progrès.",
    h1: "Un exercice d’orthographe que votre enfant fait en autonomie",
    eyebrow: "Pour les parents pressés",
    intro:
      "Vous n’avez pas à dicter chaque mot. Collez la liste de l’école et commencez maintenant, ou partagez-la depuis l’espace de travail pour suivre les résultats.",
    heroPoints: [
      "Aucun compte ni mot de passe pour l’enfant",
      "Utilisez exactement la liste de la semaine",
      "Revoyez les mots manqués en courtes séances",
    ],
    launcherLabel: "Mots de cette semaine",
    launcherButton: "Commencer",
    launcherHelp: "Sans connexion · Jusqu’à 20 mots",
    flowTitle: "De la liste de l’école aux vrais progrès",
    flow: [
      "Saisissez les mots de la semaine",
      "Partagez le lien d’exercice",
      "Votre enfant s’entraîne en autonomie",
      "Consultez les résultats et les progrès dans le temps",
    ],
    featuresTitle: "Les outils essentiels pour une routine plus simple",
    featuresIntro:
      "Commencez avec l’essentiel, puis ajoutez la révision ciblée et une préparation plus rapide si besoin.",
    features: [
      [
        "Profils des élèves",
        "Chaque enfant a un profil et un lien simple, sans compte ni mot de passe enfant.",
      ],
      [
        "Progression d’apprentissage",
        "Consultez les exercices terminés, les résultats, les erreurs et l’évolution entre les devoirs.",
      ],
      [
        "Maîtrise",
        "Distinguez les mots encore en cours d’apprentissage de ceux maîtrisés régulièrement.",
      ],
      [
        "Révision intelligente",
        "Transformez les vraies erreurs en exercice ciblé sans refaire toute la liste.",
      ],
      [
        "Import par photo",
        "Importez la liste d’orthographe de l’école depuis une photo et vérifiez les mots avant de les utiliser.",
      ],
      [
        "Phrases d’exemple automatiques",
        "Complétez les mots connus avec la bibliothèque sélectionnée et modifiez les phrases avant usage.",
      ],
    ],
    planComparisonTitle: "Offre gratuite vs Offre Parents",
    planComparisonIntro:
      "Les deux formules gardent l’exercice simple pour les enfants. L’Offre Parents ajoute les outils et l’historique qui facilitent la routine hebdomadaire.",
    freePlanFeatures: [
      "Profils des élèves",
      "Progression et maîtrise",
      "Devoirs de base et listes enregistrées",
    ],
    paidPlanFeatures: [
      "Tout l’Espace de travail gratuit",
      "Révision intelligente et Révision du jour",
      "Import par photo et phrases automatiques",
      "Jusqu’à 5 enfants et historique sur 365 jours",
    ],
    ctaTitle: "Prêt à ne plus faire la dictée vous-même ?",
    ctaText:
      "Ouvrez l’espace de travail pour créer un devoir suivi ou découvrez l’Offre Parents.",
    workspace: "Ouvrir l’espace de travail",
    plan: "Voir l’Offre Parents",
    faq: [
      [
        "Mon enfant peut-il commencer sans compte ?",
        "Oui. L’exercice ci-dessus s’ouvre sans connexion. Les devoirs de l’espace de travail utilisent aussi un lien, sans compte ni mot de passe enfant.",
      ],
      [
        "My Spelling Game prononce-t-il les mots ?",
        "Oui. Le mode dictée utilise la voix du navigateur pour que l’enfant écoute et saisisse chaque mot seul.",
      ],
      [
        "Comment suivre les résultats dans le temps ?",
        "Créez un profil dans l’espace de travail et partagez un devoir suivi. Les résultats restent liés à la progression et à la maîtrise de ce profil.",
      ],
    ],
  },
  id: {
    title: "Latihan ejaan untuk orang tua | My Spelling Game",
    description:
      "Tempel kata sekolah minggu ini dan mulai latihan dikte tanpa akun. Paket Orang Tua menambahkan impor foto, kalimat otomatis, Ulasan hari ini, dan perkembangan di ruang kerja.",
    ogDescription:
      "Ubah kata dari sekolah menjadi latihan mandiri dengan impor foto dan kalimat bantuan, lalu pantau perkembangannya.",
    h1: "Latihan ejaan yang bisa dilakukan anak secara mandiri",
    eyebrow: "Untuk orang tua yang sibuk",
    intro:
      "Anda tidak perlu mendikte setiap kata. Tempel daftar dari sekolah dan mulai sekarang, atau bagikan melalui ruang kerja untuk memantau hasilnya.",
    heroPoints: [
      "Anak tidak perlu akun atau kata sandi",
      "Gunakan daftar ejaan minggu ini apa adanya",
      "Ulangi kata yang salah dalam sesi singkat",
    ],
    launcherLabel: "Kata minggu ini",
    launcherButton: "Mulai latihan",
    launcherHelp: "Tanpa login · Hingga 20 kata",
    flowTitle: "Dari daftar sekolah ke perkembangan nyata",
    flow: [
      "Masukkan kata minggu ini",
      "Bagikan link latihan",
      "Anak berlatih sendiri",
      "Lihat hasil dan perkembangan jangka panjang",
    ],
    featuresTitle: "Alat utama untuk rutinitas ejaan yang lebih tenang",
    featuresIntro:
      "Mulai dari dasar, lalu tambahkan ulasan terarah dan penyiapan daftar yang lebih cepat saat diperlukan.",
    features: [
      [
        "Profil pelajar",
        "Setiap anak memiliki profil dan link sederhana, tanpa akun atau kata sandi anak.",
      ],
      [
        "Perkembangan belajar",
        "Lihat latihan selesai, hasil, kata yang salah, dan peningkatan antar-tugas.",
      ],
      [
        "Penguasaan",
        "Ketahui kata yang masih dipelajari dan kata yang sudah dikuasai secara konsisten.",
      ],
      [
        "Ulasan pintar",
        "Ubah kesalahan nyata menjadi latihan terarah tanpa mengulang seluruh daftar.",
      ],
      [
        "Impor foto",
        "Impor daftar ejaan sekolah dari foto, lalu periksa kata sebelum digunakan.",
      ],
      [
        "Kalimat contoh otomatis",
        "Isi kata yang dikenal dengan kalimat dari pustaka pilihan, lalu edit sebelum digunakan.",
      ],
    ],
    planComparisonTitle: "Paket Gratis vs Paket Orang Tua",
    planComparisonIntro:
      "Kedua pilihan menjaga latihan tetap sederhana bagi anak. Paket Orang Tua menambahkan alat dan riwayat untuk memudahkan rutinitas mingguan.",
    freePlanFeatures: [
      "Profil pelajar",
      "Perkembangan belajar dan penguasaan",
      "Tugas dasar dan daftar tersimpan",
    ],
    paidPlanFeatures: [
      "Semua fitur Ruang Kerja Gratis",
      "Ulasan pintar dan Ulasan hari ini",
      "Impor foto dan kalimat contoh otomatis",
      "Hingga 5 anak dan riwayat 365 hari",
    ],
    ctaTitle: "Siap berhenti mendikte sendiri?",
    ctaText:
      "Buka ruang kerja untuk membuat tugas terlacak atau lihat Paket Orang Tua.",
    workspace: "Buka ruang kerja",
    plan: "Lihat Paket Orang Tua",
    faq: [
      [
        "Bisakah anak mulai tanpa akun?",
        "Bisa. Latihan di atas langsung terbuka tanpa login. Tugas dari ruang kerja juga memakai link tanpa akun atau kata sandi anak.",
      ],
      [
        "Apakah My Spelling Game membacakan kata?",
        "Ya. Mode dikte memakai suara browser agar anak dapat mendengar dan mengetik setiap kata sendiri.",
      ],
      [
        "Bagaimana cara melihat hasil dari waktu ke waktu?",
        "Buat profil di ruang kerja dan bagikan tugas terlacak. Hasilnya tetap terhubung dengan perkembangan dan riwayat penguasaan profil itu.",
      ],
    ],
  },
  zh: {
    title: "家长英语拼写练习 | My Spelling Game",
    description:
      "粘贴学校本周英语单词，无需登录即可开始听写练习；家长方案还支持拍照导入、自动例句、今日复习，并在工作台长期追踪进度。",
    ogDescription: "把学校本周词表变成孩子可独立完成的英语拼写练习，并支持拍照导入和自动例句。",
    h1: "孩子可以独立完成的英语拼写练习",
    eyebrow: "为忙碌家长而做",
    intro:
      "家长不需要亲自逐个听写。粘贴学校本周词表即可开始；进入工作台后，还能分享练习链接并持续查看结果。",
    heroPoints: [
      "无需儿童账号或密码",
      "直接使用学校本周原始词表",
      "错词可以用短轮次再次练习",
    ],
    launcherLabel: "学校本周英语单词",
    launcherButton: "开始练习",
    launcherHelp: "无需登录 · 最多 20 个单词",
    flowTitle: "从学校词表到真实学习进度",
    flow: [
      "输入学校本周单词",
      "分享练习链接",
      "孩子独立练习",
      "家长查看结果和长期进度",
    ],
    featuresTitle: "让拼写练习更轻松的核心功能",
    featuresIntro: "先使用基础功能，再按需要加入针对性复习和更快的词表准备。",
    features: [
      ["学习者档案", "每个孩子使用固定档案和简单链接，无需儿童账号或密码。"],
      ["学习进度", "查看已完成练习、成绩、错词，以及不同作业之间的进步。"],
      ["掌握度", "分清仍在学习的单词和已经能够稳定掌握的单词。"],
      ["智能复习", "根据真实错误生成针对性练习，不必反复重练整份词表。"],
      ["拍照导入", "从学校词表照片中提取单词，确认后再加入练习。"],
      ["自动生成例句", "使用精选例句库为已知单词补充例句，使用前仍可编辑。"],
    ],
    planComparisonTitle: "免费方案 vs 家长方案",
    planComparisonIntro:
      "两种方案都让孩子可以轻松开始练习。家长方案增加了更适合长期家庭学习的工具和历史记录。",
    freePlanFeatures: ["学习者档案", "学习进度和掌握度", "基础作业和保存词表"],
    paidPlanFeatures: [
      "包含免费工作台全部功能",
      "智能复习和今日复习",
      "拍照导入和自动生成例句",
      "最多 5 个孩子和 365 天历史记录",
    ],
    ctaTitle: "准备好不再亲自做听写了吗？",
    ctaText: "进入工作台创建并分享可追踪作业，或查看家长方案的完整权益。",
    workspace: "进入工作台",
    plan: "查看家长方案",
    faq: [
      [
        "孩子无需账号也能开始吗？",
        "可以。上方练习无需登录即可直接开始。工作台作业同样通过链接进入，不需要儿童账号和密码。",
      ],
      [
        "My Spelling Game 会自动读出单词吗？",
        "会。听写模式使用浏览器语音，让孩子自己听单词并输入答案。",
      ],
      [
        "怎样查看长期练习结果？",
        "在工作台创建学习者档案并分享可追踪作业，完成结果就会关联到该学习者的进度和掌握度记录。",
      ],
    ],
  },
};

const teacherLandingCopy = {
  en: {
    title: "Spelling Assignments for Teachers | My Spelling Game",
    description:
      "Paste a spelling list, share one link, and track results without student accounts. Teacher Plan adds photo import, automatic example sentences, Today's Review, Smart Review, mastery, and CSV reports.",
    ogDescription:
      "Turn any spelling list into a shareable assignment with photo import and sentence help, then track class results without student accounts.",
    h1: "Assign English Spelling Work Without Student Sign-Ups",
    eyebrow: "For teachers",
    intro:
      "Create assignments from the exact words your class is learning, share one link, and follow every result in Teacher Workspace.",
    heroLine: "Paste your spelling list → Share one link → Track results",
    heroPoints: [
      "Students join without creating accounts",
      "Results are recorded automatically",
      "Track progress over time",
    ],
    heroPreviewTitle: "Teacher feature overview",
    missedWordsPreview: "Missed-word insights",
    launcherLabel: "Your spelling list",
    launcherButton: "Try it now",
    launcherHelp: "No student accounts · Up to 20 words for instant practice",
    flowTitle: "From spelling list to class results",
    flow: ["Paste your spelling list", "Share one link", "Track results"],
    featuresTitle: "Spelling teaching tools teachers need",
    featuresIntro:
      "From assigning work to reviewing scores, missed words, and progress, everything stays in one workspace.",
    features: [
      [
        "No student accounts",
        "Students open a link or use a class PIN without creating an email login or password.",
      ],
      [
        "Assignments",
        "Create a tracked assignment from your own words and share it with the whole class.",
      ],
      [
        "Progress",
        "See submissions, scores, missed words, and improvement across assignments.",
      ],
      [
        "Mastery",
        "Spot the words each student is learning and the words they consistently know.",
      ],
      [
        "Smart Review",
        "Build focused follow-up practice from real mistakes instead of repeating every word.",
      ],
      [
        "Class Join/PIN",
        "Give students one class code and a personal PIN for a quick return to their work.",
      ],
      [
        "CSV",
        "Export assignment and student results for records, reporting, or further analysis.",
      ],
      [
        "Teacher Plan",
        "Support up to 40 students with 5 active assignments, unlimited tracked submissions, and 365-day history.",
      ],
    ],
    planComparisonTitle: "Free Plan vs Teacher Plan",
    planComparisonIntro:
      "Start with basic assignments and progress tracking. Teacher Plan adds review, import, reporting, and classroom capacity for a complete weekly workflow.",
    freePlanFeatures: [
      "Basic assignments from your own words",
      "Learner progress and mastery",
      "No student accounts for practice",
    ],
    paidPlanFeatures: [
      "Everything in Free Workspace",
      "Smart Review and Today's Review",
      "Photo Import and automatic example sentences",
      "Class Join/PIN and CSV Export",
      "Class-wide missed-word statistics",
      "Up to 40 students, 5 active assignments, and 365-day history",
    ],
    ctaTitle: "Ready to create this week's spelling assignment?",
    ctaText:
      "Open Workspace to create a tracked assignment, or compare the Teacher Plan for full class tools.",
    workspace: "Open Teacher Workspace",
    plan: "View Teacher Plan",
    faq: [
      [
        "Do students need accounts?",
        "No. Students can open an assignment link directly or join a class with a code and personal PIN.",
      ],
      [
        "Can I use my own spelling list?",
        "Yes. Paste the exact words your class is learning, then create and share the assignment.",
      ],
      [
        "What results can teachers track?",
        "Workspace records submissions, scores, missed words, progress, and mastery. Teacher Plan also includes CSV export and longer history.",
      ],
    ],
  },
  es: {
    title: "Tareas de ortografía para docentes | My Spelling Game",
    description:
      "Pega una lista de ortografía, comparte un enlace y sigue los resultados sin cuentas para alumnos. El plan para docentes añade importación por foto, frases automáticas, Repaso de hoy, dominio y CSV.",
    ogDescription:
      "Convierte cualquier lista de ortografía en una tarea compartida con importación por foto y frases automáticas, y sigue los resultados sin cuentas.",
    h1: "Asigna tareas de ortografía sin registro para el alumnado",
    eyebrow: "Para docentes",
    intro:
      "Crea tareas con las palabras exactas que estudia tu clase, comparte un enlace y sigue cada resultado en el espacio para docentes.",
    heroLine: "Pega tu lista → Comparte un enlace → Sigue los resultados",
    heroPoints: [
      "El alumnado entra sin registrarse",
      "Los resultados se registran automáticamente",
      "Sigue el progreso a largo plazo",
    ],
    heroPreviewTitle: "Resumen de funciones para docentes",
    missedWordsPreview: "Estadísticas de errores",
    launcherLabel: "Tu lista de ortografía",
    launcherButton: "Probar ahora",
    launcherHelp: "Sin cuentas de alumnos · Hasta 20 palabras en la prueba",
    flowTitle: "De la lista a los resultados de clase",
    flow: ["Pega tu lista", "Comparte un enlace", "Sigue los resultados"],
    featuresTitle: "Herramientas de ortografía que necesita el docente",
    featuresIntro:
      "Desde asignar tareas hasta revisar resultados, errores y progreso, todo queda en un mismo espacio de trabajo.",
    features: [
      [
        "Sin cuentas para alumnos",
        "Los alumnos abren un enlace o usan el PIN de clase, sin correo, cuenta ni contraseña.",
      ],
      [
        "Tareas",
        "Crea una tarea con seguimiento a partir de tus palabras y compártela con toda la clase.",
      ],
      [
        "Progreso",
        "Consulta entregas, resultados, errores y mejoras entre distintas tareas.",
      ],
      [
        "Dominio",
        "Distingue las palabras que cada alumno sigue aprendiendo de las que ya domina.",
      ],
      [
        "Repaso inteligente",
        "Crea prácticas específicas a partir de errores reales sin repetir toda la lista.",
      ],
      [
        "Acceso a clase/PIN",
        "Da a los alumnos un código de clase y un PIN personal para volver rápidamente a sus tareas.",
      ],
      [
        "CSV",
        "Exporta resultados por tarea y alumno para informes, registros o análisis.",
      ],
      [
        "Plan para docentes",
        "Hasta 40 alumnos, 5 tareas activas, entregas registradas ilimitadas y 365 días de historial.",
      ],
    ],
    planComparisonTitle: "Plan gratuito vs Plan para docentes",
    planComparisonIntro:
      "Empieza con tareas básicas y seguimiento del progreso. El Plan para docentes añade repaso, importación, informes y capacidad para la clase.",
    freePlanFeatures: [
      "Tareas básicas con tus propias palabras",
      "Progreso y dominio del alumnado",
      "Práctica sin cuentas para alumnos",
    ],
    paidPlanFeatures: [
      "Todo lo incluido en el espacio gratuito",
      "Repaso inteligente y Repaso de hoy",
      "Importación por foto y frases automáticas",
      "Acceso a clase/PIN y exportación CSV",
      "Estadísticas de errores de toda la clase",
      "Hasta 40 alumnos, 5 tareas activas y 365 días de historial",
    ],
    ctaTitle: "¿Todo listo para crear la tarea de ortografía de esta semana?",
    ctaText:
      "Abre el espacio de trabajo para crear una tarea con seguimiento o consulta el Plan para docentes.",
    workspace: "Abrir espacio para docentes",
    plan: "Ver Plan para docentes",
    faq: [
      [
        "¿Los alumnos necesitan una cuenta?",
        "No. Pueden abrir directamente el enlace de la tarea o entrar con un código de clase y su PIN personal.",
      ],
      [
        "¿Puedo usar mi propia lista de palabras?",
        "Sí. Pega las palabras exactas que está aprendiendo la clase y crea la tarea para compartirla.",
      ],
      [
        "¿Qué resultados puede seguir el docente?",
        "El espacio de trabajo registra entregas, resultados, errores, progreso y dominio. El Plan para docentes añade exportación CSV e historial ampliado.",
      ],
    ],
  },
  "pt-BR": {
    title: "Atividades de ortografia para professores | My Spelling Game",
    description:
      "Cole uma lista de ortografia, compartilhe um link e acompanhe os resultados sem contas de alunos. O plano para Professores acrescenta importação por foto, frases automáticas, Revisão de hoje, domínio e CSV.",
    ogDescription:
      "Transforme qualquer lista de ortografia em uma atividade compartilhável com importação por foto e frases automáticas, e acompanhe a turma sem contas.",
    h1: "Crie atividades de ortografia sem cadastro dos alunos",
    eyebrow: "Para professores",
    intro:
      "Crie atividades com as palavras exatas da turma, compartilhe um link e acompanhe cada resultado no espaço do professor.",
    heroLine: "Cole sua lista → Compartilhe um link → Acompanhe os resultados",
    heroPoints: [
      "Os alunos entram sem criar conta",
      "Os resultados são registrados automaticamente",
      "Acompanhe o progresso ao longo do tempo",
    ],
    heroPreviewTitle: "Visão geral das ferramentas do professor",
    missedWordsPreview: "Estatísticas de erros",
    launcherLabel: "Sua lista de ortografia",
    launcherButton: "Testar agora",
    launcherHelp: "Sem contas de alunos · Até 20 palavras no teste",
    flowTitle: "Da lista aos resultados da turma",
    flow: ["Cole sua lista", "Compartilhe um link", "Acompanhe os resultados"],
    featuresTitle: "Ferramentas de ortografia que o professor precisa",
    featuresIntro:
      "Da criação da atividade à consulta de resultados, erros e progresso, tudo fica em um só espaço de trabalho.",
    features: [
      [
        "Sem contas de alunos",
        "Os alunos abrem um link ou usam o PIN da turma, sem e-mail, conta ou senha.",
      ],
      [
        "Atividades",
        "Crie uma atividade acompanhada com suas palavras e compartilhe com toda a turma.",
      ],
      [
        "Progresso",
        "Veja envios, resultados, palavras erradas e melhora entre atividades.",
      ],
      [
        "Domínio",
        "Saiba quais palavras cada aluno ainda está aprendendo e quais já domina.",
      ],
      [
        "Revisão inteligente",
        "Crie práticas focadas com base nos erros reais sem repetir a lista inteira.",
      ],
      [
        "Entrada na turma/PIN",
        "Dê aos alunos um código da turma e um PIN pessoal para voltar rapidamente às atividades.",
      ],
      [
        "CSV",
        "Exporte resultados por atividade e aluno para registros, relatórios ou análise.",
      ],
      [
        "Plano para Professores",
        "Até 40 alunos, 5 atividades ativas, envios acompanhados ilimitados e histórico de 365 dias.",
      ],
    ],
    planComparisonTitle: "Plano gratuito vs Plano para Professores",
    planComparisonIntro:
      "Comece com atividades básicas e acompanhamento do progresso. O Plano para Professores acrescenta revisão, importação, relatórios e capacidade para a turma.",
    freePlanFeatures: [
      "Atividades básicas com suas próprias palavras",
      "Progresso e domínio dos alunos",
      "Prática sem contas para os alunos",
    ],
    paidPlanFeatures: [
      "Tudo do Espaço de trabalho gratuito",
      "Revisão inteligente e Revisão de hoje",
      "Importação por foto e frases automáticas",
      "Entrada na turma/PIN e exportação CSV",
      "Estatísticas de erros de toda a turma",
      "Até 40 alunos, 5 atividades ativas e histórico de 365 dias",
    ],
    ctaTitle: "Pronto para criar a atividade de ortografia desta semana?",
    ctaText:
      "Abra o espaço de trabalho para criar uma atividade acompanhada ou veja o Plano para Professores.",
    workspace: "Abrir espaço do professor",
    plan: "Ver Plano para Professores",
    faq: [
      [
        "Os alunos precisam de conta?",
        "Não. Eles podem abrir o link da atividade diretamente ou entrar com o código da turma e o PIN pessoal.",
      ],
      [
        "Posso usar minha própria lista de palavras?",
        "Sim. Cole exatamente as palavras que a turma está estudando e crie a atividade para compartilhar.",
      ],
      [
        "Quais resultados o professor pode acompanhar?",
        "O espaço de trabalho registra envios, resultados, erros, progresso e domínio. O Plano para Professores também inclui exportação CSV e histórico ampliado.",
      ],
    ],
  },
  fr: {
    title: "Devoirs d’orthographe pour enseignants | My Spelling Game",
    description:
      "Collez une liste d’orthographe, partagez un lien et suivez les résultats sans compte élève. L’offre Enseignants ajoute l’import photo, les phrases automatiques, la Révision du jour, la maîtrise et le CSV.",
    ogDescription:
      "Transformez une liste d’orthographe en devoir à partager avec import photo et phrases automatiques, puis suivez la classe sans compte élève.",
    h1: "Créez des devoirs d’orthographe sans inscription des élèves",
    eyebrow: "Pour les enseignants",
    intro:
      "Créez des devoirs avec les mots exacts étudiés en classe, partagez un lien et suivez chaque résultat dans l’espace enseignant.",
    heroLine: "Collez votre liste → Partagez un lien → Suivez les résultats",
    heroPoints: [
      "Les élèves participent sans créer de compte",
      "Les résultats sont enregistrés automatiquement",
      "Suivez les progrès dans la durée",
    ],
    heroPreviewTitle: "Aperçu des outils enseignants",
    missedWordsPreview: "Statistiques des erreurs",
    launcherLabel: "Votre liste d’orthographe",
    launcherButton: "Tester maintenant",
    launcherHelp: "Sans compte élève · Jusqu’à 20 mots pour l’essai",
    flowTitle: "De la liste aux résultats de la classe",
    flow: ["Collez votre liste", "Partagez un lien", "Suivez les résultats"],
    featuresTitle: "Les outils d’orthographe dont les enseignants ont besoin",
    featuresIntro:
      "De la création des devoirs au suivi des résultats, des erreurs et des progrès, tout est réuni au même endroit.",
    features: [
      [
        "Sans compte élève",
        "Les élèves ouvrent un lien ou utilisent le code et leur PIN, sans e-mail, compte ni mot de passe.",
      ],
      [
        "Devoirs",
        "Créez un devoir suivi avec vos propres mots et partagez-le avec toute la classe.",
      ],
      [
        "Progression",
        "Consultez les remises, les résultats, les erreurs et l’évolution entre les devoirs.",
      ],
      [
        "Maîtrise",
        "Repérez les mots que chaque élève apprend encore et ceux qu’il maîtrise durablement.",
      ],
      [
        "Révision intelligente",
        "Créez des exercices ciblés à partir des vraies erreurs sans reprendre toute la liste.",
      ],
      [
        "Accès classe/PIN",
        "Donnez aux élèves un code de classe et un PIN personnel pour retrouver rapidement leur travail.",
      ],
      [
        "CSV",
        "Exportez les résultats par devoir et par élève pour vos dossiers, bilans ou analyses.",
      ],
      [
        "Offre Enseignants",
        "Jusqu’à 40 élèves, 5 devoirs actifs, remises suivies illimitées et historique sur 365 jours.",
      ],
    ],
    planComparisonTitle: "Offre gratuite vs Offre Enseignants",
    planComparisonIntro:
      "Commencez avec les devoirs de base et le suivi des progrès. L’Offre Enseignants ajoute la révision, l’import, les rapports et la capacité de classe.",
    freePlanFeatures: [
      "Devoirs de base avec vos propres mots",
      "Progression et maîtrise des élèves",
      "Exercices sans compte élève",
    ],
    paidPlanFeatures: [
      "Tout l’Espace de travail gratuit",
      "Révision intelligente et Révision du jour",
      "Import par photo et phrases automatiques",
      "Accès classe/PIN et export CSV",
      "Statistiques des mots manqués de la classe",
      "Jusqu’à 40 élèves, 5 devoirs actifs et historique sur 365 jours",
    ],
    ctaTitle: "Prêt à créer le devoir d’orthographe de cette semaine ?",
    ctaText:
      "Ouvrez l’espace de travail pour créer un devoir suivi ou découvrez l’Offre Enseignants.",
    workspace: "Ouvrir l’espace enseignant",
    plan: "Voir l’Offre Enseignants",
    faq: [
      [
        "Les élèves ont-ils besoin d’un compte ?",
        "Non. Ils ouvrent directement le lien du devoir ou rejoignent la classe avec un code et leur PIN personnel.",
      ],
      [
        "Puis-je utiliser ma propre liste de mots ?",
        "Oui. Collez exactement les mots étudiés en classe, puis créez et partagez le devoir.",
      ],
      [
        "Quels résultats l’enseignant peut-il suivre ?",
        "L’espace de travail enregistre remises, résultats, erreurs, progression et maîtrise. L’Offre Enseignants ajoute l’export CSV et un historique étendu.",
      ],
    ],
  },
  id: {
    title: "Tugas ejaan untuk guru | My Spelling Game",
    description:
      "Tempel daftar ejaan, bagikan satu link, dan pantau hasil tanpa akun siswa. Paket Guru menambahkan impor foto, kalimat otomatis, Ulasan hari ini, penguasaan, dan CSV.",
    ogDescription:
      "Ubah daftar ejaan menjadi tugas yang mudah dibagikan dengan impor foto dan kalimat otomatis, lalu pantau kelas tanpa akun siswa.",
    h1: "Buat tugas ejaan tanpa pendaftaran siswa",
    eyebrow: "Untuk guru",
    intro:
      "Buat tugas dari kata yang sedang dipelajari kelas, bagikan satu link, lalu pantau setiap hasil di ruang kerja guru.",
    heroLine: "Tempel daftar ejaan → Bagikan satu link → Pantau hasil",
    heroPoints: [
      "Siswa bergabung tanpa membuat akun",
      "Hasil dicatat secara otomatis",
      "Pantau perkembangan dari waktu ke waktu",
    ],
    heroPreviewTitle: "Ringkasan fitur guru",
    missedWordsPreview: "Statistik kata salah",
    launcherLabel: "Daftar ejaan Anda",
    launcherButton: "Coba sekarang",
    launcherHelp: "Tanpa akun siswa · Hingga 20 kata untuk uji coba",
    flowTitle: "Dari daftar ke hasil kelas",
    flow: ["Tempel daftar ejaan", "Bagikan satu link", "Pantau hasil"],
    featuresTitle: "Alat pengajaran ejaan yang dibutuhkan guru",
    featuresIntro:
      "Mulai dari membuat tugas hingga melihat hasil, kata salah, dan perkembangan, semuanya ada di satu ruang kerja.",
    features: [
      [
        "Tanpa akun siswa",
        "Siswa membuka link atau memakai kode kelas dan PIN tanpa email, akun, atau kata sandi.",
      ],
      [
        "Tugas",
        "Buat tugas terlacak dari kata Anda sendiri dan bagikan kepada seluruh kelas.",
      ],
      [
        "Perkembangan",
        "Lihat kiriman, hasil, kata yang salah, dan peningkatan antartugas.",
      ],
      [
        "Penguasaan",
        "Ketahui kata yang masih dipelajari setiap siswa dan yang sudah dikuasai secara konsisten.",
      ],
      [
        "Ulasan pintar",
        "Buat latihan lanjutan dari kesalahan nyata tanpa mengulang seluruh daftar.",
      ],
      [
        "Gabung kelas/PIN",
        "Berikan kode kelas dan PIN pribadi agar siswa cepat kembali ke tugas mereka.",
      ],
      [
        "CSV",
        "Ekspor hasil tugas dan siswa untuk arsip, laporan, atau analisis lanjutan.",
      ],
      [
        "Paket Guru",
        "Hingga 40 siswa, 5 tugas aktif, kiriman terlacak tanpa batas, dan riwayat 365 hari.",
      ],
    ],
    planComparisonTitle: "Paket Gratis vs Paket Guru",
    planComparisonIntro:
      "Mulai dengan tugas dasar dan pemantauan perkembangan. Paket Guru menambahkan ulasan, impor, laporan, dan kapasitas kelas.",
    freePlanFeatures: [
      "Tugas dasar dengan kata-kata Anda sendiri",
      "Perkembangan dan penguasaan siswa",
      "Latihan tanpa akun siswa",
    ],
    paidPlanFeatures: [
      "Semua fitur Ruang Kerja Gratis",
      "Ulasan pintar dan Ulasan hari ini",
      "Impor foto dan kalimat contoh otomatis",
      "Gabung kelas/PIN dan ekspor CSV",
      "Statistik kata salah di seluruh kelas",
      "Hingga 40 siswa, 5 tugas aktif, dan riwayat 365 hari",
    ],
    ctaTitle: "Siap membuat tugas ejaan minggu ini?",
    ctaText:
      "Buka ruang kerja untuk membuat tugas terlacak atau lihat Paket Guru untuk alat kelas lengkap.",
    workspace: "Buka ruang kerja guru",
    plan: "Lihat Paket Guru",
    faq: [
      [
        "Apakah siswa memerlukan akun?",
        "Tidak. Siswa dapat langsung membuka link tugas atau bergabung dengan kode kelas dan PIN pribadi.",
      ],
      [
        "Bisakah saya memakai daftar ejaan sendiri?",
        "Bisa. Tempel kata yang sedang dipelajari kelas, lalu buat dan bagikan tugasnya.",
      ],
      [
        "Hasil apa yang dapat dipantau guru?",
        "Ruang kerja mencatat kiriman, hasil, kesalahan, perkembangan, dan penguasaan. Paket Guru juga mencakup ekspor CSV dan riwayat yang lebih panjang.",
      ],
    ],
  },
  zh: {
    title: "教师英语拼写作业 | My Spelling Game",
    description:
      "粘贴英语词表，分享一个链接，无需学生账号即可追踪结果；教师方案还支持拍照导入、自动例句、今日复习、掌握度、智能复习和 CSV。",
    ogDescription: "把任意英语词表变成可分享、可追踪的班级作业，支持拍照导入和自动例句，无需学生账号。",
    h1: "无需学生注册，轻松布置英语拼写作业",
    eyebrow: "为教师而做",
    intro:
      "使用班级正在学习的准确词表创建作业，分享一个链接，并在教师工作台持续查看每次练习结果。",
    heroLine: "粘贴词表 → 分享一个链接 → 追踪结果",
    heroPoints: [
      "学生无需注册",
      "自动记录结果",
      "长期追踪进度",
    ],
    heroPreviewTitle: "教师功能概览",
    missedWordsPreview: "错词统计",
    launcherLabel: "你的英语拼写词表",
    launcherButton: "立即试用",
    launcherHelp: "无需学生账号 · 试用最多支持 20 个单词",
    flowTitle: "从词表到全班练习结果",
    flow: ["粘贴英语词表", "分享一个链接", "追踪练习结果"],
    featuresTitle: "教师需要的拼写教学工具",
    featuresIntro: "从布置作业到查看成绩、错词和学习进度，都集中在一个工作台。",
    features: [
      [
        "无需学生账号",
        "学生通过作业链接或班级代码与 PIN 进入，无需邮箱、账号或密码。",
      ],
      ["作业", "用自己的词表创建可追踪作业，并分享给全班学生。"],
      ["学习进度", "查看提交记录、成绩、错词和不同作业之间的进步。"],
      ["掌握度", "分清每位学生仍在学习的单词和已经稳定掌握的单词。"],
      ["智能复习", "根据真实错词生成针对性后续练习，不必重复整份词表。"],
      [
        "班级加入/PIN",
        "向学生提供班级代码和个人 PIN，方便他们快速回到自己的作业。",
      ],
      ["CSV", "按作业和学生导出结果，便于留档、汇报或进一步分析。"],
      [
        "教师方案",
        "最多支持 40 名学生和 5 份活跃作业，提交追踪不限量，并保留 365 天记录。",
      ],
    ],
    planComparisonTitle: "免费方案 vs 教师方案",
    planComparisonIntro:
      "先用基础作业和进度追踪开始。教师方案增加复习、导入、报告和班级容量，覆盖完整的每周作业流程。",
    freePlanFeatures: [
      "使用自己的词表创建基础作业",
      "查看学习进度和掌握度",
      "学生练习无需账号",
    ],
    paidPlanFeatures: [
      "包含免费工作台全部功能",
      "智能复习和今日复习",
      "拍照导入和自动生成例句",
      "班级加入/PIN 和 CSV 导出",
      "班级错词统计",
      "最多 40 名学生、5 份活跃作业和 365 天历史记录",
    ],
    ctaTitle: "准备好布置本周英语拼写作业了吗？",
    ctaText: "进入工作台创建可追踪作业，或查看教师方案的完整班级功能。",
    workspace: "进入教师工作台",
    plan: "查看教师方案",
    faq: [
      [
        "学生需要注册账号吗？",
        "不需要。学生可以直接打开作业链接，也可以使用班级代码和个人 PIN 加入。",
      ],
      [
        "可以使用自己的英语词表吗？",
        "可以。粘贴班级正在学习的单词，即可创建并分享作业。",
      ],
      [
        "教师可以追踪哪些结果？",
        "工作台会记录提交、成绩、错词、学习进度和掌握度；教师方案还支持 CSV 导出和更长的历史记录。",
      ],
    ],
  },
};

const paidLandingFeatures = {
  en: {
    parent: [
      ["Photo Import", "Bring in a school spelling list from a photo, then review the words before using them."],
      ["Automatic Example Sentences", "Fill known words with example sentences from the curated library, with editing before use."],
    ],
    teacher: [
      ["Today's Review", "Open a short session built from missed words that are due for practice today."],
      ["Photo Import", "Bring in a school spelling list from a photo, then review the words before creating an assignment."],
      ["Automatic Example Sentences", "Fill known words with example sentences from the curated library, with editing before publishing."],
      ["Class-wide Missed-word Statistics", "See which missed words are most common across the class."],
    ],
  },
  es: {
    parent: [["Importar desde una foto", "Importa la lista de spelling de la escuela desde una foto y revisa las palabras antes de usarlas."], ["Frases de ejemplo automáticas", "Completa palabras conocidas con frases de la biblioteca seleccionada y edítalas antes de usarlas."]],
    teacher: [["Repaso de hoy", "Abre una sesión corta con las palabras falladas que toca practicar hoy."], ["Importar desde una foto", "Importa la lista de spelling de la escuela desde una foto y revisa las palabras antes de crear la tarea."], ["Frases de ejemplo automáticas", "Completa palabras conocidas con frases de la biblioteca seleccionada y edítalas antes de publicar."], ["Estadísticas de errores de la clase", "Identifica las palabras que más cuesta dominar en toda la clase."]],
  },
  "pt-BR": {
    parent: [["Importar por foto", "Importe a lista de ortografia da escola por foto e revise as palavras antes de usá-las."], ["Frases de exemplo automáticas", "Preencha palavras conhecidas com frases da biblioteca selecionada e edite-as antes de usar."]],
    teacher: [["Revisão de hoje", "Abra uma sessão curta com as palavras erradas que já devem ser praticadas hoje."], ["Importar por foto", "Importe a lista de ortografia da escola por foto e revise as palavras antes de criar a atividade."], ["Frases de exemplo automáticas", "Preencha palavras conhecidas com frases da biblioteca selecionada e edite-as antes de publicar."], ["Estatísticas de erros da turma", "Veja quais palavras são mais difíceis para toda a turma."]],
  },
  fr: {
    parent: [["Import par photo", "Importez la liste d’orthographe de l’école depuis une photo et vérifiez les mots avant de les utiliser."], ["Phrases d’exemple automatiques", "Complétez les mots connus avec la bibliothèque sélectionnée et modifiez les phrases avant usage."]],
    teacher: [["Révision du jour", "Lancez une courte séance avec les mots manqués qui doivent être revus aujourd’hui."], ["Import par photo", "Importez la liste d’orthographe de l’école depuis une photo et vérifiez les mots avant de créer le devoir."], ["Phrases d’exemple automatiques", "Complétez les mots connus avec la bibliothèque sélectionnée et modifiez les phrases avant publication."], ["Statistiques des mots manqués de la classe", "Repérez les mots qui posent le plus de difficultés dans toute la classe."]],
  },
  id: {
    parent: [["Impor foto", "Impor daftar ejaan sekolah dari foto, lalu periksa kata sebelum digunakan."], ["Kalimat contoh otomatis", "Isi kata yang dikenal dengan kalimat dari pustaka pilihan, lalu edit sebelum digunakan."]],
    teacher: [["Ulasan hari ini", "Buka sesi singkat berisi kata salah yang sudah waktunya dilatih hari ini."], ["Impor foto", "Impor daftar ejaan sekolah dari foto, lalu periksa kata sebelum membuat tugas."], ["Kalimat contoh otomatis", "Isi kata yang dikenal dengan kalimat dari pustaka pilihan, lalu edit sebelum diterbitkan."], ["Statistik kata salah di kelas", "Lihat kata yang paling sering salah di seluruh kelas."]],
  },
  zh: {
    parent: [["拍照导入", "从学校词表照片中提取单词，确认后再加入练习。"], ["自动填充例句", "使用精选例句库为已知单词补充例句，使用前仍可编辑。"]],
    teacher: [["今日复习", "打开一轮短练习，复习今天正好需要再次练习的错词。"], ["拍照导入", "从学校词表照片中提取单词，确认后再创建作业。"], ["自动填充例句", "使用精选例句库为已知单词补充例句，发布前仍可编辑。"], ["班级错词统计", "查看全班最常出现的错词，找到需要重点练习的内容。"]],
  },
};

const parentFeatureGroups = {
  en: {
    freeTitle: "Free Workspace",
    freeIntro: "After a parent signs in, Free Workspace keeps learner profiles, progress, and mastery history connected.",
    paidTitle: "Parent Plan",
    paidIntro: "The paid Parent Plan adds focused review, list import, sentence help, and longer family history.",
  },
  es: {
    freeTitle: "Espacio de trabajo gratuito",
    freeIntro: "Al iniciar sesión, el espacio gratuito mantiene unidos los perfiles, el progreso y el dominio de cada estudiante.",
    paidTitle: "Plan para familias",
    paidIntro: "El Plan para familias de pago añade repaso específico, importación de listas, ayuda con frases y un historial más largo.",
  },
  "pt-BR": {
    freeTitle: "Espaço de trabalho gratuito",
    freeIntro: "Depois de entrar, o espaço gratuito reúne perfis, progresso e domínio de cada aluno.",
    paidTitle: "Plano para Pais",
    paidIntro: "O Plano para Pais pago acrescenta revisão focada, importação de listas, ajuda com frases e um histórico familiar mais longo.",
  },
  fr: {
    freeTitle: "Espace de travail gratuit",
    freeIntro: "Après connexion, l’espace gratuit relie les profils, la progression et la maîtrise de chaque élève.",
    paidTitle: "Offre Parents",
    paidIntro: "L’offre Parents payante ajoute la révision ciblée, l’import de listes, l’aide aux phrases et un historique familial plus long.",
  },
  id: {
    freeTitle: "Ruang Kerja Gratis",
    freeIntro: "Setelah orang tua masuk, Ruang Kerja Gratis menghubungkan profil pelajar, perkembangan, dan penguasaan.",
    paidTitle: "Paket Orang Tua",
    paidIntro: "Paket Orang Tua berbayar menambahkan ulasan terarah, impor daftar, bantuan kalimat, dan riwayat keluarga yang lebih panjang.",
  },
  zh: {
    freeTitle: "免费工作台",
    freeIntro: "家长登录后，免费工作台可以保存学习者档案、进度和掌握度记录。",
    paidTitle: "家长方案",
    paidIntro: "家长方案付费权益增加针对性复习、词表导入、例句帮助和更长的家庭学习历史。",
  },
};

const teacherFeatureGroups = {
  en: {
    freeTitle: "Free Workspace",
    freeIntro: "After a teacher signs in, Free Workspace covers basic assignments, learner progress, and mastery.",
    paidTitle: "Teacher Plan",
    paidIntro: "The paid Teacher Plan adds review tools, list import, class capacity, history, and reporting.",
  },
  es: {
    freeTitle: "Espacio de trabajo gratuito",
    freeIntro: "Al iniciar sesión, el espacio gratuito cubre las tareas básicas, el progreso y el dominio del alumnado.",
    paidTitle: "Plan para docentes",
    paidIntro: "El Plan para docentes de pago añade herramientas de repaso, importación de listas, capacidad de clase, historial e informes.",
  },
  "pt-BR": {
    freeTitle: "Espaço de trabalho gratuito",
    freeIntro: "Depois de entrar, o espaço gratuito cobre atividades básicas, progresso e domínio dos alunos.",
    paidTitle: "Plano para Professores",
    paidIntro: "O Plano para Professores pago acrescenta ferramentas de revisão, importação de listas, capacidade da turma, histórico e relatórios.",
  },
  fr: {
    freeTitle: "Espace de travail gratuit",
    freeIntro: "Après connexion, l’espace gratuit couvre les devoirs de base, la progression et la maîtrise des élèves.",
    paidTitle: "Offre Enseignants",
    paidIntro: "L’offre Enseignants payante ajoute les outils de révision, l’import de listes, la capacité de classe, l’historique et les rapports.",
  },
  id: {
    freeTitle: "Ruang Kerja Gratis",
    freeIntro: "Setelah guru masuk, Ruang Kerja Gratis mencakup tugas dasar, perkembangan, dan penguasaan siswa.",
    paidTitle: "Paket Guru",
    paidIntro: "Paket Guru berbayar menambahkan alat ulasan, impor daftar, kapasitas kelas, riwayat, dan laporan.",
  },
  zh: {
    freeTitle: "免费工作台",
    freeIntro: "教师登录后，免费工作台提供基础作业、学习进度和掌握度记录。",
    paidTitle: "教师方案",
    paidIntro: "教师方案付费权益增加复习工具、词表导入、班级规模、历史记录和结果报告。",
  },
};

for (const [code, features] of Object.entries(paidLandingFeatures)) {
  const teacherPlan = teacherLandingCopy[code].features.pop();
  teacherLandingCopy[code].features.push(...features.teacher, teacherPlan);
}

const customLauncher = {
  en: {
    label: "Your own spelling words",
    button: "Start Instantly",
    help: "No login needed · Up to 20 custom spelling words",
    sightLabel: "Sight words",
    sightButton: "Start Typing Game",
    sightHelp: "No login needed · Up to 20 sight words",
    weeklyLabel: "This week's spelling words",
    weeklyButton: "Start This Week's Practice",
    weeklyHelp: "No login needed · Use the exact weekly list",
    invalid: "Enter at least one word.",
    limit: "No-login practice supports up to 20 words per list.",
  },
  es: {
    label: "Tus propias palabras de ortografía",
    button: "Empezar ahora",
    help: "Sin iniciar sesión · Hasta 20 palabras personalizadas",
    sightLabel: "Palabras frecuentes (sight words)",
    sightButton: "Empezar el juego de mecanografía",
    sightHelp: "Sin iniciar sesión · Hasta 20 sight words",
    weeklyLabel: "Palabras de spelling de esta semana",
    weeklyButton: "Empezar la práctica semanal",
    weeklyHelp: "Sin iniciar sesión · Usa la lista semanal exacta",
    invalid: "Escribe al menos una palabra.",
    limit: "La práctica sin cuenta admite hasta 20 palabras por lista.",
  },
  "pt-BR": {
    label: "Suas próprias palavras de ortografia",
    button: "Começar agora",
    help: "Sem conta · Até 20 palavras personalizadas",
    sightLabel: "Palavras frequentes (sight words)",
    sightButton: "Começar o jogo de digitação",
    sightHelp: "Sem login · Até 20 sight words",
    weeklyLabel: "Palavras de ortografia desta semana",
    weeklyButton: "Começar a prática da semana",
    weeklyHelp: "Sem conta · Use a lista exata da semana",
    invalid: "Digite pelo menos uma palavra.",
    limit: "A prática sem conta aceita até 20 palavras por lista.",
  },
  fr: {
    label: "Vos propres mots d’orthographe",
    button: "Commencer maintenant",
    help: "Sans compte · Jusqu’à 20 mots personnalisés",
    sightLabel: "Mots fréquents (sight words)",
    sightButton: "Lancer le jeu de frappe",
    sightHelp: "Sans connexion · Jusqu’à 20 sight words",
    weeklyLabel: "Mots d’orthographe de cette semaine",
    weeklyButton: "Commencer la pratique de la semaine",
    weeklyHelp: "Sans compte · Utilisez la liste exacte de la semaine",
    invalid: "Saisissez au moins un mot.",
    limit: "L’entraînement sans compte accepte jusqu’à 20 mots par liste.",
  },
  id: {
    label: "Kata ejaan sendiri",
    button: "Mulai sekarang",
    help: "Tanpa akun · Maksimal 20 kata kustom",
    sightLabel: "Sight words (kata umum)",
    sightButton: "Mulai game mengetik",
    sightHelp: "Tanpa akun · Maksimal 20 sight words",
    weeklyLabel: "Kata ejaan minggu ini",
    weeklyButton: "Mulai latihan minggu ini",
    weeklyHelp: "Tanpa akun · Gunakan daftar mingguan yang sama",
    invalid: "Masukkan setidaknya satu kata.",
    limit: "Latihan tanpa akun mendukung hingga 20 kata per daftar.",
  },
  zh: {
    label: "你自己的英语拼写单词",
    button: "立即开始游戏",
    help: "无需登录 · 最多输入 20 个自定义单词",
    sightLabel: "Sight words 高频词",
    sightButton: "开始打字游戏",
    sightHelp: "无需登录 · 最多输入 20 个 sight words",
    weeklyLabel: "本周英语拼写单词",
    weeklyButton: "开始本周练习",
    weeklyHelp: "无需登录 · 直接使用本周完整词表",
    invalid: "请至少输入一个英语单词。",
    limit: "无需登录的练习每份词表最多 20 个单词。",
  },
};

const toolHeroPoints = {
  en: ["No login needed", "Use your own spelling list", "Share or retry practice"],
  es: ["Sin iniciar sesión", "Usa tu propia lista de palabras", "Comparte o repite la práctica"],
  "pt-BR": ["Sem login", "Use sua própria lista de palavras", "Compartilhe ou repita a prática"],
  fr: ["Sans connexion", "Utilisez votre propre liste de mots", "Partagez ou recommencez l’exercice"],
  id: ["Tanpa login", "Gunakan daftar ejaan sendiri", "Bagikan atau ulangi latihan"],
  zh: ["无需登录", "使用你自己的词表", "可以分享或重复练习"],
};

const toolWhyCopy = {
  en: {
    title: "Why use this practice?",
    items: [
      ["✦", "Custom word lists", "Practice the exact words from homework, class, or your own plan."],
      ["◎", "No account needed", "Start a round right away without creating a student login."],
      ["↻", "Retry missed words", "Spend the next short round on the words that still need work."],
    ],
  },
  es: {
    title: "¿Por qué usar esta práctica?",
    items: [
      ["✦", "Listas personalizadas", "Practica exactamente las palabras de la tarea, la clase o tu propio plan."],
      ["◎", "Sin cuenta", "Empieza una ronda al instante sin crear un acceso para el alumno."],
      ["↻", "Repite los fallos", "Dedica la siguiente ronda breve a las palabras que aún cuestan."],
    ],
  },
  "pt-BR": {
    title: "Por que usar esta prática?",
    items: [
      ["✦", "Listas personalizadas", "Pratique exatamente as palavras da tarefa, da turma ou do seu plano."],
      ["◎", "Sem conta", "Comece uma rodada na hora, sem criar login para o aluno."],
      ["↻", "Repita os erros", "Use a próxima rodada curta nas palavras que ainda precisam de prática."],
    ],
  },
  fr: {
    title: "Pourquoi utiliser cet exercice ?",
    items: [
      ["✦", "Listes personnalisées", "Travaillez exactement les mots des devoirs, de la classe ou de votre programme."],
      ["◎", "Sans compte", "Lancez une séance immédiatement, sans créer de compte élève."],
      ["↻", "Revoyez les erreurs", "Consacrez la courte séance suivante aux mots encore difficiles."],
    ],
  },
  id: {
    title: "Mengapa memakai latihan ini?",
    items: [
      ["✦", "Daftar kata sendiri", "Latih tepat kata dari pekerjaan rumah, kelas, atau rencana Anda."],
      ["◎", "Tanpa akun", "Mulai sesi segera tanpa membuat login siswa."],
      ["↻", "Ulangi kata yang salah", "Gunakan sesi singkat berikutnya untuk kata yang masih perlu dilatih."],
    ],
  },
  zh: {
    title: "为什么使用这个练习？",
    items: [
      ["✦", "自定义词表", "练习作业、课堂或你自己计划中的准确单词。"],
      ["◎", "无需账号", "不用创建学生登录信息，打开就能开始一轮练习。"],
      ["↻", "错词重练", "下一轮短练习只关注仍然需要掌握的单词。"],
    ],
  },
};

const toolStartCopy = {
  en: {
    title: "3 steps to start practicing",
    steps: [
      ["Enter your word list", "Paste your own words"],
      ["Start practicing", "Use the current practice mode"],
      ["Share or retry", "Share the link or retry missed words"],
    ],
  },
  es: {
    title: "3 pasos para empezar",
    steps: [
      ["Escribe tu lista", "Pega tus propias palabras"],
      ["Empieza a practicar", "Usa el modo de práctica actual"],
      ["Comparte o repite", "Comparte el enlace o repite los fallos"],
    ],
  },
  "pt-BR": {
    title: "3 passos para começar",
    steps: [
      ["Digite sua lista", "Cole suas próprias palavras"],
      ["Comece a praticar", "Use o modo de prática atual"],
      ["Compartilhe ou repita", "Compartilhe o link ou repita os erros"],
    ],
  },
  fr: {
    title: "3 étapes pour commencer",
    steps: [
      ["Saisissez votre liste", "Collez vos propres mots"],
      ["Commencez l’exercice", "Utilisez le mode actuel"],
      ["Partagez ou recommencez", "Partagez le lien ou revoyez les erreurs"],
    ],
  },
  id: {
    title: "3 langkah untuk mulai berlatih",
    steps: [
      ["Masukkan daftar kata", "Tempel kata-kata Anda sendiri"],
      ["Mulai berlatih", "Gunakan mode latihan saat ini"],
      ["Bagikan atau ulangi", "Bagikan link atau ulangi kata yang salah"],
    ],
  },
  zh: {
    title: "3步开始练习",
    steps: [
      ["输入词表", "粘贴自己的单词"],
      ["开始练习", "使用当前练习模式"],
      ["分享/重练", "分享链接或重练错词"],
    ],
  },
};

const toolUseCasesCopy = {
  en: {
    title: "Great for these situations",
    items: [
      ["Weekly homework", "Turn this week’s list into a short, repeatable practice."],
      ["Spelling tests", "Run a quick check before the classroom test."],
      ["Practice at home", "Give children an independent round with no login."],
      ["ESL and vocabulary", "Use lesson words for focused typing or listening practice."],
    ],
  },
  es: {
    title: "Ideal para estas situaciones",
    items: [
      ["Tareas semanales", "Convierte la lista de esta semana en una práctica breve y repetible."],
      ["Pruebas de ortografía", "Haz una comprobación rápida antes de la prueba de clase."],
      ["Práctica en casa", "Ofrece al niño una ronda independiente sin iniciar sesión."],
      ["ESL y vocabulario", "Usa las palabras de la lección para practicar typing o dictado."],
    ],
  },
  "pt-BR": {
    title: "Perfeito para estas situações",
    items: [
      ["Tarefa semanal", "Transforme a lista da semana em uma prática curta e repetível."],
      ["Testes de ortografia", "Faça uma verificação rápida antes do teste da turma."],
      ["Prática em casa", "Ofereça uma rodada independente para a criança, sem login."],
      ["ESL e vocabulário", "Use as palavras da aula em uma prática focada de digitação ou ditado."],
    ],
  },
  fr: {
    title: "Utile dans ces situations",
    items: [
      ["Devoirs de la semaine", "Transformez la liste de la semaine en exercice court et répétable."],
      ["Tests d’orthographe", "Faites une vérification rapide avant le contrôle en classe."],
      ["Exercices à la maison", "Laissez l’enfant faire une séance autonome, sans connexion."],
      ["ESL et vocabulaire", "Utilisez les mots de la leçon pour une pratique ciblée de frappe ou de dictée."],
    ],
  },
  id: {
    title: "Cocok untuk situasi ini",
    items: [
      ["Tugas mingguan", "Ubah daftar minggu ini menjadi latihan singkat yang bisa diulang."],
      ["Tes ejaan", "Lakukan pemeriksaan cepat sebelum tes di kelas."],
      ["Latihan di rumah", "Berikan sesi mandiri untuk anak tanpa perlu login."],
      ["ESL dan kosakata", "Gunakan kata dari pelajaran untuk latihan mengetik atau dikte yang terarah."],
    ],
  },
  zh: {
    title: "适合这些场景",
    items: [
      ["每周作业", "把本周词表变成简短、可以重复的练习。"],
      ["拼写测试", "在课堂测试前先做一轮快速检查。"],
      ["家庭练习", "让孩子无需登录即可独立完成一轮练习。"],
      ["ESL/词汇", "使用课程单词进行有针对性的打字或听写练习。"],
    ],
  },
};

const toolSupportingCopy = {
  en: {
    adviceTitle: "Sight word practice tips",
    workspaceCta: "Open Parent or Teacher Workspace",
  },
  es: {
    adviceTitle: "Consejos para practicar palabras frecuentes",
    workspaceCta: "Abrir el espacio para familias o docentes",
  },
  "pt-BR": {
    adviceTitle: "Dicas para praticar palavras frequentes",
    workspaceCta: "Abrir o espaço para pais ou professores",
  },
  fr: {
    adviceTitle: "Conseils pour travailler les mots fréquents",
    workspaceCta: "Ouvrir l’espace parents ou enseignants",
  },
  id: {
    adviceTitle: "Tips latihan sight words",
    workspaceCta: "Buka ruang kerja orang tua atau guru",
  },
  zh: {
    adviceTitle: "高频词练习建议",
    workspaceCta: "进入家长或教师工作台",
  },
};

function pagePath(lang, slug) {
  return lang.dir ? `/${lang.dir}/${slug}` : `/${slug}`;
}

function dirPath(lang) {
  return lang.dir ? `/${lang.dir}/` : "/";
}

function alternateLinks(slug) {
  const links = languages.map(
    (lang) =>
      `    <link rel="alternate" hreflang="${lang.hreflang}" href="${baseUrl}${pagePath(lang, slug)}">`,
  );
  links.push(
    `    <link rel="alternate" hreflang="x-default" href="${baseUrl}/${slug}">`,
  );
  return links.join("\n");
}

function languageMenu(currentCode, slug) {
  const links = languages
    .map((lang) => {
      const current = lang.code === currentCode ? ' aria-current="page"' : "";
      return `                <a class="lang-option" href="${pagePath(lang, slug)}" hreflang="${lang.hreflang}"${current}>${lang.label}</a>`;
    })
    .join("\n");
  const lang = languages.find((item) => item.code === currentCode);
  return `    <header class="top-right-nav">
        <a class="brand-link" href="${dirPath(lang)}" aria-label="My Spelling Game home">
            <img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt="">
            <span class="brand-name">My Spelling Game</span>
        </a>
        <details class="language-switcher">
            <summary class="lang-btn" aria-label="${escapeAttr(lang.nav)}">${lang.nav}</summary>
            <div class="lang-menu">
${links}
            </div>
        </details>
        <a class="teacher-nav-link" href="/workspace?lang=${encodeURIComponent(currentCode)}">${langCodeLabel(currentCode)}</a>
        <button class="header-home-link" onclick="window.location.href='${dirPath(lang)}'" id="back-home" title="${escapeAttr(lang.home)}">${lang.home}</button>
    </header>`;
}

function langCodeLabel(code) {
  return (
    {
      en: "Workspace",
      es: "Espacio de trabajo",
      "pt-BR": "Espaço de trabalho",
      fr: "Espace de travail",
      id: "Ruang kerja",
      zh: "工作台",
    }[code] || "Workspace"
  );
}

function panelHtml([title, body], langCode) {
  return `        <section class="seo-panel">
            <h2>${localizeLegacyTerms(title, langCode)}</h2>
            <p>${localizeLegacyTerms(body, langCode)}</p>
        </section>`;
}

function faqHtml(langCode, faq, compact = false) {
  if (compact) {
    return `        <section class="tool-faq" aria-labelledby="tool-faq-${langCode}">
            <h2 id="tool-faq-${langCode}">${labels[langCode].faq}</h2>
            <div class="faq-list">
${faq.map(([q, a]) => `                <details class="faq-item"><summary>${localizeLegacyTerms(q, langCode)}</summary><p>${localizeLegacyTerms(a, langCode)}</p></details>`).join("\n")}
            </div>
        </section>`;
  }
  return `        <section class="seo-panel">
            <h2>${labels[langCode].faq}</h2>
${faq.map(([q, a]) => `            <p><strong>${localizeLegacyTerms(q, langCode)}</strong> ${localizeLegacyTerms(a, langCode)}</p>`).join("\n")}
        </section>`;
}

function relatedHtml(langCode, currentSlug, compact = false) {
  const sectionClass = compact ? "tool-related" : "seo-panel";
  const heading = compact ? labels[langCode].continuePractice : labels[langCode].related;
  const linksClass = compact ? "tool-related-links" : "seo-link-grid";
  return `        <section class="${sectionClass}"${compact ? ` aria-labelledby="tool-related-${langCode}"` : ""}>
            <h2${compact ? ` id="tool-related-${langCode}"` : ""}>${heading}</h2>
            <div class="${linksClass}">
${(compact ? footerSlugs.slice(0, 4) : seoSlugs.filter((slug) => slug !== currentSlug))
  .map(
    (slug) =>
      `                <a href="${pagePath(
        languages.find((lang) => lang.code === langCode),
        slug,
      )}">${localizeLegacyTerms(labels[langCode].links[slug], langCode)}</a>`,
  )
  .join("\n")}
            </div>
        </section>`;
}

function footerHtml(langCode) {
  const lang = languages.find((item) => item.code === langCode);
  return `    <footer>
        <p>
            <span class="footer-links">${footerSlugs.map((slug) => `<a href="${pagePath(lang, slug)}">${footerLinks[langCode][slug]}</a>`).join(" &middot; ")}</span><br>
            <span class="footer-secondary-links">${footerSecondarySlugs.map((slug) => `<a href="${pagePath(lang, slug)}" aria-label="${escapeAttr(footerSecondaryLinks[langCode][slug])}">${footerSecondaryLinks[langCode][slug]}</a>`).join(" &middot; ")}</span><br>
            &copy; 2026 My Spelling Game ${footerRights[langCode]}
        </p>
    </footer>`;
}

function jsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

function schemaScripts(lang, slug, page) {
  const url = `${baseUrl}${pagePath(lang, slug)}`;
  const webpage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.h1,
    description: page.description,
    url,
    inLanguage: lang.htmlLang,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      name: "My Spelling Game",
      url: `${baseUrl}/`,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "My Spelling Game",
      url: baseUrl,
      logo: `${baseUrl}/images/icon-512.png`,
    },
  };
  if (lang.code === "en") {
    webpage.dateModified = {
      "custom-spelling-words-game": "2026-08-30",
      "homeschool-spelling-practice": "2026-08-23",
      "sight-word-typing-game": "2026-08-30",
      "weekly-spelling-practice": "2026-08-30",
      "spelling-assignments-for-teachers": "2026-08-30",
      "spelling-practice-for-parents": "2026-08-30",
      "vocabulary-typing-game": "2026-06-22",
    }[slug];
  }
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang.htmlLang,
    mainEntity: page.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: localizeLegacyTerms(question, lang.code),
      acceptedAnswer: {
        "@type": "Answer",
        text: localizeLegacyTerms(answer, lang.code),
      },
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: lang.home,
        item: `${baseUrl}${dirPath(lang)}`,
      },
      { "@type": "ListItem", position: 2, name: page.h1, item: url },
    ],
  };
  return [webpage, faq, breadcrumb]
    .map(
      (schema) =>
        `    <script type="application/ld+json">\n${jsonLd(schema)}\n    </script>`,
    )
    .join("\n");
}

function parentLandingMain(langCode, lang, copy) {
  const workspaceUrl = `/workspace?lang=${encodeURIComponent(langCode)}`;
  const pricingUrl = pagePath(lang, "pricing");
  const featureCards = copy.features
    .map(
      ([title, body]) =>
        `                <article class="parent-value-card"><h3>${title}</h3><p>${body}</p></article>`,
    )
    .join("\n");
  const planList = (items) =>
    items.map((item) => `                    <li>${item}</li>`).join("\n");
  return `    <main class="seo-landing content-page parent-landing">
        <section class="parent-practice-hero">
            <div class="parent-hero-copy">
                <span class="parent-eyebrow">${copy.eyebrow}</span>
                <h1>${copy.h1}</h1>
                <p>${copy.intro}</p>
                <ul class="parent-hero-points">
${copy.heroPoints.map((point) => `                    <li>${point}</li>`).join("\n")}
                </ul>
            </div>
            <form class="landing-launcher parent-hero-launcher" action="${dirPath(lang)}" data-mode="dictation" data-invalid="${escapeAttr(customLauncher[langCode].invalid)}" data-limit="${escapeAttr(customLauncher[langCode].limit)}">
                <label for="parent-words-${langCode}">${copy.launcherLabel}</label>
                <textarea id="parent-words-${langCode}" name="words" required spellcheck="false" placeholder="because&#10;friend&#10;beautiful"></textarea>
                <button type="submit">${copy.launcherButton}</button>
                <small>${copy.launcherHelp}</small>
            </form>
        </section>

        <section class="parent-flow" aria-labelledby="parent-flow-${langCode}">
            <h2 id="parent-flow-${langCode}">${copy.flowTitle}</h2>
            <ol>
${copy.flow.map((step) => `                <li>${step}</li>`).join("\n")}
            </ol>
        </section>

        <section class="parent-value-section" aria-labelledby="parent-values-${langCode}">
            <div class="parent-section-heading">
                <h2 id="parent-values-${langCode}">${copy.featuresTitle}</h2>
                <p>${copy.featuresIntro}</p>
            </div>
            <div class="parent-value-grid">
${featureCards}
            </div>
        </section>

        <section class="parent-plan-section" aria-labelledby="parent-plans-${langCode}">
            <div class="parent-section-heading">
                <h2 id="parent-plans-${langCode}">${copy.planComparisonTitle}</h2>
                <p>${copy.planComparisonIntro}</p>
            </div>
            <div class="parent-plan-grid">
                <article class="parent-plan-card">
                    <h3>${parentFeatureGroups[langCode].freeTitle}</h3>
                    <p>${parentFeatureGroups[langCode].freeIntro}</p>
                    <ul>
${planList(copy.freePlanFeatures)}
                    </ul>
                </article>
                <article class="parent-plan-card parent-plan-card-highlight">
                    <h3>${parentFeatureGroups[langCode].paidTitle}</h3>
                    <p>${parentFeatureGroups[langCode].paidIntro}</p>
                    <ul>
${planList(copy.paidPlanFeatures)}
                    </ul>
                    <a class="seo-cta" href="${pricingUrl}">${copy.plan}</a>
                </article>
            </div>
        </section>

${faqHtml(langCode, copy.faq)}

        <section class="parent-workspace-cta parent-final-cta">
            <h2>${copy.ctaTitle}</h2>
            <p>${copy.ctaText}</p>
            <div class="parent-cta-actions">
                <a class="seo-cta" href="${workspaceUrl}">${copy.workspace}</a>
                <a class="seo-cta parent-secondary-cta" href="${pricingUrl}">${copy.plan}</a>
            </div>
        </section>
    </main>`;
}

function teacherLandingMain(langCode, lang, copy) {
  const workspaceUrl = `/workspace?lang=${encodeURIComponent(langCode)}`;
  const pricingUrl = pagePath(lang, "pricing");
  const heroPreviewItems = [
    copy.features[1][0],
    copy.features[2][0],
    copy.features[3][0],
    copy.missedWordsPreview,
  ];
  const featureCards = copy.features
    .slice(0, -1)
    .map(
      ([title, body]) =>
        `                <article class="parent-value-card"><h3>${title}</h3><p>${body}</p></article>`,
    )
    .join("\n");
  const planList = (items) =>
    items.map((item) => `                    <li>${item}</li>`).join("\n");
  return `    <main class="seo-landing content-page parent-landing teacher-landing">
        <section class="parent-practice-hero">
            <div class="parent-hero-copy">
                <span class="parent-eyebrow">${copy.eyebrow}</span>
                <h1>${copy.h1}</h1>
                <p>${copy.intro}</p>
                <ul class="parent-hero-points">
${copy.heroPoints.map((point) => `                    <li>${point}</li>`).join("\n")}
                </ul>
                <div class="parent-cta-actions teacher-hero-actions">
                    <a class="seo-cta" href="${workspaceUrl}">${copy.workspace}</a>
                    <a class="seo-cta parent-secondary-cta" href="${pricingUrl}">${copy.plan}</a>
                </div>
            </div>
            <aside class="teacher-hero-preview" aria-labelledby="teacher-preview-${langCode}">
                <h2 id="teacher-preview-${langCode}">${copy.heroPreviewTitle}</h2>
                <ul>
${heroPreviewItems.map((item) => `                    <li>${item}</li>`).join("\n")}
                </ul>
            </aside>
        </section>

        <section class="parent-flow" aria-labelledby="teacher-flow-${langCode}">
            <h2 id="teacher-flow-${langCode}">${copy.flowTitle}</h2>
            <ol>
${copy.flow.map((step) => `                <li>${step}</li>`).join("\n")}
            </ol>
        </section>

        <section class="parent-value-section" aria-labelledby="teacher-values-${langCode}">
            <div class="parent-section-heading">
                <h2 id="teacher-values-${langCode}">${copy.featuresTitle}</h2>
                <p>${copy.featuresIntro}</p>
            </div>
            <div class="parent-value-grid">
${featureCards}
            </div>
        </section>

        <section class="parent-plan-section" aria-labelledby="teacher-plans-${langCode}">
            <div class="parent-section-heading">
                <h2 id="teacher-plans-${langCode}">${copy.planComparisonTitle}</h2>
                <p>${copy.planComparisonIntro}</p>
            </div>
            <div class="parent-plan-grid">
                <article class="parent-plan-card">
                    <h3>${teacherFeatureGroups[langCode].freeTitle}</h3>
                    <p>${teacherFeatureGroups[langCode].freeIntro}</p>
                    <ul>
${planList(copy.freePlanFeatures)}
                    </ul>
                </article>
                <article class="parent-plan-card parent-plan-card-highlight">
                    <h3>${teacherFeatureGroups[langCode].paidTitle}</h3>
                    <p>${teacherFeatureGroups[langCode].paidIntro}</p>
                    <ul>
${planList(copy.paidPlanFeatures)}
                    </ul>
                    <a class="seo-cta" href="${pricingUrl}">${copy.plan}</a>
                </article>
            </div>
        </section>

${faqHtml(langCode, copy.faq)}

        <section class="parent-workspace-cta parent-final-cta">
            <h2>${copy.ctaTitle}</h2>
            <p>${copy.ctaText}</p>
            <div class="parent-cta-actions">
                <a class="seo-cta" href="${workspaceUrl}">${copy.workspace}</a>
                <a class="seo-cta parent-secondary-cta" href="${pricingUrl}">${copy.plan}</a>
            </div>
        </section>
    </main>`;
}

function audienceLandingMain(langCode, lang, copy, audience) {
  if (audience === "parent") return parentLandingMain(langCode, lang, copy);
  if (audience === "teacher") return teacherLandingMain(langCode, lang, copy);
  const workspaceUrl = `/workspace?lang=${encodeURIComponent(langCode)}`;
  const pricingUrl = pagePath(lang, "pricing");
  const featureCards = (features) =>
    features
      .map(([title, body]) => `                <article class="seo-panel parent-value-card"><h3>${title}</h3><p>${body}</p></article>`)
      .join("\n");
  const featureGroups = audience === "parent" ? parentFeatureGroups[langCode] : teacherFeatureGroups[langCode];
  const freeFeatureCount = audience === "parent" ? 3 : 4;
  const featureContent =
    audience === "parent" || audience === "teacher"
      ? `            <div class="parent-feature-group">
                <div class="parent-section-heading">
                    <h2>${featureGroups.freeTitle}</h2>
                    <p>${featureGroups.freeIntro}</p>
                </div>
                <div class="parent-value-grid">
${featureCards(copy.features.slice(0, freeFeatureCount))}
                </div>
            </div>
            <div class="parent-feature-group">
                <div class="parent-section-heading">
                    <h2>${featureGroups.paidTitle}</h2>
                    <p>${featureGroups.paidIntro}</p>
                </div>
                <div class="parent-value-grid">
${featureCards(copy.features.slice(freeFeatureCount))}
                </div>
            </div>`
      : `            <div class="parent-value-grid">
${featureCards(copy.features)}
            </div>`;
  return `    <main class="seo-landing content-page parent-landing${audience === "teacher" ? " teacher-landing" : ""}">
        <section class="seo-hero parent-practice-hero">
            <span class="parent-eyebrow">${copy.eyebrow}</span>
            <h1>${copy.h1}</h1>
            <p>${copy.intro}</p>${copy.heroLine ? `\n            <p class="teacher-flow-line">${copy.heroLine}</p>` : ""}
            <form class="landing-launcher" action="${dirPath(lang)}" data-mode="dictation" data-invalid="${escapeAttr(customLauncher[langCode].invalid)}" data-limit="${escapeAttr(customLauncher[langCode].limit)}">
                <label for="${audience}-words-${langCode}">${copy.launcherLabel}</label>
                <textarea id="${audience}-words-${langCode}" name="words" required spellcheck="false" placeholder="because&#10;friend&#10;beautiful"></textarea>
                <button type="submit">${copy.launcherButton}</button>
                <small>${copy.launcherHelp}</small>
            </form>
        </section>

        <section class="seo-panel parent-flow${audience === "teacher" ? " teacher-flow" : ""}" aria-labelledby="${audience}-flow-${langCode}">
            <h2 id="${audience}-flow-${langCode}">${copy.flowTitle}</h2>
            <ol>
${copy.flow.map((step) => `                <li>${step}</li>`).join("\n")}
            </ol>
        </section>

        <section class="parent-value-section" aria-labelledby="${audience}-values-${langCode}">
            <div class="parent-section-heading">
                <h2 id="${audience}-values-${langCode}">${copy.featuresTitle}</h2>
                <p>${copy.featuresIntro}</p>
            </div>
${featureContent}
        </section>

        <section class="seo-panel parent-workspace-cta">
            <h2>${copy.ctaTitle}</h2>
            <p>${copy.ctaText}</p>
            <div class="parent-cta-actions">
                <a class="seo-cta" href="${workspaceUrl}">${copy.workspace}</a>
                <a class="seo-cta parent-secondary-cta" href="${pricingUrl}">${copy.plan}</a>
            </div>
        </section>

${faqHtml(langCode, copy.faq)}
    </main>`;
}

function toolLandingMain(langCode, lang, page, slug, launcher) {
  const weekly = slug === "weekly-spelling-practice";
  const sight = slug === "sight-word-typing-game";
  const prefix = sight ? "sight" : weekly ? "weekly" : "custom";
  const mode = weekly ? "dictation" : "typing";
  const label = sight ? launcher.sightLabel : weekly ? launcher.weeklyLabel : launcher.label;
  const button = sight ? launcher.sightButton : weekly ? launcher.weeklyButton : launcher.button;
  const help = sight ? launcher.sightHelp : weekly ? launcher.weeklyHelp : launcher.help;
  const placeholder = sight ? "the&#10;and&#10;you&#10;said" : "because&#10;friend&#10;beautiful";
  const whyItems = toolWhyCopy[langCode].items.map((item) => [...item]);
  if (weekly) {
    whyItems[0] = [whyItems[0][0], ...page.panels[0]];
    whyItems[2] = [whyItems[2][0], ...page.panels[1]];
  } else if (!sight) {
    whyItems[0] = [whyItems[0][0], ...page.panels[0]];
    whyItems[1] = [whyItems[1][0], ...page.panels[1]];
  }
  const supportingContent = weekly
    ? `        <section class="tool-workspace-note" aria-labelledby="tool-workspace-${langCode}">
            <div>
                <h2 id="tool-workspace-${langCode}">${localizeLegacyTerms(page.panels[2][0], langCode)}</h2>
                <p>${localizeLegacyTerms(page.panels[2][1], langCode)}</p>
            </div>
            <a class="tool-workspace-link" href="/workspace?lang=${encodeURIComponent(langCode)}">${toolSupportingCopy[langCode].workspaceCta}</a>
        </section>`
    : sight
      ? `        <section class="tool-advice" aria-labelledby="tool-advice-${langCode}">
            <h2 id="tool-advice-${langCode}">${toolSupportingCopy[langCode].adviceTitle}</h2>
            <div class="tool-advice-grid">
${page.panels.map(([title, body]) => `                <article class="tool-advice-item"><h3>${localizeLegacyTerms(title, langCode)}</h3><p>${localizeLegacyTerms(body, langCode)}</p></article>`).join("\n")}
            </div>
        </section>`
      : "";
  return `    <main class="seo-landing content-page tool-landing">
        <section class="tool-hero">
            <div class="tool-hero-copy">
                <h1>${localizeLegacyTerms(page.h1, langCode)}</h1>
                <p>${localizeLegacyTerms(page.intro, langCode)}</p>
                <ul class="tool-hero-points">
${toolHeroPoints[langCode].map((point) => `                    <li>${localizeLegacyTerms(point, langCode)}</li>`).join("\n")}
                </ul>
            </div>
            <form class="landing-launcher tool-hero-launcher" action="${dirPath(lang)}" data-mode="${mode}" data-invalid="${escapeAttr(launcher.invalid)}" data-limit="${escapeAttr(launcher.limit)}">
                <label for="${prefix}-words-${langCode}">${localizeLegacyTerms(label, langCode)}</label>
                <textarea id="${prefix}-words-${langCode}" name="words" required spellcheck="false" placeholder="${placeholder}"></textarea>
                <button type="submit">${localizeLegacyTerms(button, langCode)}</button>
                <small>${localizeLegacyTerms(help, langCode)}</small>
            </form>
        </section>

        <section class="tool-why" aria-labelledby="tool-why-${langCode}">
            <h2 id="tool-why-${langCode}">${toolWhyCopy[langCode].title}</h2>
            <div class="tool-why-grid">
${whyItems.map(([icon, title, body]) => `                <div class="tool-why-item"><span class="tool-why-icon" aria-hidden="true">${icon}</span><h3>${localizeLegacyTerms(title, langCode)}</h3><p>${localizeLegacyTerms(body, langCode)}</p></div>`).join("\n")}
            </div>
        </section>

        <section class="tool-start" aria-labelledby="tool-start-${langCode}">
            <h2 id="tool-start-${langCode}">${toolStartCopy[langCode].title}</h2>
            <div class="tool-start-grid">
${toolStartCopy[langCode].steps.map(([title, body], index) => `                <div class="tool-start-step"><div class="tool-start-number">${index + 1}</div><h3>${title}</h3><p>${body}</p></div>`).join("\n")}
            </div>
        </section>

        <section class="tool-use-cases" aria-labelledby="tool-use-cases-${langCode}">
            <h2 id="tool-use-cases-${langCode}">${toolUseCasesCopy[langCode].title}</h2>
            <div class="tool-use-case-grid">
${toolUseCasesCopy[langCode].items.map(([title, body]) => `                <div class="tool-use-case"><h3>${title}</h3><p>${body}</p></div>`).join("\n")}
            </div>
        </section>

        <aside class="ad-slot" aria-label="${localizeLegacyTerms("Advertisement", langCode)}">
            <span>${localizeLegacyTerms("Advertisement", langCode)}</span>
        </aside>

${supportingContent}

${faqHtml(langCode, page.faq, true)}

${relatedHtml(langCode, slug, true)}
    </main>`;
}

function renderPage(langCode, slug) {
  const lang = languages.find((item) => item.code === langCode);
  const audience =
    slug === "spelling-practice-for-parents" ? "parent" : "teacher";
  const audienceCopy =
    slug === "spelling-practice-for-parents"
      ? parentLandingCopy[langCode]
      : slug === "spelling-assignments-for-teachers"
        ? teacherLandingCopy[langCode]
        : null;
  const page =
    audienceCopy ||
    (slug === "weekly-spelling-practice"
      ? weeklyPageCopy[langCode]
      : pages[langCode][slug]);
  const launcher = customLauncher[langCode];
  return `<!DOCTYPE html>
<html lang="${lang.htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${localizeLegacyTerms(page.title, langCode)}</title>
    <meta name="description" content="${escapeAttr(localizeLegacyTerms(page.description, langCode))}">
    <meta name="robots" content="index, follow">
    <meta name="google-adsense-account" content="ca-pub-9244949928133071">
    <link rel="canonical" href="${baseUrl}${pagePath(lang, slug)}">
${alternateLinks(slug)}
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/icon-32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
    <meta property="og:title" content="${escapeAttr(localizeLegacyTerms(page.title, langCode))}">
    <meta property="og:description" content="${escapeAttr(localizeLegacyTerms(page.ogDescription, langCode))}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${baseUrl}${pagePath(lang, slug)}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="My Spelling Game ${escapeAttr(localizeLegacyTerms(page.h1, langCode))} preview">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(localizeLegacyTerms(page.title, langCode))}">
    <meta name="twitter:description" content="${escapeAttr(localizeLegacyTerms(page.ogDescription, langCode))}">
    <meta name="twitter:image" content="${ogImage}">
    <script src="/src/js/localeRedirect.js"></script>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9244949928133071"
      crossorigin="anonymous"></script>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-VYF1V40KVS"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-VYF1V40KVS', {
        page_location: window.location.origin + window.location.pathname,
        page_path: window.location.pathname
      });
    </script>
    <script type="module" src="/src/js/analytics.mjs"></script>
    <link rel="stylesheet" href="/src/css/main.css">
</head>
<body>
${languageMenu(langCode, slug)}
${
  audienceCopy
    ? audienceLandingMain(langCode, lang, audienceCopy, audience)
    : ["custom-spelling-words-game", "sight-word-typing-game", "weekly-spelling-practice"].includes(slug)
      ? toolLandingMain(langCode, lang, page, slug, launcher)
      : `    <main class="seo-landing content-page">
        <section class="seo-hero">
            <h1>${localizeLegacyTerms(page.h1, langCode)}</h1>
            <p>${localizeLegacyTerms(page.intro, langCode)}</p>
${
  [
    "custom-spelling-words-game",
    "sight-word-typing-game",
    "weekly-spelling-practice",
  ].includes(slug)
    ? `            <form class="landing-launcher" action="${dirPath(lang)}" data-mode="${slug === "weekly-spelling-practice" ? "dictation" : "typing"}" data-invalid="${escapeAttr(launcher.invalid)}" data-limit="${escapeAttr(launcher.limit)}">
                <label for="${slug === "sight-word-typing-game" ? "sight" : slug === "weekly-spelling-practice" ? "weekly" : "custom"}-words-${langCode}">${localizeLegacyTerms(slug === "sight-word-typing-game" ? launcher.sightLabel : slug === "weekly-spelling-practice" ? launcher.weeklyLabel : launcher.label, langCode)}</label>
                <textarea id="${slug === "sight-word-typing-game" ? "sight" : slug === "weekly-spelling-practice" ? "weekly" : "custom"}-words-${langCode}" name="words" required spellcheck="false" placeholder="${slug === "sight-word-typing-game" ? "the&#10;and&#10;you&#10;said" : "because&#10;friend&#10;beautiful"}"></textarea>
                <button type="submit">${localizeLegacyTerms(slug === "sight-word-typing-game" ? launcher.sightButton : slug === "weekly-spelling-practice" ? launcher.weeklyButton : launcher.button, langCode)}</button>
                <small>${localizeLegacyTerms(slug === "sight-word-typing-game" ? launcher.sightHelp : slug === "weekly-spelling-practice" ? launcher.weeklyHelp : launcher.help, langCode)}</small>
            </form>`
    : `            <a class="seo-cta" href="${dirPath(lang)}">${labels[langCode].start}</a>`
}
        </section>

        <aside class="ad-slot" aria-label="${localizeLegacyTerms("Advertisement", langCode)}">
            <span>${localizeLegacyTerms("Advertisement", langCode)}</span>
        </aside>

${page.panels.map((panel) => panelHtml(panel, langCode)).join("\n\n")}

${faqHtml(langCode, page.faq)}

${relatedHtml(langCode, slug)}
    </main>`
}
${footerHtml(langCode)}
${schemaScripts(lang, slug, page)}
    <script type="module" src="/src/js/landingLauncher.mjs"></script>
</body>
</html>
`;
}

function updateEnglishLongtail(slug) {
  const file = path.join(root, `${slug}.html`);
  let html = fs.readFileSync(file, "utf8");
  const canonical = `    <link rel="canonical" href="${baseUrl}/${slug}">\n`;
  html = html.replace(
    new RegExp(
      `    <link rel="canonical" href="${baseUrl}/${slug}(?:\\.html)?">\\n(?:    <link rel="alternate"[^\\n]+>\\n)*`,
    ),
    canonical + alternateLinks(slug) + "\n",
  );
  if (!html.includes("/src/js/localeRedirect.js")) {
    html = html.replace(
      "    <!-- Google tag (gtag.js) -->",
      '    <script src="/src/js/localeRedirect.js"></script>\n    <!-- Google tag (gtag.js) -->',
    );
  }
  if (html.includes('class="top-right-nav"')) {
    const headerStart = html.indexOf('    <div class="top-right-nav">');
    const headerEnd = html.indexOf("\n    </div>", headerStart);
    if (headerStart >= 0 && headerEnd >= 0) {
      html = `${html.slice(0, headerStart)}${languageMenu("en", slug)}${html.slice(headerEnd + "\n    </div>".length)}`;
    }
  } else {
    html = html.replace("<body>\n", `<body>\n${languageMenu("en", slug)}\n`);
  }
  html = html.replace(
    "gtag('config', 'G-VYF1V40KVS');",
    "gtag('config', 'G-VYF1V40KVS', {\n        page_location: window.location.origin + window.location.pathname,\n        page_path: window.location.pathname\n      });",
  );
  if (!html.includes("/src/js/analytics.mjs")) {
    html = html.replace(
      '    <link rel="stylesheet"',
      '    <script type="module" src="/src/js/analytics.mjs"></script>\n    <link rel="stylesheet"',
    );
  }
  html = html.replace(
    /        <section class="seo-panel">\s*<h2>Related Practice Pages<\/h2>[\s\S]*?<\/section>/,
    relatedHtml("en", slug),
  );
  html = html.replace(/    <footer[\s\S]*?<\/footer>/, footerHtml("en"));
  fs.writeFileSync(file, html, "utf8");
}

function schemaForExisting(langCode, slug) {
  const lang = languages.find((item) => item.code === langCode);
  const data = existingFaq[langCode][slug];
  const url = `${baseUrl}${pagePath(lang, slug)}`;
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang.htmlLang,
    mainEntity: data.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: lang.home,
        item: `${baseUrl}${dirPath(lang)}`,
      },
      { "@type": "ListItem", position: 2, name: data.breadcrumb, item: url },
    ],
  };
  return `    <script type="application/ld+json">\n${jsonLd(faq)}\n    </script>\n    <script type="application/ld+json">\n${jsonLd(breadcrumb)}\n    </script>\n`;
}

function updateExistingLocalizedSeoPage(langCode, slug) {
  const lang = languages.find((item) => item.code === langCode);
  const file = path.join(root, lang.dir, `${slug}.html`);
  let html = fs.readFileSync(file, "utf8");
  const faqBlock = faqHtml(langCode, existingFaq[langCode][slug].faq);
  if (!html.includes(`<h2>${labels[langCode].faq}</h2>`)) {
    html = html.replace("    </main>", `${faqBlock}\n    </main>`);
  }
  if (!html.includes('"@type": "FAQPage"')) {
    html = html.replace(
      "</body>",
      `${schemaForExisting(langCode, slug)}</body>`,
    );
  }
  fs.writeFileSync(file, html, "utf8");
}

function localizeLongtailLinks() {
  for (const lang of languages.filter((item) => item.code !== "en")) {
    for (const file of fs
      .readdirSync(path.join(root, lang.dir))
      .filter((name) => name.endsWith(".html"))) {
      if (newLongtailSlugs.includes(path.basename(file, ".html"))) continue;
      const fullPath = path.join(root, lang.dir, file);
      let html = fs.readFileSync(fullPath, "utf8");
      for (const slug of newLongtailSlugs) {
        html = html.replaceAll(
          `href="/${slug}.html"`,
          `href="/${lang.dir}/${slug}"`,
        );
        html = html.replaceAll(
          `href="/${slug}"`,
          `href="/${lang.dir}/${slug}"`,
        );
        html = html.replaceAll(
          `href="/${lang.dir}/${slug}.html"`,
          `href="/${lang.dir}/${slug}"`,
        );
      }
      fs.writeFileSync(fullPath, html, "utf8");
    }
  }
}

function normalizePublicUrls() {
  const localizedDirs = languages
    .filter((lang) => lang.dir)
    .map((lang) => `${lang.dir}/`)
    .join("|");
  const slugs = [
    ...new Set([...seoSlugs, ...newLongtailSlugs, ...legalSlugs]),
  ].join("|");
  const htmlUrl = new RegExp(`/(?:${localizedDirs})?(?:${slugs})\\.html`, "g");
  const files = ["sitemap.xml"];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "scripts") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".html")) {
        files.push(path.relative(root, fullPath));
      }
    }
  }

  walk(root);

  for (const file of files) {
    const fullPath = path.join(root, file);
    const original = fs.readFileSync(fullPath, "utf8");
    const updated = original
      .replace(/\/index\.html/g, "/")
      .replace(htmlUrl, (match) => match.slice(0, -5));
    if (updated !== original) {
      fs.writeFileSync(fullPath, updated, "utf8");
    }
  }
}

for (const lang of languages.filter((item) => item.code !== "en")) {
  for (const slug of newLongtailSlugs) {
    const file = path.join(root, lang.dir, `${slug}.html`);
    fs.writeFileSync(file, renderPage(lang.code, slug), "utf8");
  }
  for (const slug of existingLocalizedSlugs) {
    updateExistingLocalizedSeoPage(lang.code, slug);
  }
}

for (const slug of newLongtailSlugs) {
  fs.writeFileSync(
    path.join(root, `${slug}.html`),
    renderPage("en", slug),
    "utf8",
  );
}

localizeLongtailLinks();
normalizePublicUrls();

console.log(
  "Generated localized long-tail pages and updated localized SEO schema",
);
