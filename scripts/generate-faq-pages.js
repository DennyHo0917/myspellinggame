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
    teacher: "Workspace",
    title: "FAQ | My Spelling Game",
    heading: "Frequently asked questions",
    intro:
      "Answers about word lists, practice modes, sharing, accounts, assignments, and reports.",
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
        "No. Student practice works in the browser without a login. A workspace account is only needed for assignments and reports.",
      ],
      [
        "Can I share a list with students?",
        "Yes. Copy a practice link and students can open the same list without creating an account.",
      ],
      [
        "Are paid subscriptions recurring?",
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
    teacher: "Espacio de trabajo",
    title: "Preguntas frecuentes | My Spelling Game",
    heading: "Preguntas frecuentes",
    intro:
      "Respuestas sobre listas, modos de práctica, enlaces, cuentas, tareas e informes.",
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
        "No. La práctica funciona en el navegador sin iniciar sesión. Las cuentas para docentes y familias sirven para tareas e informes.",
      ],
      [
        "¿Puedo compartir una lista?",
        "Sí. Copia el enlace de práctica y los alumnos abrirán la misma lista sin crear una cuenta.",
      ],
      [
        "¿Las suscripciones se renuevan?",
        "Sí. Un plan de pago se renueva automáticamente hasta que se cancela desde el portal de facturación.",
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
    teacher: "Espaço de trabalho",
    title: "Perguntas frequentes | My Spelling Game",
    heading: "Perguntas frequentes",
    intro:
      "Respostas sobre listas, modos de prática, links, contas, tarefas e relatórios.",
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
        "Não. A prática funciona no navegador sem login. Contas para professores e responsáveis servem para tarefas e relatórios.",
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
    teacher: "Espace de travail",
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
        "Non. La pratique fonctionne sans connexion. Les comptes pour enseignants et parents servent aux devoirs et aux rapports.",
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
    teacher: "Ruang kerja",
    title: "Pertanyaan umum | My Spelling Game",
    heading: "Pertanyaan umum",
    intro:
      "Jawaban tentang daftar kata, mode latihan, link, akun, tugas, dan laporan.",
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
        "Tidak. Latihan berjalan di browser tanpa login. Akun untuk guru dan orang tua hanya diperlukan untuk tugas dan laporan.",
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
    teacher: "工作台",
    title: "常见问题 | My Spelling Game",
    heading: "常见问题",
    intro: "集中说明单词表、练习模式、分享链接、账号、作业和学习报告。",
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
        "不需要。学生直接在浏览器中练习即可，教师或家长只需在布置作业和查看报告时使用工作台账号。",
      ],
      [
        "可以把单词表分享给学生吗？",
        "可以。复制练习链接，学生无需创建账号就能打开同一份单词表。",
      ],
      ["订阅会自动续费吗？", "会。付费方案会自动续费，直到在账单门户中取消。"],
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

