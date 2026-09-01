const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const baseUrl = "https://myspellinggame.com";
const ogImage = `${baseUrl}/images/my-spelling-game-og.png`;

const alternates = [
  { code: "en", hreflang: "en", label: "English", path: "/" },
  { code: "es", hreflang: "es", label: "Español", path: "/es/" },
  { code: "pt-BR", hreflang: "pt-BR", label: "Português", path: "/pt-br/" },
  { code: "fr", hreflang: "fr", label: "Français", path: "/fr/" },
  { code: "id", hreflang: "id", label: "Bahasa Indonesia", path: "/id/" },
  { code: "zh", hreflang: "zh-CN", label: "中文", path: "/zh/" },
];

const sharedLinks = [
  "/custom-spelling-words-game",
  "/weekly-spelling-practice",
  "/sight-word-typing-game",
  "/spelling-practice-for-parents",
  "/spelling-assignments-for-teachers",
];

const localizedSeoSlugs = [
  "sight-word-typing-game",
  "spelling-practice-for-parents",
  "custom-spelling-words-game",
  "spelling-assignments-for-teachers",
  "weekly-spelling-practice",
  "pricing",
  "faq",
  "privacy",
  "about",
  "contact",
];
const secondaryLinks = {
  en: [["/pricing", "Pricing"], ["/faq", "FAQ"], ["/privacy", "Privacy"], ["/about", "About"], ["/contact", "Contact"]],
  es: [["/pricing", "Precios"], ["/faq", "Preguntas frecuentes"], ["/privacy", "Privacidad"], ["/about", "Acerca de"], ["/contact", "Contacto"]],
  "pt-BR": [["/pricing", "Preços"], ["/faq", "Perguntas frequentes"], ["/privacy", "Privacidade"], ["/about", "Sobre"], ["/contact", "Contato"]],
  fr: [["/pricing", "Tarifs"], ["/faq", "Questions fréquentes"], ["/privacy", "Confidentialité"], ["/about", "À propos"], ["/contact", "Contact"]],
  id: [["/pricing", "Harga"], ["/faq", "Pertanyaan umum"], ["/privacy", "Privasi"], ["/about", "Tentang"], ["/contact", "Kontak"]],
  zh: [["/pricing", "价格"], ["/faq", "常见问题"], ["/privacy", "隐私"], ["/about", "关于"], ["/contact", "联系"]],
};
const footerRights = {
  en: "All rights reserved.",
  es: "Todos los derechos reservados.",
  "pt-BR": "Todos os direitos reservados.",
  fr: "Tous droits réservés.",
  id: "Hak cipta dilindungi.",
  zh: "版权所有。",
};
const comboLabels = {
  en: "Streak",
  es: "Racha",
  "pt-BR": "Sequência",
  fr: "Série",
  id: "Rentetan",
  zh: "连续正确",
};
const benefitsLabels = {
  en: "My Spelling Game benefits",
  es: "Ventajas de My Spelling Game",
  "pt-BR": "Vantagens do My Spelling Game",
  fr: "Atouts de My Spelling Game",
  id: "Keunggulan My Spelling Game",
  zh: "练习优势",
};

const workspaceCopy = {
  en: {
    heading: "For parents and teachers",
    text: "Want to use the same spelling lists week after week? Create a free workspace to save lists, assign practice without student accounts, track progress across assignments, and see which words need review next.",
    cta: "Open Workspace",
  },
  es: {
    heading: "Para familias y docentes",
    text: "¿Quieres usar las mismas listas de spelling semana tras semana? Crea un espacio de trabajo gratis para guardar listas, asignar prácticas sin cuentas de estudiantes, seguir el progreso entre tareas y ver qué palabras necesitan repaso.",
    cta: "Abrir el espacio de trabajo",
  },
  "pt-BR": {
    heading: "Para responsáveis e professores",
    text: "Quer usar as mesmas listas de ortografia semana após semana? Crie um espaço de trabalho gratuito para salvar listas, atribuir práticas sem contas de alunos, acompanhar o progresso entre tarefas e ver quais palavras precisam de revisão.",
    cta: "Abrir o espaço de trabalho",
  },
  fr: {
    heading: "Pour les parents et les enseignants",
    text: "Vous voulez réutiliser les mêmes listes chaque semaine ? Créez un espace de travail gratuit pour enregistrer les listes, proposer des exercices sans compte élève, suivre les progrès entre les devoirs et voir les mots à revoir.",
    cta: "Ouvrir l’espace de travail",
  },
  id: {
    heading: "Untuk orang tua dan guru",
    text: "Ingin memakai daftar ejaan yang sama setiap minggu? Buat ruang kerja gratis untuk menyimpan daftar, memberikan latihan tanpa akun siswa, memantau kemajuan di berbagai tugas, dan melihat kata yang perlu diulas berikutnya.",
    cta: "Buka Ruang kerja",
  },
  zh: {
    heading: "适合家长和老师",
    text: "想每周重复使用同一份单词表吗？创建免费工作台，保存词表、在无需学生账号的情况下布置练习、追踪不同作业的进度，并查看下一步需要复习的单词。",
    cta: "打开工作台",
  },
};

