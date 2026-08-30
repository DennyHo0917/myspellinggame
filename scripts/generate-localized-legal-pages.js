const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const baseUrl = "https://myspellinggame.com";
const ogImage = `${baseUrl}/images/my-spelling-game-og.png`;
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
    [/(?<!My )spelling(?! Game)/gi, "ortografía"],
    [/login/gi, "cuenta"],
    [/homeschool/gi, "educación en casa"],
    [/Advertisement/g, "Publicidad"],
  ],
  "pt-BR": [
    [/Typing Rain/gi, "chuva de palavras"],
    [/Spelling Test/gi, "teste de ortografia"],
    [/ESL/gi, "aprendizagem de inglês"],
    [/(?<!My )spelling(?! Game)/gi, "ortografia"],
    [/login/gi, "conta"],
    [/homeschool/gi, "educação em casa"],
    [/Advertisement/g, "Anúncio"],
  ],
  fr: [
    [/Typing Rain/gi, "pluie de mots"],
    [/Spelling Test/gi, "test d’orthographe"],
    [/ESL/gi, "apprentissage de l’anglais"],
    [/(?<!My )spelling(?! Game)/gi, "orthographe"],
    [/login/gi, "connexion"],
    [/homeschool/gi, "école à la maison"],
    [/Advertisement/g, "Publicité"],
  ],
  id: [
    [/Typing Rain/gi, "hujan kata"],
    [/Spelling Test/gi, "tes ejaan"],
    [/ESL/gi, "pembelajaran bahasa Inggris"],
    [/(?<!My )spelling(?! Game)/gi, "ejaan"],
    [/login/gi, "akun"],
    [/homeschool/gi, "belajar di rumah"],
    [/Advertisement/g, "Iklan"],
  ],
  zh: [
    [/Typing Rain/gi, "单词雨"],
    [/Spelling Test/gi, "听写测试"],
    [/ESL/gi, "英语学习"],
    [/(?<!My )spelling(?! Game)/gi, "拼写"],
    [/login/gi, "账号"],
    [/homeschool/gi, "家庭教育"],
    [/Advertisement/g, "广告"],
  ],
};

function localizeTerms(value, code) {
  return (legacyTermTranslations[code] || []).reduce(
    (text, [pattern, replacement]) =>
      String(text).replace(pattern, replacement),
    String(value),
  );
}

const alternates = [
  { code: "en", hreflang: "en", label: "English", dir: "" },
  { code: "es", hreflang: "es", label: "Español", dir: "/es" },
  { code: "pt-BR", hreflang: "pt-BR", label: "Português", dir: "/pt-br" },
  { code: "fr", hreflang: "fr", label: "Français", dir: "/fr" },
  { code: "id", hreflang: "id", label: "Bahasa Indonesia", dir: "/id" },
  { code: "zh", hreflang: "zh-CN", label: "中文", dir: "/zh" },
];

