import { createAuth, getTeacherSession, type AuthEnv } from "./auth";
import {
  HttpError,
  PLAN_LIMITS,
  addDays,
  csvCell,
  monthStart,
  parseWordList,
  randomPublicId,
  scoreAnswers,
  validateAttemptId,
  validateDeadline,
  validateDuration,
  validateMaxAttempts,
  validateMode,
  validateNickname,
  validateTitle,
  type AssignmentWord,
  type Plan,
} from "./domain";
import {
  createCheckout,
  createPortal,
  verifyAndProcessWebhook,
  type StripeEnv,
} from "./stripe";

interface RateLimiter {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface Env extends AuthEnv, StripeEnv {
  ASSETS: Fetcher;
  CREATE_LIMITER: RateLimiter;
  SUBMIT_LIMITER: RateLimiter;
}

type TeacherSession = Awaited<ReturnType<typeof getTeacherSession>>;
type SessionGetter = (env: Env, request: Request) => Promise<TeacherSession>;
type HandlerOverrides = { getSession?: SessionGetter };

type AssignmentRow = {
  id: string;
  public_id: string;
  owner_user_id: string;
  title: string;
  mode: "dictation" | "typing";
  status: "published" | "closed";
  max_attempts: number;
  created_at: string;
  expires_at: string;
};

type AttemptDetailRow = {
  id: string;
  nickname: string;
  attempt_number: number;
  score: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  duration_seconds: number;
  completed_at: string;
  missed_words: string | null;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, "cache-control": "no-store", ...headers },
  });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new HttpError(415, "json_required", "This endpoint requires JSON.");
  }
  const body = await request.text();
  if (body.length > 32_768)
    throw new HttpError(413, "body_too_large", "The request is too large.");
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("object required");
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(
      400,
      "invalid_json",
      "The request body is not valid JSON.",
    );
  }
}

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new HttpError(
      403,
      "invalid_origin",
      "This request must come from My Spelling Game.",
    );
  }
}

async function requireTeacher(
  env: Env,
  request: Request,
  getSession: SessionGetter,
) {
  const session = await getSession(env, request);
  if (!session?.user?.id)
    throw new HttpError(
      401,
      "sign_in_required",
      "Sign in as a teacher to continue.",
    );
  return session.user;
}

async function getPlan(
  db: D1Database,
  userId: string,
  now = new Date(),
): Promise<Plan> {
  const subscription = await db
    .prepare(
      `SELECT plan, status, current_period_end FROM subscriptions
       WHERE user_id = ?`,
    )
    .bind(userId)
    .first<{ plan: Plan; status: string; current_period_end: string | null }>();
  const paidStatus =
    subscription?.status === "active" || subscription?.status === "trialing";
  const unexpired =
    !subscription?.current_period_end ||
    subscription.current_period_end > now.toISOString();
  return subscription?.plan === "pro" && paidStatus && unexpired
    ? "pro"
    : "free";
}

