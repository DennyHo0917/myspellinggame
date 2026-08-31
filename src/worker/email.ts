const SITE_URL = "https://myspellinggame.com/";
const LOGO_URL = `${SITE_URL}images/icon-64.png`;
const FROM = "MySpellingGame <hello@myspellinggame.com>";

const COPY = {
  en: {
    lang: "en",
    subject: "Welcome to MySpellingGame",
    greeting: "Hi,",
    welcome: "Welcome to MySpellingGame.",
    intro:
      "You can create a custom spelling list in seconds and turn it into an interactive practice activity for your child or students.",
    lead: "With MySpellingGame, you can:",
    features: [
      "Create your own spelling word lists",
      "Practice with games and listening activities",
      "Create and share spelling assignments",
      "Track learning progress over time",
    ],
    setup:
      "No complicated setup is required. Just add your words and start practicing.",
    start: "Start here",
    thanks: "Thanks for trying MySpellingGame.",
  },
  es: {
    lang: "es",
    subject: "Te damos la bienvenida a MySpellingGame",
    greeting: "Hola:",
    welcome: "Te damos la bienvenida a MySpellingGame.",
    intro:
      "En pocos segundos puedes crear una lista de palabras personalizada y convertirla en una actividad interactiva para tus hijos o estudiantes.",
    lead: "Con MySpellingGame puedes:",
    features: [
      "Crear tus propias listas de palabras",
      "Practicar con juegos y actividades de comprensión auditiva",
      "Crear y compartir tareas de ortografía",
      "Seguir el progreso a lo largo del tiempo",
    ],
    setup:
      "No hace falta configurar nada complicado. Añade tus palabras y empieza a practicar.",
    start: "Empieza aquí",
    thanks: "Gracias por probar MySpellingGame.",
  },
  "pt-BR": {
    lang: "pt-BR",
    subject: "Boas-vindas ao MySpellingGame",
    greeting: "Olá,",
    welcome: "Boas-vindas ao MySpellingGame.",
    intro:
      "Em poucos segundos, você pode criar uma lista personalizada de palavras e transformá-la em uma atividade interativa para seus filhos ou alunos.",
    lead: "Com o MySpellingGame, você pode:",
    features: [
      "Criar suas próprias listas de palavras",
      "Praticar com jogos e atividades de compreensão auditiva",
      "Criar e compartilhar tarefas de ortografia",
      "Acompanhar o progresso ao longo do tempo",
    ],
    setup:
      "Não é preciso fazer nenhuma configuração complicada. Basta adicionar as palavras e começar a praticar.",
    start: "Comece aqui",
    thanks: "Obrigado por experimentar o MySpellingGame.",
  },
  fr: {
    lang: "fr",
    subject: "Bienvenue sur MySpellingGame",
    greeting: "Bonjour,",
    welcome: "Bienvenue sur MySpellingGame.",
    intro:
      "En quelques secondes, vous pouvez créer une liste de mots personnalisée et la transformer en activité interactive pour votre enfant ou vos élèves.",
    lead: "Avec MySpellingGame, vous pouvez :",
    features: [
      "Créer vos propres listes de mots",
      "Vous entraîner avec des jeux et des activités d’écoute",
      "Créer et partager des exercices d’orthographe",
      "Suivre les progrès au fil du temps",
    ],
    setup:
      "Aucune configuration compliquée n’est nécessaire. Ajoutez vos mots et commencez à vous entraîner.",
    start: "Commencer",
    thanks: "Merci d’avoir essayé MySpellingGame.",
  },
  id: {
    lang: "id",
    subject: "Selamat datang di MySpellingGame",
    greeting: "Halo,",
    welcome: "Selamat datang di MySpellingGame.",
    intro:
      "Dalam hitungan detik, Anda dapat membuat daftar kata sendiri dan mengubahnya menjadi aktivitas latihan interaktif untuk anak atau murid Anda.",
    lead: "Dengan MySpellingGame, Anda dapat:",
    features: [
      "Membuat daftar kata sendiri",
      "Berlatih dengan permainan dan aktivitas menyimak",
      "Membuat dan membagikan tugas ejaan",
      "Memantau perkembangan belajar dari waktu ke waktu",
    ],
    setup:
      "Tidak perlu pengaturan yang rumit. Cukup tambahkan kata-kata Anda dan mulai berlatih.",
    start: "Mulai di sini",
    thanks: "Terima kasih telah mencoba MySpellingGame.",
  },
  "zh-CN": {
    lang: "zh-CN",
    subject: "欢迎使用 MySpellingGame",
    greeting: "你好，",
    welcome: "欢迎使用 MySpellingGame。",
    intro:
      "只需几秒钟，你就能创建自定义单词表，并把它变成适合孩子或学生的互动练习。",
    lead: "使用 MySpellingGame，你可以：",
    features: [
      "创建自己的单词表",
      "通过游戏和听力活动进行练习",
      "创建并分享拼写作业",
      "持续跟踪学习进度",
    ],
    setup: "无需复杂设置。添加单词后即可开始练习。",
    start: "立即开始",
    thanks: "感谢你使用 MySpellingGame。",
  },
} as const;