const sharedFooterLinks = [
  { href: "/custom-spelling-words-game", key: "custom" },
  { href: "/weekly-spelling-practice", key: "weekly" },
  { href: "/sight-word-typing-game", key: "sight" },
  { href: "/spelling-practice-for-parents", key: "parents" },
  { href: "/spelling-assignments-for-teachers", key: "teachers" },
];
const sharedFooterSecondaryLinks = [
  { href: "/pricing", key: "pricing" },
  { href: "/faq", key: "faq" },
  { href: "/privacy", key: "privacy" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
];

const locale = {
  en: {
    htmlLang: "en",
    dir: "",
    nav: { language: "Language", home: "Home" },
    links: {
      custom: "Custom Words",
      weekly: "Weekly Practice",
      sight: "Sight Words",
      parents: "For Parents",
      teachers: "For Teachers",
      pricing: "Pricing",
      faq: "FAQ",
      privacy: "Privacy",
      about: "About",
      contact: "Contact",
    },
    updated: "Last updated:",
    dateLocale: "en-US",
    privacyDate: "August 30, 2026",
    about: {
      title: "About | My Spelling Game",
      description:
        "About My Spelling Game, a no-login custom spelling words game for weekly spelling practice.",
      h1: "About My Spelling Game",
      intro:
        "A small, no-login spelling practice tool for the weekly word lists students already have.",
      panels: [
        [
          "Mission",
          "My Spelling Game turns any weekly word list into an audio spelling test or a falling-word typing game. It is built for quick practice without student accounts, class setup, or a generic word bank.",
        ],
        [
          "Why It Exists",
          "Most spelling games start with their own vocabulary. That does not help when a child needs to practice this week’s exact words. This site keeps the workflow simple: paste the list, play the round, replay the missed words, and share the same practice link.",
        ],
        [
          "What It Does",
          "<ul><li>Uses your own spelling words.</li><li>Offers a hidden-word audio test and Typing Rain.</li><li>Saves missed words for a focused replay round.</li><li>Shares practice links without requiring an account.</li></ul>",
        ],
        [
          "About the Developer",
          "My Spelling Game is maintained by an indie developer. The product goal is intentionally narrow: make repeated weekly spelling practice faster to set up and easier to repeat.",
        ],
      ],
    },
    contact: {
      title: "Contact | My Spelling Game",
      description:
        "Contact My Spelling Game for support, feedback, spelling practice suggestions, or collaboration.",
      h1: "Contact",
      intro:
        "Questions, bug reports, classroom use cases, and spelling practice suggestions are welcome.",
      panels: [
        [
          "Email",
          'For support, feedback, or collaboration, please email:<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>',
        ],
        [
          "Helpful Details",
          "If you are reporting a bug, please include the browser, device, and what happened before the issue appeared. If you are suggesting a feature, a short example of the spelling practice workflow helps a lot.",
        ],
        [
          "Response Time",
          "As a solo developer, I try to reply within 2-3 business days.",
        ],
        [
          "Privacy",
          "Emails are used only to respond to your message. No newsletter or marketing emails will be sent.",
        ],
      ],
    },
    privacy: {
      title: "Privacy Policy | My Spelling Game",
      description:
        "Privacy Policy for My Spelling Game: local storage, analytics, cookies, advertising disclosures, and your choices.",
      h1: "Privacy Policy",
      intro:
        "How My Spelling Game handles local data, analytics, cookies, and advertising disclosures.",
      panels: [
        [
          "Overview",
          "Ordinary My Spelling Game practice works without an account. Accounts for teachers and parents, along with server-saved assignments, are optional. Students never create accounts.",
        ],
        [
          "Local Storage and Share Links",
          "Your spelling list and preferences are stored in this browser. New share links put the list in the URL fragment, which is processed by the browser and is not sent to our server.",
        ],
        [
          "Photo Import",
          "When you use photo import, the image is read in your browser to detect words. The image is not uploaded to our server; review and edit the detected words before adding them to your list.",
        ],
        [
          "Assignments and Results",
          "When a signed-in teacher or parent publishes an assignment or saves a custom list, its title, words, settings, and deadline are stored in Cloudflare D1. Student nicknames and profiles, plus links between profiles and completed assignment results, are stored to show mastery across assignments and create smart review lists. Completed results and their history are stored for 14 days on Free Plan or 365 days on Parent and Teacher Plans, then expire. Saved lists remain until deleted. Student profiles can be archived and restored; archiving does not delete the profile or linked results. Deleting an assignment also deletes its results. We do not collect student email, IP address, or User-Agent.",
        ],
        [
          "Analytics",
          "Google Analytics receives a cleaned page address without query parameters or URL fragments, plus aggregate events such as mode, word count, and result. We do not send word lists or typed answers.",
        ],
        [
          "Advertising",
          'The site uses Google AdSense. Ad personalization and related cookies follow Google policies. Authorized seller declaration is published at <a href="/ads.txt">/ads.txt</a>.',
        ],
        [
          "Your Choices",
          "You can clear saved spelling lists in your browser settings, block cookies, use ad blockers, or disable analytics through browser tools and privacy extensions.",
        ],
        [
          "Contact",
          'If you have questions about this policy, please contact us through the <a href="/contact">contact page</a>.',
        ],
      ],
    },
  },
  es: {
    htmlLang: "es",
    dir: "/es",
    nav: { language: "Idioma", home: "Inicio" },
    links: {
      custom: "Palabras personalizadas",
      weekly: "Práctica semanal",
      sight: "Palabras frecuentes",
      parents: "Para familias",
      teachers: "Para docentes",
      pricing: "Precios",
      faq: "Preguntas frecuentes",
      privacy: "Privacidad",
      about: "Acerca de",
      contact: "Contacto",
    },
    updated: "Última actualización:",
    dateLocale: "es",
    privacyDate: "30 de agosto de 2026",
    about: {
      title: "Acerca de | My Spelling Game",
      description:
        "Conoce My Spelling Game, una herramienta sin cuenta para practicar spelling en inglés con listas semanales reales.",
      h1: "Acerca de My Spelling Game",
      intro:
        "Una herramienta pequeña, sin cuenta, para practicar las listas de palabras que los estudiantes ya tienen.",
      panels: [
        [
          "Misión",
          "My Spelling Game convierte cualquier lista semanal en una prueba de spelling por audio o un juego de palabras que caen. Está pensado para practicar rápido, sin cuentas de estudiantes ni bancos de palabras genéricos.",
        ],
        [
          "Por qué existe",
          "Muchos juegos empiezan con su propio vocabulario. Eso no ayuda cuando el niño necesita practicar las palabras exactas de esta semana. Aquí el flujo es simple: pegar la lista, jugar, repetir lo fallado y compartir el mismo enlace.",
        ],
        [
          "Qué hace",
          "<ul><li>Usa tus propias palabras de inglés.</li><li>Crea práctica instantánea con palabras que caen.</li><li>Guarda las palabras falladas para una ronda de repaso.</li><li>Comparte enlaces sin crear cuenta.</li><li>Incluye modo fácil para practicar con menos presión.</li></ul>",
        ],
        [
          "Quién lo mantiene",
          "My Spelling Game lo mantiene un desarrollador independiente. El objetivo es estrecho a propósito: hacer que la práctica semanal sea más rápida de preparar y más fácil de repetir.",
        ],
      ],
    },
    contact: {
      title: "Contacto | My Spelling Game",
      description:
        "Contacta con My Spelling Game para soporte, errores, sugerencias de práctica o colaboración.",
      h1: "Contacto",
      intro:
        "Puedes enviar preguntas, errores, ideas para clase y sugerencias de práctica.",
      panels: [
        [
          "Email",
          'Para soporte, comentarios o colaboración, escribe a:<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>',
        ],
        [
          "Detalles útiles",
          "Si reportas un error, incluye el navegador, el dispositivo y qué ocurrió antes del problema. Si propones una función, ayuda mucho contar un ejemplo de uso real.",
        ],
        [
          "Tiempo de respuesta",
          "Como desarrollador independiente, intento responder en 2-3 días laborables.",
        ],
        [
          "Privacidad",
          "Los correos solo se usan para responder a tu mensaje. No se enviarán newsletters ni correos de marketing.",
        ],
      ],
    },
    privacy: {
      title: "Política de privacidad | My Spelling Game",
      description:
        "Política de privacidad de My Spelling Game: almacenamiento local, analítica, cookies, publicidad y tus opciones.",
      h1: "Política de privacidad",
      intro:
        "Cómo My Spelling Game gestiona datos locales, analítica, cookies y publicidad.",
      panels: [
        [
          "Resumen",
          "La práctica normal funciona sin cuenta. Las cuentas para docentes y familias, junto con las tareas guardadas en el servidor, son opcionales. Los estudiantes nunca crean una cuenta.",
        ],
        [
          "Almacenamiento local y enlaces",
          "Tu lista y tus preferencias se guardan en este navegador. Los enlaces nuevos colocan la lista en el fragmento de la URL, que el navegador procesa sin enviarlo a nuestro servidor.",
        ],
        [
          "Importación por foto",
          "Al usar la importación por foto, la imagen se lee en tu navegador para detectar palabras. No se sube a nuestro servidor; revisa y edita las palabras antes de añadirlas a la lista.",
        ],
        [
          "Tareas y resultados",
          "Cuando un docente o familiar conectado publica una tarea o guarda una lista personalizada, el título, las palabras, los ajustes y la fecha límite se guardan en Cloudflare D1. Los apodos y perfiles de estudiantes, junto con la relación entre cada perfil y los resultados completados, se usan para mostrar el dominio entre tareas y crear repasos inteligentes. Los resultados completados y su historial se guardan 14 días con el Plan Gratis o 365 días con los planes para familias y docentes, y después caducan. Las listas permanecen hasta que se eliminan. Los perfiles se pueden archivar y restaurar; archivarlos no borra el perfil ni los resultados relacionados. Al borrar una tarea también se borran sus resultados. No recopilamos email, dirección IP ni User-Agent del estudiante.",
        ],
        [
          "Analítica",
          "Google Analytics recibe la dirección limpia de la página, sin parámetros ni fragmentos, y datos agregados como el modo, la cantidad de palabras y el resultado. No enviamos listas ni respuestas.",
        ],
        [
          "Publicidad",
          'El sitio usa Google AdSense. La personalización de anuncios y cookies relacionadas sigue las políticas de Google. La declaración de vendedor autorizado está en <a href="/ads.txt">/ads.txt</a>.',
        ],
        [
          "Tus opciones",
          "Puedes borrar listas guardadas desde el navegador, bloquear cookies, usar bloqueadores de anuncios o desactivar analítica con herramientas de privacidad.",
        ],
        [
          "Contacto",
          'Si tienes preguntas sobre esta política, escríbenos desde la <a href="/es/contact">página de contacto</a>.',
        ],
      ],
    },
  },
  "pt-BR": {
    htmlLang: "pt-BR",
    dir: "/pt-br",
    nav: { language: "Idioma", home: "Início" },
    links: {
      custom: "Palavras personalizadas",
      weekly: "Prática semanal",
      sight: "Palavras frequentes",
      parents: "Para pais",
      teachers: "Para professores",
      pricing: "Preços",
      faq: "Perguntas frequentes",
      privacy: "Privacidade",
      about: "Sobre",
      contact: "Contato",
    },
    updated: "Atualizado em:",
    dateLocale: "pt-BR",
    privacyDate: "30 de agosto de 2026",
    about: {
      title: "Sobre | My Spelling Game",
      description:
        "Conheça o My Spelling Game, uma ferramenta sem login para praticar spelling em inglês com listas reais.",
      h1: "Sobre o My Spelling Game",
      intro:
        "Uma ferramenta pequena, sem login, para praticar as listas de palavras que os alunos já têm.",
      panels: [
        [
          "Missão",
          "My Spelling Game transforma qualquer lista semanal em um teste de spelling por áudio ou um jogo de digitação com palavras caindo. A prática começa rápido, sem contas de aluno ou banco genérico de palavras.",
        ],
        [
          "Por que existe",
          "Muitos jogos começam com seu próprio vocabulário. Isso não ajuda quando a criança precisa treinar as palavras exatas da semana. Aqui o fluxo é simples: colar a lista, jogar, revisar os erros e compartilhar o mesmo link.",
        ],
        [
          "O que faz",
          "<ul><li>Usa suas próprias palavras de inglês.</li><li>Cria prática instantânea com palavras caindo.</li><li>Salva palavras erradas para revisão focada.</li><li>Compartilha links sem exigir conta.</li><li>Oferece modo fácil para uma prática mais lenta.</li></ul>",
        ],
        [
          "Quem mantém",
          "My Spelling Game é mantido por um desenvolvedor independente. O objetivo é propositalmente estreito: deixar a prática semanal mais rápida de preparar e mais fácil de repetir.",
        ],
      ],
    },
    contact: {
      title: "Contato | My Spelling Game",
      description:
        "Entre em contato com My Spelling Game para suporte, feedback, bugs, sugestões ou colaboração.",
      h1: "Contato",
      intro:
        "Perguntas, erros, uso em sala e sugestões de prática são bem-vindos.",
      panels: [
        [
          "Email",
          'Para suporte, feedback ou colaboração, envie um email para:<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>',
        ],
        [
          "Detalhes úteis",
          "Ao relatar um bug, inclua navegador, dispositivo e o que aconteceu antes do problema. Para sugerir recurso, um exemplo real de prática ajuda bastante.",
        ],
        [
          "Tempo de resposta",
          "Como desenvolvedor solo, tento responder em 2-3 dias úteis.",
        ],
        [
          "Privacidade",
          "Emails são usados apenas para responder à sua mensagem. Nenhuma newsletter ou email de marketing será enviado.",
        ],
      ],
    },
    privacy: {
      title: "Política de Privacidade | My Spelling Game",
      description:
        "Política de Privacidade do My Spelling Game: armazenamento local, analytics, cookies, anúncios e suas opções.",
      h1: "Política de Privacidade",
      intro:
        "Como My Spelling Game lida com dados locais, analytics, cookies e anúncios.",
      panels: [
        [
          "Visão geral",
          "A prática comum funciona sem conta. Contas para professores e responsáveis, junto com tarefas salvas no servidor, são opcionais. Alunos nunca criam uma conta.",
        ],
        [
          "Armazenamento local e links",
          "Sua lista e preferências ficam neste navegador. Os links novos colocam a lista no fragmento da URL, processado pelo navegador sem ser enviado ao nosso servidor.",
        ],
        [
          "Importação por foto",
          "Ao usar a importação por foto, a imagem é lida no navegador para detectar palavras. Ela não é enviada ao nosso servidor; revise e edite as palavras antes de adicioná-las à lista.",
        ],
        [
          "Tarefas e resultados",
          "Quando um professor ou responsável conectado publica uma tarefa ou salva uma lista personalizada, título, palavras, configurações e prazo ficam no Cloudflare D1. Apelidos e perfis de alunos, além da ligação entre cada perfil e os resultados concluídos, são usados para mostrar o domínio entre tarefas e criar revisões inteligentes. Resultados concluídos e seu histórico ficam por 14 dias no Plano Grátis ou 365 dias nos planos para Pais e Professores e depois expiram. Listas salvas permanecem até serem excluídas. Perfis podem ser arquivados e restaurados; arquivar não exclui o perfil nem os resultados relacionados. Excluir uma tarefa também exclui seus resultados. Não coletamos email, endereço IP ou User-Agent do aluno.",
        ],
        [
          "Analytics",
          "O Google Analytics recebe o endereço limpo da página, sem parâmetros ou fragmentos, e dados agregados como modo, quantidade de palavras e resultado. Não enviamos listas nem respostas.",
        ],
        [
          "Anúncios",
          'O site usa Google AdSense. Personalização de anúncios e cookies seguem as políticas do Google. A declaração de vendedor autorizado fica em <a href="/ads.txt">/ads.txt</a>.',
        ],
        [
          "Suas opções",
          "Você pode apagar listas salvas nas configurações do navegador, bloquear cookies, usar bloqueadores de anúncio ou desativar analytics com ferramentas de privacidade.",
        ],
        [
          "Contato",
          'Se tiver dúvidas sobre esta política, fale conosco pela <a href="/pt-br/contact">página de contato</a>.',
        ],
      ],
    },
  },
  fr: {
    htmlLang: "fr",
    dir: "/fr",
    nav: { language: "Langue", home: "Accueil" },
    links: {
      custom: "Mots personnalisés",
      weekly: "Pratique hebdomadaire",
      sight: "Mots fréquents",
      parents: "Pour les parents",
      teachers: "Pour les enseignants",
      pricing: "Tarifs",
      faq: "Questions fréquentes",
      privacy: "Confidentialité",
      about: "À propos",
      contact: "Contact",
    },
    updated: "Dernière mise à jour :",
    dateLocale: "fr",
    privacyDate: "30 août 2026",
    about: {
      title: "À propos | My Spelling Game",
      description:
        "Découvrez My Spelling Game, un outil sans compte pour pratiquer le spelling anglais avec les vraies listes de la semaine.",
      h1: "À propos de My Spelling Game",
      intro:
        "Un petit outil sans compte pour travailler les listes de mots que les élèves ont déjà.",
      panels: [
        [
          "Mission",
          "My Spelling Game transforme n’importe quelle liste de mots anglais en test audio ou en jeu de frappe avec des mots qui tombent. La pratique démarre vite, sans comptes élèves ni listes génériques.",
        ],
        [
          "Pourquoi ce site existe",
          "Beaucoup de jeux imposent leur propre vocabulaire. C’est peu utile quand l’enfant doit apprendre les mots exacts de la semaine. Ici, le parcours reste simple : coller la liste, jouer, refaire les mots manqués, partager le lien.",
        ],
        [
          "Ce que fait l’outil",
          "<ul><li>Utilise vos propres mots anglais.</li><li>Crée une pratique immédiate.</li><li>Garde les mots manqués pour une partie ciblée.</li><li>Partage des liens sans compte.</li><li>Propose un mode facile plus lent.</li></ul>",
        ],
        [
          "Développement",
          "My Spelling Game est maintenu par un développeur indépendant. Le but est volontairement précis : rendre la pratique hebdomadaire plus rapide à lancer et plus facile à répéter.",
        ],
      ],
    },
    contact: {
      title: "Contact | My Spelling Game",
      description:
        "Contactez My Spelling Game pour support, bugs, suggestions de pratique ou collaboration.",
      h1: "Contact",
      intro:
        "Questions, bugs, usages en classe et idées de pratique sont les bienvenus.",
      panels: [
        [
          "Email",
          'Pour le support, un retour ou une collaboration, écrivez à :<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>',
        ],
        [
          "Détails utiles",
          "Pour signaler un bug, indiquez le navigateur, l’appareil et ce qui s’est passé avant le problème. Pour une idée de fonctionnalité, un exemple concret aide beaucoup.",
        ],
        [
          "Délai de réponse",
          "En tant que développeur indépendant, j’essaie de répondre sous 2 à 3 jours ouvrés.",
        ],
        [
          "Confidentialité",
          "Les emails servent uniquement à répondre à votre message. Aucune newsletter ni email marketing ne sera envoyé.",
        ],
      ],
    },
    privacy: {
      title: "Politique de confidentialité | My Spelling Game",
      description:
        "Politique de confidentialité de My Spelling Game : stockage local, analytics, cookies, publicité et choix utilisateur.",
      h1: "Politique de confidentialité",
      intro:
        "Comment My Spelling Game gère les données locales, analytics, cookies et annonces.",
      panels: [
        [
          "Vue d’ensemble",
          "L’entraînement classique fonctionne sans compte. Les comptes pour enseignants et parents, ainsi que les devoirs enregistrés sur le serveur, sont facultatifs. Les élèves ne créent jamais de compte.",
        ],
        [
          "Stockage local et liens",
          "Votre liste et vos préférences restent dans ce navigateur. Les nouveaux liens placent la liste dans le fragment de l’URL, traité par le navigateur sans être envoyé à notre serveur.",
        ],
        [
          "Import photo",
          "Lors d’un import photo, l’image est lue dans votre navigateur pour détecter les mots. Elle n’est pas envoyée à notre serveur ; vérifiez et modifiez les mots avant de les ajouter à la liste.",
        ],
        [
          "Devoirs et résultats",
          "Lorsqu’un enseignant ou un parent connecté publie un devoir ou enregistre une liste personnalisée, le titre, les mots, les réglages et l’échéance sont stockés dans Cloudflare D1. Les pseudonymes et profils des élèves, ainsi que les liens entre profils et résultats terminés, servent à afficher la maîtrise entre plusieurs devoirs et à créer des révisions intelligentes. Les résultats terminés et leur historique sont conservés 14 jours avec l’offre gratuite ou 365 jours avec les offres Parents et Enseignants, puis expirent. Les listes restent enregistrées jusqu’à leur suppression. Les profils peuvent être archivés et restaurés ; l’archivage ne supprime ni le profil ni les résultats associés. Supprimer un devoir supprime aussi ses résultats. Aucun email, adresse IP ni User-Agent d’élève n’est collecté.",
        ],
        [
          "Mesure d’audience",
          "Google Analytics reçoit une adresse de page nettoyée, sans paramètres ni fragment, ainsi que des données agrégées comme le mode, le nombre de mots et le résultat. Les listes et réponses ne sont pas envoyées.",
        ],
        [
          "Publicité",
          'Le site utilise Google AdSense. La personnalisation des annonces et les cookies associés suivent les règles de Google. La déclaration de vendeur autorisé se trouve sur <a href="/ads.txt">/ads.txt</a>.',
        ],
        [
          "Vos choix",
          "Vous pouvez effacer les listes enregistrées dans le navigateur, bloquer les cookies, utiliser un bloqueur de publicité ou désactiver l’analyse avec des outils de confidentialité.",
        ],
        [
          "Contact",
          'Pour toute question sur cette politique, utilisez la <a href="/fr/contact">page de contact</a>.',
        ],
      ],
    },
  },
  id: {
    htmlLang: "id",
    dir: "/id",
    nav: { language: "Bahasa", home: "Beranda" },
    links: {
      custom: "Kata kustom",
      weekly: "Latihan mingguan",
      sight: "Kata umum",
      parents: "Untuk orang tua",
      teachers: "Untuk guru",
      pricing: "Harga",
      faq: "Pertanyaan umum",
      privacy: "Privasi",
      about: "Tentang",
      contact: "Kontak",
    },
    updated: "Terakhir diperbarui:",
    dateLocale: "id-ID",
    privacyDate: "30 Agustus 2026",
    about: {
      title: "Tentang | My Spelling Game",
      description:
        "Tentang My Spelling Game, alat tanpa akun untuk latihan spelling bahasa Inggris dengan daftar kata mingguan.",
      h1: "Tentang My Spelling Game",
      intro:
        "Alat kecil tanpa login untuk melatih daftar kata yang sudah dimiliki siswa.",
      panels: [
        [
          "Misi",
          "My Spelling Game mengubah daftar kata mingguan menjadi tes spelling dengan audio atau game mengetik kata yang jatuh. Latihan bisa langsung dimulai tanpa akun siswa atau bank kata acak.",
        ],
        [
          "Kenapa dibuat",
          "Banyak game memakai kosakata bawaan. Itu kurang membantu ketika anak harus melatih kata minggu ini. Di sini alurnya sederhana: tempel daftar, main, ulangi kata yang salah, lalu bagikan link yang sama.",
        ],
        [
          "Fungsi utama",
          "<ul><li>Memakai daftar kata sendiri.</li><li>Membuat latihan kata jatuh secara instan.</li><li>Menyimpan kata yang salah untuk ronde ulang.</li><li>Membagikan link tanpa akun.</li><li>Menyediakan mode mudah agar latihan lebih pelan.</li></ul>",
        ],
        [
          "Pengembang",
          "My Spelling Game dikelola oleh developer independen. Tujuannya sengaja sempit: membuat latihan spelling mingguan lebih cepat disiapkan dan mudah diulang.",
        ],
      ],
    },
    contact: {
      title: "Kontak | My Spelling Game",
      description:
        "Hubungi My Spelling Game untuk dukungan, laporan bug, saran latihan, atau kerja sama.",
      h1: "Kontak",
      intro:
        "Pertanyaan, laporan bug, penggunaan di kelas, dan saran latihan sangat diterima.",
      panels: [
        [
          "Email",
          'Untuk dukungan, masukan, atau kerja sama, kirim email ke:<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>',
        ],
        [
          "Detail yang membantu",
          "Jika melaporkan bug, sertakan browser, perangkat, dan apa yang terjadi sebelum masalah muncul. Jika menyarankan fitur, contoh alur latihan akan sangat membantu.",
        ],
        [
          "Waktu respons",
          "Sebagai developer solo, saya berusaha membalas dalam 2-3 hari kerja.",
        ],
        [
          "Privasi",
          "Email hanya dipakai untuk membalas pesanmu. Tidak ada newsletter atau email marketing.",
        ],
      ],
    },
    privacy: {
      title: "Kebijakan Privasi | My Spelling Game",
      description:
        "Kebijakan Privasi My Spelling Game: penyimpanan lokal, analytics, cookies, iklan, dan pilihan pengguna.",
      h1: "Kebijakan Privasi",
      intro:
        "Cara My Spelling Game menangani data lokal, analytics, cookies, dan iklan.",
      panels: [
        [
          "Ringkasan",
          "Latihan biasa berjalan tanpa akun. Akun untuk guru dan orang tua, beserta tugas yang disimpan di server, bersifat opsional. Siswa tidak pernah membuat akun.",
        ],
        [
          "Penyimpanan lokal dan link",
          "Daftar kata dan pilihan latihan disimpan di browser ini. Link baru menaruh daftar di fragmen URL yang diproses browser tanpa dikirim ke server kami.",
        ],
        [
          "Impor foto",
          "Saat memakai impor foto, gambar dibaca di browser untuk mendeteksi kata. Gambar tidak diunggah ke server kami; periksa dan edit kata sebelum menambahkannya ke daftar.",
        ],
        [
          "Tugas dan hasil",
          "Saat guru atau orang tua yang sudah masuk menerbitkan tugas atau menyimpan daftar khusus, judul, kata, pengaturan, dan tenggat disimpan di Cloudflare D1. Nama panggilan dan profil siswa, beserta hubungan profil dengan hasil tugas yang selesai, dipakai untuk menampilkan penguasaan lintas tugas dan membuat ulasan pintar. Hasil yang selesai dan riwayatnya disimpan 14 hari pada Paket Gratis atau 365 hari pada Paket Orang Tua dan Guru, lalu kedaluwarsa. Daftar tersimpan tetap ada sampai dihapus. Profil dapat diarsipkan dan dipulihkan; pengarsipan tidak menghapus profil atau hasil terkait. Menghapus tugas juga menghapus hasilnya. Kami tidak mengumpulkan email, alamat IP, atau User-Agent siswa.",
        ],
        [
          "Analytics",
          "Google Analytics menerima alamat halaman yang sudah dibersihkan tanpa parameter atau fragmen, serta data gabungan seperti mode, jumlah kata, dan hasil. Daftar kata dan jawaban tidak dikirim.",
        ],
        [
          "Iklan",
          'Situs ini menggunakan Google AdSense. Personalisasi iklan dan cookie terkait mengikuti kebijakan Google. Pernyataan penjual resmi tersedia di <a href="/ads.txt">/ads.txt</a>.',
        ],
        [
          "Pilihanmu",
          "Kamu dapat menghapus daftar tersimpan lewat pengaturan browser, memblokir cookies, memakai ad blocker, atau menonaktifkan analytics dengan alat privasi.",
        ],
        [
          "Kontak",
          'Jika ada pertanyaan tentang kebijakan ini, hubungi kami lewat <a href="/id/contact">halaman kontak</a>.',
        ],
      ],
    },
  },
  zh: {
    htmlLang: "zh-CN",
    dir: "/zh",
    nav: { language: "语言", home: "首页" },
    links: {
      custom: "自定义单词",
      weekly: "每周练习",
      sight: "高频词",
      parents: "家长练习",
      teachers: "教师作业",
      pricing: "价格",
      faq: "常见问题",
      privacy: "隐私",
      about: "关于",
      contact: "联系",
    },
    updated: "最后更新：",
    dateLocale: "zh-CN",
    privacyDate: "2026 年 8 月 30 日",
    about: {
      title: "关于 | My Spelling Game",
      description:
        "了解 My Spelling Game：一个无需注册、用真实英语单词表练拼写的小工具。",
      h1: "关于 My Spelling Game",
      intro:
        "一个小而专注的英语拼写练习工具，用来处理学生每周已经拿到的单词表。",
      panels: [
        [
          "使命",
          "My Spelling Game 把任意英语单词表变成隐藏单词听写测试或掉落单词打字游戏，无需学生账号、班级设置或随机词库。",
        ],
        [
          "为什么做它",
          "很多拼写游戏先给你一套固定词汇，但孩子真正要练的往往是这周老师布置的那一份。这个网站只保留最短流程：粘贴单词、开始练习、重练漏词、分享同一份链接。",
        ],
        [
          "它能做什么",
          "<ul><li>使用你自己的英语单词。</li><li>立即生成掉落单词练习。</li><li>自动保存漏掉的词，方便集中重练。</li><li>无需注册即可分享练习链接。</li><li>提供简单模式，让刚开始练的孩子压力更小。</li></ul>",
        ],
        [
          "开发者",
          "My Spelling Game 由独立开发者维护。产品目标刻意保持很窄：让每周反复发生的英语拼写练习更快开始、更容易重复。",
        ],
      ],
    },
    contact: {
      title: "联系 | My Spelling Game",
      description:
        "联系 My Spelling Game，反馈问题、建议英语拼写练习功能或讨论合作。",
      h1: "联系",
      intro:
        "欢迎反馈问题、课堂使用场景、功能建议，或任何和英语拼写练习有关的想法。",
      panels: [
        [
          "邮箱",
          '如需支持、反馈或合作，请发送邮件到：<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>',
        ],
        [
          "建议提供的信息",
          "如果你在报告 bug，请尽量附上浏览器、设备和问题出现前的操作。如果你在建议功能，一个真实的练习场景会非常有帮助。",
        ],
        ["回复时间", "这是一个独立开发项目，我会尽量在 2-3 个工作日内回复。"],
        [
          "邮件隐私",
          "邮件只用于回复你的消息。不会发送 newsletter 或营销邮件。",
        ],
      ],
    },
    privacy: {
      title: "隐私政策 | My Spelling Game",
      description:
        "My Spelling Game 隐私政策：本地存储、访问分析、Cookie、广告披露和你的选择。",
      h1: "隐私政策",
      intro:
        "My Spelling Game 如何处理本地数据、访问分析、Cookie 和广告相关信息。",
      panels: [
        [
          "概览",
          "普通练习无需账号。教师或家长使用的工作台账号及服务端保存的作业都是可选功能，学生始终不需要注册。",
        ],
        [
          "本地存储和分享链接",
          "单词表和练习偏好保存在当前浏览器。新分享链接会把单词表放在 URL 片段中，由浏览器处理，不会发送到我们的服务器。",
        ],
        [
          "拍照导入",
          "使用拍照导入时，图片会在浏览器内读取并识别单词，不会上传到我们的服务器。识别结果会先展示给你编辑，确认后才加入词表。",
        ],
        [
          "作业和学习结果",
          "教师或家长登录后发布作业或保存自定义词表时，标题、单词、设置和截止时间会保存到 Cloudflare D1。学生昵称和档案，以及档案与不同作业完成结果之间的关联，用于展示跨作业掌握度并生成智能复习。已完成结果及其历史在免费方案保存 14 天，在家长方案和教师方案保存 365 天，之后过期。已保存词表会保留到用户主动删除。学生档案可归档和恢复；归档不会删除档案或关联结果。删除作业时，其结果也会一并删除。我们不采集学生邮箱、IP 地址或 User-Agent。",
        ],
        [
          "访问分析",
          "Google Analytics 只接收不含查询参数和 URL 片段的页面地址，以及模式、单词数量、成绩等汇总信息。完整单词表和输入答案不会被发送。",
        ],
        [
          "广告",
          '网站使用 Google AdSense。广告个性化和相关 Cookie 遵循 Google 的政策。授权销售方声明发布在 <a href="/ads.txt">/ads.txt</a>。',
        ],
        [
          "你的选择",
          "你可以在浏览器设置中清除保存的单词表，屏蔽 Cookie，使用广告拦截器，或通过隐私插件禁用访问分析。",
        ],
        [
          "联系",
          '如果你对本政策有疑问，请通过 <a href="/zh/contact">联系页面</a> 告诉我们。',
        ],
      ],
    },
  },
};

const aboutUpdates = {
  en: {
    description:
      "About My Spelling Game, a custom spelling practice tool with no-account student practice, photo import, automatic example sentences, and review tools.",
    intro:
      "My Spelling Game is a spelling practice tool for students, parents, teachers, and homeschool families. Students can practice custom word lists without creating accounts. Teachers and parents can optionally use a workspace to save lists, publish assignments, track progress, and use Today’s Review over time.",
    panels: [
      [
        "Mission",
        "My Spelling Game helps students practice the exact spelling words they already receive from school, home, tutoring, or homeschool lessons. Practice stays fast: paste words, practice, and review mistakes. For repeated use, parents and teachers can save lists, assign practice, and follow progress across sessions.",
      ],
      [
        "Why It Exists",
        "Many spelling products use their own fixed vocabulary, while families usually need this week's exact words. One practice can be completed completely anonymously. When people need longer-term use, the workspace adds saved lists, assignments, student progress, and review without changing the custom-list workflow.",
      ],
      [
        "What It Does",
        "<ul><li>Practice your own spelling words in Spelling Test or Typing Rain.</li><li>Add optional example sentences for dictation practice.</li><li>Replay missed words immediately after a practice round.</li><li>Save and reuse weekly spelling lists in a workspace.</li><li>Import school lists from a photo and edit the detected words before use.</li><li>Fill example sentences from the curated library and use Today’s Review on paid plans.</li><li>Publish assignments without requiring student accounts.</li><li>Track student progress across assignments.</li><li>Identify missed words that need later review.</li><li>Use cross-day practice history to distinguish learning from mastered words.</li></ul>",
      ],
      [
        "About the Developer",
        "My Spelling Game is maintained by an indie developer. The product focuses on making weekly spelling practice easy to start, easy to repeat, and easier for adults to follow over time.",
      ],
    ],
  },
  es: {
    description:
      "Sobre My Spelling Game, una herramienta de práctica de spelling sin cuenta con importación por foto, frases automáticas y repaso.",
    intro:
      "My Spelling Game es una herramienta de práctica de spelling para estudiantes, familias, docentes y hogares que educan en casa. Los estudiantes practican listas propias sin crear cuentas. Docentes y familias pueden usar un espacio de trabajo para guardar listas, publicar tareas, seguir el progreso y usar el Repaso de hoy.",
    panels: [
      [
        "Misión",
        "My Spelling Game ayuda a practicar las palabras exactas de la escuela, casa, tutoría o educación en casa. El proceso es rápido: pega las palabras, practica y repasa los errores. Para repetirlo durante la semana, familias y docentes pueden guardar listas, asignar prácticas y seguir el progreso entre sesiones.",
      ],
      [
        "Por qué existe",
        "Muchos juegos usan su propio vocabulario, pero normalmente se necesitan las palabras exactas de esta semana. Una práctica puede hacerse de forma totalmente anónima. Cuando hace falta continuidad, el espacio de trabajo añade listas guardadas, tareas, progreso y repaso sin cambiar el flujo de lista personalizada.",
      ],
      [
        "Qué hace",
        "<ul><li>Practica tus palabras en la prueba de spelling o Typing Rain.</li><li>Añade frases de ejemplo opcionales para dictado.</li><li>Repite las palabras falladas al terminar.</li><li>Guarda y reutiliza listas semanales en un espacio de trabajo.</li><li>Importa listas escolares desde una foto y edita las palabras detectadas.</li><li>Completa frases de ejemplo y usa el Repaso de hoy en los planes de pago.</li><li>Publica tareas sin cuentas de estudiantes.</li><li>Sigue el progreso entre tareas.</li><li>Identifica palabras que necesitan repaso.</li><li>Usa el historial de distintos días para distinguir aprendizaje y dominio.</li></ul>",
      ],
      [
        "Desarrollo",
        "My Spelling Game está mantenido por un desarrollador independiente. El producto busca que la práctica semanal sea fácil de empezar, repetir y seguir para los adultos.",
      ],
    ],
  },
  "pt-BR": {
    description:
      "Sobre o My Spelling Game, uma ferramenta de prática de ortografia sem conta com importação por foto, frases automáticas e revisão.",
    intro:
      "My Spelling Game é uma ferramenta de prática de ortografia para alunos, responsáveis, professores e famílias que fazem educação domiciliar. Os alunos praticam listas próprias sem criar contas. Professores e responsáveis podem usar um espaço de trabalho para salvar listas, publicar tarefas, acompanhar o progresso e usar a Revisão de hoje.",
    panels: [
      [
        "Missão",
        "O My Spelling Game ajuda os alunos a praticar as palavras exatas da escola, de casa, da tutoria ou da educação domiciliar. O processo é rápido: cole as palavras, pratique e revise os erros. Para uso contínuo, responsáveis e professores podem salvar listas, atribuir práticas e acompanhar o progresso entre sessões.",
      ],
      [
        "Por que existe",
        "Muitos produtos usam um vocabulário fixo, mas as famílias geralmente precisam das palavras exatas da semana. Uma prática pode ser concluída de forma totalmente anônima. Quando é preciso continuar, o espaço de trabalho acrescenta listas salvas, tarefas, progresso e revisão sem mudar o fluxo de lista personalizada.",
      ],
      [
        "O que faz",
        "<ul><li>Pratica suas palavras no teste de ortografia ou no Typing Rain.</li><li>Adiciona frases de exemplo opcionais para o ditado.</li><li>Repete as palavras erradas ao terminar.</li><li>Salva e reutiliza listas semanais no espaço de trabalho.</li><li>Importa listas escolares por foto e edita as palavras reconhecidas.</li><li>Preenche frases de exemplo e usa a Revisão de hoje nos planos pagos.</li><li>Publica tarefas sem exigir contas dos alunos.</li><li>Acompanha o progresso entre tarefas.</li><li>Identifica palavras que precisam de revisão.</li><li>Usa o histórico de dias diferentes para distinguir aprendizagem e domínio.</li></ul>",
      ],
      [
        "Desenvolvimento",
        "O My Spelling Game é mantido por um desenvolvedor independente. O produto torna a prática semanal fácil de começar, repetir e acompanhar para os adultos.",
      ],
    ],
  },
  fr: {
    description:
      "À propos de My Spelling Game, un outil de pratique de l’orthographe sans compte avec import photo, phrases automatiques et révision.",
    intro:
      "My Spelling Game est un outil de pratique de l’orthographe pour les élèves, les parents, les enseignants et les familles en instruction à domicile. Les élèves utilisent leurs listes sans créer de compte. Les adultes peuvent utiliser un espace de travail pour enregistrer les listes, publier des devoirs, suivre les progrès et lancer la Révision du jour.",
    panels: [
      [
        "Mission",
        "My Spelling Game aide les élèves à pratiquer les mots exacts de l’école, de la maison, du soutien scolaire ou de l’instruction à domicile. Le parcours reste rapide : coller les mots, pratiquer, puis revoir les erreurs. Pour un usage régulier, parents et enseignants peuvent enregistrer des listes, proposer des exercices et suivre les progrès entre les séances.",
      ],
      [
        "Pourquoi ce site existe",
        "Beaucoup de produits imposent un vocabulaire fixe, alors que les familles ont besoin des mots exacts de la semaine. Une séance peut être faite entièrement sans compte. Pour un suivi plus long, l’espace de travail ajoute listes enregistrées, devoirs, progrès et révision sans changer le fonctionnement des listes personnalisées.",
      ],
      [
        "Ce que fait l’outil",
        "<ul><li>Pratique vos mots dans le test d’orthographe ou Typing Rain.</li><li>Ajoute des phrases d’exemple facultatives pour la dictée.</li><li>Rejoue les mots manqués à la fin.</li><li>Enregistre et réutilise les listes de la semaine.</li><li>Importe une liste scolaire depuis une photo et modifie les mots détectés.</li><li>Complète les phrases d’exemple et utilise la Révision du jour dans les offres payantes.</li><li>Publie des devoirs sans compte élève.</li><li>Suit les progrès entre les devoirs.</li><li>Repère les mots à revoir.</li><li>Utilise l’historique de plusieurs jours pour distinguer apprentissage et maîtrise.</li></ul>",
      ],
      [
        "Développement",
        "My Spelling Game est maintenu par un développeur indépendant. Le produit rend la pratique hebdomadaire facile à commencer, à répéter et à suivre pour les adultes.",
      ],
    ],
  },
  id: {
    description:
      "Tentang My Spelling Game, alat latihan ejaan tanpa akun dengan impor foto, kalimat otomatis, dan ulasan mingguan.",
    intro:
      "My Spelling Game adalah alat latihan ejaan untuk siswa, orang tua, guru, dan keluarga homeschool. Siswa dapat berlatih dengan daftar sendiri tanpa membuat akun. Guru dan orang tua dapat memakai ruang kerja untuk menyimpan daftar, menerbitkan tugas, memantau kemajuan, dan memakai Ulasan hari ini.",
    panels: [
      [
        "Misi",
        "My Spelling Game membantu siswa berlatih kata ejaan yang benar-benar mereka dapatkan dari sekolah, rumah, les, atau homeschool. Alurnya cepat: tempel kata, berlatih, lalu ulas kesalahan. Untuk penggunaan rutin, orang tua dan guru dapat menyimpan daftar, memberikan latihan, dan mengikuti kemajuan antar sesi.",
      ],
      [
        "Mengapa dibuat",
        "Banyak produk ejaan memakai kosakata tetap, padahal keluarga biasanya membutuhkan kata yang tepat untuk minggu ini. Satu latihan dapat diselesaikan sepenuhnya tanpa akun. Jika perlu penggunaan jangka panjang, ruang kerja menambahkan daftar tersimpan, tugas, kemajuan siswa, dan ulasan tanpa mengubah alur daftar sendiri.",
      ],
      [
        "Fungsi utama",
        "<ul><li>Berlatih dengan kata sendiri dalam Spelling Test atau Typing Rain.</li><li>Menambahkan kalimat contoh opsional untuk dikte.</li><li>Mengulang kata yang salah setelah latihan.</li><li>Menyimpan dan memakai ulang daftar mingguan di ruang kerja.</li><li>Mengimpor daftar ejaan sekolah dari foto dan mengedit kata yang terdeteksi.</li><li>Mengisi kalimat contoh dan memakai Ulasan hari ini pada paket berbayar.</li><li>Menerbitkan tugas tanpa akun siswa.</li><li>Memantau kemajuan di berbagai tugas.</li><li>Menemukan kata yang perlu diulas.</li><li>Menggunakan riwayat lintas hari untuk membedakan belajar dan penguasaan.</li></ul>",
      ],
      [
        "Pengembang",
        "My Spelling Game dikelola oleh developer independen. Produk ini membuat latihan mingguan mudah dimulai, diulang, dan dipantau oleh orang dewasa.",
      ],
    ],
  },
  zh: {
    description:
      "关于 My Spelling Game：支持学生免账号练习、拍照导入词表、自动例句和每周复习的英语拼写工具。",
    intro:
      "My Spelling Game 是一款面向学生、家长、老师和家庭教育的英语拼写练习工具。学生无需创建账号即可练习自己的单词表；家长和老师可以使用工作台保存词表、发布作业、持续追踪进度，并使用今日复习。",
    panels: [
      [
        "使命",
        "My Spelling Game 帮助学生练习学校、家庭、辅导或家庭教育中正在学习的准确单词。流程保持快速：粘贴单词、开始练习、复习错词。需要持续使用时，家长和老师可以保存词表、布置练习，并跨多次练习查看进度。",
      ],
      [
        "为什么做它",
        "很多拼写产品使用固定词库，但家庭真正需要的通常是本周正在学习的单词。一次练习可以完全匿名完成。如果需要长期使用，工作台会增加已保存词表、作业、学生进度和复习功能，同时保留自定义词表的核心流程。",
      ],
      [
        "它能做什么",
        "<ul><li>在拼写测试或单词雨中练习自己的单词。</li><li>为听写练习添加可选例句。</li><li>练习结束后立即重练错词。</li><li>在工作台保存并重复使用每周词表。</li><li>从学校词表照片中识别单词，并在写入前编辑结果。</li><li>从精选例句库自动填充例句，并使用今日复习回顾到期错词。</li><li>无需学生账号即可发布作业。</li><li>跨作业追踪学生进度。</li><li>找出之后需要复习的错词。</li><li>利用跨日期练习历史区分学习中和已掌握的单词。</li></ul>",
      ],
      [
        "关于开发者",
        "My Spelling Game 由独立开发者维护，目标是让每周拼写练习更容易开始、重复，也让家长和老师更容易长期跟进。",
      ],
    ],
  },
};

for (const [code, update] of Object.entries(aboutUpdates)) {
  locale[code].about = { ...locale[code].about, ...update };
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function pagePath(loc, slug) {
  return `${loc.dir}/${slug}`.replace("//", "/");
}

function alternateLinks(slug) {
  return [
    ...alternates.map((alt) =>
      `    <link rel="alternate" hreflang="${alt.hreflang}" href="${baseUrl}${alt.dir}/${slug}">`
        .replace("//", "/")
        .replace("https:/", "https://"),
    ),
    `    <link rel="alternate" hreflang="x-default" href="${baseUrl}/${slug}">`,
  ].join("\n");
}

function languageMenu(currentCode, slug, labels) {
  const links = alternates
    .map((alt) => {
      const current = alt.code === currentCode ? ' aria-current="page"' : "";
      const href = `${alt.dir}/${slug}`.replace("//", "/");
      return `                <a class="lang-option" href="${href}" hreflang="${alt.hreflang}"${current}>${alt.label}</a>`;
    })
    .join("\n");

  return `        <details class="language-switcher">
            <summary class="lang-btn" aria-label="${escapeAttr(labels.language)}">${labels.language}</summary>
            <div class="lang-menu">
${links}
            </div>
        </details>`;
}

function footer(loc) {
  return `    <footer>
        <p>
            <span class="footer-links">${sharedFooterLinks.map((item) => `<a href="${localizedSeoHref(loc, item)}">${loc.links[item.key]}</a>`).join(" &middot; ")}</span><br>
            <span class="footer-secondary-links">${sharedFooterSecondaryLinks.map((item) => `<a href="${localizedSeoHref(loc, item)}" aria-label="${escapeAttr(loc.links[item.key])}">${loc.links[item.key]}</a>`).join(" &middot; ")}</span><br>
            &copy; 2026 My Spelling Game ${footerRights[codeForLocale(loc)]}
        </p>
    </footer>`;
}

function localizedSeoHref(loc, item) {
  const slug = item.href.replace(/^\//, "");
  return pagePath(loc, slug);
}

function codeForLocale(loc) {
  return Object.entries(locale).find(([, value]) => value === loc)?.[0] || "en";
}

function panelBody(body) {
  const text = String(body).trim();
  return text.startsWith("<ul") ? text : `<p>${body}</p>`;
}

function render(loc, code, slug, data, schemaType) {
  const canonical = `${baseUrl}${pagePath(loc, slug)}`;
  const homeHref = `${loc.dir || ""}/`.replace("//", "/");
  return `<!DOCTYPE html>
<html lang="${loc.htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${localizeTerms(data.title, code)}</title>
    <meta name="description" content="${escapeAttr(localizeTerms(data.description, code))}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
${alternateLinks(slug)}
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/icon-32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
    <meta name="theme-color" content="#2f6f73">
    <meta name="google-adsense-account" content="ca-pub-9244949928133071">
    <meta property="og:title" content="${escapeAttr(localizeTerms(data.title, code))}">
    <meta property="og:description" content="${escapeAttr(localizeTerms(data.description, code))}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="My Spelling Game preview">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(localizeTerms(data.title, code))}">
    <meta name="twitter:description" content="${escapeAttr(localizeTerms(data.description, code))}">
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
    <header class="top-right-nav">
        <a class="brand-link" href="${homeHref}" aria-label="My Spelling Game home">
            <img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt="">
            <span class="brand-name">My Spelling Game</span>
        </a>
${languageMenu(code, slug, loc.nav)}
        <a class="teacher-nav-link" href="/teacher?lang=${encodeURIComponent(code)}">${loc.nav.home === "Home" ? "Workspace" : code === "zh" ? "工作台" : code === "es" ? "Espacio de trabajo" : code === "pt-BR" ? "Espaço de trabalho" : code === "fr" ? "Espace de travail" : "Ruang kerja"}</a>
        <button class="header-home-link" onclick="window.location.href='${homeHref}'" id="back-home" title="${escapeAttr(loc.nav.home)}">${loc.nav.home}</button>
    </header>

    <main class="seo-landing content-page">
        <section class="seo-hero">
            <h1>${localizeTerms(data.h1, code)}</h1>
            <p>${localizeTerms(data.intro, code)}</p>
        </section>

${data.panels
  .map(
    ([title, body], index) => `        <section class="seo-panel">
            <h2>${localizeTerms(title, code)}</h2>
            ${localizeTerms(panelBody(body), code)}${slug === "privacy" && index === data.panels.length - 1 ? `\n            <p class="privacy-update">${loc.updated} ${loc.privacyDate}</p>` : ""}
        </section>`,
  )
  .join("\n\n")}
    </main>

${footer(loc)}

    <script type="application/ld+json">
    ${JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": schemaType,
        name: data.title,
        url: canonical,
        inLanguage: loc.htmlLang,
        about: {
          "@type": "SoftwareApplication",
          "@id": `${baseUrl}/#software`,
        },
      },
      null,
      6,
    )}
    </script>
</body>
</html>
`;
}

for (const [code, loc] of Object.entries(locale)) {
  if (code !== "en")
    fs.mkdirSync(path.join(root, loc.dir), { recursive: true });
  const targetDir = path.join(root, loc.dir);
  fs.writeFileSync(
    path.join(targetDir, "about.html"),
    render(loc, code, "about", loc.about, "AboutPage"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(targetDir, "contact.html"),
    render(loc, code, "contact", loc.contact, "ContactPage"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(targetDir, "privacy.html"),
    render(loc, code, "privacy", loc.privacy, "WebPage"),
    "utf8",
  );
}

console.log("Generated localized about/contact/privacy pages");