const faqUpdates = {
  en: {
    intro:
      "Answers about custom spelling lists, practice modes, student accounts, assignments, progress tracking, mastery, review, and plans.",
    account:
      "No. Students open an assignment or practice link and enter a nickname when needed. Student email accounts and passwords are not required.",
    additions: [
      [
        "Can teachers track student spelling progress over time?",
        "Yes. A teacher or parent workspace can link completed assignments to student profiles and show spelling progress across multiple assignments. Free Plan keeps 14 days of history, while Parent and Teacher Plans keep 365 days.",
      ],
      [
        "Can I save and reuse weekly spelling lists?",
        "Yes. Signed-in teachers and parents can save spelling lists and reuse them for future assignments. Free Plan includes one saved list, while Parent and Teacher Plans include unlimited saved lists.",
      ],
      [
        "What is Today's Review?",
        "Today's Review is included in Parent and Teacher Plans. It uses completed spelling history to surface previously missed words when they are due for more practice.",
      ],
      [
        "How does My Spelling Game decide when a word is mastered?",
        "A word requires at least three consecutive correct completed attempts across at least two UTC practice dates to be marked mastered.",
      ],
      [
        "Can I use example sentences with spelling words?",
        "Yes. Example sentences are optional. In dictation practice, My Spelling Game can read the word, the example sentence, and the word again.",
      ],
      [
        "Can My Spelling Game automatically provide example sentences?",
        "Parent and Teacher Plans include a curated sentence library that can fill example sentences for known words. Teachers and parents can still edit the sentence before publishing an assignment.",
      ],
      [
        "Does My Spelling Game charge per student?",
        "No. Parent Plan supports up to 5 child profiles and Teacher Plan supports up to 40 student profiles, without a per-profile fee.",
      ],
      [
        "Can parents use My Spelling Game?",
        "Yes. Parents can use free practice without an account or sign in to a workspace to save weekly lists, create assignments, and track a child's progress over time.",
      ],
    ],
  },
  es: {
    intro:
      "Respuestas sobre listas personalizadas, modos de práctica, cuentas de estudiantes, tareas, progreso, dominio, repaso y planes.",
    account:
      "No. Los estudiantes abren un enlace de práctica o una tarea y escriben un apodo cuando hace falta. No necesitan email ni contraseña.",
    additions: [
      [
        "¿Pueden docentes y familias seguir el progreso de spelling con el tiempo?",
        "Sí. Un espacio de trabajo puede vincular tareas terminadas con perfiles de estudiantes y mostrar el progreso entre varias tareas. El Plan Gratis guarda 14 días de historial y los planes para familias y docentes, 365 días.",
      ],
      [
        "¿Puedo guardar y reutilizar listas semanales?",
        "Sí. Docentes y familias conectados pueden guardar listas y reutilizarlas en futuras tareas. El Plan Gratis incluye una lista y los planes para familias y docentes permiten listas ilimitadas.",
      ],
      [
        "¿Qué es Today's Review?",
        "Today's Review está incluido en los planes para familias y docentes. Usa el historial de spelling para mostrar palabras falladas cuando toca practicarlas de nuevo.",
      ],
      [
        "¿Cómo decide My Spelling Game que una palabra está dominada?",
        "Una palabra necesita al menos tres intentos completados correctos consecutivos en al menos dos fechas de práctica UTC distintas para marcarse como dominada.",
      ],
      [
        "¿Puedo usar frases de ejemplo con las palabras?",
        "Sí. Son opcionales. En el dictado, My Spelling Game puede leer la palabra, la frase de ejemplo y la palabra otra vez.",
      ],
      [
        "¿My Spelling Game puede proporcionar frases automáticamente?",
        "Los planes para familias y docentes incluyen una biblioteca seleccionada de frases para completar palabras conocidas. La frase se puede editar antes de publicar.",
      ],
      [
        "¿My Spelling Game cobra por estudiante?",
        "No. El Plan para familias admite hasta 5 perfiles infantiles y el Plan para docentes hasta 40 estudiantes, sin cobrar por perfil.",
      ],
      [
        "¿Pueden usarlo las familias?",
        "Sí. Las familias pueden practicar gratis sin cuenta o usar un espacio de trabajo para guardar listas, crear tareas y seguir el progreso del niño.",
      ],
    ],
  },
  "pt-br": {
    intro:
      "Respostas sobre listas personalizadas, modos de prática, contas de alunos, tarefas, progresso, domínio, revisão e planos.",
    account:
      "Não. Os alunos abrem um link de prática ou tarefa e usam um apelido quando necessário. Email e senha de aluno não são necessários.",
    additions: [
      [
        "Professores e responsáveis podem acompanhar o progresso de ortografia?",
        "Sim. Um espaço de trabalho pode ligar tarefas concluídas aos perfis dos alunos e mostrar o progresso em várias tarefas. O Plano Grátis guarda 14 dias de histórico, e os planos para Pais e Professores, 365 dias.",
      ],
      [
        "Posso salvar e reutilizar listas semanais?",
        "Sim. Professores e responsáveis conectados podem salvar listas e reutilizá-las em futuras tarefas. O Plano Grátis inclui uma lista, e os planos para Pais e Professores permitem listas ilimitadas.",
      ],
      [
        "O que é o Today's Review?",
        "Today's Review está incluído nos planos para Pais e Professores. Ele usa o histórico de ortografia para mostrar palavras erradas quando chega a hora de praticá-las novamente.",
      ],
      [
        "Como o My Spelling Game decide que uma palavra foi dominada?",
        "A palavra precisa de pelo menos três tentativas concluídas e corretas em sequência, em pelo menos duas datas UTC diferentes, para ser marcada como dominada.",
      ],
      [
        "Posso usar frases de exemplo com as palavras?",
        "Sim. As frases são opcionais. No ditado, o My Spelling Game pode ler a palavra, a frase de exemplo e a palavra novamente.",
      ],
      [
        "O My Spelling Game pode fornecer frases automaticamente?",
        "Os planos para Pais e Professores incluem uma biblioteca selecionada de frases para preencher palavras conhecidas. A frase ainda pode ser editada antes de publicar.",
      ],
      [
        "O My Spelling Game cobra por aluno?",
        "Não. O Plano para Pais aceita até 5 perfis de crianças, e o Plano para Professores até 40 alunos, sem cobrança por perfil.",
      ],
      [
        "Responsáveis podem usar o My Spelling Game?",
        "Sim. Responsáveis podem praticar grátis sem conta ou entrar no espaço de trabalho para salvar listas, criar tarefas e acompanhar o progresso da criança.",
      ],
    ],
  },
  fr: {
    intro:
      "Réponses sur les listes personnalisées, les modes de pratique, les comptes élèves, les devoirs, les progrès, la maîtrise, la révision et les offres.",
    account:
      "Non. Les élèves ouvrent un lien de pratique ou un devoir et utilisent un pseudonyme si nécessaire. Aucun email ni mot de passe élève n’est requis.",
    additions: [
      [
        "Les enseignants et les parents peuvent-ils suivre les progrès en orthographe ?",
        "Oui. Un espace de travail peut relier les devoirs terminés aux profils d’élèves et montrer les progrès sur plusieurs devoirs. L’offre gratuite conserve 14 jours d’historique, et les offres Parents et Enseignants, 365 jours.",
      ],
      [
        "Puis-je enregistrer et réutiliser les listes de la semaine ?",
        "Oui. Les enseignants et parents connectés peuvent enregistrer des listes et les réutiliser pour de futurs devoirs. L’offre gratuite inclut une liste, tandis que les offres Parents et Enseignants autorisent les listes illimitées.",
      ],
      [
        "Qu’est-ce que Today's Review ?",
        "Today's Review est inclus dans les offres Parents et Enseignants. Il utilise l’historique d’orthographe pour proposer les mots manqués lorsqu’ils doivent être revus.",
      ],
      [
        "Comment My Spelling Game décide-t-il qu’un mot est maîtrisé ?",
        "Un mot doit compter au moins trois tentatives terminées correctes consécutives sur au moins deux dates UTC différentes pour être marqué comme maîtrisé.",
      ],
      [
        "Puis-je utiliser des phrases d’exemple avec les mots ?",
        "Oui. Elles sont facultatives. En dictée, My Spelling Game peut lire le mot, la phrase d’exemple, puis le mot à nouveau.",
      ],
      [
        "My Spelling Game peut-il fournir automatiquement des phrases ?",
        "Les offres Parents et Enseignants incluent une bibliothèque sélectionnée de phrases pour compléter les mots connus. La phrase peut être modifiée avant publication.",
      ],
      [
        "My Spelling Game facture-t-il par élève ?",
        "Non. L’offre Parents prend en charge jusqu’à 5 profils d’enfants et l’offre Enseignants jusqu’à 40 élèves, sans frais par profil.",
      ],
      [
        "Les parents peuvent-ils utiliser My Spelling Game ?",
        "Oui. Ils peuvent pratiquer gratuitement sans compte ou utiliser un espace de travail pour enregistrer des listes, créer des devoirs et suivre les progrès de l’enfant.",
      ],
    ],
  },
  id: {
    intro:
      "Jawaban tentang daftar kata sendiri, mode latihan, akun siswa, tugas, kemajuan, penguasaan, ulasan, dan paket.",
    account:
      "Tidak. Siswa membuka link latihan atau tugas dan memakai nama panggilan bila diperlukan. Email dan kata sandi siswa tidak diperlukan.",
    additions: [
      [
        "Bisakah guru dan orang tua memantau kemajuan ejaan dari waktu ke waktu?",
        "Bisa. Ruang kerja dapat menghubungkan tugas yang selesai ke profil siswa dan menampilkan kemajuan di beberapa tugas. Paket Gratis menyimpan riwayat 14 hari, sedangkan Paket Orang Tua dan Guru 365 hari.",
      ],
      [
        "Bisa menyimpan dan memakai ulang daftar mingguan?",
        "Bisa. Guru dan orang tua yang sudah masuk dapat menyimpan daftar dan memakainya lagi untuk tugas berikutnya. Paket Gratis mencakup satu daftar, sedangkan Paket Orang Tua dan Guru tidak terbatas.",
      ],
      [
        "Apa itu Today's Review?",
        "Today's Review tersedia pada Paket Orang Tua dan Guru dan memakai riwayat ejaan untuk menampilkan kata yang salah saat waktunya berlatih lagi.",
      ],
      [
        "Bagaimana My Spelling Game menentukan kata sudah dikuasai?",
        "Sebuah kata harus memiliki setidaknya tiga percobaan selesai yang benar secara berurutan pada setidaknya dua tanggal latihan UTC berbeda untuk dianggap dikuasai.",
      ],
      [
        "Bisa memakai kalimat contoh dengan kata ejaan?",
        "Bisa. Kalimat contoh bersifat opsional. Dalam dikte, My Spelling Game dapat membacakan kata, kalimat contoh, lalu kata lagi.",
      ],
      [
        "Apakah My Spelling Game bisa menyediakan kalimat contoh otomatis?",
        "Paket Orang Tua dan Guru memiliki pustaka kalimat pilihan untuk mengisi kata yang dikenal. Guru dan orang tua tetap bisa mengedit kalimat sebelum menerbitkan tugas.",
      ],
      [
        "Apakah My Spelling Game mengenakan biaya per siswa?",
        "Tidak. Paket Orang Tua mendukung hingga 5 profil anak dan Paket Guru hingga 40 siswa, tanpa biaya per profil.",
      ],
      [
        "Bisakah orang tua memakai My Spelling Game?",
        "Bisa. Orang tua dapat berlatih gratis tanpa akun atau masuk ke ruang kerja untuk menyimpan daftar, membuat tugas, dan memantau kemajuan anak.",
      ],
    ],
  },
  zh: {
    intro:
      "集中说明自定义单词表、练习模式、学生账号、作业、进度、掌握度、复习和方案。",
    account:
      "不需要。学生打开练习链接或作业，需要时输入昵称即可，不需要学生邮箱或密码。",
    additions: [
      [
        "老师和家长可以持续追踪学生的拼写进度吗？",
        "可以。工作台可以把已完成作业关联到学生档案，展示多次作业中的拼写进度。免费方案保留 14 天历史，家长方案和教师方案保留 365 天。",
      ],
      [
        "可以保存并重复使用每周词表吗？",
        "可以。登录后的老师和家长可以保存词表，用于之后创建作业。免费方案可保存 1 个词表，家长方案和教师方案支持无限保存。",
      ],
      [
        "什么是 Today's Review？",
        "Today's Review 包含在家长方案和教师方案中，会根据学生完成过的拼写历史，在错词需要再次练习时把它们找出来。",
      ],
      [
        "My Spelling Game 如何判断单词已经掌握？",
        "单词必须在至少两个不同的 UTC 练习日期中，连续完成至少三次正确作答，才会被标记为已掌握。",
      ],
      [
        "可以给拼写单词添加例句吗？",
        "可以。例句是可选的。听写练习时，My Spelling Game 可以依次读出单词、例句和单词。",
      ],
      [
        "My Spelling Game 能自动提供例句吗？",
        "家长方案和教师方案包含精选例句库，可以为已知单词补充例句。老师和家长发布作业前仍可编辑例句。",
      ],
      [
        "My Spelling Game 按学生收费吗？",
        "不收费。家长方案支持最多 5 个孩子档案，教师方案支持最多 40 个学生档案，不按档案单独收费。",
      ],
      [
        "家长可以使用 My Spelling Game 吗？",
        "可以。家长无需账号即可免费练习，也可以登录工作台保存每周词表、创建作业并持续追踪孩子的进度。",
      ],
    ],
  },
};