async function usage(
  db: D1Database,
  userId: string,
  plan: Plan,
  now = new Date(),
) {
  const [active, monthly, students] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM assignments
         WHERE owner_user_id = ? AND status = 'published' AND expires_at > ?`,
      )
      .bind(userId, now.toISOString())
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM monthly_submission_usage
         WHERE user_id = ? AND month_key = ?`,
      )
      .bind(userId, monthStart(now))
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT COUNT(DISTINCT at.nickname_key) AS count
         FROM attempts at JOIN assignments a ON a.id = at.assignment_id
         WHERE a.owner_user_id = ? AND at.retention_expires_at > ?`,
      )
      .bind(userId, now.toISOString())
      .first<{ count: number }>(),
  ]);
  return {
    plan,
    limits: PLAN_LIMITS[plan],
    activeAssignments: Number(active?.count ?? 0),
    monthlyAttempts: Number(monthly?.count ?? 0),
    studentNicknames: Number(students?.count ?? 0),
  };
}

async function getOwnedAssignment(
  db: D1Database,
  id: string,
  ownerUserId: string,
) {
  const assignment = await db
    .prepare("SELECT * FROM assignments WHERE id = ? AND owner_user_id = ?")
    .bind(id, ownerUserId)
    .first<AssignmentRow>();
  if (!assignment)
    throw new HttpError(404, "assignment_not_found", "Assignment not found.");
  return assignment;
}

async function listAssignments(db: D1Database, ownerUserId: string) {
  const result = await db
    .prepare(
      `SELECT a.id, a.public_id, a.title, a.mode, a.status, a.max_attempts,
              a.created_at, a.expires_at,
              COUNT(at.id) AS attempt_count,
              COUNT(DISTINCT at.nickname_key) AS student_count,
              COALESCE(ROUND(AVG(at.accuracy)), 0) AS average_accuracy
       FROM assignments a
       LEFT JOIN attempts at ON at.assignment_id = a.id AND at.retention_expires_at > ?
       WHERE a.owner_user_id = ?
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
    )
    .bind(new Date().toISOString(), ownerUserId)
    .all();
  return result.results;
}

async function assignmentDetail(
  db: D1Database,
  assignment: AssignmentRow,
  plan: Plan,
) {
  const now = new Date().toISOString();
  const [wordRows, attemptRows, average] = await Promise.all([
    db
      .prepare(
        "SELECT id, position, word FROM assignment_words WHERE assignment_id = ? ORDER BY position",
      )
      .bind(assignment.id)
      .all<AssignmentWord>(),
    db
      .prepare(
        `SELECT at.id, at.nickname, at.attempt_number, at.score, at.correct_count,
                at.incorrect_count, at.accuracy, at.duration_seconds, at.completed_at,
                GROUP_CONCAT(CASE WHEN ai.is_correct = 0 THEN aw.word END, char(31)) AS missed_words
         FROM attempts at
         LEFT JOIN attempt_items ai ON ai.attempt_id = at.id
         LEFT JOIN assignment_words aw ON aw.id = ai.word_id
         WHERE at.assignment_id = ? AND at.retention_expires_at > ?
         GROUP BY at.id
         ORDER BY at.completed_at DESC`,
      )
      .bind(assignment.id, now)
      .all<AttemptDetailRow>(),
    db
      .prepare(
        `SELECT COUNT(*) AS attempts, COUNT(DISTINCT nickname_key) AS students,
                COALESCE(ROUND(AVG(accuracy)), 0) AS average_accuracy
         FROM attempts WHERE assignment_id = ? AND retention_expires_at > ?`,
      )
      .bind(assignment.id, now)
      .first<Record<string, number>>(),
  ]);
  let missedWords: unknown[] | null = null;
  if (PLAN_LIMITS[plan].missedWordStats) {
    missedWords = (
      await db
        .prepare(
          `SELECT aw.word, COUNT(*) AS misses
           FROM attempt_items ai
           JOIN attempts at ON at.id = ai.attempt_id
           JOIN assignment_words aw ON aw.id = ai.word_id
           WHERE at.assignment_id = ? AND at.retention_expires_at > ? AND ai.is_correct = 0
           GROUP BY aw.id ORDER BY misses DESC, aw.position LIMIT 10`,
        )
        .bind(assignment.id, now)
        .all()
    ).results;
  }
  return {
    ...assignment,
    words: wordRows.results,
    attempts: attemptRows.results.map((attempt) => ({
      ...attempt,
      missed_words: attempt.missed_words
        ? String(attempt.missed_words).split(String.fromCharCode(31))
        : [],
    })),
    summary: {
      attempts: Number(average?.attempts ?? 0),
      students: Number(average?.students ?? 0),
      averageAccuracy: Number(average?.average_accuracy ?? 0),
    },
    missedWordStats: missedWords,
  };
}