const pages = {
  es: {
    htmlLang: "es",
    path: "/es/",
    pageLocale: "es",
    ogLocale: "es_ES",
    title: "Prueba de Ortografía Gratis con Tus Palabras — Sin Cuenta",
    description:
      "Pega tu propia lista, escucha una palabra oculta, escribe la respuesta y recibe corrección al instante. Repite los fallos sin crear una cuenta.",
    keywords:
      "juego de spelling en inglés,juego de deletreo en inglés,juego de ortografía inglesa,practicar spelling en inglés,juego con tus propias palabras,lista de vocabulario en inglés,juego de palabras en inglés para niños,práctica de spelling sin cuenta",
    ogTitle: "Prueba de ortografía con tus propias palabras",
    ogDescription:
      "Escucha palabras ocultas, recibe corrección al instante y repite los fallos. Sin cuenta.",
    nav: {
      language: "Idioma",
      teacher: "Espacio de trabajo",
      privacy: "Privacidad",
      sound: "Sonido",
    },
    hero: {
      h1: "Prueba gratis de ortografía con tus propias palabras",
      p1: "Pega tu lista y escucha cada palabra sin verla en pantalla.",
      p2: "Escribe la respuesta, recibe la corrección al instante y repite solo las palabras falladas.",
      p3: "No hace falta crear una cuenta.",
      flow: [
        "Sin iniciar sesión",
        "Pega las palabras",
        "Escucha una palabra oculta",
        "Escribe la respuesta",
        "Repite las falladas",
      ],
      flowLabel: "Pasos de la práctica",
    },
    game: {
      round: "Ronda de práctica",
      placeholder: "Escribe una palabra en inglés...",
      startTitle: "Practica con tu propia lista",
      subtitle: "Prueba de ortografía o juego de palabras, sin cuenta",
      intro:
        "Elige la prueba de audio recomendada o la lluvia de palabras, pega tus palabras y empieza.",
      chips: ["Corrección inmediata", "Palabra oculta", "Repite los fallos"],
      noLogin: "Sin crear una cuenta",
      wordsLabel: "Tus palabras en inglés",
      photoImport: "Importar desde una foto",
      sentencesLabel: "Frases de ejemplo (opcional)",
      autoSentences: "Autocompletar",
      sentencesHelp:
        "Una frase por línea, en el mismo orden que las palabras. Deja una línea en blanco si no la necesitas.",
      hear: "Escuchar cada palabra antes de escribir",
      easy: "Modo fácil",
      ready: "8 palabras listas",
      sample: "Lista de ejemplo",
      copy: "Copiar enlace de práctica",
      assign: "Asignar tarea",
      assignComplete: "Asignar esta lista a estudiantes",
      start: "Empezar práctica",
      complete: "Práctica terminada",
      returnMenu: "Volver al menú principal",
      finalScore: "Puntos finales",
      finalRound: "Ronda alcanzada",
      finalSpeed: "Mejor velocidad",
      accuracy: "Precisión",
      finalMissed: "Palabras falladas",
      replay: "Repetir palabras falladas",
      same: "Jugar con las mismas palabras",
      edit: "Editar lista de palabras",
      stats: ["PUNTOS", "RONDA", "VELOCIDAD", "PRECISIÓN", "FALLADAS"],
    },
    privacy: {
      title: "Privacidad",
      h3: "Datos que se guardan",
      intro:
        "My Spelling Game está pensado para práctica rápida en el navegador. Así tratamos tus datos:",
      localTitle: "Almacenamiento local",
      local: [
        "Tu lista de palabras y tus preferencias se guardan localmente en este navegador.",
        "Los enlaces nuevos guardan la lista en el fragmento de la URL, que el navegador procesa sin enviarlo al servidor.",
        "La importación por foto lee la imagen en tu navegador; no se sube al servidor y puedes editar las palabras detectadas antes de usarlas.",
        "Las tareas que un docente o familiar publica de forma explícita y sus resultados se guardan en Cloudflare D1 durante 14 días con el Plan Gratis o 365 días con los planes para familias y docentes. No recopilamos email, IP ni User-Agent del estudiante.",
        "Puedes borrar estos datos desde el navegador o desde este panel.",
      ],
      analyticsTitle: "Analítica",
      analytics: [
        "Google Analytics recibe la dirección limpia de la página, sin parámetros ni fragmentos.",
        "Solo enviamos datos agregados, como el modo, la cantidad de palabras y el resultado.",
        "No enviamos la lista de palabras ni las respuestas escritas.",
      ],
      adsTitle: "Publicidad",
      ads: [
        "El sitio usa Google AdSense para mostrar anuncios.",
        "La personalización de anuncios depende de las políticas de Google.",
      ],
      rightsTitle: "Tus opciones",
      rights: [
        "Puedes borrar la lista guardada cuando quieras.",
        "Puedes bloquear analítica o anuncios con las opciones de tu navegador.",
      ],
      contactTitle: "Contacto",
      contact:
        "Si tienes preguntas sobre privacidad, puedes escribirnos desde la página de contacto.",
      updated: "Última actualización:",
      close: "Cerrar",
      clear: "Borrar mis datos",
    },
    info: {
      listTitle: "Para la lista de esta semana",
      list: [
        "Pega las palabras de inglés que ya trae tu clase o tu hijo.",
        "Usa la prueba de audio para escuchar una palabra oculta o la lluvia de palabras para escribir las palabras que caen.",
        "Pulsa <kbd>Enter</kbd> para enviar; la lluvia de palabras también admite <kbd>Space</kbd>.",
        "Las palabras falladas quedan guardadas para repasarlas con un clic.",
        "Copia un enlace para compartir la misma lista.",
      ],
      easyTitle: "Modo fácil",
      easyText:
        "Activa el modo fácil antes de jugar para que las palabras caigan más despacio.",
      whyTitle: "Por qué funciona",
      why: [
        "Usa las palabras exactas de la semana, no un banco aleatorio.",
        "Sirve para deberes, tutorías, estudiantes de inglés y práctica en casa.",
        "El repaso se concentra en las palabras que el estudiante falló.",
        "El modo fácil baja la velocidad sin cambiar las reglas de ortografía.",
        "Los planes para familias y docentes añaden importación por foto, frases automáticas y Repaso de hoy.",
      ],
      seoTitle: "Dos formas de practicar tu propia lista",
      seoIntro:
        "<strong>Prueba de ortografía</strong> reproduce una palabra oculta y corrige la respuesta. La <strong>lluvia de palabras</strong> mantiene el juego original de palabras que caen.",
      sectionTitle: "Una lista concreta, una práctica más útil",
      sectionText:
        "Pegar la lista real mantiene la práctica centrada en las palabras de esta semana. Los dos modos guardan los fallos para repasarlos.",
      bullets: [
        "<strong>Usa tu lista real:</strong> Pega palabras de una hoja del profesor, deberes o material de educación en casa.",
        "<strong>Repite lo fallado:</strong> Las respuestas incorrectas y las palabras perdidas vuelven en otra ronda.",
        "<strong>Comparte la práctica:</strong> Copia un enlace con la misma lista, sin cuenta ni aula virtual.",
        "<strong>Haz una prueba de audio:</strong> La palabra permanece oculta hasta enviar la respuesta.",
        "<strong>Usa contexto sin revelar la respuesta:</strong> En las frases de ejemplo, la palabra objetivo aparece como un espacio en blanco, mientras el audio lee la palabra y la frase completa.",
      ],
      repeatTitle: "Bueno para práctica semanal",
      repeatText:
        "Es una herramienta pequeña para una tarea repetida: tomar una lista corta, practicar, ver qué palabras fallan y repetirlas. Gratis, sin cuentas de estudiante y sin depender de una plataforma escolar.",
    },
    footerLinks: [
      "Palabras personalizadas",
      "Práctica semanal",
      "Palabras frecuentes",
      "Para familias",
      "Para docentes",
    ],
    legalLinks: ["Privacidad", "Acerca de", "Contacto"],
    schema: {
      description:
        "Pega tus palabras para una prueba de ortografía por audio o una lluvia de palabras. Las frases de ejemplo muestran la palabra objetivo como un espacio en blanco mientras el audio lee la palabra y la frase completa.",
      faq: [
        [
          "¿Puedo usar mis propias palabras?",
          "Sí. Pega una lista semanal y My Spelling Game usará exactamente esas palabras en el juego.",
        ],
        [
          "¿Puedo repetir solo las palabras falladas?",
          "Sí. Al final de la ronda, las palabras falladas quedan listas para otra práctica.",
        ],
        [
          "¿Hace falta crear una cuenta?",
          "No. Funciona en el navegador, sin cuenta de estudiante ni aula virtual.",
        ],
      ],
      breadcrumb: "Juego de ortografía en inglés",
    },
  },
  "pt-BR": {
    htmlLang: "pt-BR",
    path: "/pt-br/",
    pageLocale: "pt-BR",
    ogLocale: "pt_BR",
    title: "Teste de Ortografia Grátis com Suas Palavras — Sem Conta",
    description:
      "Cole sua lista, ouça uma palavra escondida, digite a resposta e veja a correção na hora. Revise os erros sem criar conta.",
    keywords:
      "jogo de soletrar em inglês,soletrar em inglês,jogo de spelling em inglês,jogo de ortografia em inglês,praticar spelling em inglês,lista de palavras em inglês,jogo com suas próprias palavras,atividade de inglês para crianças,spelling bee online grátis",
    ogTitle: "Teste de ortografia com suas próprias palavras",
    ogDescription:
      "Ouça palavras escondidas, veja a correção na hora e revise os erros. Sem login.",
    nav: {
      language: "Idioma",
      teacher: "Espaço de trabalho",
      privacy: "Privacidade",
      sound: "Som",
    },
    hero: {
      h1: "Teste de ortografia grátis com suas próprias palavras",
      p1: "Cole sua lista e ouça cada palavra sem vê-la na tela.",
      p2: "Digite a resposta, confira a correção na hora e revise somente o que errou.",
      p3: "Não precisa criar conta.",
      flow: [
        "Sem fazer login",
        "Cole as palavras",
        "Ouça uma palavra escondida",
        "Digite a resposta",
        "Revise os erros",
      ],
      flowLabel: "Etapas da prática",
    },
    game: {
      round: "Rodada de prática",
      placeholder: "Digite uma palavra em inglês...",
      startTitle: "Pratique com sua própria lista",
      subtitle: "Teste de ortografia ou jogo de palavras, sem conta",
      intro:
        "Escolha o teste por áudio recomendado ou a chuva de palavras, cole as palavras e comece.",
      chips: ["Correção imediata", "Palavra escondida", "Revise os erros"],
      noLogin: "Sem criar uma conta",
      wordsLabel: "Suas palavras em inglês",
      photoImport: "Importar de uma foto",
      sentencesLabel: "Frases de exemplo (opcional)",
      autoSentences: "Preencher",
      sentencesHelp:
        "Uma frase por linha, na mesma ordem das palavras. Deixe uma linha em branco quando não precisar.",
      hear: "Ouvir cada palavra antes de digitar",
      easy: "Modo fácil",
      ready: "8 palavras prontas",
      sample: "Lista de exemplo",
      copy: "Copiar link de prática",
      assign: "Criar tarefa",
      assignComplete: "Criar tarefa para alunos com esta lista",
      start: "Começar prática",
      complete: "Prática concluída",
      returnMenu: "Voltar ao menu principal",
      finalScore: "Pontuação final",
      finalRound: "Rodada alcançada",
      finalSpeed: "Melhor velocidade",
      accuracy: "Precisão",
      finalMissed: "Palavras erradas",
      replay: "Revisar palavras erradas",
      same: "Jogar com as mesmas palavras",
      edit: "Editar lista",
      stats: ["PONTOS", "RODADA", "VELOC.", "PRECISÃO", "ERROS"],
    },
    privacy: {
      title: "Privacidade",
      h3: "Dados salvos",
      intro:
        "My Spelling Game foi feito para prática rápida no navegador. Veja como tratamos seus dados:",
      localTitle: "Armazenamento local",
      local: [
        "Sua lista de palavras e preferências ficam salvas neste navegador.",
        "Os links novos guardam a lista no fragmento da URL, processado pelo navegador sem ser enviado ao servidor.",
        "A importação por foto lê a imagem no navegador; ela não é enviada ao servidor e você pode editar as palavras reconhecidas antes de usá-las.",
        "Tarefas publicadas explicitamente por professores ou responsáveis e seus resultados ficam no Cloudflare D1 por 14 dias no Plano Grátis ou 365 dias nos planos para Pais e Professores. Não coletamos email, IP ou User-Agent do aluno.",
        "Você pode apagar esses dados pelo navegador ou por este painel.",
      ],
      analyticsTitle: "Analytics",
      analytics: [
        "O Google Analytics recebe o endereço limpo da página, sem parâmetros ou fragmentos.",
        "Enviamos apenas dados agregados, como modo, quantidade de palavras e resultado.",
        "A lista de palavras e as respostas digitadas não são enviadas.",
      ],
      adsTitle: "Anúncios",
      ads: [
        "O site usa Google AdSense para exibir anúncios.",
        "A personalização segue as políticas do Google.",
      ],
      rightsTitle: "Suas opções",
      rights: [
        "Você pode apagar a lista salva quando quiser.",
        "Você pode bloquear analytics ou anúncios nas configurações do navegador.",
      ],
      contactTitle: "Contato",
      contact:
        "Se tiver dúvidas sobre privacidade, fale conosco pela página de contato.",
      updated: "Atualizado em:",
      close: "Fechar",
      clear: "Apagar meus dados",
    },
    info: {
      listTitle: "Para a lista desta semana",
      list: [
        "Cole as palavras de inglês que a turma ou a criança já recebeu.",
        "Use o teste por áudio para ouvir uma palavra escondida ou a chuva de palavras para digitar as palavras que caem.",
        "Use <kbd>Enter</kbd> para enviar; a chuva de palavras também aceita <kbd>Space</kbd>.",
        "As palavras erradas ficam salvas para revisão em um clique.",
        "Copie um link para compartilhar a mesma lista.",
      ],
      easyTitle: "Modo fácil",
      easyText:
        "Ative o modo fácil antes de jogar para deixar as palavras mais lentas.",
      whyTitle: "Por que funciona",
      why: [
        "Usa as palavras exatas da semana, não uma lista aleatória.",
        "Ajuda em tarefa de casa, reforço, estudantes de inglês e educação em casa.",
        "A revisão foca nas palavras que o aluno errou.",
        "O modo fácil reduz a velocidade sem mudar as regras de ortografia.",
        "Os planos para Pais e Professores acrescentam importação por foto, frases automáticas e Revisão de hoje.",
      ],
      seoTitle: "Duas formas de praticar sua própria lista",
      seoIntro:
        "<strong>Teste de ortografia</strong> toca uma palavra escondida e corrige a resposta. A <strong>chuva de palavras</strong> mantém o jogo original de palavras caindo.",
      sectionTitle: "Uma lista real deixa a prática mais útil",
      sectionText:
        "Colar a lista da semana mantém o foco nas palavras certas. Os dois modos guardam os erros para uma rodada de revisão.",
      bullets: [
        "<strong>Use sua lista real:</strong> Cole palavras da tarefa, da escola ou do material de educação em casa.",
        "<strong>Revise os erros:</strong> Respostas erradas e palavras perdidas entram em outra rodada.",
        "<strong>Compartilhe a prática:</strong> Copie um link com a mesma lista, sem conta nem turma online.",
        "<strong>Faça um teste por áudio:</strong> A palavra fica escondida até a resposta ser enviada.",
        "<strong>Use contexto sem revelar a resposta:</strong> Nas frases de exemplo, a palavra-alvo aparece como lacuna, enquanto o áudio lê a palavra e a frase completa.",
      ],
      repeatTitle: "Feito para prática semanal",
      repeatText:
        "É uma ferramenta pequena para uma rotina que se repete: pegar uma lista curta, praticar, descobrir os erros e praticar de novo. Grátis, sem conta de aluno e sem depender de plataforma escolar.",
    },
    footerLinks: [
      "Palavras personalizadas",
      "Prática semanal",
      "Palavras frequentes",
      "Para pais",
      "Para professores",
    ],
    legalLinks: ["Privacidade", "Sobre", "Contato"],
    schema: {
      description:
        "Cole suas palavras para um teste de ortografia por áudio ou uma chuva de palavras. Frases de exemplo deixam a palavra-alvo em branco enquanto o áudio lê a palavra e a frase completa.",
      faq: [
        [
          "Posso usar minhas próprias palavras?",
          "Sim. Cole uma lista semanal e o jogo usa exatamente essas palavras.",
        ],
        [
          "Dá para revisar só as palavras erradas?",
          "Sim. No fim da rodada, as palavras erradas ficam prontas para outra prática.",
        ],
        [
          "Precisa criar conta?",
          "Não. Funciona no navegador, sem conta, turma online ou cadastro de aluno.",
        ],
      ],
      breadcrumb: "Jogo de soletrar em inglês",
    },
  },
  fr: {
    htmlLang: "fr",
    path: "/fr/",
    pageLocale: "fr",
    ogLocale: "fr_FR",
    title: "Test d’Orthographe Anglaise avec Vos Mots — Sans Compte",
    description:
      "Collez votre liste, écoutez un mot caché, tapez la réponse et obtenez la correction immédiatement. Reprenez vos erreurs sans compte.",
    keywords:
      "jeu d'orthographe anglais,orthographe anglaise,pratiquer l'orthographe anglaise,jeu de spelling anglais,épeler des mots anglais,liste de mots anglais,jeu avec vos propres mots,spelling bee anglais gratuit",
    ogTitle: "Test d’orthographe anglaise avec vos propres mots",
    ogDescription:
      "Écoutez des mots cachés, obtenez la correction immédiatement et reprenez vos erreurs. Sans compte.",
    nav: {
      language: "Langue",
      teacher: "Espace de travail",
      privacy: "Confidentialité",
      sound: "Son",
    },
    hero: {
      h1: "Test gratuit d’orthographe anglaise avec vos propres mots",
      p1: "Collez votre liste et écoutez chaque mot sans le voir à l’écran.",
      p2: "Tapez la réponse, voyez la correction tout de suite, puis reprenez seulement vos erreurs.",
      p3: "Aucun compte n’est nécessaire.",
      flow: [
        "Sans connexion",
        "Collez les mots",
        "Écoutez un mot caché",
        "Tapez la réponse",
        "Reprenez vos erreurs",
      ],
      flowLabel: "Étapes de la pratique",
    },
    game: {
      round: "Partie de pratique",
      placeholder: "Tapez un mot anglais...",
      startTitle: "Pratiquez avec votre propre liste",
      subtitle: "Test d’orthographe ou jeu de frappe, sans compte",
      intro:
        "Choisissez le test audio recommandé ou la pluie de mots, collez vos mots et commencez.",
      chips: ["Correction immédiate", "Mot caché", "Reprendre les erreurs"],
      noLogin: "Sans créer de compte",
      wordsLabel: "Vos mots anglais",
      photoImport: "Importer depuis une photo",
      sentencesLabel: "Phrases d’exemple (facultatif)",
      autoSentences: "Remplir",
      sentencesHelp:
        "Une phrase par ligne, dans le même ordre que les mots. Laissez une ligne vide si besoin.",
      hear: "Écouter chaque mot avant de taper",
      easy: "Mode facile",
      ready: "8 mots prêts",
      sample: "Liste exemple",
      copy: "Copier le lien",
      assign: "Donner un devoir",
      assignComplete: "Donner cette liste aux élèves",
      start: "Commencer",
      complete: "Entraînement terminé",
      returnMenu: "Retour au menu principal",
      finalScore: "Score final",
      finalRound: "Partie atteinte",
      finalSpeed: "Meilleure vitesse",
      accuracy: "Précision",
      finalMissed: "Mots manqués",
      replay: "Rejouer les mots manqués",
      same: "Rejouer la même liste",
      edit: "Modifier la liste",
      stats: ["POINTS", "PARTIE", "VITESSE", "PRÉCISION", "MANQUÉS"],
    },
    privacy: {
      title: "Confidentialité",
      h3: "Données enregistrées",
      intro:
        "My Spelling Game est conçu pour une pratique rapide dans le navigateur. Voici comment les données sont traitées :",
      localTitle: "Stockage local",
      local: [
        "Votre liste de mots et vos préférences sont enregistrées localement dans ce navigateur.",
        "Les nouveaux liens placent la liste dans le fragment de l’URL, traité par le navigateur sans être envoyé au serveur.",
        "L’import photo lit l’image dans le navigateur ; elle n’est pas envoyée au serveur et vous pouvez modifier les mots détectés avant usage.",
        "Les devoirs publiés explicitement par un enseignant ou un parent et leurs résultats sont conservés dans Cloudflare D1 pendant 14 jours avec l’offre gratuite ou 365 jours avec les offres Parents et Enseignants. Aucun email, IP ni User-Agent élève n’est collecté.",
        "Vous pouvez effacer ces données depuis le navigateur ou depuis ce panneau.",
      ],
      analyticsTitle: "Mesure d’audience",
      analytics: [
        "Google Analytics reçoit une adresse de page nettoyée, sans paramètres ni fragment.",
        "Seules des données agrégées sont envoyées, comme le mode, le nombre de mots et le résultat.",
        "La liste de mots et les réponses saisies ne sont jamais envoyées.",
      ],
      adsTitle: "Publicité",
      ads: [
        "Le site utilise Google AdSense pour afficher des annonces.",
        "La personnalisation dépend des règles de Google.",
      ],
      rightsTitle: "Vos choix",
      rights: [
        "Vous pouvez effacer la liste enregistrée à tout moment.",
        "Vous pouvez bloquer l’analyse ou les annonces avec les réglages de votre navigateur.",
      ],
      contactTitle: "Contact",
      contact:
        "Pour toute question sur la confidentialité, utilisez la page de contact.",
      updated: "Dernière mise à jour :",
      close: "Fermer",
      clear: "Effacer mes données",
    },
    info: {
      listTitle: "Pour la liste de cette semaine",
      list: [
        "Collez les mots anglais déjà donnés par le professeur ou le cours.",
        "Choisissez le test audio pour écouter un mot caché, ou la pluie de mots pour taper les mots qui tombent.",
        "Appuyez sur <kbd>Enter</kbd> pour valider ; la pluie de mots accepte aussi <kbd>Space</kbd>.",
        "Les mots manqués sont gardés pour une révision en un clic.",
        "Copiez un lien pour partager la même liste.",
      ],
      easyTitle: "Mode facile",
      easyText:
        "Activez le mode facile avant de jouer pour ralentir les mots qui tombent.",
      whyTitle: "Pourquoi ça marche",
      why: [
        "On travaille les mots exacts de la semaine, pas une liste au hasard.",
        "Pratique pour les devoirs, le soutien, l’apprentissage de l’anglais et l’école à la maison.",
        "La révision se concentre sur les mots réellement manqués.",
        "Le mode facile ralentit la partie sans changer la règle.",
        "Les offres Parents et Enseignants ajoutent l’import photo, les phrases automatiques et la Révision du jour.",
      ],
      seoTitle: "Deux façons de travailler votre propre liste",
      seoIntro:
        "<strong>Test d’orthographe</strong> lit un mot caché et corrige la réponse. La <strong>pluie de mots</strong> conserve le jeu original de mots qui tombent.",
      sectionTitle: "Une liste précise rend la pratique plus utile",
      sectionText:
        "Coller la liste de la semaine garde la pratique centrée sur les bons mots. Les deux modes enregistrent les erreurs pour les reprendre.",
      bullets: [
        "<strong>Votre vraie liste :</strong> Collez les mots d’un devoir, d’un cours ou d’un support d’école à la maison.",
        "<strong>Révision ciblée :</strong> Les mots manqués reviennent dans une autre partie.",
        "<strong>Lien partageable :</strong> Envoyez la même liste sans compte ni espace classe.",
        "<strong>Test audio :</strong> Le mot reste caché jusqu’à l’envoi de la réponse.",
        "<strong>Donnez du contexte sans révéler la réponse :</strong> Dans une phrase d’exemple, le mot cible devient un blanc tandis que l’audio lit le mot et la phrase complète.",
      ],
      repeatTitle: "Adapté à la pratique hebdomadaire",
      repeatText:
        "L’outil reste volontairement simple : prendre une liste courte, faire pratiquer l’enfant, repérer les mots manqués, puis les refaire. Gratuit, sans compte élève et sans dépendre d’une plateforme scolaire.",
    },
    footerLinks: [
      "Mots personnalisés",
      "Pratique hebdomadaire",
      "Mots fréquents",
      "Pour les parents",
      "Pour les enseignants",
    ],
    legalLinks: ["Confidentialité", "À propos", "Contact"],
    schema: {
      description:
        "Collez vos mots pour un test audio ou une pluie de mots. Les phrases d’exemple laissent le mot cible en blanc tandis que l’audio lit le mot et la phrase complète.",
      faq: [
        [
          "Puis-je utiliser mes propres mots ?",
          "Oui. Collez une liste de la semaine et le jeu utilise exactement ces mots.",
        ],
        [
          "Peut-on rejouer seulement les mots manqués ?",
          "Oui. Les mots manqués restent disponibles pour une nouvelle partie.",
        ],
        [
          "Faut-il créer un compte ?",
          "Non. Le jeu fonctionne dans le navigateur, sans compte ni espace classe.",
        ],
      ],
      breadcrumb: "Jeu d’orthographe anglaise",
    },
  },
  id: {
    htmlLang: "id",
    path: "/id/",
    pageLocale: "id",
    ogLocale: "id_ID",
    title: "Tes Ejaan Gratis dengan Kata Sendiri — Tanpa Akun",
    description:
      "Tempel daftar sendiri, dengarkan kata yang disembunyikan, ketik jawaban, lalu lihat hasilnya. Ulangi kata yang salah tanpa akun.",
    keywords:
      "game spelling bahasa Inggris,permainan spelling bahasa Inggris,permainan mengeja bahasa Inggris,latihan mengeja bahasa Inggris,belajar spelling bahasa Inggris,game kosakata bahasa Inggris,daftar kata bahasa Inggris,buat daftar kata sendiri,game dengan kata sendiri,latihan spelling anak,spelling bee online gratis",
    ogTitle: "Tes ejaan dengan daftar kata sendiri",
    ogDescription:
      "Dengarkan kata tersembunyi, lihat hasilnya, lalu ulangi yang salah. Tanpa login.",
    nav: {
      language: "Bahasa",
      teacher: "Ruang kerja",
      privacy: "Privasi",
      sound: "Suara",
    },
    hero: {
      h1: "Tes ejaan gratis dengan daftar kata sendiri",
      p1: "Tempel daftar kata lalu dengarkan setiap kata tanpa melihatnya di layar.",
      p2: "Ketik jawaban, lihat hasilnya saat itu juga, dan ulangi hanya kata yang salah.",
      p3: "Tidak perlu membuat akun.",
      flow: [
        "Tanpa login",
        "Tempel kata",
        "Dengarkan kata tersembunyi",
        "Ketik jawaban",
        "Ulangi kata yang salah",
      ],
      flowLabel: "Langkah latihan",
    },
    game: {
      round: "Ronde latihan",
      placeholder: "Ketik kata bahasa Inggris...",
      startTitle: "Latihan dengan daftar kata sendiri",
      subtitle: "Tes ejaan atau permainan kata, tanpa akun",
      intro:
        "Pilih tes audio yang direkomendasikan atau hujan kata, tempel kata, lalu mulai.",
      chips: ["Hasil langsung", "Kata disembunyikan", "Ulangi yang salah"],
      noLogin: "Tanpa membuat akun",
      wordsLabel: "Daftar kata bahasa Inggris",
      photoImport: "Impor dari foto",
      sentencesLabel: "Kalimat contoh (opsional)",
      autoSentences: "Isi otomatis",
      sentencesHelp:
        "Satu kalimat per baris, sesuai urutan kata. Biarkan baris kosong jika tidak perlu.",
      hear: "Dengarkan kata sebelum mengetik",
      easy: "Mode mudah",
      ready: "8 kata siap",
      sample: "Contoh daftar",
      copy: "Salin link latihan",
      assign: "Berikan tugas",
      assignComplete: "Berikan daftar ini ke siswa",
      start: "Mulai latihan",
      complete: "Latihan selesai",
      returnMenu: "Kembali ke menu utama",
      finalScore: "Skor akhir",
      finalRound: "Ronde",
      finalSpeed: "Kecepatan terbaik",
      accuracy: "Akurasi",
      finalMissed: "Kata terlewat",
      replay: "Ulangi kata yang salah",
      same: "Main lagi dengan kata ini",
      edit: "Ubah daftar kata",
      stats: ["SKOR", "RONDE", "CEPAT", "AKURASI", "SALAH"],
    },
    privacy: {
      title: "Privasi",
      h3: "Data yang disimpan",
      intro:
        "My Spelling Game dibuat untuk latihan cepat di browser. Begini cara kami menangani data:",
      localTitle: "Penyimpanan lokal",
      local: [
        "Daftar kata dan pilihan latihan disimpan di browser ini.",
        "Link baru menyimpan daftar di fragmen URL yang diproses browser tanpa dikirim ke server.",
        "Impor foto membaca gambar di browser; gambar tidak diunggah ke server dan kata yang terdeteksi bisa diedit sebelum digunakan.",
        "Tugas yang diterbitkan guru atau orang tua dan hasilnya disimpan di Cloudflare D1 selama 14 hari pada Paket Gratis atau 365 hari pada Paket Orang Tua dan Guru. Email, IP, dan User-Agent siswa tidak dikumpulkan.",
        "Kamu bisa menghapus data ini lewat browser atau panel ini.",
      ],
      analyticsTitle: "Analytics",
      analytics: [
        "Google Analytics menerima alamat halaman yang sudah dibersihkan, tanpa parameter atau fragmen.",
        "Kami hanya mengirim statistik gabungan seperti mode, jumlah kata, dan hasil.",
        "Daftar kata dan jawaban yang diketik tidak pernah dikirim.",
      ],
      adsTitle: "Iklan",
      ads: [
        "Situs menggunakan Google AdSense untuk menampilkan iklan.",
        "Personalisasi iklan mengikuti kebijakan Google.",
      ],
      rightsTitle: "Pilihanmu",
      rights: [
        "Kamu bisa menghapus daftar kata yang tersimpan kapan saja.",
        "Kamu bisa memblokir analytics atau iklan lewat pengaturan browser.",
      ],
      contactTitle: "Kontak",
      contact:
        "Jika ada pertanyaan tentang privasi, hubungi kami lewat halaman kontak.",
      updated: "Terakhir diperbarui:",
      close: "Tutup",
      clear: "Hapus data saya",
    },
    info: {
      listTitle: "Untuk daftar kata minggu ini",
      list: [
        "Tempel kata bahasa Inggris yang sudah diberikan guru atau kelas.",
        "Pilih tes audio untuk mendengar kata tersembunyi, atau hujan kata untuk mengetik kata yang jatuh.",
        "Tekan <kbd>Enter</kbd> untuk mengirim; hujan kata juga menerima <kbd>Space</kbd>.",
        "Kata yang terlewat disimpan untuk latihan ulang sekali klik.",
        "Salin link untuk membagikan daftar yang sama.",
      ],
      easyTitle: "Mode mudah",
      easyText:
        "Aktifkan mode mudah sebelum bermain agar kata jatuh lebih pelan.",
      whyTitle: "Kenapa ini membantu",
      why: [
        "Latihan memakai kata minggu ini, bukan bank kata acak.",
        "Cocok untuk PR, les, pelajar bahasa Inggris, dan belajar di rumah.",
        "Ronde ulang fokus pada kata yang benar-benar salah.",
        "Mode mudah memperlambat permainan tanpa mengubah aturan ejaan.",
        "Paket Orang Tua dan Guru menambahkan impor foto, kalimat otomatis, dan Ulasan hari ini.",
      ],
      seoTitle: "Dua cara berlatih dengan daftar sendiri",
      seoIntro:
        "<strong>Tes ejaan</strong> membacakan kata tersembunyi dan memeriksa jawaban. <strong>Hujan kata</strong> mempertahankan permainan kata jatuh yang asli.",
      sectionTitle: "Daftar yang tepat membuat latihan lebih berguna",
      sectionText:
        "Menempel daftar minggu ini membuat latihan tetap fokus. Kedua mode menyimpan kesalahan untuk ronde ulang.",
      bullets: [
        "<strong>Pakai daftar nyata:</strong> Tempel kata dari PR, lembar guru, atau materi belajar di rumah.",
        "<strong>Latihan ulang:</strong> Jawaban salah dan kata yang terlewat masuk ronde berikutnya.",
        "<strong>Bagikan link:</strong> Kirim latihan yang sama tanpa akun atau kelas online.",
        "<strong>Tes audio:</strong> Kata tetap tersembunyi sampai jawaban dikirim.",
        "<strong>Gunakan konteks tanpa membocorkan jawaban:</strong> Dalam kalimat contoh, kata target diganti bagian kosong, sementara audio membacakan kata dan kalimat lengkap.",
      ],
      repeatTitle: "Cocok untuk latihan mingguan",
      repeatText:
        "Alat ini sengaja sederhana: ambil daftar pendek, latihan, lihat kata yang terlewat, lalu ulangi. Gratis, tanpa akun siswa, dan tidak bergantung pada platform sekolah.",
    },
    footerLinks: [
      "Kata kustom",
      "Latihan mingguan",
      "Kata umum",
      "Untuk orang tua",
      "Untuk guru",
    ],
    legalLinks: ["Privasi", "Tentang", "Kontak"],
    schema: {
      description:
        "Tempel kata sendiri untuk tes ejaan dengan audio atau hujan kata. Kalimat contoh mengosongkan kata target sementara audio membacakan kata dan kalimat lengkap.",
      faq: [
        [
          "Bisa memakai daftar kata sendiri?",
          "Bisa. Tempel daftar kata mingguan dan game akan memakai kata itu.",
        ],
        [
          "Bisa mengulang kata yang salah saja?",
          "Bisa. Kata yang terlewat akan tersedia untuk ronde ulang.",
        ],
        [
          "Perlu membuat akun?",
          "Tidak. Game berjalan di browser tanpa akun siswa atau kelas online.",
        ],
      ],
      breadcrumb: "Game ejaan bahasa Inggris",
    },
  },
  zh: {
    htmlLang: "zh-CN",
    path: "/zh/",
    pageLocale: "zh",
    ogLocale: "zh_CN",
    title: "用自己的单词做免费英语听写 — 无需登录",
    description:
      "粘贴自己的英语单词表，听隐藏单词并输入答案，立即查看批改结果，还能单独重练错词，全程无需账号。",
    keywords:
      "英语拼写练习,spelling game,英语单词拼写游戏,自定义单词表游戏,自定义英语单词表,英语听写练习,英语默写练习,英语单词练习小游戏,小学生英语拼写,背单词打字游戏,自定义单词表背单词,无需注册英语练习",
    ogTitle: "用自己的单词做英语听写测试",
    ogDescription: "听隐藏单词、即时查看批改结果并重练错词，无需登录。",
    nav: {
      language: "语言",
      teacher: "工作台",
      privacy: "隐私",
      sound: "声音",
    },
    hero: {
      h1: "用自己的单词做免费英语听写",
      p1: "粘贴单词表，听到单词后再输入答案，作答前不会显示拼写。",
      p2: "系统会立即批改，并把错词单独整理出来继续练习。",
      p3: "无需注册或登录。",
      flow: ["无需登录", "粘贴单词", "听隐藏单词", "输入答案", "重练错词"],
      flowLabel: "练习步骤",
    },
    game: {
      round: "练习回合",
      placeholder: "输入掉落的英语单词...",
      startTitle: "用自己的单词表开始练习",
      subtitle: "可选听写测试或单词雨游戏",
      intro: "推荐使用听写测试，也可以选择单词雨；粘贴单词后即可开始。",
      chips: ["即时批改", "作答前隐藏单词", "错词重练"],
      noLogin: "无需创建账号",
      wordsLabel: "你的英语单词",
      photoImport: "拍照导入",
      sentencesLabel: "例句（可选）",
      autoSentences: "自动填充",
      sentencesHelp:
        "每行填写一个例句，顺序与上面的单词对应。不需要的单词留空行即可。",
      hear: "输入前朗读每个单词",
      easy: "简单模式",
      ready: "已准备 8 个单词",
      sample: "示例单词表",
      copy: "复制练习链接",
      assign: "教师&家长：布置作业",
      assignComplete: "用这份词表给学生布置作业",
      start: "开始练习",
      complete: "练习完成",
      returnMenu: "返回主菜单",
      finalScore: "最终得分",
      finalRound: "回合",
      finalSpeed: "最高速度",
      accuracy: "准确率",
      finalMissed: "漏掉的单词",
      replay: "重练漏掉的单词",
      same: "用当前单词再来一局",
      edit: "重新设置单词表",
      stats: ["得分", "回合", "速度", "准确率", "漏词"],
    },
    privacy: {
      title: "隐私",
      h3: "数据如何保存",
      intro:
        "My Spelling Game 是一个浏览器里的轻量练习工具。数据处理方式如下：",
      localTitle: "本地保存",
      local: [
        "你的单词表和练习偏好会保存在当前浏览器里。",
        "新分享链接把单词表放在 URL 片段中，由浏览器处理，不会发送到服务器。",
        "拍照导入会在浏览器内读取图片，图片不会上传到服务器；识别结果可先编辑，再加入词表。",
        "教师或家长明确发布的作业及学生成绩会保存到 Cloudflare D1：免费方案 14 天，家长方案和教师方案 365 天。我们不采集学生邮箱、IP 或 User-Agent。",
        "你可以在浏览器设置里清除，也可以用这里的清除按钮。",
      ],
      analyticsTitle: "访问分析",
      analytics: [
        "Google Analytics 只接收清理后的页面地址，不包含查询参数或 URL 片段。",
        "统计事件只包含模式、单词数量和成绩等汇总信息。",
        "完整单词表和你输入的答案不会发送给 Analytics。",
      ],
      adsTitle: "广告",
      ads: [
        "网站使用 Google AdSense 展示广告。",
        "广告个性化遵循 Google 的相关政策。",
      ],
      rightsTitle: "你的选择",
      rights: [
        "你可以随时清除保存的单词表。",
        "你也可以通过浏览器插件或设置屏蔽统计和广告。",
      ],
      contactTitle: "联系",
      contact: "如果你对隐私有疑问，可以通过联系页面告诉我们。",
      updated: "最后更新：",
      close: "关闭",
      clear: "清除我的数据",
    },
    info: {
      listTitle: "适合这周的英语单词表",
      list: [
        "粘贴老师、教材或家长已经准备好的英语单词。",
        "听写测试会播放隐藏单词；单词雨则需要输入正在下落的单词。",
        "按 <kbd>Enter</kbd> 提交；单词雨也可以使用 <kbd>Space</kbd>。",
        "漏掉的单词会自动保存，方便一键重练。",
        "复制练习链接，就能让别人使用同一份单词表。",
      ],
      easyTitle: "简单模式",
      easyText: "开始前打开简单模式，单词会掉得更慢，适合刚开始练的孩子。",
      whyTitle: "为什么这个方式更有效",
      why: [
        "练的是本周真实单词，不是随机词库。",
        "适合家庭作业、课后辅导、英语学习和家庭教育场景。",
        "重练只围绕漏掉的词，不浪费时间。",
        "简单模式只降低速度，不改变拼写规则。",
        "家长方案和教师方案还支持拍照导入、自动填充例句和今日复习。",
      ],
      seoTitle: "同一份单词表，两种练习方式",
      seoIntro:
        "<strong>听写测试</strong>会朗读隐藏单词并立即批改；<strong>单词雨</strong>保留原有的掉落单词打字玩法。",
      sectionTitle: "只练现在真正需要的单词",
      sectionText:
        "粘贴本周词表后，两种模式都会只使用这些单词，并把答错或漏掉的词整理出来重练。",
      bullets: [
        "<strong>使用真实单词表：</strong> 可以来自作业、教材、老师讲义或自学计划。",
        "<strong>自动记录错词：</strong> 答错或漏掉的单词会进入下一轮。",
        "<strong>分享同一份练习：</strong> 复制链接即可，不需要注册账号。",
        "<strong>真正的听写流程：</strong> 提交答案前不会显示单词拼写。",
        "<strong>有语境但不泄题：</strong> 例句中的目标词会显示为空白，语音仍会读出单词和完整例句。",
      ],
      repeatTitle: "适合每周反复使用",
      repeatText:
        "这个工具故意做得很小：每周拿到一份单词，练一遍，找到漏掉的词，再练一遍。免费、无需学生账号，也不绑定任何学习平台。",
    },
    footerLinks: ["自定义单词", "每周练习", "高频词", "家长练习", "教师作业"],
    legalLinks: ["隐私", "关于", "联系"],
    schema: {
      description:
        "粘贴自己的英语单词，选择隐藏单词听写测试或单词雨，并在结束后重练错词。例句会把目标词显示为空白，语音仍会读出单词和完整例句。",
      faq: [
        [
          "可以用自己的英语单词吗？",
          "可以。粘贴本周单词表后，游戏会使用这些单词进行练习。",
        ],
        [
          "能只重练漏掉的单词吗？",
          "可以。每轮结束后，漏掉的单词会自动整理出来。",
        ],
        [
          "需要注册账号吗？",
          "不需要。游戏直接在浏览器里运行，不需要学生账号或班级设置。",
        ],
      ],
      breadcrumb: "英语拼写练习",
    },
  },
};