for (const [code, update] of Object.entries(faqUpdates)) {
  const item = locales[code];
  item.intro = update.intro;
  const account = item.questions.findIndex(([question]) =>
    /account|cuenta|conta|compte|akun|账号/.test(question),
  );
  if (account >= 0) item.questions[account][1] = update.account;
  item.questions.push(...update.additions);
}

const planQuestions = {
  en: [
    [
      "How many spelling words can I practice?",
      "Without an account, you can practice up to 20 words per list. Free Plan supports up to 30 words, while Parent and Teacher Plans support up to 40.",
    ],
  ],
  es: [
    [
      "¿Cuántas palabras puedo practicar?",
      "Sin cuenta puedes practicar hasta 20 palabras por lista. El Plan Gratis admite hasta 30 y los planes para familias y docentes hasta 40.",
    ],
  ],
  "pt-br": [
    [
      "Quantas palavras posso praticar?",
      "Sem conta, você pode praticar até 20 palavras por lista. O Plano Grátis aceita até 30, e os planos para Pais e Professores até 40.",
    ],
  ],
  fr: [
    [
      "Combien de mots puis-je pratiquer ?",
      "Sans compte, vous pouvez pratiquer jusqu’à 20 mots par liste. L’offre gratuite accepte jusqu’à 30 mots et les offres Parents et Enseignants jusqu’à 40.",
    ],
  ],
  id: [
    [
      "Berapa banyak kata yang bisa dilatih?",
      "Tanpa akun, Anda dapat berlatih hingga 20 kata per daftar. Paket Gratis mendukung hingga 30 kata, sedangkan Paket Orang Tua dan Guru hingga 40.",
    ],
  ],
  zh: [
    [
      "可以练习多少个单词？",
      "无需账号时，每份词表最多练习 20 个单词。免费方案支持最多 30 个，家长方案和教师方案支持最多 40 个。",
    ],
  ],
};
for (const [code, questions] of Object.entries(planQuestions)) {
  for (const [question, answer] of questions) {
    const existing = locales[code].questions.findIndex(
      ([current]) => current === question,
    );
    if (existing >= 0) locales[code].questions[existing][1] = answer;
    else locales[code].questions.push([question, answer]);
  }
}

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
  return `<!doctype html>\n<html lang="${item.html}">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${escape(item.title)}</title>\n    <meta name="description" content="${escape(item.intro)}">\n    <meta name="robots" content="index, follow">\n    <link rel="canonical" href="${baseUrl}${pagePath(item)}">\n${alternates}\n    <link rel="alternate" hreflang="x-default" href="${baseUrl}/faq">\n    <link rel="icon" href="/favicon.ico" sizes="any">\n    <link rel="stylesheet" href="/src/css/main.css">\n    <script src="/src/js/localeRedirect.js"></script>\n</head>\n<body>\n    <header class="top-right-nav">\n        <a class="brand-link" href="${home}" aria-label="My Spelling Game home"><img class="brand-logo" src="/images/icon-64.png" width="32" height="32" alt=""><span class="brand-name">My Spelling Game</span></a>\n        <details class="language-switcher"><summary class="lang-btn" aria-label="${escape(item.language)}">${escape(item.language)}</summary><div class="lang-menu">${languageLinks}</div></details>\n        <a class="teacher-nav-link" href="/teacher?lang=${code}">${escape(item.teacher)}</a>\n        <a class="lang-btn" href="${home}">${escape(item.home)}</a>\n    </header>\n    <main class="seo-landing content-page faq-page">\n        <section class="seo-hero"><h1>${escape(item.heading)}</h1><p>${escape(item.intro)}</p></section>\n        <section class="faq-list" aria-label="${escape(item.heading)}">\n${questions}\n        </section>\n    </main>\n    <footer><p><span class="footer-links"><a href="${home}">${escape(item.home)}</a> &middot; <a href="${home}custom-spelling-words-game">Custom Spelling Game</a> &middot; <a href="${pagePath(item)}">${escape(item.heading)}</a> &middot; <a href="${home}privacy">Privacy</a> &middot; <a href="${home}contact">Contact</a></span><br>&copy; 2026 My Spelling Game All rights reserved.</p></footer>\n    <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", name: item.title, url: `${baseUrl}${pagePath(item)}`, inLanguage: item.html, mainEntity: entities })}</script>\n</body>\n</html>\n`;
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
