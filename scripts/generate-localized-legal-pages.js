const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const baseUrl = 'https://myspellinggame.com';
const ogImage = `${baseUrl}/images/my-spelling-game-og.png`;

const alternates = [
  { code: 'en', hreflang: 'en', label: 'English', dir: '' },
  { code: 'es', hreflang: 'es', label: 'Español', dir: '/es' },
  { code: 'pt-BR', hreflang: 'pt-BR', label: 'Português', dir: '/pt-br' },
  { code: 'fr', hreflang: 'fr', label: 'Français', dir: '/fr' },
  { code: 'id', hreflang: 'id', label: 'Bahasa Indonesia', dir: '/id' },
  { code: 'zh', hreflang: 'zh-CN', label: '中文', dir: '/zh' },
];

const sharedSeoLinks = [
  { href: '/custom-spelling-words-game', key: 'custom' },
  { href: '/spelling-list-game', key: 'list' },
  { href: '/weekly-spelling-practice', key: 'weekly' },
];

const locale = {
  en: {
    htmlLang: 'en',
    dir: '',
    nav: { language: 'Language', home: 'Home' },
    links: { custom: 'Custom Spelling Game', list: 'Spelling List Game', weekly: 'Weekly Practice', privacy: 'Privacy', about: 'About', contact: 'Contact' },
    updated: 'Last updated:',
    dateLocale: 'en-US',
    about: {
      title: 'About | My Spelling Game',
      description: 'About My Spelling Game, a no-login custom spelling words game for weekly spelling practice.',
      h1: 'About My Spelling Game',
      intro: 'A small, no-login spelling practice tool for the weekly word lists students already have.',
      panels: [
        ['Mission', 'My Spelling Game turns any weekly word list into an audio spelling test or a falling-word typing game. It is built for quick practice without student accounts, class setup, or a generic word bank.'],
        ['Why It Exists', 'Most spelling games start with their own vocabulary. That does not help when a child needs to practice this week’s exact words. This site keeps the workflow simple: paste the list, play the round, replay the missed words, and share the same practice link.'],
        ['What It Does', '<ul><li>Uses your own spelling words.</li><li>Offers a hidden-word audio test and Typing Rain.</li><li>Saves missed words for a focused replay round.</li><li>Shares practice links without requiring an account.</li></ul>'],
        ['About the Developer', 'My Spelling Game is maintained by an indie developer. The product goal is intentionally narrow: make repeated weekly spelling practice faster to set up and easier to repeat.'],
      ],
    },
    contact: {
      title: 'Contact | My Spelling Game',
      description: 'Contact My Spelling Game for support, feedback, spelling practice suggestions, or collaboration.',
      h1: 'Contact',
      intro: 'Questions, bug reports, classroom use cases, and spelling practice suggestions are welcome.',
      panels: [
        ['Email', 'For support, feedback, or collaboration, please email:<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>'],
        ['Helpful Details', 'If you are reporting a bug, please include the browser, device, and what happened before the issue appeared. If you are suggesting a feature, a short example of the spelling practice workflow helps a lot.'],
        ['Response Time', 'As a solo developer, I try to reply within 2-3 business days.'],
        ['Privacy', 'Emails are used only to respond to your message. No newsletter or marketing emails will be sent.'],
      ],
    },
    privacy: {
      title: 'Privacy Policy | My Spelling Game',
      description: 'Privacy Policy for My Spelling Game: local storage, analytics, cookies, advertising disclosures, and your choices.',
      h1: 'Privacy Policy',
      intro: 'How My Spelling Game handles local data, analytics, cookies, and advertising disclosures.',
      panels: [
        ['Overview', 'Ordinary My Spelling Game practice works without an account. Teacher accounts and server-saved assignments are optional. Students never create accounts.'],
        ['Local Storage and Share Links', 'Your spelling list and preferences are stored in this browser. New share links put the list in the URL fragment, which is processed by the browser and is not sent to our server.'],
        ['Teacher Assignments and Results', 'When a signed-in teacher explicitly publishes an assignment, its title, word list, settings, and deadline are stored in Cloudflare D1. Student nicknames, server-calculated results, missed words, duration, and completion time are stored for 30 days on Free or 365 days on Pro. We do not collect student email, IP address, or User-Agent. Deleting an assignment also deletes its student results.'],
        ['Analytics', 'Google Analytics receives a cleaned page address without query parameters or URL fragments, plus aggregate events such as mode, word count, and result. We do not send word lists or typed answers.'],
        ['Advertising', 'The site uses Google AdSense. Ad personalization and related cookies follow Google policies. Authorized seller declaration is published at <a href="/ads.txt">/ads.txt</a>.'],
        ['Your Choices', 'You can clear saved spelling lists in your browser settings, block cookies, use ad blockers, or disable analytics through browser tools and privacy extensions.'],
        ['Contact', 'If you have questions about this policy, please contact us through the <a href="/contact">contact page</a>.'],
      ],
    },
  },
  es: {
    htmlLang: 'es',
    dir: '/es',
    nav: { language: 'Idioma', home: 'Inicio' },
    links: { custom: 'Juego personalizado', list: 'Lista de spelling', weekly: 'Práctica semanal', privacy: 'Privacidad', about: 'Acerca de', contact: 'Contacto' },
    updated: 'Última actualización:',
    dateLocale: 'es',
    about: {
      title: 'Acerca de | My Spelling Game',
      description: 'Conoce My Spelling Game, una herramienta sin cuenta para practicar spelling en inglés con listas semanales reales.',
      h1: 'Acerca de My Spelling Game',
      intro: 'Una herramienta pequeña, sin cuenta, para practicar las listas de palabras que los estudiantes ya tienen.',
      panels: [
        ['Misión', 'My Spelling Game convierte cualquier lista semanal en una prueba de spelling por audio o un juego de palabras que caen. Está pensado para practicar rápido, sin cuentas de estudiantes ni bancos de palabras genéricos.'],
        ['Por qué existe', 'Muchos juegos empiezan con su propio vocabulario. Eso no ayuda cuando el niño necesita practicar las palabras exactas de esta semana. Aquí el flujo es simple: pegar la lista, jugar, repetir lo fallado y compartir el mismo enlace.'],
        ['Qué hace', '<ul><li>Usa tus propias palabras de inglés.</li><li>Crea práctica instantánea con palabras que caen.</li><li>Guarda las palabras falladas para una ronda de repaso.</li><li>Comparte enlaces sin crear cuenta.</li><li>Incluye modo fácil para practicar con menos presión.</li></ul>'],
        ['Quién lo mantiene', 'My Spelling Game lo mantiene un desarrollador independiente. El objetivo es estrecho a propósito: hacer que la práctica semanal sea más rápida de preparar y más fácil de repetir.'],
      ],
    },
    contact: {
      title: 'Contacto | My Spelling Game',
      description: 'Contacta con My Spelling Game para soporte, errores, sugerencias de práctica o colaboración.',
      h1: 'Contacto',
      intro: 'Puedes enviar preguntas, errores, ideas para clase y sugerencias de práctica.',
      panels: [
        ['Email', 'Para soporte, comentarios o colaboración, escribe a:<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>'],
        ['Detalles útiles', 'Si reportas un error, incluye el navegador, el dispositivo y qué ocurrió antes del problema. Si propones una función, ayuda mucho contar un ejemplo de uso real.'],
        ['Tiempo de respuesta', 'Como desarrollador independiente, intento responder en 2-3 días laborables.'],
        ['Privacidad', 'Los correos solo se usan para responder a tu mensaje. No se enviarán newsletters ni correos de marketing.'],
      ],
    },
    privacy: {
      title: 'Política de privacidad | My Spelling Game',
      description: 'Política de privacidad de My Spelling Game: almacenamiento local, analítica, cookies, publicidad y tus opciones.',
      h1: 'Política de privacidad',
      intro: 'Cómo My Spelling Game gestiona datos locales, analítica, cookies y publicidad.',
      panels: [
        ['Resumen', 'La práctica normal funciona sin cuenta. Las cuentas docentes y las tareas guardadas en el servidor son opcionales. Los estudiantes nunca crean una cuenta.'],
        ['Almacenamiento local y enlaces', 'Tu lista y tus preferencias se guardan en este navegador. Los enlaces nuevos colocan la lista en el fragmento de la URL, que el navegador procesa sin enviarlo a nuestro servidor.'],
        ['Tareas docentes y resultados', 'Cuando un docente conectado publica una tarea, su título, lista, ajustes y fecha límite se guardan en Cloudflare D1. Guardamos el apodo, resultado calculado por el servidor, errores, duración y hora de entrega durante 30 días en Gratis o 365 días en Pro. No recopilamos email, dirección IP ni User-Agent del estudiante. Al borrar la tarea también se borran sus resultados.'],
        ['Analítica', 'Google Analytics recibe la dirección limpia de la página, sin parámetros ni fragmentos, y datos agregados como el modo, la cantidad de palabras y el resultado. No enviamos listas ni respuestas.'],
        ['Publicidad', 'El sitio usa Google AdSense. La personalización de anuncios y cookies relacionadas sigue las políticas de Google. La declaración de vendedor autorizado está en <a href="/ads.txt">/ads.txt</a>.'],
        ['Tus opciones', 'Puedes borrar listas guardadas desde el navegador, bloquear cookies, usar bloqueadores de anuncios o desactivar analítica con herramientas de privacidad.'],
        ['Contacto', 'Si tienes preguntas sobre esta política, escríbenos desde la <a href="/es/contact">página de contacto</a>.'],
      ],
    },
  },
  'pt-BR': {
    htmlLang: 'pt-BR',
    dir: '/pt-br',
    nav: { language: 'Idioma', home: 'Início' },
    links: { custom: 'Jogo personalizado', list: 'Lista de spelling', weekly: 'Prática semanal', privacy: 'Privacidade', about: 'Sobre', contact: 'Contato' },
    updated: 'Atualizado em:',
    dateLocale: 'pt-BR',
    about: {
      title: 'Sobre | My Spelling Game',
      description: 'Conheça o My Spelling Game, uma ferramenta sem login para praticar spelling em inglês com listas reais.',
      h1: 'Sobre o My Spelling Game',
      intro: 'Uma ferramenta pequena, sem login, para praticar as listas de palavras que os alunos já têm.',
      panels: [
        ['Missão', 'My Spelling Game transforma qualquer lista semanal em um teste de spelling por áudio ou um jogo de digitação com palavras caindo. A prática começa rápido, sem contas de aluno ou banco genérico de palavras.'],
        ['Por que existe', 'Muitos jogos começam com seu próprio vocabulário. Isso não ajuda quando a criança precisa treinar as palavras exatas da semana. Aqui o fluxo é simples: colar a lista, jogar, revisar os erros e compartilhar o mesmo link.'],
        ['O que faz', '<ul><li>Usa suas próprias palavras de inglês.</li><li>Cria prática instantânea com palavras caindo.</li><li>Salva palavras erradas para revisão focada.</li><li>Compartilha links sem exigir conta.</li><li>Oferece modo fácil para uma prática mais lenta.</li></ul>'],
        ['Quem mantém', 'My Spelling Game é mantido por um desenvolvedor independente. O objetivo é propositalmente estreito: deixar a prática semanal mais rápida de preparar e mais fácil de repetir.'],
      ],
    },
    contact: {
      title: 'Contato | My Spelling Game',
      description: 'Entre em contato com My Spelling Game para suporte, feedback, bugs, sugestões ou colaboração.',
      h1: 'Contato',
      intro: 'Perguntas, erros, uso em sala e sugestões de prática são bem-vindos.',
      panels: [
        ['Email', 'Para suporte, feedback ou colaboração, envie um email para:<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>'],
        ['Detalhes úteis', 'Ao relatar um bug, inclua navegador, dispositivo e o que aconteceu antes do problema. Para sugerir recurso, um exemplo real de prática ajuda bastante.'],
        ['Tempo de resposta', 'Como desenvolvedor solo, tento responder em 2-3 dias úteis.'],
        ['Privacidade', 'Emails são usados apenas para responder à sua mensagem. Nenhuma newsletter ou email de marketing será enviado.'],
      ],
    },
    privacy: {
      title: 'Política de Privacidade | My Spelling Game',
      description: 'Política de Privacidade do My Spelling Game: armazenamento local, analytics, cookies, anúncios e suas opções.',
      h1: 'Política de Privacidade',
      intro: 'Como My Spelling Game lida com dados locais, analytics, cookies e anúncios.',
      panels: [
        ['Visão geral', 'A prática comum funciona sem conta. Contas de professor e tarefas salvas no servidor são opcionais. Alunos nunca criam uma conta.'],
        ['Armazenamento local e links', 'Sua lista e preferências ficam neste navegador. Os links novos colocam a lista no fragmento da URL, processado pelo navegador sem ser enviado ao nosso servidor.'],
        ['Tarefas e resultados', 'Quando um professor conectado publica uma tarefa, título, palavras, configurações e prazo ficam no Cloudflare D1. Apelido do aluno, resultado calculado no servidor, erros, duração e horário ficam por 30 dias no Grátis ou 365 dias no Pro. Não coletamos email, endereço IP ou User-Agent do aluno. Excluir a tarefa também exclui os resultados.'],
        ['Analytics', 'O Google Analytics recebe o endereço limpo da página, sem parâmetros ou fragmentos, e dados agregados como modo, quantidade de palavras e resultado. Não enviamos listas nem respostas.'],
        ['Anúncios', 'O site usa Google AdSense. Personalização de anúncios e cookies seguem as políticas do Google. A declaração de vendedor autorizado fica em <a href="/ads.txt">/ads.txt</a>.'],
        ['Suas opções', 'Você pode apagar listas salvas nas configurações do navegador, bloquear cookies, usar bloqueadores de anúncio ou desativar analytics com ferramentas de privacidade.'],
        ['Contato', 'Se tiver dúvidas sobre esta política, fale conosco pela <a href="/pt-br/contact">página de contato</a>.'],
      ],
    },
  },
  fr: {
    htmlLang: 'fr',
    dir: '/fr',
    nav: { language: 'Langue', home: 'Accueil' },
    links: { custom: 'Jeu personnalisé', list: 'Liste de spelling', weekly: 'Pratique hebdo', privacy: 'Confidentialité', about: 'À propos', contact: 'Contact' },
    updated: 'Dernière mise à jour :',
    dateLocale: 'fr',
    about: {
      title: 'À propos | My Spelling Game',
      description: 'Découvrez My Spelling Game, un outil sans compte pour pratiquer le spelling anglais avec les vraies listes de la semaine.',
      h1: 'À propos de My Spelling Game',
      intro: 'Un petit outil sans compte pour travailler les listes de mots que les élèves ont déjà.',
      panels: [
        ['Mission', 'My Spelling Game transforme n’importe quelle liste de mots anglais en test audio ou en jeu de frappe avec des mots qui tombent. La pratique démarre vite, sans comptes élèves ni listes génériques.'],
        ['Pourquoi ce site existe', 'Beaucoup de jeux imposent leur propre vocabulaire. C’est peu utile quand l’enfant doit apprendre les mots exacts de la semaine. Ici, le parcours reste simple : coller la liste, jouer, refaire les mots manqués, partager le lien.'],
        ['Ce que fait l’outil', '<ul><li>Utilise vos propres mots anglais.</li><li>Crée une pratique immédiate.</li><li>Garde les mots manqués pour une partie ciblée.</li><li>Partage des liens sans compte.</li><li>Propose un mode facile plus lent.</li></ul>'],
        ['Développement', 'My Spelling Game est maintenu par un développeur indépendant. Le but est volontairement précis : rendre la pratique hebdomadaire plus rapide à lancer et plus facile à répéter.'],
      ],
    },
    contact: {
      title: 'Contact | My Spelling Game',
      description: 'Contactez My Spelling Game pour support, bugs, suggestions de pratique ou collaboration.',
      h1: 'Contact',
      intro: 'Questions, bugs, usages en classe et idées de pratique sont les bienvenus.',
      panels: [
        ['Email', 'Pour le support, un retour ou une collaboration, écrivez à :<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>'],
        ['Détails utiles', 'Pour signaler un bug, indiquez le navigateur, l’appareil et ce qui s’est passé avant le problème. Pour une idée de fonctionnalité, un exemple concret aide beaucoup.'],
        ['Délai de réponse', 'En tant que développeur indépendant, j’essaie de répondre sous 2 à 3 jours ouvrés.'],
        ['Confidentialité', 'Les emails servent uniquement à répondre à votre message. Aucune newsletter ni email marketing ne sera envoyé.'],
      ],
    },
    privacy: {
      title: 'Politique de confidentialité | My Spelling Game',
      description: 'Politique de confidentialité de My Spelling Game : stockage local, analytics, cookies, publicité et choix utilisateur.',
      h1: 'Politique de confidentialité',
      intro: 'Comment My Spelling Game gère les données locales, analytics, cookies et annonces.',
      panels: [
        ['Vue d’ensemble', 'L’entraînement classique fonctionne sans compte. Les comptes enseignants et devoirs enregistrés sur le serveur sont facultatifs. Les élèves ne créent jamais de compte.'],
        ['Stockage local et liens', 'Votre liste et vos préférences restent dans ce navigateur. Les nouveaux liens placent la liste dans le fragment de l’URL, traité par le navigateur sans être envoyé à notre serveur.'],
        ['Devoirs et résultats', 'Lorsqu’un enseignant connecté publie un devoir, son titre, sa liste, ses réglages et son échéance sont stockés dans Cloudflare D1. Le pseudonyme, le résultat recalculé par le serveur, les mots manqués, la durée et l’heure sont conservés 30 jours avec l’offre gratuite ou 365 jours avec Pro. Aucun email, adresse IP ni User-Agent élève n’est collecté. Supprimer le devoir supprime aussi ses résultats.'],
        ['Mesure d’audience', 'Google Analytics reçoit une adresse de page nettoyée, sans paramètres ni fragment, ainsi que des données agrégées comme le mode, le nombre de mots et le résultat. Les listes et réponses ne sont pas envoyées.'],
        ['Publicité', 'Le site utilise Google AdSense. La personnalisation des annonces et les cookies associés suivent les règles de Google. La déclaration de vendeur autorisé se trouve sur <a href="/ads.txt">/ads.txt</a>.'],
        ['Vos choix', 'Vous pouvez effacer les listes enregistrées dans le navigateur, bloquer les cookies, utiliser un bloqueur de publicité ou désactiver l’analyse avec des outils de confidentialité.'],
        ['Contact', 'Pour toute question sur cette politique, utilisez la <a href="/fr/contact">page de contact</a>.'],
      ],
    },
  },
  id: {
    htmlLang: 'id',
    dir: '/id',
    nav: { language: 'Bahasa', home: 'Beranda' },
    links: { custom: 'Game kata sendiri', list: 'Daftar spelling', weekly: 'Latihan mingguan', privacy: 'Privasi', about: 'Tentang', contact: 'Kontak' },
    updated: 'Terakhir diperbarui:',
    dateLocale: 'id-ID',
    about: {
      title: 'Tentang | My Spelling Game',
      description: 'Tentang My Spelling Game, alat tanpa akun untuk latihan spelling bahasa Inggris dengan daftar kata mingguan.',
      h1: 'Tentang My Spelling Game',
      intro: 'Alat kecil tanpa login untuk melatih daftar kata yang sudah dimiliki siswa.',
      panels: [
        ['Misi', 'My Spelling Game mengubah daftar kata mingguan menjadi tes spelling dengan audio atau game mengetik kata yang jatuh. Latihan bisa langsung dimulai tanpa akun siswa atau bank kata acak.'],
        ['Kenapa dibuat', 'Banyak game memakai kosakata bawaan. Itu kurang membantu ketika anak harus melatih kata minggu ini. Di sini alurnya sederhana: tempel daftar, main, ulangi kata yang salah, lalu bagikan link yang sama.'],
        ['Fungsi utama', '<ul><li>Memakai daftar kata sendiri.</li><li>Membuat latihan kata jatuh secara instan.</li><li>Menyimpan kata yang salah untuk ronde ulang.</li><li>Membagikan link tanpa akun.</li><li>Menyediakan mode mudah agar latihan lebih pelan.</li></ul>'],
        ['Pengembang', 'My Spelling Game dikelola oleh developer independen. Tujuannya sengaja sempit: membuat latihan spelling mingguan lebih cepat disiapkan dan mudah diulang.'],
      ],
    },
    contact: {
      title: 'Kontak | My Spelling Game',
      description: 'Hubungi My Spelling Game untuk dukungan, laporan bug, saran latihan, atau kerja sama.',
      h1: 'Kontak',
      intro: 'Pertanyaan, laporan bug, penggunaan di kelas, dan saran latihan sangat diterima.',
      panels: [
        ['Email', 'Untuk dukungan, masukan, atau kerja sama, kirim email ke:<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>'],
        ['Detail yang membantu', 'Jika melaporkan bug, sertakan browser, perangkat, dan apa yang terjadi sebelum masalah muncul. Jika menyarankan fitur, contoh alur latihan akan sangat membantu.'],
        ['Waktu respons', 'Sebagai developer solo, saya berusaha membalas dalam 2-3 hari kerja.'],
        ['Privasi', 'Email hanya dipakai untuk membalas pesanmu. Tidak ada newsletter atau email marketing.'],
      ],
    },
    privacy: {
      title: 'Kebijakan Privasi | My Spelling Game',
      description: 'Kebijakan Privasi My Spelling Game: penyimpanan lokal, analytics, cookies, iklan, dan pilihan pengguna.',
      h1: 'Kebijakan Privasi',
      intro: 'Cara My Spelling Game menangani data lokal, analytics, cookies, dan iklan.',
      panels: [
        ['Ringkasan', 'Latihan biasa berjalan tanpa akun. Akun guru dan tugas yang disimpan di server bersifat opsional. Siswa tidak pernah membuat akun.'],
        ['Penyimpanan lokal dan link', 'Daftar kata dan pilihan latihan disimpan di browser ini. Link baru menaruh daftar di fragmen URL yang diproses browser tanpa dikirim ke server kami.'],
        ['Tugas dan hasil siswa', 'Saat guru yang sudah masuk menerbitkan tugas, judul, daftar kata, pengaturan, dan tenggat disimpan di Cloudflare D1. Nama panggilan, hasil yang dihitung server, kata salah, durasi, dan waktu selesai disimpan 30 hari pada paket Gratis atau 365 hari pada Pro. Kami tidak mengumpulkan email, alamat IP, atau User-Agent siswa. Menghapus tugas juga menghapus seluruh hasilnya.'],
        ['Analytics', 'Google Analytics menerima alamat halaman yang sudah dibersihkan tanpa parameter atau fragmen, serta data gabungan seperti mode, jumlah kata, dan hasil. Daftar kata dan jawaban tidak dikirim.'],
        ['Iklan', 'Situs ini menggunakan Google AdSense. Personalisasi iklan dan cookie terkait mengikuti kebijakan Google. Pernyataan penjual resmi tersedia di <a href="/ads.txt">/ads.txt</a>.'],
        ['Pilihanmu', 'Kamu dapat menghapus daftar tersimpan lewat pengaturan browser, memblokir cookies, memakai ad blocker, atau menonaktifkan analytics dengan alat privasi.'],
        ['Kontak', 'Jika ada pertanyaan tentang kebijakan ini, hubungi kami lewat <a href="/id/contact">halaman kontak</a>.'],
      ],
    },
  },
  zh: {
    htmlLang: 'zh-CN',
    dir: '/zh',
    nav: { language: '语言', home: '首页' },
    links: { custom: '自定义单词游戏', list: '单词表练习', weekly: '每周拼写练习', privacy: '隐私', about: '关于', contact: '联系' },
    updated: '最后更新：',
    dateLocale: 'zh-CN',
    about: {
      title: '关于 | My Spelling Game',
      description: '了解 My Spelling Game：一个无需注册、用真实英语单词表练拼写的小工具。',
      h1: '关于 My Spelling Game',
      intro: '一个小而专注的英语拼写练习工具，用来处理学生每周已经拿到的单词表。',
      panels: [
        ['使命', 'My Spelling Game 把任意英语单词表变成隐藏单词听写测试或掉落单词打字游戏，无需学生账号、班级设置或随机词库。'],
        ['为什么做它', '很多拼写游戏先给你一套固定词汇，但孩子真正要练的往往是这周老师布置的那一份。这个网站只保留最短流程：粘贴单词、开始练习、重练漏词、分享同一份链接。'],
        ['它能做什么', '<ul><li>使用你自己的英语单词。</li><li>立即生成掉落单词练习。</li><li>自动保存漏掉的词，方便集中重练。</li><li>无需注册即可分享练习链接。</li><li>提供简单模式，让刚开始练的孩子压力更小。</li></ul>'],
        ['开发者', 'My Spelling Game 由独立开发者维护。产品目标刻意保持很窄：让每周反复发生的英语拼写练习更快开始、更容易重复。'],
      ],
    },
    contact: {
      title: '联系 | My Spelling Game',
      description: '联系 My Spelling Game，反馈问题、建议英语拼写练习功能或讨论合作。',
      h1: '联系',
      intro: '欢迎反馈问题、课堂使用场景、功能建议，或任何和英语拼写练习有关的想法。',
      panels: [
        ['邮箱', '如需支持、反馈或合作，请发送邮件到：<br><a class="text-link" href="mailto:dennyho0917@hotmail.com">dennyho0917@hotmail.com</a>'],
        ['建议提供的信息', '如果你在报告 bug，请尽量附上浏览器、设备和问题出现前的操作。如果你在建议功能，一个真实的练习场景会非常有帮助。'],
        ['回复时间', '这是一个独立开发项目，我会尽量在 2-3 个工作日内回复。'],
        ['邮件隐私', '邮件只用于回复你的消息。不会发送 newsletter 或营销邮件。'],
      ],
    },
    privacy: {
      title: '隐私政策 | My Spelling Game',
      description: 'My Spelling Game 隐私政策：本地存储、访问分析、Cookie、广告披露和你的选择。',
      h1: '隐私政策',
      intro: 'My Spelling Game 如何处理本地数据、访问分析、Cookie 和广告相关信息。',
      panels: [
        ['概览', '普通练习无需账号。教师账号和服务端保存的作业是可选功能，学生始终不需要注册。'],
        ['本地存储和分享链接', '单词表和练习偏好保存在当前浏览器。新分享链接会把单词表放在 URL 片段中，由浏览器处理，不会发送到我们的服务器。'],
        ['教师作业和学生成绩', '登录教师明确发布作业后，标题、词表、设置和截止时间会保存到 Cloudflare D1。学生昵称、服务端重新计算的成绩、错词、用时和完成时间在免费版保存 30 天，在 Pro 版保存 365 天。我们不采集学生邮箱、IP 地址或 User-Agent。删除作业时，其学生成绩也会一并删除。'],
        ['访问分析', 'Google Analytics 只接收不含查询参数和 URL 片段的页面地址，以及模式、单词数量、成绩等汇总信息。完整单词表和输入答案不会被发送。'],
        ['广告', '网站使用 Google AdSense。广告个性化和相关 Cookie 遵循 Google 的政策。授权销售方声明发布在 <a href="/ads.txt">/ads.txt</a>。'],
        ['你的选择', '你可以在浏览器设置中清除保存的单词表，屏蔽 Cookie，使用广告拦截器，或通过隐私插件禁用访问分析。'],
        ['联系', '如果你对本政策有疑问，请通过 <a href="/zh/contact">联系页面</a> 告诉我们。'],
      ],
    },
  },
};

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function pagePath(loc, slug) {
  return `${loc.dir}/${slug}`.replace('//', '/');
}