async function createAssignment(env: Env, request: Request, userId: string) {
  const allowed = await env.CREATE_LIMITER.limit({ key: `create:${userId}` });
  if (!allowed.success)
    throw new HttpError(
      429,
      "rate_limited",
      "Too many assignments were created. Try again shortly.",
    );
  const body = await readJson(request);
  const title = validateTitle(body.title);
  const words = parseWordList(body.words);
  const mode = validateMode(body.mode);
  const maxAttempts = validateMaxAttempts(body.maxAttempts);
  const expiresAt = validateDeadline(body.expiresAt);
  const plan = await getPlan(env.DB, userId);
  const currentUsage = await usage(env.DB, userId, plan);
  if (currentUsage.activeAssignments >= PLAN_LIMITS[plan].activeAssignments) {
    throw new HttpError(
      403,
      "active_assignment_limit",
      "Your active assignment limit has been reached.",
    );
  }
  const id = crypto.randomUUID();
  const publicId = randomPublicId();
  const createdAt = new Date().toISOString();
  const statements = [
    env.DB.prepare(
      `INSERT INTO assignments (
           id, public_id, owner_user_id, title, mode, status, max_attempts, created_at, expires_at
         )
         SELECT ?, ?, ?, ?, ?, 'published', ?, ?, ?
         WHERE (SELECT COUNT(*) FROM assignments
                WHERE owner_user_id = ? AND status = 'published' AND expires_at > ?) < ?`,
    ).bind(
      id,
      publicId,
      userId,
      title,
      mode,
      maxAttempts,
      createdAt,
      expiresAt,
      userId,
      createdAt,
      PLAN_LIMITS[plan].activeAssignments,
    ),
    ...words.map((word, position) =>
      env.DB.prepare(
        `INSERT INTO assignment_words (id, assignment_id, position, word)
           SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM assignments WHERE id = ?)`,
      ).bind(crypto.randomUUID(), id, position, word, id),
    ),
  ];
  await env.DB.batch(statements);
  const saved = await env.DB.prepare("SELECT id FROM assignments WHERE id = ?")
    .bind(id)
    .first();
  if (!saved)
    throw new HttpError(
      403,
      "active_assignment_limit",
      "Your active assignment limit has been reached.",
    );
  return { id, publicId, title, mode, maxAttempts, createdAt, expiresAt };
}

async function updateAssignment(
  env: Env,
  request: Request,
  assignment: AssignmentRow,
  userId: string,
) {
  const body = await readJson(request);
  if (body.status !== "published" && body.status !== "closed") {
    throw new HttpError(
      400,
      "invalid_status",
      "Assignments can be published or closed.",
    );
  }
  if (body.status === "published") {
    if (assignment.expires_at <= new Date().toISOString()) {
      throw new HttpError(
        409,
        "assignment_expired",
        "Expired assignments cannot be reopened.",
      );
    }
    if (assignment.status !== "published") {
      const plan = await getPlan(env.DB, userId);
      const now = new Date().toISOString();
      const reopened = await env.DB.prepare(
        `UPDATE assignments SET status = 'published', closed_at = NULL
         WHERE id = ? AND owner_user_id = ?
           AND (SELECT COUNT(*) FROM assignments
                WHERE owner_user_id = ? AND status = 'published' AND expires_at > ?) < ?`,
      )
        .bind(
          assignment.id,
          userId,
          userId,
          now,
          PLAN_LIMITS[plan].activeAssignments,
        )
        .run();
      if (!reopened.meta.changes) {
        throw new HttpError(
          403,
          "active_assignment_limit",
          "Your active assignment limit has been reached.",
        );
      }
      return { status: body.status };
    }
  }
  await env.DB.prepare(
    "UPDATE assignments SET status = ?, closed_at = ? WHERE id = ? AND owner_user_id = ?",
  )
    .bind(
      body.status,
      body.status === "closed" ? new Date().toISOString() : null,
      assignment.id,
      userId,
    )
    .run();
  return { status: body.status };
}

