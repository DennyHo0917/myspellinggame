const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const baseUrl = 'https://myspellinggame.com';
const ogImage = `${baseUrl}/images/my-spelling-game-og.png`;
const gaId = 'G-VYF1V40KVS';

const alternates = [
  { code: 'en', hreflang: 'en', label: 'English', dir: '' },
  { code: 'es', hreflang: 'es', label: 'Español', dir: '/es' },
  { code: 'pt-BR', hreflang: 'pt-BR', label: 'Português', dir: '/pt-br' },
  { code: 'fr', hreflang: 'fr', label: 'Français', dir: '/fr' },
  { code: 'id', hreflang: 'id', label: 'Bahasa Indonesia', dir: '/id' },
  { code: 'zh', hreflang: 'zh-CN', label: '中文', dir: '/zh' },
];

const locale = {
  en: {
    htmlLang: 'en',
    dir: '',
    nav: { language: 'Language', home: 'Home' },
    footer: { privacy: 'Privacy', about: 'About', contact: 'Contact' },
    related: {
      custom: 'Custom Spelling Words Game',
      list: 'Spelling List Game',
      weekly: 'Weekly Spelling Practice',
      sight: 'Sight Word Typing Game',
      homeschool: 'Homeschool Spelling Practice',
      vocabulary: 'Vocabulary Typing Game',
    },
    pages: {
      'spelling-list-game': {
        title: 'Spelling List Game | My Spelling Game',
        description: 'Turn a spelling list into a game. Paste weekly words, play a falling-word typing round, replay missed words, and share a no-login practice link.',
        ogDescription: 'Paste a spelling list and play it as a falling-word typing game.',
        h1: 'Spelling List Game',
        intro: 'Have a word list from school? Paste it into My Spelling Game and play a quick spelling list game that uses only those words.',
        cta: 'Start With My List',
        panels: [
          ['Built For The Weekly List', 'A spelling list game is useful only when it matches the student’s actual list. My Spelling Game keeps the practice focused on the same words that appear in homework, tutoring sessions, or the next quiz.'],
          ['Use Cases', ['Parents turning a teacher handout into quick home practice.', 'Teachers sharing the same list with students without student accounts.', 'Tutors repeating missed words after a short practice round.']],
        ],
        schemaDescription: 'Turn a spelling list into a falling-word typing game.',
      },
      'weekly-spelling-practice': {
        title: 'Weekly Spelling Practice Game | My Spelling Game',
        description: 'Paste this week’s spelling words, hear each hidden word, type the answer, and retry missed words in a no-login weekly practice test.',
        ogDescription: 'Paste this week’s words and replay only the words that were missed.',
        h1: 'Weekly Spelling Practice Game',
        intro: 'Paste this week’s list and start the recommended audio spelling test. Each word stays hidden until the answer is submitted.',
        cta: 'Practice This Week’s Words',
        panels: [
          ['Why Weekly Practice Needs A Simple Tool', 'Spelling lists change every week, so fixed word games quickly become irrelevant. A useful spelling practice tool should let you bring the current list and start immediately.'],
          ['Repeat Loop', ['Monday: paste the new list and share the practice link.', 'Midweek: replay missed words for focused repetition.', 'Before the quiz: run one more round with the same words.']],
        ],
        schemaDescription: 'Make weekly spelling practice less repetitive with a custom word-list game.',
      },
    },
  },
  es: {
    htmlLang: 'es',
    dir: '/es',
    nav: { language: 'Idioma', home: 'Inicio' },
    footer: { privacy: 'Privacidad', about: 'Acerca de', contact: 'Contacto' },
    related: {
      custom: 'Juego con palabras propias',
      list: 'Juego con lista de spelling',
      weekly: 'Práctica semanal',
      sight: 'Sight words',
      homeschool: 'Homeschool',
      vocabulary: 'Vocabulario',
    },
    pages: {
      'spelling-list-game': {
        title: 'Juego con lista de spelling | My Spelling Game',
        description: 'Convierte una lista de spelling en un juego. Pega las palabras de la semana, practica, repite las falladas y comparte un enlace sin cuenta.',
        ogDescription: 'Pega una lista de palabras y úsala en un juego de spelling con palabras que caen.',
        h1: 'Juego con lista de spelling',
        intro: '¿Ya tienes una lista de palabras de la escuela? Pégala en My Spelling Game y crea una práctica rápida con esas mismas palabras.',
        cta: 'Practicar mi lista',
        panels: [
          ['Hecho para la lista real', 'Un juego de spelling sirve de verdad cuando usa la lista exacta del alumno. Aquí no aparece un banco genérico: solo las palabras de la tarea, la clase o la próxima prueba.'],
          ['Cuándo usarlo', ['Familias que convierten una hoja del profesor en práctica en casa.', 'Profesores que comparten una misma lista sin cuentas de estudiante.', 'Tutores que repiten solo las palabras falladas después de una ronda corta.']],
        ],
        schemaDescription: 'Convierte una lista de spelling en un juego de palabras que caen.',
      },
      'weekly-spelling-practice': {
        title: 'Práctica semanal de spelling | My Spelling Game',
        description: 'Pega las palabras de esta semana, escucha cada palabra oculta, escribe la respuesta y repite los fallos sin crear una cuenta.',
        ogDescription: 'Pega las palabras de esta semana y repite solo las que fallaron.',
        h1: 'Práctica semanal de spelling',
        intro: 'Pega la lista de esta semana y empieza la prueba de audio recomendada. La palabra no aparece hasta que envías la respuesta.',
        cta: 'Practicar esta semana',
        panels: [
          ['Por qué una práctica semanal necesita algo simple', 'Las listas cambian cada semana. Por eso un juego con palabras fijas deja de servir rápido. Lo importante es empezar con la lista actual sin preparar una lección entera.'],
          ['Rutina de uso', ['Lunes: pega la nueva lista y comparte el enlace.', 'Mitad de semana: repite las palabras falladas.', 'Antes de la prueba: haz una última ronda con la misma lista.']],
        ],
        schemaDescription: 'Practica la lista semanal de spelling con un juego de palabras propias.',
      },
    },
  },
  'pt-BR': {
    htmlLang: 'pt-BR',
    dir: '/pt-br',
    nav: { language: 'Idioma', home: 'Início' },
    footer: { privacy: 'Privacidade', about: 'Sobre', contact: 'Contato' },
    related: {
      custom: 'Jogo com palavras próprias',
      list: 'Jogo com lista de palavras',
      weekly: 'Prática semanal',
      sight: 'Sight words',
      homeschool: 'Homeschool',
      vocabulary: 'Vocabulário',
    },
    pages: {
      'spelling-list-game': {
        title: 'Jogo com lista de palavras em inglês | My Spelling Game',
        description: 'Transforme uma lista de palavras em inglês em jogo. Cole a lista da semana, pratique, revise erros e compartilhe um link sem conta.',
        ogDescription: 'Cole uma lista de palavras e jogue um jogo de soletrar em inglês.',
        h1: 'Jogo com lista de palavras em inglês',
        intro: 'Se você já tem uma lista da escola ou do material de inglês, cole no My Spelling Game e pratique só essas palavras.',
        cta: 'Praticar minha lista',
        panels: [
          ['Feito para a lista real', 'Um jogo de soletrar funciona melhor quando usa exatamente as palavras que o aluno precisa aprender. A prática fica focada na tarefa, na aula ou na próxima prova.'],
          ['Quando usar', ['Pais transformando uma lista da escola em prática rápida.', 'Professores compartilhando a mesma lista sem criar contas.', 'Tutores revisando as palavras erradas depois de uma rodada curta.']],
        ],
        schemaDescription: 'Transforme uma lista de palavras em inglês em um jogo de soletrar.',
      },
      'weekly-spelling-practice': {
        title: 'Prática semanal de spelling em inglês | My Spelling Game',
        description: 'Cole as palavras da semana, ouça cada palavra escondida, digite a resposta e revise os erros sem criar conta.',
        ogDescription: 'Cole as palavras da semana e revise só o que ficou errado.',
        h1: 'Prática semanal de spelling em inglês',
        intro: 'Cole a lista desta semana e comece o teste por áudio recomendado. A palavra só aparece depois que a resposta é enviada.',
        cta: 'Praticar a lista da semana',
        panels: [
          ['Por que a prática semanal precisa ser simples', 'A lista muda toda semana. Um jogo com palavras fixas perde valor rápido. O melhor fluxo é colar a lista atual e começar em poucos segundos.'],
          ['Rotina de uso', ['Segunda: cole a nova lista e compartilhe o link.', 'Meio da semana: revise só as palavras erradas.', 'Antes da prova: faça mais uma rodada com a mesma lista.']],
        ],
        schemaDescription: 'Pratique a lista semanal de inglês com um jogo de palavras próprias.',
      },
    },
  },
  fr: {
    htmlLang: 'fr',
    dir: '/fr',
    nav: { language: 'Langue', home: 'Accueil' },
    footer: { privacy: 'Confidentialité', about: 'À propos', contact: 'Contact' },
    related: {
      custom: 'Jeu avec vos mots',
      list: 'Jeu avec liste de mots',
      weekly: 'Pratique hebdomadaire',
      sight: 'Sight words',
      homeschool: 'École à la maison',
      vocabulary: 'Vocabulaire',
    },
    pages: {
      'spelling-list-game': {
        title: 'Jeu avec liste de mots anglais | My Spelling Game',
        description: 'Transformez une liste de mots anglais en jeu. Collez la liste, jouez une partie courte, révisez les mots manqués et partagez un lien.',
        ogDescription: 'Collez une liste de mots et jouez à un jeu d’orthographe anglaise.',
        h1: 'Jeu avec liste de mots anglais',
        intro: 'Vous avez déjà une liste donnée par l’école ou le cours ? Collez-la dans My Spelling Game et pratiquez uniquement ces mots.',
        cta: 'Pratiquer ma liste',
        panels: [
          ['Pensé pour la vraie liste', 'Un jeu d’orthographe est utile quand il reprend les mots exacts de l’élève. La pratique reste centrée sur le devoir, le cours ou le prochain contrôle.'],
          ['Cas d’usage', ['Parents qui transforment une fiche de mots en pratique rapide.', 'Enseignants qui partagent la même liste sans comptes élèves.', 'Tuteurs qui reprennent les mots manqués après une courte partie.']],
        ],
        schemaDescription: 'Transformez une liste de mots anglais en jeu d’orthographe.',
      },
      'weekly-spelling-practice': {
        title: 'Pratique hebdomadaire d’orthographe anglaise | My Spelling Game',
        description: 'Collez les mots anglais de la semaine, écoutez chaque mot caché, tapez la réponse et reprenez vos erreurs sans compte.',
        ogDescription: 'Collez les mots de la semaine et révisez seulement les mots manqués.',
        h1: 'Pratique hebdomadaire d’orthographe anglaise',
        intro: 'Collez la liste de la semaine et lancez le test audio recommandé. Le mot reste caché jusqu’à l’envoi de la réponse.',
        cta: 'Pratiquer la liste de la semaine',
        panels: [
          ['Pourquoi rester simple', 'Les listes changent chaque semaine. Un jeu avec des mots fixes devient vite moins utile. Ici, on commence avec la liste actuelle sans préparer toute une leçon.'],
          ['Rythme de pratique', ['Lundi : coller la nouvelle liste et partager le lien.', 'Milieu de semaine : refaire les mots manqués.', 'Avant le contrôle : lancer une dernière partie avec la même liste.']],
        ],
        schemaDescription: 'Pratiquez l’orthographe anglaise hebdomadaire avec vos propres mots.',
      },
    },
  },
  id: {
    htmlLang: 'id',
    dir: '/id',
    nav: { language: 'Bahasa', home: 'Beranda' },
    footer: { privacy: 'Privasi', about: 'Tentang', contact: 'Kontak' },
    related: {
      custom: 'Game kata sendiri',
      list: 'Game daftar kata',
      weekly: 'Latihan mingguan',
      sight: 'Sight words',
      homeschool: 'Belajar di rumah',
      vocabulary: 'Kosakata',
    },
    pages: {
      'spelling-list-game': {
        title: 'Game daftar kata bahasa Inggris | My Spelling Game',
        description: 'Ubah daftar kata bahasa Inggris menjadi game. Tempel kata mingguan, mainkan ronde singkat, ulangi kata yang salah, dan bagikan link tanpa akun.',
        ogDescription: 'Tempel daftar kata dan mainkan game spelling bahasa Inggris.',
        h1: 'Game daftar kata bahasa Inggris',
        intro: 'Kalau kamu sudah punya daftar kata dari sekolah atau les, tempel di My Spelling Game dan latihan hanya dengan kata-kata itu.',
        cta: 'Latih daftar kata saya',
        panels: [
          ['Untuk daftar yang benar-benar dipakai', 'Game spelling paling berguna ketika memakai kata yang memang harus dipelajari siswa. Latihan tetap sesuai PR, kelas, atau kuis berikutnya.'],
          ['Cocok untuk', ['Orang tua yang mengubah daftar dari guru menjadi latihan cepat.', 'Guru yang membagikan daftar yang sama tanpa akun siswa.', 'Tutor yang mengulang kata salah setelah satu ronde pendek.']],
        ],
        schemaDescription: 'Ubah daftar kata bahasa Inggris menjadi game spelling.',
      },
      'weekly-spelling-practice': {
        title: 'Latihan spelling bahasa Inggris mingguan | My Spelling Game',
        description: 'Tempel kata bahasa Inggris minggu ini, dengarkan kata tersembunyi, ketik jawaban, lalu ulangi yang salah tanpa akun.',
        ogDescription: 'Tempel kata minggu ini dan ulangi hanya kata yang salah.',
        h1: 'Latihan spelling bahasa Inggris mingguan',
        intro: 'Tempel daftar minggu ini dan mulai tes audio yang direkomendasikan. Kata tetap tersembunyi sampai jawaban dikirim.',
        cta: 'Latih kata minggu ini',
        panels: [
          ['Kenapa harus sederhana', 'Daftar kata berubah setiap minggu. Game dengan bank kata tetap cepat terasa tidak cocok. Di sini kamu cukup memakai daftar terbaru dan langsung mulai.'],
          ['Alur latihan', ['Senin: tempel daftar baru dan bagikan link.', 'Tengah minggu: ulangi kata yang salah.', 'Sebelum kuis: mainkan satu ronde lagi dengan daftar yang sama.']],
        ],
        schemaDescription: 'Latihan spelling mingguan dengan daftar kata sendiri.',
      },
    },
  },
  zh: {
    htmlLang: 'zh-CN',
    dir: '/zh',
    nav: { language: '语言', home: '首页' },
    footer: { privacy: '隐私', about: '关于', contact: '联系' },
    related: {
      custom: '自定义单词游戏',
      list: '单词表拼写游戏',
      weekly: '每周拼写练习',
      sight: 'Sight words',
      homeschool: '家庭学习',
      vocabulary: '词汇练习',
    },
    pages: {
      'spelling-list-game': {
        title: '英语单词表拼写游戏 | My Spelling Game',
        description: '把英语单词表变成拼写小游戏。粘贴本周单词，开始掉落单词练习，自动重练漏掉的词，并分享无需登录的练习链接。',
        ogDescription: '粘贴英语单词表，马上变成可玩的拼写练习。',
        h1: '英语单词表拼写游戏',
        intro: '如果你已经有老师、教材或家长准备好的英语单词表，可以直接粘贴进 My Spelling Game，只练这份真实单词。',
        cta: '练习我的单词表',
        panels: [
          ['为真实单词表准备', '单词游戏真正有用的前提，是它练的就是孩子这周要掌握的那份单词，而不是随机词库。这个页面适合家庭作业、课后辅导和测验前复习。'],
          ['适合这些场景', ['家长把老师发的单词表变成家庭练习。', '老师不用创建学生账号，也能分享同一份练习。', '辅导时先练一轮，再只重练漏掉的单词。']],
        ],
        schemaDescription: '把英语单词表变成掉落单词拼写游戏。',
      },
      'weekly-spelling-practice': {
        title: '每周英语拼写练习 | My Spelling Game',
        description: '粘贴本周英语单词，听隐藏单词后输入答案，立即查看批改结果，并单独重练错词，无需账号。',
        ogDescription: '粘贴本周英语单词，只重练漏掉的词。',
        h1: '每周英语拼写练习',
        intro: '粘贴本周单词表，直接开始推荐的听写测试；提交答案前，页面不会显示单词拼写。',
        cta: '练习本周单词',
        panels: [
          ['为什么每周练习要足够简单', '英语单词表每周都会换。固定词库的游戏很快就不匹配了。更直接的方式是把这周真实要背的单词贴进来，马上开始。'],
          ['一周里的使用方式', ['周一：粘贴新单词表，复制练习链接。', '周中：只重练漏掉的单词。', '测验前：用同一份单词表再跑一轮。']],
        ],
        schemaDescription: '用自己的英语单词表做每周拼写练习。',
      },
    },
  },
};