const modeCopy = {
  es: {
    choose: "Elige un modo",
    dictation: "Prueba de ortografía",
    recommended: "Recomendado",
    dictationDescription:
      "Escucha una palabra oculta y escribe cómo se deletrea.",
    typing: "Lluvia de palabras",
    typingDescription: "Escribe cada palabra antes de que llegue abajo.",
    start: "Empezar prueba de ortografía",
    heading: "Escucha y escribe la palabra",
    help: "La palabra permanece oculta hasta que envíes tu respuesta.",
    replay: "Repetir palabra",
    replayLabel: "Volver a escuchar la palabra actual",
    answer: "Escribe lo que escuchas",
    submit: "Enviar respuesta",
    next: "Siguiente palabra",
    total: "Total de palabras",
    correct: "Correctas",
    incorrect: "Incorrectas",
    retry: "Practicar palabras falladas",
    restart: "Reiniciar",
    instructions:
      "Usa la prueba para escuchar una palabra oculta cada vez, o la lluvia de palabras para escribir palabras que caen.",
  },
  "pt-BR": {
    choose: "Escolha um modo",
    dictation: "Teste de ortografia",
    recommended: "Recomendado",
    dictationDescription: "Ouça uma palavra escondida e digite a grafia.",
    typing: "Chuva de palavras",
    typingDescription: "Digite cada palavra antes que ela chegue ao fim.",
    start: "Começar teste de ortografia",
    heading: "Ouça e escreva a palavra",
    help: "A palavra fica oculta até você enviar a resposta.",
    replay: "Repetir palavra",
    replayLabel: "Ouvir novamente a palavra atual",
    answer: "Digite o que você ouviu",
    submit: "Enviar resposta",
    next: "Próxima palavra",
    total: "Total de palavras",
    correct: "Corretas",
    incorrect: "Incorretas",
    retry: "Praticar palavras erradas",
    restart: "Reiniciar",
    instructions:
      "Use o teste para ouvir uma palavra oculta por vez, ou a chuva de palavras para digitar palavras que caem.",
  },
  fr: {
    choose: "Choisissez un mode",
    dictation: "Test d’orthographe",
    recommended: "Recommandé",
    dictationDescription: "Écoutez un mot caché et saisissez son orthographe.",
    typing: "Pluie de mots",
    typingDescription: "Saisissez chaque mot avant qu’il atteigne le bas.",
    start: "Commencer le test d’orthographe",
    heading: "Écoutez et écrivez le mot",
    help: "Le mot reste caché jusqu’à la validation de votre réponse.",
    replay: "Réécouter le mot",
    replayLabel: "Réécouter le mot actuel",
    answer: "Écrivez ce que vous entendez",
    submit: "Valider",
    next: "Mot suivant",
    total: "Nombre de mots",
    correct: "Corrects",
    incorrect: "Incorrects",
    retry: "Retravailler les mots manqués",
    restart: "Recommencer",
    instructions:
      "Utilisez le test pour écouter un mot caché à la fois, ou la pluie de mots pour saisir les mots qui tombent.",
  },
  id: {
    choose: "Pilih mode",
    dictation: "Tes ejaan",
    recommended: "Disarankan",
    dictationDescription:
      "Dengarkan satu kata tersembunyi lalu ketik ejaannya.",
    typing: "Hujan kata",
    typingDescription: "Ketik setiap kata sebelum mencapai bagian bawah.",
    start: "Mulai tes ejaan",
    heading: "Dengarkan dan eja katanya",
    help: "Kata tetap tersembunyi sampai jawaban dikirim.",
    replay: "Putar ulang kata",
    replayLabel: "Putar ulang kata saat ini",
    answer: "Ketik yang Anda dengar",
    submit: "Kirim jawaban",
    next: "Kata berikutnya",
    total: "Jumlah kata",
    correct: "Benar",
    incorrect: "Salah",
    retry: "Latih kata yang salah",
    restart: "Mulai ulang",
    instructions:
      "Gunakan tes untuk mendengar satu kata tersembunyi, atau hujan kata untuk mengetik kata yang jatuh.",
  },
  zh: {
    choose: "选择模式",
    dictation: "听写测试",
    recommended: "推荐",
    dictationDescription: "每次听一个隐藏单词，然后输入拼写。",
    typing: "单词雨",
    typingDescription: "在单词落到底部前完成输入。",
    start: "开始听写测试",
    heading: "听单词并写出拼写",
    help: "提交答案前，页面不会显示这个单词。",
    replay: "重新播放",
    replayLabel: "重新播放当前单词",
    answer: "输入你听到的单词",
    submit: "提交答案",
    next: "下一题",
    total: "单词总数",
    correct: "正确",
    incorrect: "错误",
    retry: "重新练习错词",
    restart: "重新开始",
    instructions:
      "听写测试每次播放一个隐藏单词；单词雨模式则需要输入正在下落的单词。",
  },
};

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function jsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