type WelcomeLocale = keyof typeof COPY;

export function resolveWelcomeLocale(
  acceptLanguage?: string | null,
): WelcomeLocale {
  for (const part of (acceptLanguage || "").toLowerCase().split(",")) {
    const tag = part.split(";", 1)[0].trim();
    if (tag === "zh" || tag.startsWith("zh-")) return "zh-CN";
    if (tag === "pt" || tag.startsWith("pt-")) return "pt-BR";
    for (const locale of ["en", "es", "fr", "id"] as const) {
      if (tag === locale || tag.startsWith(`${locale}-`)) return locale;
    }
  }
  return "en";
}

export function buildWelcomeEmail(acceptLanguage?: string | null) {
  const copy = COPY[resolveWelcomeLocale(acceptLanguage)];
  const featureText = copy.features.map((feature) => `- ${feature}`).join("\n");
  const featureHtml = copy.features
    .map((feature) => `<li style="margin:0 0 10px">${feature}</li>`)
    .join("");

  return {
    from: FROM,
    subject: copy.subject,
    text: `${copy.greeting}\n\n${copy.welcome}\n\n${copy.intro}\n\n${copy.lead}\n\n${featureText}\n\n${copy.setup}\n\n${copy.start}:\n${SITE_URL}\n\n${copy.thanks}\n\n— MySpellingGame`,
    html: `<!doctype html>
<html lang="${copy.lang}">
  <body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#1f2937">
    <div style="display:none;max-height:0;overflow:hidden">${copy.welcome}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px">
          <tr><td style="padding:32px">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td><a href="${SITE_URL}"><img src="${LOGO_URL}" width="40" height="40" alt="" style="display:block;border:0"></a></td>
                <td style="padding-left:12px"><a href="${SITE_URL}" style="color:#2f6f73;text-decoration:none;font-size:20px;font-weight:700;line-height:1.2">My Spelling Game</a></td>
              </tr>
            </table>
            <p style="margin:28px 0 18px;font-size:16px;line-height:1.6">${copy.greeting}</p>
            <h1 style="margin:0 0 18px;font-size:26px;line-height:1.3;color:#111827">${copy.welcome}</h1>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6">${copy.intro}</p>
            <p style="margin:0 0 10px;font-size:16px;line-height:1.6">${copy.lead}</p>
            <ul style="margin:0 0 20px;padding-left:24px;font-size:16px;line-height:1.6">${featureHtml}</ul>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6">${copy.setup}</p>
            <a href="${SITE_URL}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;border-radius:6px">${copy.start}</a>
            <p style="margin:28px 0 18px;font-size:16px;line-height:1.6">${copy.thanks}</p>
            <p style="margin:0;font-size:16px;line-height:1.6">— MySpellingGame</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

type EmailFetch = (url: string, init: RequestInit) => Promise<Response>;

export async function sendWelcomeEmail(
  apiKey: string,
  to: string,
  acceptLanguage?: string | null,
  fetchEmail: EmailFetch = fetch,
) {
  const email = buildWelcomeEmail(acceptLanguage);
  const response = await fetchEmail("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...email, to: [to] }),
  });
  if (!response.ok) {
    throw new Error(`Resend welcome email failed (${response.status})`);
  }
  return (await response.json()) as { id: string };
}