async function publicAssignment(db: D1Database, publicId: string) {
  const assignment = await db
    .prepare(
      `SELECT id, public_id, owner_user_id, title, mode, status, max_attempts, created_at, expires_at
       FROM assignments WHERE public_id = ?`,
    )
    .bind(publicId)
    .first<AssignmentRow>();
  if (!assignment)
    throw new HttpError(
      404,
      "assignment_not_found",
      "This assignment link is invalid.",
    );
  if (assignment.status !== "published")
    throw new HttpError(410, "assignment_closed", "This assignment is closed.");
  if (assignment.expires_at <= new Date().toISOString()) {
    throw new HttpError(
      410,
      "assignment_expired",
      "This assignment has expired.",
    );
  }
  const words = await db
    .prepare(
      "SELECT id, position, word FROM assignment_words WHERE assignment_id = ? ORDER BY position",
    )
    .bind(assignment.id)
    .all<AssignmentWord>();
  return { ...assignment, words: words.results };
}

async function loadAttemptResult(
  db: D1Database,
  attemptId: string,
  publicId: string,
) {
  const attempt = await db
    .prepare(
      `SELECT at.id, at.nickname, at.score, at.correct_count, at.incorrect_count,
              at.accuracy, at.duration_seconds, at.completed_at
       FROM attempts at JOIN assignments a ON a.id = at.assignment_id
       WHERE at.id = ? AND a.public_id = ?`,
    )
    .bind(attemptId, publicId)
    .first<Record<string, unknown>>();
  if (!attempt) return null;
  const missed = await db
    .prepare(
      `SELECT aw.word FROM attempt_items ai
       JOIN assignment_words aw ON aw.id = ai.word_id
       WHERE ai.attempt_id = ? AND ai.is_correct = 0 ORDER BY aw.position`,
    )
    .bind(attemptId)
    .all<{ word: string }>();
  return { ...attempt, missedWords: missed.results.map((row) => row.word) };
}