function alternateLinks(_currentPath) {
  return [
    ...alternates.map(
      (alt) =>
        `    <link rel="alternate" hreflang="${alt.hreflang}" href="${baseUrl}${alt.path}">`,
    ),
    `    <link rel="alternate" hreflang="x-default" href="${baseUrl}/">`,
  ].join("\n");
}

function languageMenu(currentCode, nav) {
  const links = alternates
    .map((alt) => {
      const current = alt.code === currentCode ? ' aria-current="page"' : "";
      return `                <a class="lang-option" href="${alt.path}" hreflang="${alt.hreflang}"${current}>${alt.label}</a>`;
    })
    .join("\n");

  return `        <details class="language-switcher">
            <summary class="lang-btn" aria-label="${escapeAttr(nav.language)}">${nav.language}</summary>
            <div class="lang-menu" id="language-menu">
${links}
            </div>
        </details>`;
}

function head(page) {
  return `<!DOCTYPE html>
<html lang="${page.htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/icon-32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">

    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" as="style">
    <link rel="preload" href="/src/js/index.js?v=spelling-test1" as="script">
    <link rel="preload" href="/src/css/main.css" as="style">

    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//www.googletagmanager.com">
    <link rel="dns-prefetch" href="//pagead2.googlesyndication.com">

    <title>${page.title}</title>
    <meta name="description" content="${escapeAttr(page.description)}">
    <meta name="author" content="My Spelling Game">
    <meta name="robots" content="index, follow">
    <meta name="google-adsense-account" content="ca-pub-9244949928133071">

    <meta property="og:title" content="${escapeAttr(page.ogTitle)}">
    <meta property="og:description" content="${escapeAttr(page.ogDescription)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${baseUrl}${page.path}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeAttr(page.ogTitle)} preview">
    <meta property="og:site_name" content="My Spelling Game">
    <meta property="og:locale" content="${page.ogLocale}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(page.ogTitle)}">
    <meta name="twitter:description" content="${escapeAttr(page.ogDescription)}">
    <meta name="twitter:image" content="${ogImage}">

    <meta name="theme-color" content="#2f6f73">
    <meta name="application-name" content="My Spelling Game">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="My Spelling Game">
    <meta name="format-detection" content="telephone=no">

    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <link rel="canonical" href="${baseUrl}${page.path}">
${alternateLinks(page.path)}

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
</head>`;
}

