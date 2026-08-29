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
  "homeschool-spelling-practice",
  "sight-word-typing-game",
  "vocabulary-typing-game",
];
const footerSlugs = [
  "sight-word-typing-game",
  "homeschool-spelling-practice",
  "vocabulary-typing-game",
];
const newLongtailSlugs = [
  "homeschool-spelling-practice",
  "sight-word-typing-game",
  "vocabulary-typing-game",
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
    faq: "Quick FAQ",
    start: "Start Practice",
    links: {
      "custom-spelling-words-game": "Custom Spelling Words Game",
      "spelling-list-game": "Spelling List Game",
      "weekly-spelling-practice": "Weekly Spelling Practice",
      "homeschool-spelling-practice": "Homeschool Spelling Practice",
      "sight-word-typing-game": "Sight Word Typing Game",
      "vocabulary-typing-game": "Vocabulary Typing Game",
    },
  },
  es: {
    related: "Páginas de práctica relacionadas",
    faq: "Preguntas rápidas",
    start: "Empezar práctica",
    links: {
      "custom-spelling-words-game": "Juego con tus palabras",
      "spelling-list-game": "Juego con lista de spelling",
      "weekly-spelling-practice": "Práctica semanal",
      "homeschool-spelling-practice": "Spelling para educación en casa",
      "sight-word-typing-game": "Práctica de sight words",
      "vocabulary-typing-game": "Juego de vocabulario",
    },
  },
  "pt-BR": {
    related: "Páginas de prática relacionadas",
    faq: "Perguntas rápidas",
    start: "Começar prática",
    links: {
      "custom-spelling-words-game": "Jogo com suas palavras",
      "spelling-list-game": "Jogo com lista de palavras",
      "weekly-spelling-practice": "Prática semanal",
      "homeschool-spelling-practice": "Spelling para homeschool",
      "sight-word-typing-game": "Prática de sight words",
      "vocabulary-typing-game": "Jogo de vocabulário",
    },
  },
  fr: {
    related: "Pages de pratique liées",
    faq: "Questions rapides",
    start: "Commencer",
    links: {
      "custom-spelling-words-game": "Jeu avec vos mots",
      "spelling-list-game": "Jeu avec liste de mots",
      "weekly-spelling-practice": "Pratique hebdomadaire",
      "homeschool-spelling-practice": "Orthographe anglaise à la maison",
      "sight-word-typing-game": "Pratique des sight words",
      "vocabulary-typing-game": "Jeu de vocabulaire",
    },
  },
  id: {
    related: "Halaman latihan terkait",
    faq: "Pertanyaan singkat",
    start: "Mulai latihan",
    links: {
      "custom-spelling-words-game": "Game dengan kata sendiri",
      "spelling-list-game": "Game daftar kata",
      "weekly-spelling-practice": "Latihan mingguan",
      "homeschool-spelling-practice": "Latihan spelling di rumah",
      "sight-word-typing-game": "Latihan sight words",
      "vocabulary-typing-game": "Game kosakata",
    },
  },
  zh: {
    related: "相关练习页面",
    faq: "常见问题",
    start: "开始练习",
    links: {
      "custom-spelling-words-game": "自定义单词拼写游戏",
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
    "custom-spelling-words-game": "Custom Spelling Game",
    "spelling-list-game": "Spelling List Game",
    "weekly-spelling-practice": "Weekly Practice",
    "homeschool-spelling-practice": "Homeschool",
    "sight-word-typing-game": "Sight Words",
    "vocabulary-typing-game": "Vocabulary",
  },
  es: {
    "custom-spelling-words-game": "Juego personalizado",
    "spelling-list-game": "Lista de spelling",
    "weekly-spelling-practice": "Práctica semanal",
    "homeschool-spelling-practice": "En casa",
    "sight-word-typing-game": "Palabras frecuentes",
    "vocabulary-typing-game": "Vocabulario",
  },
  "pt-BR": {
    "custom-spelling-words-game": "Jogo personalizado",
    "spelling-list-game": "Lista de soletrar",
    "weekly-spelling-practice": "Prática semanal",
    "homeschool-spelling-practice": "Em casa",
    "sight-word-typing-game": "Palavras frequentes",
    "vocabulary-typing-game": "Vocabulário",
  },
  fr: {
    "custom-spelling-words-game": "Jeu personnalisé",
    "spelling-list-game": "Liste de mots",
    "weekly-spelling-practice": "Pratique hebdomadaire",
    "homeschool-spelling-practice": "À la maison",
    "sight-word-typing-game": "Mots fréquents",
    "vocabulary-typing-game": "Vocabulaire",
  },
  id: {
    "custom-spelling-words-game": "Game kata sendiri",
    "spelling-list-game": "Daftar spelling",
    "weekly-spelling-practice": "Latihan mingguan",
    "homeschool-spelling-practice": "Di rumah",
    "sight-word-typing-game": "Kata umum",
    "vocabulary-typing-game": "Kosakata",
  },
  zh: {
    "custom-spelling-words-game": "自定义单词游戏",
    "spelling-list-game": "单词表练习",
    "weekly-spelling-practice": "每周拼写练习",
    "homeschool-spelling-practice": "家庭学习",
    "sight-word-typing-game": "高频词练习",
    "vocabulary-typing-game": "词汇练习",
  },
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
      title: "Custom Typing Game With Your Own Words | My Spelling Game",
      description:
        "Paste your own spelling words and start Typing Rain immediately. Type each falling word, review misses, and play without an account.",
      ogDescription:
        "Paste your own words and start a no-login Typing Rain game.",
      h1: "Typing Rain With Your Own Spelling Words",
      intro:
        "Paste any word list and launch the falling-word typing game with exactly those words.",
      panels: [
        [
          "Paste-And-Play Custom Word Lists",
          "Parents, teachers, tutors, homeschool families, and ESL instructors often already have the word list. This page turns that list into practice without a lesson builder or student login.",
        ],
        [
          "Why It Is Different",
          "No premade word bank, no class setup, and no account wall. Paste the exact words, play a short round, then replay missed words.",
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
      title: "Juego de Typing con Tus Propias Palabras | My Spelling Game",
      description:
        "Pega tus palabras y empieza Typing Rain al instante. Escribe cada palabra que cae, repasa los fallos y juega sin crear una cuenta.",
      ogDescription:
        "Pega tus palabras y empieza un juego Typing Rain sin cuenta.",
      h1: "Typing Rain con tus propias palabras",
      intro:
        "Pega cualquier lista y juega con esas palabras en el modo de typing con palabras que caen.",
      panels: [
        [
          "Para listas reales, no bancos genéricos",
          "Muchas familias y profesores ya tienen la lista. Lo útil es practicar exactamente esas palabras sin preparar una lección completa.",
        ],
        [
          "Rápido para clase o casa",
          "Pega la lista, juega una ronda y repite las palabras falladas. El enlace compartido funciona sin cuenta de estudiante.",
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
      title: "Jogo de Digitação com Suas Palavras | My Spelling Game",
      description:
        "Cole suas palavras e comece o Typing Rain na hora. Digite cada palavra que cai, revise os erros e jogue sem criar conta.",
      ogDescription: "Cole suas palavras e comece um Typing Rain sem login.",
      h1: "Typing Rain com suas próprias palavras",
      intro:
        "Cole qualquer lista e jogue o modo de digitação com exatamente essas palavras caindo na tela.",
      panels: [
        [
          "Para listas reais",
          "Pais, professores e tutores normalmente já têm a lista. O jogo evita banco genérico e usa só o que foi colado.",
        ],
        [
          "Sem preparação longa",
          "Cole a lista, faça uma rodada curta e revise as palavras erradas. O link compartilhado não exige login de aluno.",
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
      title: "Jeu de Frappe avec Vos Propres Mots | My Spelling Game",
      description:
        "Collez vos mots et lancez Typing Rain immédiatement. Tapez chaque mot qui tombe, révisez vos erreurs et jouez sans compte.",
      ogDescription: "Collez vos mots et lancez un Typing Rain sans compte.",
      h1: "Typing Rain avec vos propres mots",
      intro:
        "Collez n’importe quelle liste et lancez le jeu de frappe avec exactement ces mots à l’écran.",
      panels: [
        [
          "Des mots réels, pas une liste générique",
          "La liste existe souvent déjà. Le plus utile est de la transformer en pratique courte sans préparer une leçon entière.",
        ],
        [
          "Pratique rapide",
          "Collez la liste, jouez une partie et refaites les mots manqués. Le lien partagé fonctionne sans compte élève.",
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
      title: "Game Mengetik dengan Kata Sendiri | My Spelling Game",
      description:
        "Tempel kata sendiri lalu mulai Typing Rain. Ketik setiap kata yang jatuh, ulangi yang salah, dan main tanpa membuat akun.",
      ogDescription: "Tempel kata sendiri dan mulai Typing Rain tanpa login.",
      h1: "Typing Rain dengan kata sendiri",
      intro:
        "Tempel daftar apa saja lalu mainkan game mengetik dengan kata-kata itu jatuh di layar.",
      panels: [
        [
          "Untuk daftar yang benar-benar dipakai",
          "Orang tua, guru, dan tutor biasanya sudah punya daftar. Game ini mengubah daftar itu menjadi latihan tanpa bank kata acak.",
        ],
        [
          "Cepat untuk kelas atau rumah",
          "Tempel daftar, mainkan ronde pendek, lalu ulangi kata yang salah. Link latihan tidak perlu akun siswa.",
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
      title: "用自己的单词玩打字游戏 | My Spelling Game",
      description:
        "粘贴自己的英语单词，立即开始 Typing Rain。输入屏幕上掉落的单词，结束后重练漏词，无需账号。",
      ogDescription: "粘贴自己的单词，直接开始无需登录的 Typing Rain。",
      h1: "用自己的单词玩 Typing Rain",
      intro: "粘贴任意英语单词表，让这些单词进入掉落打字游戏。",
      panels: [
        [
          "不是随机词库",
          "很多时候单词表已经存在，真正需要的是把它快速变成练习，而不是重新建课程。",
        ],
        [
          "适合课堂和家庭",
          "粘贴单词，练一轮，再重练漏掉的词。分享链接不需要学生注册账号。",
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

const customLauncher = {
  en: {
    label: "Words for Typing Rain",
    button: "Start Typing Rain",
    invalid: "Enter at least one word.",
    limit: "No-login practice supports up to 20 words per list.",
  },
  es: {
    label: "Palabras para Typing Rain",
    button: "Empezar Typing Rain",
    invalid: "Escribe al menos una palabra.",
    limit: "La práctica sin cuenta admite hasta 20 palabras por lista.",
  },
  "pt-BR": {
    label: "Palavras para o Typing Rain",
    button: "Começar Typing Rain",
    invalid: "Digite pelo menos uma palavra.",
    limit: "A prática sem conta aceita até 20 palavras por lista.",
  },
  fr: {
    label: "Mots pour Typing Rain",
    button: "Lancer Typing Rain",
    invalid: "Saisissez au moins un mot.",
    limit: "L’entraînement sans compte accepte jusqu’à 20 mots par liste.",
  },
  id: {
    label: "Kata untuk Typing Rain",
    button: "Mulai Typing Rain",
    invalid: "Masukkan setidaknya satu kata.",
    limit: "Latihan tanpa akun mendukung hingga 20 kata per daftar.",
  },
  zh: {
    label: "Typing Rain 单词表",
    button: "开始 Typing Rain",
    invalid: "请至少输入一个英语单词。",
    limit: "无需登录的练习每份词表最多 20 个单词。",
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
        <a class="teacher-nav-link" href="/teacher?lang=${encodeURIComponent(currentCode)}">${langCodeLabel(currentCode)}</a>
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

function faqHtml(langCode, faq) {
  return `        <section class="seo-panel">
            <h2>${labels[langCode].faq}</h2>
${faq.map(([q, a]) => `            <p><strong>${localizeLegacyTerms(q, langCode)}</strong> ${localizeLegacyTerms(a, langCode)}</p>`).join("\n")}
        </section>`;
}

function relatedHtml(langCode, currentSlug) {
  return `        <section class="seo-panel">
            <h2>${labels[langCode].related}</h2>
            <div class="seo-link-grid">
${seoSlugs
  .filter((slug) => slug !== currentSlug)
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
            <span class="footer-links">${footerSlugs.map((slug) => `<a href="${pagePath(lang, slug)}">${footerLinks[langCode][slug]}</a>`).join(" &middot; ")} &middot; <a href="${pagePath(lang, "faq")}">${faqLabels[langCode]}</a> &middot; <a href="${pagePath(lang, "privacy")}">${lang.privacy}</a> &middot; <a href="${pagePath(lang, "about")}">${lang.about}</a> &middot; <a href="${pagePath(lang, "contact")}">${lang.contact}</a></span><br>
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
      "homeschool-spelling-practice": "2026-08-23",
      "sight-word-typing-game": "2026-06-22",
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

function renderPage(langCode, slug) {
  const lang = languages.find((item) => item.code === langCode);
  const page = pages[langCode][slug];
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
    <main class="seo-landing content-page">
        <section class="seo-hero">
            <h1>${localizeLegacyTerms(page.h1, langCode)}</h1>
            <p>${localizeLegacyTerms(page.intro, langCode)}</p>
${
  slug === "custom-spelling-words-game"
    ? `            <form class="landing-launcher" action="${dirPath(lang)}" data-mode="typing" data-invalid="${escapeAttr(launcher.invalid)}" data-limit="${escapeAttr(launcher.limit)}">
                <label for="custom-words-${langCode}">${localizeLegacyTerms(launcher.label, langCode)}</label>
                <textarea id="custom-words-${langCode}" name="words" required spellcheck="false" placeholder="because&#10;friend&#10;beautiful"></textarea>
                <button type="submit">${localizeLegacyTerms(launcher.button, langCode)}</button>
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
    </main>
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
  const slugs = [...seoSlugs, ...legalSlugs].join("|");
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