async function submitAttempt(env: Env, request: Request, publicId: string) {
  const allowed = await env.SUBMIT_LIMITER.limit({ key: `submit:${publicId}` });
  if (!allowed.success)
    throw new HttpError(
      429,
      "rate_limited",
      "Too many submissions. Try again shortly.",
    );
  const body = await readJson(request);
  const attemptId = validateAttemptId(body.attemptId);
  const existing = await loadAttemptResult(env.DB, attemptId, publicId);
  if (existing) return existing;
  const assignment = await publicAssignment(env.DB, publicId);
  const { nickname, nicknameKey } = validateNickname(body.nickname);
  const durationSeconds = validateDuration(body.durationSeconds);
  const words = assignment.words;
  const result = scoreAnswers(words, body.answers);
  const plan = await getPlan(env.DB, assignment.owner_user_id);
  const limits = PLAN_LIMITS[plan];
  const now = new Date();
  const completedAt = now.toISOString();
  const retentionExpiresAt = addDays(completedAt, limits.retentionDays);
  const monthKey = monthStart(now);
  const monthlyLimit = limits.monthlyAttempts ?? 2_147_483_647;
  const statements = [
    env.DB.prepare(
      `INSERT OR IGNORE INTO attempts (
           id, assignment_id, nickname, nickname_key, attempt_number, score,
           correct_count, incorrect_count, accuracy, duration_seconds,
           completed_at, retention_expires_at
         )
         SELECT ?, a.id, ?, ?,
           (SELECT COUNT(*) + 1 FROM attempts x WHERE x.assignment_id = a.id AND x.nickname_key = ?),
           ?, ?, ?, ?, ?, ?, ?
         FROM assignments a
         WHERE a.public_id = ? AND a.status = 'published' AND a.expires_at > ?
           AND (SELECT COUNT(*) FROM attempts x WHERE x.assignment_id = a.id AND x.nickname_key = ?) < a.max_attempts
           AND (SELECT COUNT(*) FROM monthly_submission_usage mu
                WHERE mu.user_id = a.owner_user_id AND mu.month_key = ?) < ?
           AND (
             EXISTS (SELECT 1 FROM attempts x JOIN assignments ax ON ax.id = x.assignment_id
                     WHERE ax.owner_user_id = a.owner_user_id AND x.nickname_key = ?)
             OR (SELECT COUNT(DISTINCT x.nickname_key) FROM attempts x
                 JOIN assignments ax ON ax.id = x.assignment_id
                 WHERE ax.owner_user_id = a.owner_user_id AND x.retention_expires_at > ?) < ?
           )`,
    ).bind(
      attemptId,
      nickname,
      nicknameKey,
      nicknameKey,
      result.score,
      result.correctCount,
      result.incorrectCount,
      result.accuracy,
      durationSeconds,
      completedAt,
      retentionExpiresAt,
      publicId,
      completedAt,
      nicknameKey,
      monthKey,
      monthlyLimit,
      nicknameKey,
      completedAt,
      limits.studentNicknames,
    ),
    ...result.items.map((item) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO attempt_items (attempt_id, word_id, is_correct)
           SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM attempts WHERE id = ?)`,
      ).bind(attemptId, item.wordId, item.correct ? 1 : 0, attemptId),
    ),
    env.DB.prepare(
      `INSERT OR IGNORE INTO monthly_submission_usage (attempt_id, user_id, month_key, created_at)
         SELECT ?, a.owner_user_id, ?, ? FROM attempts at
         JOIN assignments a ON a.id = at.assignment_id WHERE at.id = ?`,
    ).bind(attemptId, monthKey, completedAt, attemptId),
  ];
  await env.DB.batch(statements);
  const saved = await loadAttemptResult(env.DB, attemptId, publicId);
  if (saved) return saved;
  const attemptCount = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM attempts WHERE assignment_id = ? AND nickname_key = ?",
  )
    .bind(assignment.id, nicknameKey)
    .first<{ count: number }>();
  if (Number(attemptCount?.count ?? 0) >= assignment.max_attempts) {
    throw new HttpError(
      403,
      "attempt_limit",
      "This nickname has used all allowed attempts.",
    );
  }
  const currentUsage = await usage(env.DB, assignment.owner_user_id, plan, now);
  if (
    limits.monthlyAttempts !== null &&
    currentUsage.monthlyAttempts >= limits.monthlyAttempts
  ) {
    throw new HttpError(
      403,
      "monthly_submission_limit",
      "The teacher’s monthly submission limit has been reached.",
    );
  }
  throw new HttpError(
    403,
    "student_limit",
    "The assignment’s student limit has been reached.",
  );
}

async function exportCsv(
  db: D1Database,
  assignment: AssignmentRow,
  plan: Plan,
) {
  if (!PLAN_LIMITS[plan].csvExport)
    throw new HttpError(403, "pro_required", "CSV export requires Pro.");
  const detail = await assignmentDetail(db, assignment, plan);
  const lines = [
    [
      "Nickname",
      "Attempt",
      "Score",
      "Correct",
      "Incorrect",
      "Accuracy",
      "Missed words",
      "Duration seconds",
      "Completed at",
    ]
      .map(csvCell)
      .join(","),
    ...detail.attempts.map((attempt) =>
      [
        attempt.nickname,
        attempt.attempt_number,
        attempt.score,
        attempt.correct_count,
        attempt.incorrect_count,
        `${attempt.accuracy}%`,
        (attempt.missed_words as string[]).join("; "),
        attempt.duration_seconds,
        attempt.completed_at,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        'attachment; filename="myspellinggame-results.csv"',
      "cache-control": "no-store",
    },
  });
}

async function serveShell(
  env: Env,
  request: Request,
  pathname: string,
  noindex: boolean,
) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = "";
  const response = await env.ASSETS.fetch(
    new Request(url, { method: "GET", headers: request.headers }),
  );
  const headers = new Headers(response.headers);
  if (noindex) {
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    headers.set("cache-control", "no-store");
  }
  return new Response(response.body, { status: response.status, headers });
}

export async function handleRequest(
  request: Request,
  env: Env,
  overrides: HandlerOverrides = {},
) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const getSession = overrides.getSession ?? getTeacherSession;

  if (url.pathname.startsWith("/api/auth/")) {
    if (
      !env.BETTER_AUTH_SECRET ||
      !env.GOOGLE_CLIENT_ID ||
      !env.GOOGLE_CLIENT_SECRET
    ) {
      throw new HttpError(
        503,
        "auth_not_configured",
        "Teacher sign-in is not configured yet.",
      );
    }
    return createAuth(env, request).handler(request);
  }
  if (url.pathname === "/api/stripe/webhook" && method === "POST") {
    const processed = await verifyAndProcessWebhook(env, env.DB, request);
    return json({ received: true, processed });
  }
  if (url.pathname === "/api/config" && method === "GET") {
    return json({
      googleAuthConfigured: Boolean(
        env.BETTER_AUTH_SECRET &&
        env.GOOGLE_CLIENT_ID &&
        env.GOOGLE_CLIENT_SECRET,
      ),
      billingConfigured: Boolean(
        env.STRIPE_SECRET_KEY &&
        env.STRIPE_PRICE_MONTHLY &&
        env.STRIPE_PRICE_YEARLY &&
        env.STRIPE_WEBHOOK_SECRET,
      ),
    });
  }

  const publicMatch = url.pathname.match(
    /^\/api\/public\/assignments\/([A-Za-z0-9_-]{24})$/,
  );
  if (publicMatch && method === "GET") {
    const assignment = await publicAssignment(env.DB, publicMatch[1]);
    return json({
      title: assignment.title,
      mode: assignment.mode,
      max_attempts: assignment.max_attempts,
      expires_at: assignment.expires_at,
      words: assignment.words,
    });
  }
  const submitMatch = url.pathname.match(
    /^\/api\/public\/assignments\/([A-Za-z0-9_-]{24})\/attempts$/,
  );
  if (submitMatch && method === "POST") {
    requireSameOrigin(request);
    return json(await submitAttempt(env, request, submitMatch[1]), 201);
  }

  if (url.pathname === "/api/me" && method === "GET") {
    const user = await requireTeacher(env, request, getSession);
    const plan = await getPlan(env.DB, user.id);
    return json({
      user: { id: user.id, name: user.name, email: user.email },
      ...(await usage(env.DB, user.id, plan)),
    });
  }

  if (url.pathname === "/api/assignments") {
    const user = await requireTeacher(env, request, getSession);
    if (method === "GET") {
      const plan = await getPlan(env.DB, user.id);
      return json({
        assignments: await listAssignments(env.DB, user.id),
        usage: await usage(env.DB, user.id, plan),
      });
    }
    if (method === "POST") {
      requireSameOrigin(request);
      return json(await createAssignment(env, request, user.id), 201);
    }
  }

  const assignmentMatch = url.pathname.match(
    /^\/api\/assignments\/([0-9a-f-]{36})$/i,
  );
  if (assignmentMatch) {
    const user = await requireTeacher(env, request, getSession);
    const assignment = await getOwnedAssignment(
      env.DB,
      assignmentMatch[1],
      user.id,
    );
    if (method === "GET")
      return json(
        await assignmentDetail(
          env.DB,
          assignment,
          await getPlan(env.DB, user.id),
        ),
      );
    if (method === "PATCH") {
      requireSameOrigin(request);
      return json(await updateAssignment(env, request, assignment, user.id));
    }
    if (method === "DELETE") {
      requireSameOrigin(request);
      await env.DB.prepare(
        "DELETE FROM assignments WHERE id = ? AND owner_user_id = ?",
      )
        .bind(assignment.id, user.id)
        .run();
      return new Response(null, { status: 204 });
    }
  }

  const deleteAttemptMatch = url.pathname.match(
    /^\/api\/assignments\/([0-9a-f-]{36})\/attempts\/([0-9a-f-]{36})$/i,
  );
  if (deleteAttemptMatch && method === "DELETE") {
    requireSameOrigin(request);
    const user = await requireTeacher(env, request, getSession);
    await getOwnedAssignment(env.DB, deleteAttemptMatch[1], user.id);
    await env.DB.prepare(
      `DELETE FROM attempts WHERE id = ? AND assignment_id = ?
         AND EXISTS (SELECT 1 FROM assignments WHERE id = ? AND owner_user_id = ?)`,
    )
      .bind(
        deleteAttemptMatch[2],
        deleteAttemptMatch[1],
        deleteAttemptMatch[1],
        user.id,
      )
      .run();
    return new Response(null, { status: 204 });
  }

  const exportMatch = url.pathname.match(
    /^\/api\/assignments\/([0-9a-f-]{36})\/export\.csv$/i,
  );
  if (exportMatch && method === "GET") {
    const user = await requireTeacher(env, request, getSession);
    const assignment = await getOwnedAssignment(
      env.DB,
      exportMatch[1],
      user.id,
    );
    return exportCsv(env.DB, assignment, await getPlan(env.DB, user.id));
  }

  if (url.pathname === "/api/billing/checkout" && method === "POST") {
    requireSameOrigin(request);
    const user = await requireTeacher(env, request, getSession);
    const body = await readJson(request);
    if (body.interval !== "month" && body.interval !== "year") {
      throw new HttpError(
        400,
        "invalid_interval",
        "Choose monthly or yearly billing.",
      );
    }
    const checkout = await createCheckout(
      env,
      env.DB,
      user,
      body.interval,
      url.origin,
    );
    return json({ url: checkout.url });
  }

  if (url.pathname === "/api/billing/portal" && method === "POST") {
    requireSameOrigin(request);
    const user = await requireTeacher(env, request, getSession);
    const portal = await createPortal(env, env.DB, user.id, url.origin);
    return json({ url: portal.url });
  }

  if (url.pathname === "/teacher" || url.pathname.startsWith("/teacher/")) {
    return serveShell(env, request, "/src/pages/teacher.html", true);
  }
  if (/^\/a\/[A-Za-z0-9_-]{24}$/.test(url.pathname)) {
    return serveShell(env, request, "/src/pages/assignment.html", true);
  }
  return env.ASSETS.fetch(request);
}

async function scheduled(_controller: ScheduledController, env: Env) {
  const now = new Date();
  const staleAssignments = new Date(
    now.getTime() - 366 * 86_400_000,
  ).toISOString();
  const staleUsage = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1),
  ).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM attempts WHERE retention_expires_at <= ?").bind(
      now.toISOString(),
    ),
    env.DB.prepare("DELETE FROM assignments WHERE expires_at <= ?").bind(
      staleAssignments,
    ),
    env.DB.prepare(
      "DELETE FROM monthly_submission_usage WHERE month_key < ?",
    ).bind(staleUsage),
    env.DB.prepare(
      "DELETE FROM stripe_events WHERE processed_at IS NOT NULL AND processed_at < ?",
    ).bind(staleAssignments),
  ]);
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      if (error instanceof HttpError)
        return json(
          { error: error.code, message: error.message },
          error.status,
        );
      return json(
        {
          error: "internal_error",
          message: "Something went wrong. Please try again.",
        },
        500,
      );
    }
  },
  scheduled,
} satisfies ExportedHandler<Env>;