const pageSlugs = ['spelling-list-game', 'weekly-spelling-practice'];

const launcherCopy = {
  en: { label: "This week's spelling words", placeholder: 'because\nfriend\nbeautiful', invalid: 'Enter at least one spelling word.' },
  es: { label: 'Palabras de spelling de esta semana', placeholder: 'because\nfriend\nbeautiful', invalid: 'Escribe al menos una palabra.' },
  'pt-BR': { label: 'Palavras de spelling desta semana', placeholder: 'because\nfriend\nbeautiful', invalid: 'Digite pelo menos uma palavra.' },
  fr: { label: 'Mots anglais de cette semaine', placeholder: 'because\nfriend\nbeautiful', invalid: 'Saisissez au moins un mot.' },
  id: { label: 'Kata spelling minggu ini', placeholder: 'because\nfriend\nbeautiful', invalid: 'Masukkan setidaknya satu kata.' },
  zh: { label: '本周英语单词', placeholder: 'because\nfriend\nbeautiful', invalid: '请至少输入一个英语单词。' },
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

function languageMenu(currentCode, slug, loc) {
  const links = alternates.map((alt) => {
    const current = alt.code === currentCode ? ' aria-current="page"' : '';
    const href = `${alt.dir}/${slug}`.replace('//', '/');
    return `                <a class="lang-option" href="${href}" hreflang="${alt.hreflang}"${current}>${alt.label}</a>`;
  }).join('\n');

  return `    <div class="top-right-nav">
        <details class="language-switcher">
            <summary class="lang-btn" aria-label="${escapeAttr(loc.nav.language)}">${loc.nav.language}</summary>
            <div class="lang-menu">
${links}
            </div>
        </details>
        <button class="lang-btn" onclick="window.location.href='${loc.dir || '/'}'" id="back-home" title="${escapeAttr(loc.nav.home)}">${loc.nav.home}</button>
    </div>`;
}

function googleTag() {
  return `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', {
        page_location: window.location.origin + window.location.pathname,
        page_path: window.location.pathname
      });
    </script>
    <script type="module" src="/src/js/analytics.mjs"></script>`;
}

function panelBody(body) {
  if (Array.isArray(body)) {
    return `<ul>
${body.map((item) => `                <li>${item}</li>`).join('\n')}
            </ul>`;
  }
  return `<p>${body}</p>`;
}

function relatedLinks(loc, slug) {
  const otherSlug = slug === 'spelling-list-game' ? 'weekly-spelling-practice' : 'spelling-list-game';
  const prefix = loc.dir || '';
  const links = [
    { href: `${loc.dir || ''}/`.replace('//', '/'), label: loc.nav.home },
    { href: pagePath(loc, otherSlug), label: loc.pages[otherSlug].h1 },
    { href: `${prefix}/custom-spelling-words-game`, label: loc.related.custom },
    { href: `${prefix}/sight-word-typing-game`, label: loc.related.sight },
    { href: `${prefix}/homeschool-spelling-practice`, label: loc.related.homeschool },
    { href: `${prefix}/vocabulary-typing-game`, label: loc.related.vocabulary },
  ];
  return links.map((link) => `                <a href="${link.href}">${link.label}</a>`).join('\n');
}

function footer(loc) {
  return `    <footer style="text-align:center; padding:20px;">
        <a href="${loc.dir || '/'}" style="color:#00f5ff">${loc.nav.home}</a> &middot; <a href="${pagePath(loc, 'privacy')}" style="color:#00f5ff">${loc.footer.privacy}</a> &middot; <a href="${pagePath(loc, 'about')}" style="color:#00f5ff">${loc.footer.about}</a>
    </footer>`;
}

function jsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

function render(code, loc, slug) {
  const page = loc.pages[slug];
  const launcher = launcherCopy[code];
  const canonical = `${baseUrl}${pagePath(loc, slug)}`;
  const relatedTitle = slug === 'spelling-list-game' ? loc.related.weekly : loc.related.list;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.h1,
    description: page.schemaDescription,
    url: canonical,
    inLanguage: loc.htmlLang,
    isPartOf: {
      '@type': 'WebSite',
      name: 'My Spelling Game',
      url: `${baseUrl}/`,
    },
  };

  return `<!DOCTYPE html>
<html lang="${loc.htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title}</title>
    <meta name="description" content="${escapeAttr(page.description)}">
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
    <meta property="og:title" content="${escapeAttr(page.title)}">
    <meta property="og:description" content="${escapeAttr(page.ogDescription)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="My Spelling Game preview">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(page.title)}">
    <meta name="twitter:description" content="${escapeAttr(page.ogDescription)}">
    <meta name="twitter:image" content="${ogImage}">
    <script src="/src/js/localeRedirect.js"></script>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9244949928133071"
      crossorigin="anonymous"></script>
${googleTag()}
    <link rel="stylesheet" href="/src/css/main.css">
</head>
<body>
${languageMenu(code, slug, loc)}
    <main class="seo-landing content-page">
        <section class="seo-hero">
            <h1>${page.h1}</h1>
            <p>${page.intro}</p>
${slug === 'weekly-spelling-practice' ? `            <form class="landing-launcher" action="${`${loc.dir || ''}/`.replace('//', '/')}" data-mode="dictation" data-invalid="${escapeAttr(launcher.invalid)}">
                <label for="weekly-words-${code}">${launcher.label}</label>
                <textarea id="weekly-words-${code}" name="words" required spellcheck="false" placeholder="${escapeAttr(launcher.placeholder)}"></textarea>
                <button type="submit">${page.cta}</button>
            </form>` : `            <a class="seo-cta" href="${loc.dir || '/'}">${page.cta}</a>`}
        </section>

${page.panels.map(([title, body]) => `        <section class="seo-panel">
            <h2>${title}</h2>
            ${panelBody(body)}
        </section>`).join('\n\n')}

        <section class="seo-panel">
            <h2>${relatedTitle}</h2>
            <div class="seo-link-grid">
${relatedLinks(loc, slug)}
            </div>
        </section>
    </main>
${footer(loc)}
    <script type="application/ld+json">
${jsonLd(schema)}
    </script>
    <script type="module" src="/src/js/landingLauncher.mjs"></script>
</body>
</html>
`;
}

for (const alt of alternates.filter((item) => item.code !== 'en')) {
  const loc = locale[alt.code];
  for (const slug of pageSlugs) {
    const target = path.join(root, `${loc.dir}/${slug}.html`.replace('//', '/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, render(alt.code, loc, slug), 'utf8');
  }
}

console.log(`Generated ${pageSlugs.length * (alternates.length - 1)} localized SEO pages`);