function paragraphs(items) {
  return items.map((item) => `                    <p>${item}</p>`).join("\n");
}

function listItems(items) {
  return items.map((item) => `                <li>${item}</li>`).join("\n");
}

function localizedSharedHref(page, href) {
  const slug = href.replace(/^\//, "");
  if (!localizedSeoSlugs.includes(slug)) return href;
  const base = page.path === "/" ? "" : page.path.replace(/\/$/, "");
  return `${base}/${slug}`;
}

function body(page, code) {
  const game = page.game;
  const privacy = page.privacy;
  const info = page.info;
  const nav = page.nav;
  const mode = modeCopy[code];
  const legalBase = page.path === "/" ? "" : page.path.replace(/\/$/, "");
  return `<body>
    <header class="top-right-nav">
        <a class="brand-link" href="${legalBase || "/"}" aria-label="My Spelling Game home">
            <img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt="">
            <span class="brand-name">My Spelling Game</span>
        </a>
${languageMenu(code, nav)}
        <a class="teacher-nav-link" href="/workspace?lang=${encodeURIComponent(code)}">${nav.teacher}</a>
    </header>

    <div class="main-content-wrapper">
    <section class="seo-content" id="seo-content">
        <h1>${page.hero.h1}</h1>
        <ul class="practice-flow" aria-label="${escapeAttr(page.hero.flowLabel)}">
${page.hero.flow.map((step) => `            <li>${step}</li>`).join("\n")}
        </ul>
    </section>

        <div id="game-container">
            <div class="background-particles">
                <canvas id="particles-canvas"></canvas>
            </div>

            <div class="top-bar">
                <div class="game-title">${game.round}</div>
                <div class="game-toolbar-actions">
                    <button type="button" class="sound-btn game-sound-btn" onclick="toggleSound()" id="sound-toggle" data-i18n-title-dynamic="sound">${nav.sound}</button>
                    <button type="button" class="return-menu-btn" id="return-menu-btn" onclick="returnToMainMenu()">${game.returnMenu}</button>
                </div>
                <div class="combo-display" id="combo-display">
                    ${comboLabels[page.pageLocale]} <span id="combo-count">0</span>
                </div>
            </div>

            <canvas id="game-canvas"></canvas>

            <section class="dictation-screen" id="dictation-screen" aria-labelledby="dictation-heading" hidden>
                <div class="dictation-card">
                    <p class="dictation-progress" id="dictation-progress"></p>
                    <h2 id="dictation-heading">${mode.heading}</h2>
                    <p class="dictation-help">${mode.help}</p>
                    <button type="button" class="dictation-replay" id="dictation-replay" aria-label="${escapeAttr(mode.replayLabel)}">${mode.replay}</button>
                    <p class="dictation-speech-status" id="dictation-speech-status" role="status"></p>
                    <form id="dictation-form">
                        <label class="visually-hidden" for="dictation-answer">${mode.answer}</label>
                        <input type="text" id="dictation-answer" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${escapeAttr(mode.answer)}" aria-describedby="dictation-feedback">
                        <button type="submit" id="dictation-submit">${mode.submit}</button>
                    </form>
                    <p class="dictation-feedback" id="dictation-feedback" role="status" aria-live="polite"></p>
                    <button type="button" class="dictation-next" id="dictation-next" hidden>${mode.next}</button>
                </div>
            </section>

            <div class="input-container">
                <input type="text" id="word-input" placeholder="${escapeAttr(game.placeholder)}" autocomplete="off" spellcheck="false" disabled>
            </div>

            <div class="game-start-screen" id="game-start">
                <div class="start-screen-content">
                    <div class="start-title">${game.startTitle}</div>
                    <div class="spelling-start">
                        <div class="spelling-subtitle">${game.subtitle}</div>
                        <p class="spelling-intro">${game.intro}</p>
                        <div class="hero-proof-row" aria-label="${benefitsLabels[page.pageLocale]}">
${game.chips.map((chip) => `                            <span>${chip}</span>`).join("\n")}
                            <span>${game.noLogin}</span>
                        </div>
                        <fieldset class="mode-selector">
                            <legend>${mode.choose}</legend>
                            <label class="mode-card">
                                <input type="radio" name="practice-mode" value="dictation" checked>
                                <span><strong>${mode.dictation}</strong><small>${mode.dictationDescription}</small></span>
                                <span class="recommended-badge">${mode.recommended}</span>
                            </label>
                            <label class="mode-card">
                                <input type="radio" name="practice-mode" value="typing">
                                <span><strong>${mode.typing}</strong><small>${mode.typingDescription}</small></span>
                            </label>
                        </fieldset>
                        <div class="spelling-builder">
                            <div class="word-entry-grid">
                                <div class="word-entry-field">
                                    <div class="word-field-heading"><label for="custom-word-list">${game.wordsLabel}</label><button type="button" class="auto-sentence-btn photo-import-btn" id="photo-import-btn">${game.photoImport}</button></div>
                                    <input type="file" id="photo-import-input" accept="image/*" capture="environment" hidden>
                                    <textarea id="custom-word-list" rows="7" spellcheck="false" placeholder="because&#10;friend&#10;beautiful&#10;answer"></textarea>
                                </div>
                                <div class="word-entry-field dictation-option">
                                    <div class="sentence-field-heading"><label for="custom-example-sentences">${game.sentencesLabel}</label><button type="button" class="auto-sentence-btn" id="auto-example-sentences-btn">${game.autoSentences}</button></div>
                                    <textarea id="custom-example-sentences" rows="7" maxlength="30000" spellcheck="true" placeholder="I stayed inside because it was raining.&#10;My friend helped me with my homework."></textarea>
                                    <small class="spelling-help">${game.sentencesHelp}</small>
                                </div>
                            </div>
                            <div class="spelling-options">
                                <label class="read-toggle typing-option"><input type="checkbox" id="hear-words-toggle"> ${game.hear}</label>
                                <label class="read-toggle typing-option"><input type="checkbox" id="easy-mode-toggle"> ${game.easy}</label>
                                <span id="spelling-status">${game.ready}</span>
                            </div>
                            <div class="spelling-actions">
                                <button type="button" onclick="loadSampleWords()">${game.sample}</button>
                                <button type="button" id="copy-practice-link-btn" aria-haspopup="true" aria-controls="practice-share-options" aria-expanded="false" onclick="copyPracticeLink()">${game.copy}</button>
                                <button type="button" onclick="showPrivacyPolicyLegacy()">${nav.privacy}</button>
                                <button type="button" class="assignment-entry" onclick="openTeacherAssignment('assign_homework')">${escapeAttr(game.assign)}</button>
                            </div>
                        </div>
                        <button class="start-btn spelling-start-btn" id="start-practice-btn" onclick="startGame()">${mode.start}</button>
                    </div>
                </div>
            </div>

            <div class="game-over-screen" id="game-over">
                <div class="game-over-content">
                    <div class="game-over-title" id="game-over-title">${game.complete}</div>
                    <div class="final-stats" id="typing-final-stats">
                        <p><span data-i18n="finalScore">${game.finalScore}</span>: <span id="final-score">0</span></p>
                        <p><span data-i18n="levelReached">${game.finalRound}</span>: <span id="final-level">1</span></p>
                        <p><span data-i18n="maxWPM">${game.finalSpeed}</span>: <span id="final-wpm">0</span></p>
                        <p><span data-i18n="accuracy">${game.accuracy}</span>: <span id="final-accuracy">100%</span></p>
                        <p id="duration-row" style="display:none;"><span data-i18n="duration">${page.pageLocale === "zh" ? "时长" : page.pageLocale === "es" ? "Duración" : page.pageLocale === "pt-BR" ? "Duração" : page.pageLocale === "fr" ? "Durée" : page.pageLocale === "id" ? "Durasi" : "Duration"}</span>: <span id="final-duration">0:00</span></p>
                        <p><span data-i18n="wordsMatched">${game.finalMissed}</span>: <span id="final-missed">0</span></p>
                    </div>
                    <div class="final-stats" id="dictation-final-stats" hidden>
                        <p>${mode.total}: <span id="dictation-total">0</span></p>
                        <p>${mode.correct}: <span id="dictation-correct">0</span></p>
                        <p>${mode.incorrect}: <span id="dictation-incorrect">0</span></p>
                        <p>${game.accuracy}: <span id="dictation-accuracy">0%</span></p>
                    </div>
                    <div class="spelling-summary" id="spelling-summary" hidden>
                        <div id="spelling-result"></div>
                        <div id="missed-word-list"></div>
                        <button class="restart-btn" id="replay-missed-btn" onclick="replayMissedWords()">${mode.retry}</button>
                    </div>
                    <div class="game-over-buttons">
                        <button class="restart-btn" id="restart-same-btn" onclick="restartGame(true)">${mode.restart}</button>
                        <button class="share-score-btn" id="edit-list-btn" onclick="restartGame()">${game.edit}</button>
                        <button type="button" class="share-score-btn assignment-complete-btn" onclick="openTeacherAssignment()">${game.assignComplete}</button>
                    </div>
                </div>
            </div>

            <div class="privacy-screen" id="privacy-policy">
                <div class="privacy-content">
                    <div class="privacy-title">${privacy.title}</div>
                    <div class="privacy-text">
                        <h3>${privacy.h3}</h3>
                        <p>${privacy.intro}</p>

                        <h4>${privacy.localTitle}</h4>
${paragraphs(privacy.local)}

                        <h4>${privacy.analyticsTitle}</h4>
${paragraphs(privacy.analytics)}

                        <h4>${privacy.adsTitle}</h4>
${paragraphs(privacy.ads)}

                        <h4>${privacy.rightsTitle}</h4>
${paragraphs(privacy.rights)}

                        <h4>${privacy.contactTitle}</h4>
                        <p>${privacy.contact}</p>

                        <p class="privacy-update">${privacy.updated} <span id="privacy-date"></span></p>
                    </div>
                    <div class="privacy-buttons">
                        <button class="close-privacy-btn" onclick="closePrivacyPolicyLegacy()">${privacy.close}</button>
                        <button class="clear-data-btn" onclick="clearLocalDataLegacy()">${privacy.clear}</button>
                    </div>
                </div>
            </div>

            <div class="stats" aria-label="Practice stats">
${game.stats
  .map((stat, index) => {
    const ids = ["score", "level", "wpm", "accuracy", "missed-words"];
    const values = ["0", "1", "0", "100%", "0/5"];
    return `                <div class="stat-item">
                    <div class="stat-label">${stat}</div>
                    <div class="stat-value" id="${ids[index]}">${values[index]}</div>
                </div>`;
  })
  .join("\n")}
            </div>
        </div>
    </div>

    <aside class="ad-slot ad-slot-after-game" aria-label="${page.pageLocale === "zh" ? "广告" : page.pageLocale === "es" ? "Publicidad" : page.pageLocale === "pt-BR" ? "Anúncio" : page.pageLocale === "fr" ? "Publicité" : page.pageLocale === "id" ? "Iklan" : "Advertisement"}">
        <span>${page.pageLocale === "zh" ? "广告" : page.pageLocale === "es" ? "Publicidad" : page.pageLocale === "pt-BR" ? "Anúncio" : page.pageLocale === "fr" ? "Publicité" : page.pageLocale === "id" ? "Iklan" : "Advertisement"}</span>
    </aside>

    <div class="below-game">
        <div class="practice-info-grid">
            <div class="game-instructions">
                <div class="instructions-content">
                    <h3>${info.listTitle}</h3>
                    <p>${mode.instructions}</p>
${paragraphs(info.list)}
                    <h4>${info.easyTitle}</h4>
                    <p>${info.easyText}</p>
                </div>
            </div>

            <div class="power-ups-container practice-proof">
                <div class="practice-proof-copy">
                    <h3>${info.whyTitle}</h3>
${paragraphs(info.why)}
                </div>
            </div>
        </div>

        <div class="spelling-seo-copy">
            <h2>${info.seoTitle}</h2>
            <p>${info.seoIntro}</p>

            <h3>${info.sectionTitle}</h3>
            <p>${info.sectionText}</p>
            <ul>
${listItems(info.bullets)}
            </ul>

            <h3>${info.repeatTitle}</h3>
            <p>${info.repeatText}</p>
        </div>

        <section class="spelling-seo-copy workspace-seo-section">
            <h2>${workspaceCopy[page.pageLocale].heading}</h2>
            <p>${workspaceCopy[page.pageLocale].text}</p>
            <a class="seo-cta" href="/workspace?lang=${encodeURIComponent(page.pageLocale)}">${workspaceCopy[page.pageLocale].cta}</a>
        </section>
    </div>

    <script>
      window.disableLegacyLanguageUI = true;
      window.pageLocale = '${page.pageLocale}';
      window.currentLanguage = '${page.pageLocale}';
    </script>
    <script type="module" src="/src/js/index.js?v=spelling-test1"></script>

    <footer>
        <p>
            <span class="footer-links">${sharedLinks.map((href, index) => `<a href="${localizedSharedHref(page, href)}">${page.footerLinks[index]}</a>`).join(" &middot; ")}</span><br>
            <span class="footer-secondary-links">${secondaryLinks[page.pageLocale].map(([href, label]) => `<a href="${localizedSharedHref(page, href)}" aria-label="${escapeAttr(label)}">${label}</a>`).join(" &middot; ")}</span><br>
            &copy; 2026 My Spelling Game ${footerRights[page.pageLocale]}
        </p>
    </footer>

${schemaScripts(page)}
</body>
</html>`;
}

function schemaScripts(page) {
  const game = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${baseUrl}/#software`,
    name: "My Spelling Game",
    description: page.schema.description,
    url: `${baseUrl}${page.path}`,
    author: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "My Spelling Game",
      url: baseUrl,
      logo: `${baseUrl}/images/icon-512.png`,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "My Spelling Game",
      url: baseUrl,
      logo: `${baseUrl}/images/icon-512.png`,
    },
    genre: ["Educational Game", "Spelling Game", "Typing Game"],
    operatingSystem: "Web Browser",
    applicationCategory: "EducationalApplication",
    inLanguage: page.htmlLang,
    isAccessibleForFree: true,
    dateModified: "2026-09-01",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: page.htmlLang,
    mainEntity: page.schema.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
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
        name: "My Spelling Game",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: page.schema.breadcrumb,
        item: `${baseUrl}${page.path}`,
      },
    ],
  };

  return [game, faq, breadcrumb]
    .map(
      (data) =>
        `    <script type="application/ld+json">\n${jsonLd(data)}\n    </script>`,
    )
    .join("\n\n");
}

function renderPage(code, page) {
  return `${head(page)}\n${body(page, code)}`;
}

for (const [code, page] of Object.entries(pages)) {
  const dir = path.join(root, page.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "index.html"),
    renderPage(code, page),
    "utf8",
  );
}

console.log(`Generated ${Object.keys(pages).length} localized pages`);