function alternateLinks(slug) {
  return [
    ...alternates.map((alt) => `    <link rel="alternate" hreflang="${alt.hreflang}" href="${baseUrl}${alt.dir}/${slug}">`.replace('//', '/').replace('https:/', 'https://')),
    `    <link rel="alternate" hreflang="x-default" href="${baseUrl}/${slug}">`,
  ].join('\n');
}

function languageMenu(currentCode, slug, labels) {
  const links = alternates.map((alt) => {
    const current = alt.code === currentCode ? ' aria-current="page"' : '';
    const href = `${alt.dir}/${slug}`.replace('//', '/');
    return `                <a class="lang-option" href="${href}" hreflang="${alt.hreflang}"${current}>${alt.label}</a>`;
  }).join('\n');

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
            ${sharedSeoLinks.map((item) => `<a href="${localizedSeoHref(loc, item)}">${loc.links[item.key]}</a>`).join(' &middot; ')}<br>
            <a href="${pagePath(loc, 'privacy')}">${loc.links.privacy}</a> &middot; <a href="${pagePath(loc, 'about')}">${loc.links.about}</a> &middot; <a href="${pagePath(loc, 'contact')}">${loc.links.contact}</a><br>
            &copy; 2026 My Spelling Game All rights reserved.
        </p>
    </footer>`;
}

function localizedSeoHref(loc, item) {
  const slug = item.href.replace(/^\//, '');
  return pagePath(loc, slug);
}

function panelBody(body) {
  const text = String(body).trim();
  return text.startsWith('<ul') ? text : `<p>${body}</p>`;
}

function render(loc, code, slug, data, schemaType) {
  const canonical = `${baseUrl}${pagePath(loc, slug)}`;
  const homeHref = `${loc.dir || ''}/`.replace('//', '/');
  return `<!DOCTYPE html>
<html lang="${loc.htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <meta name="description" content="${escapeAttr(data.description)}">
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
    <meta property="og:title" content="${escapeAttr(data.title)}">
    <meta property="og:description" content="${escapeAttr(data.description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="My Spelling Game preview">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(data.title)}">
    <meta name="twitter:description" content="${escapeAttr(data.description)}">
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
    <div class="top-right-nav">
${languageMenu(code, slug, loc.nav)}
        <button class="lang-btn" onclick="window.location.href='${homeHref}'" id="back-home" title="${escapeAttr(loc.nav.home)}">${loc.nav.home}</button>
    </div>

    <main class="seo-landing content-page">
        <section class="seo-hero">
            <h1>${data.h1}</h1>
            <p>${data.intro}</p>
        </section>

${data.panels.map(([title, body], index) => `        <section class="seo-panel">
            <h2>${title}</h2>
            ${panelBody(body)}${slug === 'privacy' && index === data.panels.length - 1 ? `\n            <p class="privacy-update">${loc.updated} <span id="privacy-date"></span></p>` : ''}
        </section>`).join('\n\n')}
    </main>

${footer(loc)}

${slug === 'privacy' ? `    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const el = document.getElementById('privacy-date');
        if (el) {
          el.textContent = new Date().toLocaleDateString('${loc.dateLocale}', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      });
    </script>\n\n` : ''}    <script type="application/ld+json">
    ${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: data.title,
      url: canonical,
      inLanguage: loc.htmlLang,
      about: {
        '@type': 'VideoGame',
        name: 'My Spelling Game',
      },
    }, null, 6)}
    </script>
</body>
</html>
`;
}

for (const [code, loc] of Object.entries(locale)) {
  if (code !== 'en') fs.mkdirSync(path.join(root, loc.dir), { recursive: true });
  const targetDir = path.join(root, loc.dir);
fs.writeFileSync(path.join(targetDir, 'about.html'), render(loc, code, 'about', loc.about, 'AboutPage'), 'utf8');
fs.writeFileSync(path.join(targetDir, 'contact.html'), render(loc, code, 'contact', loc.contact, 'ContactPage'), 'utf8');
fs.writeFileSync(path.join(targetDir, 'privacy.html'), render(loc, code, 'privacy', loc.privacy, 'WebPage'), 'utf8');
}

console.log('Generated localized about/contact/privacy pages');
