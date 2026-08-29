import {
  createAuth,
  getTeacherSession,
  restrictTeacherAuthCallback,
  type AuthEnv,
} from "./auth";
import {
  HttpError,
  PLAN_LIMITS,
  addDays,
  calculateReviewState,
  csvCell,
  enforcePlanWordLimit,
  masteryEvidence,
  monthStart,
  normalizeWord,
  randomPublicId,
  resolvePlan,
  scoreAnswers,
  validateAttemptId,
  validateDeadline,
  validateDuration,
  validateMaxAttempts,
  validateMode,
  validateNickname,
  validateSavedListTitle,
  validateTitle,
  parseWordEntries,
  parseWordList,
  type AssignmentWord,
  type Plan,
} from "./domain";
import {
  createCheckout,
  createPortal,
  hasActiveSubscription,
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
  ADMIN_EMAIL?: string;
}

type TeacherSession = Awaited<ReturnType<typeof getTeacherSession>>;
type SessionGetter = (env: Env, request: Request) => Promise<TeacherSession>;
type HandlerOverrides = {
  getSession?: SessionGetter;
  pinGenerator?: () => string;
};

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
  closed_at?: string | null;
};

type AttemptDetailRow = {
  id: string;
  nickname: string;
  attempt_number: number | null;
  score: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  duration_seconds: number;
  completed_at: string;
  missed_words: string | null;
  status: "completed" | "incomplete";
};

type SavedListRow = {
  id: string;
  owner_user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type LearnerRow = {
  id: string;
  owner_user_id: string;
  name: string;
  name_key: string;
  public_id: string;
  archived: number;
  created_at: string;
  updated_at: string;
  join_pin_hash?: string | null;
  join_pin?: string | null;
};

function ownerLearner(learner: LearnerRow, plan: Plan) {
  const result = { ...learner };
  delete result.join_pin_hash;
  if (plan !== "teacher") delete result.join_pin;
  return result;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, "cache-control": "no-store", ...headers },
  });
}

async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomPin() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 10_000).padStart(4, "0");
}

async function generateUniqueLearnerPin(
  db: D1Database,
  ownerUserId: string,
  generatePin = randomPin,
) {
  for (let tries = 0; tries < 20; tries += 1) {
    const pin = generatePin();
    const hash = await hashPin(pin);
    const exists = await db
      .prepare(
        "SELECT 1 FROM learners WHERE owner_user_id = ? AND join_pin_hash = ?",
      )
      .bind(ownerUserId, hash)
      .first();
    if (!exists) return { pin, hash };
  }
  throw new HttpError(
    503,
    "pin_unavailable",
    "A student PIN could not be generated. Try again.",
  );
}

async function ensureTeacherJoinIdentity(
  db: D1Database,
  userId: string,
  generatePin = randomPin,
) {
  let user = await db
    .prepare("SELECT class_public_id FROM user WHERE id = ?")
    .bind(userId)
    .first<{ class_public_id: string | null }>();
  let classPublicId = user?.class_public_id ?? null;
  if (!classPublicId) {
    classPublicId = randomPublicId().slice(0, 12);
    await db
      .prepare(
        "UPDATE user SET class_public_id = ? WHERE id = ? AND class_public_id IS NULL",
      )
      .bind(classPublicId, userId)
      .run();
    user = await db
      .prepare("SELECT class_public_id FROM user WHERE id = ?")
      .bind(userId)
      .first<{ class_public_id: string | null }>();
    classPublicId = user?.class_public_id ?? classPublicId;
  }
  const learners = await db
    .prepare(
      "SELECT id FROM learners WHERE owner_user_id = ? AND archived = 0 AND join_pin_hash IS NULL",
    )
    .bind(userId)
    .all<{ id: string }>();
  for (const learner of learners.results) {
    const { pin, hash } = await generateUniqueLearnerPin(
      db,
      userId,
      generatePin,
    );
    await db
      .prepare(
        "UPDATE learners SET join_pin_hash = ?, join_pin = ? WHERE id = ? AND owner_user_id = ? AND join_pin_hash IS NULL",
      )
      .bind(hash, pin, learner.id, userId)
      .run();
  }
  return classPublicId;
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

async function requireAdmin(
  env: Env,
  request: Request,
  getSession: SessionGetter,
) {
  const user = await requireTeacher(env, request, getSession);
  if (!env.ADMIN_EMAIL || user.email !== env.ADMIN_EMAIL)
    throw new HttpError(
      403,
      "admin_forbidden",
      "当前账号没有管理后台访问权限。",
    );
  return user;
}

async function adminStats(env: Env, now = new Date()) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
  const last7Days = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const summary = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM user) AS totalUsers,
       (SELECT COUNT(DISTINCT userId) FROM account WHERE providerId = 'google') AS googleUsers,
       (SELECT COUNT(DISTINCT userId) FROM account WHERE providerId = 'microsoft') AS microsoftUsers,
       (SELECT COUNT(*) FROM user WHERE createdAt >= ?) AS todayUsers,
       (SELECT COUNT(*) FROM user WHERE createdAt >= ?) AS last7DaysUsers`,
  )
    .bind(today, last7Days)
    .first<{
      totalUsers: number;
      googleUsers: number;
      microsoftUsers: number;
      todayUsers: number;
      last7DaysUsers: number;
    }>();
  const subscriptions = await env.DB.prepare(
    `SELECT status, billing_interval, current_period_end, stripe_price_id
     FROM subscriptions`,
  ).all<{
    status: string;
    billing_interval: "month" | "year" | null;
    current_period_end: string | null;
    stripe_price_id: string | null;
  }>();
  let proUsers = 0;
  let activePaidUsers = 0;
  let monthlyUsers = 0;
  let yearlyUsers = 0;
  for (const subscription of subscriptions.results) {
    if (!hasActiveSubscription(subscription, env, now)) continue;
    proUsers += 1;
    if (subscription.status === "active") activePaidUsers += 1;
    if (subscription.billing_interval === "month") monthlyUsers += 1;
    if (subscription.billing_interval === "year") yearlyUsers += 1;
  }
  return {
    totalUsers: Number(summary?.totalUsers ?? 0),
    googleUsers: Number(summary?.googleUsers ?? 0),
    microsoftUsers: Number(summary?.microsoftUsers ?? 0),
    proUsers,
    activePaidUsers,
    monthlyUsers,
    yearlyUsers,
    todayUsers: Number(summary?.todayUsers ?? 0),
    last7DaysUsers: Number(summary?.last7DaysUsers ?? 0),
  };
}

async function adminUsers(env: Env, url: URL) {
  const rawPage = url.searchParams.get("page") ?? "1";
  if (
    !/^\d+$/.test(rawPage) ||
    Number(rawPage) < 1 ||
    Number(rawPage) > 100_000
  )
    throw new HttpError(400, "invalid_page", "Page must be a positive number.");
  const page = Number(rawPage);
  const pageSize = 50;
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
  const search = `%${query.toLowerCase()}%`;
  const where = query
    ? "WHERE lower(u.email) LIKE ? OR lower(u.name) LIKE ? OR lower(u.id) LIKE ?"
    : "";
  const count = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM user u ${where}`,
  )
    .bind(...(query ? [search, search, search] : []))
    .first<{ count: number }>();
  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.createdAt,
            (SELECT GROUP_CONCAT(DISTINCT a.providerId)
             FROM account a WHERE a.userId = u.id) AS loginProvider,
            u.workspace_type, s.plan, s.status, s.billing_interval, s.current_period_end,
            s.stripe_price_id
     FROM user u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     ${where}
     ORDER BY u.createdAt DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(
      ...(query ? [search, search, search] : []),
      pageSize,
      (page - 1) * pageSize,
    )
    .all<{
      id: string;
      name: string;
      email: string;
      createdAt: string;
      loginProvider: string | null;
      plan: string | null;
      workspace_type: "family" | "teacher" | null;
      status: string | null;
      billing_interval: "month" | "year" | null;
      current_period_end: string | null;
      stripe_price_id: string | null;
    }>();
  return {
    users: rows.results.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      loginProvider: row.loginProvider,
      plan: resolvePlan(
        row.plan,
        row.workspace_type,
        hasActiveSubscription(
          {
            status: row.status ?? "",
            current_period_end: row.current_period_end,
            stripe_price_id: row.stripe_price_id,
          },
          env,
        ),
      ),
      subscriptionStatus: row.status,
      billingInterval: row.billing_interval,
      currentPeriodEnd: row.current_period_end,
      createdAt: row.createdAt,
    })),
    page,
    pageSize,
    total: Number(count?.count ?? 0),
  };
}

async function getPlan(
  env: Env,
  userId: string,
  now = new Date(),
): Promise<Plan> {
  const subscription = await env.DB.prepare(
    `SELECT s.plan, s.status, s.current_period_end, s.stripe_price_id,
            u.workspace_type
       FROM user u LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = ?`,
  )
    .bind(userId)
    .first<{
      plan: string | null;
      status: string | null;
      current_period_end: string | null;
      stripe_price_id: string | null;
      workspace_type: "family" | "teacher" | null;
    }>();
  return resolvePlan(
    subscription?.plan,
    subscription?.workspace_type,
    hasActiveSubscription(
      subscription
        ? { ...subscription, status: subscription.status ?? "" }
        : null,
      env,
      now,
    ),
  );
}

async function matchSentenceLibrary(
  db: D1Database,
  words: string[],
  difficulty: "simple" | "difficult",
) {
  const placeholders = words.map(() => "?").join(",");
  const rows = await db
    .prepare(
      `SELECT word, simple_sentence, difficult_sentence FROM word_sentences
       WHERE lower(word) IN (${placeholders})`,
    )
    .bind(...words)
    .all<{
      word: string;
      simple_sentence: string;
      difficult_sentence: string;
    }>();
  const found = new Map(
    rows.results.map((row) => [
      normalizeWord(row.word),
      difficulty === "simple" ? row.simple_sentence : row.difficult_sentence,
    ]),
  );
  return Object.fromEntries(
    words.map((word) => [word, found.get(word) ?? null]),
  );
}

function historyCutoff(plan: Plan, now = new Date()) {
  return addDays(now.toISOString(), -PLAN_LIMITS[plan].historyDays);
}

async function usage(
  db: D1Database,
  userId: string,
  plan: Plan,
  now = new Date(),
) {
  const [active, monthly, savedLists, learners] = await Promise.all([
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
        "SELECT COUNT(*) AS count FROM saved_lists WHERE owner_user_id = ?",
      )
      .bind(userId)
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) AS count FROM learners WHERE owner_user_id = ?")
      .bind(userId)
      .first<{ count: number }>(),
  ]);
  return {
    plan,
    limits: PLAN_LIMITS[plan],
    activeAssignments: Number(active?.count ?? 0),
    monthlyAttempts: Number(monthly?.count ?? 0),
    savedLists: Number(savedLists?.count ?? 0),
    learnerProfiles: Number(learners?.count ?? 0),
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

async function listAssignments(
  db: D1Database,
  ownerUserId: string,
  plan: Plan,
) {
  const result = await db
    .prepare(
      `SELECT a.id, a.public_id, a.title, a.mode, a.status, a.max_attempts,
              a.created_at, a.expires_at,
              COUNT(CASE WHEN at.status = 'completed' THEN 1 END) AS attempt_count,
              COUNT(DISTINCT at.nickname_key) AS student_count,
              COALESCE(ROUND(AVG(CASE WHEN at.status = 'completed' THEN at.accuracy END)), 0) AS average_accuracy,
              (SELECT GROUP_CONCAT(l.name, ', ') FROM assignment_learners al
               JOIN learners l ON l.id = al.learner_id
               WHERE al.assignment_id = a.id) AS assigned_learner_names
       FROM assignments a
       LEFT JOIN attempts at ON at.assignment_id = a.id AND at.completed_at >= ?
       WHERE a.owner_user_id = ?
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
    )
    .bind(historyCutoff(plan), ownerUserId)
    .all();
  return result.results;
}

async function assignmentDetail(
  db: D1Database,
  assignment: AssignmentRow,
  plan: Plan,
) {
  const cutoff = historyCutoff(plan);
  const [wordRows, attemptRows, average, assignedLearners, attemptExists] =
    await Promise.all([
      db
        .prepare(
          "SELECT id, position, word, example_sentence FROM assignment_words WHERE assignment_id = ? ORDER BY position",
        )
        .bind(assignment.id)
        .all<AssignmentWord>(),
      db
        .prepare(
          `SELECT at.id, at.nickname, at.attempt_number, at.status, at.score, at.correct_count,
                at.incorrect_count, at.accuracy, at.duration_seconds, at.completed_at,
                GROUP_CONCAT(CASE WHEN ai.is_correct = 0 THEN aw.word END, char(31)) AS missed_words
         FROM attempts at
         LEFT JOIN attempt_items ai ON ai.attempt_id = at.id
         LEFT JOIN assignment_words aw ON aw.id = ai.word_id
         WHERE at.assignment_id = ? AND at.completed_at >= ?
         GROUP BY at.id
         ORDER BY at.completed_at DESC`,
        )
        .bind(assignment.id, cutoff)
        .all<AttemptDetailRow>(),
      db
        .prepare(
          `SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) AS attempts,
                COUNT(DISTINCT nickname_key) AS students,
                COALESCE(ROUND(AVG(CASE WHEN status = 'completed' THEN accuracy END)), 0) AS average_accuracy
         FROM attempts WHERE assignment_id = ? AND completed_at >= ?`,
        )
        .bind(assignment.id, cutoff)
        .first<Record<string, number>>(),
      db
        .prepare(
          `SELECT l.id, l.name FROM assignment_learners al
         JOIN learners l ON l.id = al.learner_id
         WHERE al.assignment_id = ? ORDER BY l.name_key`,
        )
        .bind(assignment.id)
        .all<{ id: string; name: string }>(),
      db
        .prepare("SELECT 1 FROM attempts WHERE assignment_id = ? LIMIT 1")
        .bind(assignment.id)
        .first(),
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
           WHERE at.assignment_id = ? AND at.completed_at >= ?
             AND at.status = 'completed' AND ai.is_correct = 0
           GROUP BY aw.id ORDER BY misses DESC, aw.position LIMIT 10`,
        )
        .bind(assignment.id, cutoff)
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
    assignedLearners: assignedLearners.results,
    hasAttempts: Boolean(attemptExists),
  };
}

async function getOwnedSavedList(
  db: D1Database,
  id: string,
  ownerUserId: string,
) {
  const savedList = await db
    .prepare("SELECT * FROM saved_lists WHERE id = ? AND owner_user_id = ?")
    .bind(id, ownerUserId)
    .first<SavedListRow>();
  if (!savedList)
    throw new HttpError(404, "saved_list_not_found", "Saved list not found.");
  return savedList;
}

async function savedListDetail(db: D1Database, savedList: SavedListRow) {
  const words = await db
    .prepare(
      "SELECT word, example_sentence FROM saved_list_words WHERE saved_list_id = ? ORDER BY position",
    )
    .bind(savedList.id)
    .all<{ word: string; example_sentence: string | null }>();
  const wordDetails = words.results.map((row) => ({
    word: row.word,
    example_sentence: row.example_sentence ?? null,
  }));
  return {
    ...savedList,
    words: wordDetails.map((row) => row.word),
    word_details: wordDetails,
    example_sentences: Object.fromEntries(
      wordDetails.map((row) => [row.word, row.example_sentence]),
    ),
  };
}

async function listSavedLists(db: D1Database, ownerUserId: string) {
  const lists = await db
    .prepare(
      "SELECT * FROM saved_lists WHERE owner_user_id = ? ORDER BY updated_at DESC",
    )
    .bind(ownerUserId)
    .all<SavedListRow>();
  return Promise.all(
    lists.results.map((savedList) => savedListDetail(db, savedList)),
  );
}

async function createSavedList(
  env: Env,
  request: Request,
  ownerUserId: string,
) {
  const body = await readJson(request);
  const title = validateSavedListTitle(body.title);
  const words = parseWordEntries(
    body.words,
    body.exampleSentences ?? body.example_sentences ?? body.sentences,
  );
  const plan = await getPlan(env, ownerUserId);
  enforcePlanWordLimit(words, plan);
  const limit = PLAN_LIMITS[plan].savedLists ?? 2_147_483_647;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO saved_lists (id, owner_user_id, title, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM saved_lists WHERE owner_user_id = ?) < ?`,
    ).bind(id, ownerUserId, title, now, now, ownerUserId, limit),
    ...words.map((entry, position) =>
      env.DB.prepare(
        `INSERT INTO saved_list_words (id, saved_list_id, position, word, example_sentence)
         SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM saved_lists WHERE id = ?)`,
      ).bind(
        crypto.randomUUID(),
        id,
        position,
        entry.word,
        entry.example_sentence,
        id,
      ),
    ),
  ]);
  const savedList = await env.DB.prepare(
    "SELECT * FROM saved_lists WHERE id = ?",
  )
    .bind(id)
    .first<SavedListRow>();
  if (!savedList)
    throw new HttpError(
      403,
      "saved_list_limit",
      "Your saved-list limit has been reached.",
    );
  return savedListDetail(env.DB, savedList);
}

async function updateSavedList(
  env: Env,
  request: Request,
  savedList: SavedListRow,
) {
  const body = await readJson(request);
  const title = validateSavedListTitle(body.title);
  const words = parseWordEntries(
    body.words,
    body.exampleSentences ?? body.example_sentences ?? body.sentences,
  );
  const plan = await getPlan(env, savedList.owner_user_id);
  enforcePlanWordLimit(words, plan);
  const updatedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE saved_lists SET title = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?",
    ).bind(title, updatedAt, savedList.id, savedList.owner_user_id),
    env.DB.prepare("DELETE FROM saved_list_words WHERE saved_list_id = ?").bind(
      savedList.id,
    ),
    ...words.map((entry, position) =>
      env.DB.prepare(
        "INSERT INTO saved_list_words (id, saved_list_id, position, word, example_sentence) VALUES (?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        savedList.id,
        position,
        entry.word,
        entry.example_sentence,
      ),
    ),
  ]);
  return savedListDetail(env.DB, {
    ...savedList,
    title,
    updated_at: updatedAt,
  });
}

async function getOwnedLearner(
  db: D1Database,
  id: string,
  ownerUserId: string,
) {
  const learner = await db
    .prepare("SELECT * FROM learners WHERE id = ? AND owner_user_id = ?")
    .bind(id, ownerUserId)
    .first<LearnerRow>();
  if (!learner)
    throw new HttpError(404, "learner_not_found", "Learner not found.");
  return learner;
}

async function listLearners(db: D1Database, ownerUserId: string, plan: Plan) {
  const learners = await db
    .prepare(
      `SELECT l.*, COUNT(DISTINCT at.id) AS completed_attempts,
              COALESCE(ROUND(100.0 * SUM(ai.is_correct) / NULLIF(COUNT(ai.word_id), 0)), 0) AS accuracy,
              MAX(at.completed_at) AS last_practiced_at
       FROM learners l
       LEFT JOIN attempts at ON at.learner_id = l.id AND at.status = 'completed'
         AND at.completed_at >= ?
       LEFT JOIN attempt_items ai ON ai.attempt_id = at.id
       WHERE l.owner_user_id = ?
       GROUP BY l.id
       ORDER BY l.archived, l.updated_at DESC`,
    )
    .bind(historyCutoff(plan), ownerUserId)
    .all<LearnerRow>();
  return learners.results.map((learner) => ownerLearner(learner, plan));
}

async function createLearner(
  env: Env,
  request: Request,
  ownerUserId: string,
  generatePin = randomPin,
) {
  const body = await readJson(request);
  const { nickname: name } = validateNickname(body.name);
  const plan = await getPlan(env, ownerUserId);
  const limit = PLAN_LIMITS[plan].learnerProfiles;
  const id = crypto.randomUUID();
  const publicId = randomPublicId();
  const nameKey = `learner:${id}`;
  const now = new Date().toISOString();
  const { pin: joinPin, hash: joinPinHash } = await generateUniqueLearnerPin(
    env.DB,
    ownerUserId,
    generatePin,
  );
  const inserted = await env.DB.prepare(
    `INSERT INTO learners (id, owner_user_id, name, name_key, public_id, archived, created_at, updated_at, join_pin_hash, join_pin)
     SELECT ?, ?, ?, ?, ?, 0, ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM learners WHERE owner_user_id = ?) < ?`,
  )
    .bind(
      id,
      ownerUserId,
      name,
      nameKey,
      publicId,
      now,
      now,
      joinPinHash,
      joinPin,
      ownerUserId,
      limit,
    )
    .run();
  if (!inserted.meta.changes)
    throw new HttpError(
      403,
      "learner_limit",
      "Your saved learner profile limit has been reached.",
    );
  const learner = {
    id,
    owner_user_id: ownerUserId,
    name,
    name_key: nameKey,
    public_id: publicId,
    archived: 0,
    created_at: now,
    updated_at: now,
    join_pin_hash: joinPinHash,
    join_pin: joinPin,
  } satisfies LearnerRow;
  return ownerLearner(learner, plan);
}

async function updateLearner(
  db: D1Database,
  request: Request,
  learner: LearnerRow,
) {
  const body = await readJson(request);
  let name = learner.name;
  if (body.name !== undefined) {
    const validated = validateNickname(body.name);
    name = validated.nickname;
  }
  const archived =
    body.archived === undefined ? learner.archived : body.archived ? 1 : 0;
  const updatedAt = new Date().toISOString();
  await db
    .prepare(
      `UPDATE learners SET name = ?, archived = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ?`,
    )
    .bind(name, archived, updatedAt, learner.id, learner.owner_user_id)
    .run();
  const updated = {
    ...learner,
    name,
    archived,
    updated_at: updatedAt,
  };
  return updated;
}

async function learnerMastery(db: D1Database, learner: LearnerRow, plan: Plan) {
  const cutoff = historyCutoff(plan);
  const [attempts, itemRows] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS count, MAX(completed_at) AS last_practiced_at
         FROM attempts WHERE learner_id = ? AND status = 'completed' AND completed_at >= ?`,
      )
      .bind(learner.id, cutoff)
      .first<{ count: number; last_practiced_at: string | null }>(),
    db
      .prepare(
        `SELECT at.id AS attempt_id, at.completed_at, aw.word, aw.position,
                aw.example_sentence, ai.is_correct
         FROM attempts at
         JOIN assignments a ON a.id = at.assignment_id
         JOIN attempt_items ai ON ai.attempt_id = at.id
         JOIN assignment_words aw ON aw.id = ai.word_id
         WHERE at.learner_id = ? AND a.owner_user_id = ?
           AND at.status = 'completed' AND at.completed_at >= ?
         ORDER BY at.completed_at, at.rowid, aw.position`,
      )
      .bind(learner.id, learner.owner_user_id, cutoff)
      .all<{
        attempt_id: string;
        completed_at: string;
        word: string;
        position: number;
        example_sentence: string | null;
        is_correct: number;
      }>(),
  ]);
  const grouped = new Map<
    string,
    {
      word: string;
      results: boolean[];
      reviewResults: Array<{ correct: boolean; practicedAt: string }>;
      correctCount: number;
      incorrectCount: number;
      lastPracticedAt: string;
      lastIncorrectAt: string | null;
      exampleSentence: string | null;
    }
  >();
  for (const row of itemRows.results) {
    const key = normalizeWord(row.word);
    const current = grouped.get(key) ?? {
      word: row.word,
      results: [],
      reviewResults: [],
      correctCount: 0,
      incorrectCount: 0,
      lastPracticedAt: row.completed_at,
      lastIncorrectAt: null,
      exampleSentence: null,
    };
    const correct = row.is_correct === 1;
    current.word = row.word;
    current.results.push(correct);
    current.reviewResults.push({ correct, practicedAt: row.completed_at });
    current.correctCount += correct ? 1 : 0;
    current.incorrectCount += correct ? 0 : 1;
    current.lastPracticedAt = row.completed_at;
    if (!correct) current.lastIncorrectAt = row.completed_at;
    if (row.example_sentence) current.exampleSentence = row.example_sentence;
    grouped.set(key, current);
  }
  const words = [...grouped.values()].map(
    ({ results, reviewResults, ...word }) => {
      const evidence = masteryEvidence(reviewResults);
      return {
        ...word,
        status: evidence.status,
        lastResult: results.at(-1) ? "correct" : "incorrect",
        consecutiveCorrect: evidence.consecutiveCorrect,
        practiceDays: evidence.practiceDays,
        crossDayConfirmed: evidence.crossDayConfirmed,
        reviewState: calculateReviewState(reviewResults),
      };
    },
  );
  const reviewWords = words
    .filter((word) => word.reviewState?.due)
    .sort(
      (a, b) =>
        a.reviewState!.consecutiveCorrectAfterLastMiss -
          b.reviewState!.consecutiveCorrectAfterLastMiss ||
        b.reviewState!.recentMissCount - a.reviewState!.recentMissCount ||
        a.reviewState!.dueAt.localeCompare(b.reviewState!.dueAt) ||
        a.word.localeCompare(b.word),
    );
  const correctItems = words.reduce((sum, word) => sum + word.correctCount, 0);
  const totalItems = words.reduce(
    (sum, word) => sum + word.correctCount + word.incorrectCount,
    0,
  );
  return {
    learner: {
      ...ownerLearner(learner, plan),
      archived: Boolean(learner.archived),
    },
    historyDays: PLAN_LIMITS[plan].historyDays,
    smartReview: PLAN_LIMITS[plan].smartReview,
    todaysReview: {
      count: reviewWords.length,
      words: PLAN_LIMITS[plan].smartReview
        ? reviewWords.slice(0, 20).map((word) => ({
            word: word.word,
            recentMissCount: word.reviewState!.recentMissCount,
            lastPracticedAt: word.reviewState!.lastPracticedAt,
            consecutiveCorrectAfterLastMiss:
              word.reviewState!.consecutiveCorrectAfterLastMiss,
            dueAt: word.reviewState!.dueAt,
            exampleSentence: word.exampleSentence,
          }))
        : null,
    },
    summary: {
      completedAttempts: Number(attempts?.count ?? 0),
      accuracy: totalItems ? Math.round((correctItems / totalItems) * 100) : 0,
      lastPracticedAt: attempts?.last_practiced_at ?? null,
      mastered: words.filter((word) => word.status === "mastered").length,
      learning: words.filter((word) => word.status === "learning").length,
      needsReview: words.filter((word) => word.status === "needs_review")
        .length,
    },
    words: words
      .map(
        ({ reviewState: _reviewState, exampleSentence: _sentence, ...word }) =>
          word,
      )
      .sort((a, b) => b.lastPracticedAt.localeCompare(a.lastPracticedAt)),
  };
}

async function workspaceProgress(
  db: D1Database,
  learners: LearnerRow[],
  plan: Plan,
) {
  const result = new Map<
    string,
    {
      mastery: { mastered: number; learning: number; needsReview: number };
      missedWords: Array<{ word: string; misses: number }>;
    }
  >();
  for (const learner of learners)
    result.set(learner.id, {
      mastery: { mastered: 0, learning: 0, needsReview: 0 },
      missedWords: [],
    });
  if (!learners.length) return result;
  const placeholders = learners.map(() => "?").join(",");
  const rows = await db
    .prepare(
      `SELECT at.learner_id, at.completed_at, aw.word, aw.position, ai.is_correct
       FROM attempts at
       JOIN assignments a ON a.id = at.assignment_id
       JOIN attempt_items ai ON ai.attempt_id = at.id
       JOIN assignment_words aw ON aw.id = ai.word_id
       WHERE at.learner_id IN (${placeholders}) AND a.owner_user_id = ?
         AND at.status = 'completed' AND at.completed_at >= ?
       ORDER BY at.learner_id, at.completed_at, at.rowid, aw.position`,
    )
    .bind(
      ...learners.map((learner) => learner.id),
      learners[0].owner_user_id,
      historyCutoff(plan),
    )
    .all<{
      learner_id: string;
      completed_at: string;
      word: string;
      position: number;
      is_correct: number;
    }>();
  const grouped = new Map<
    string,
    Map<
      string,
      {
        word: string;
        results: Array<{ correct: boolean; practicedAt: string }>;
        misses: number;
      }
    >
  >();
  for (const row of rows.results) {
    const words = grouped.get(row.learner_id) ?? new Map();
    const key = normalizeWord(row.word);
    const current = words.get(key) ?? {
      word: row.word,
      results: [],
      misses: 0,
    };
    const correct = row.is_correct === 1;
    current.word = row.word;
    current.results.push({ correct, practicedAt: row.completed_at });
    if (!correct) current.misses += 1;
    words.set(key, current);
    grouped.set(row.learner_id, words);
  }
  for (const learner of learners) {
    const summary = result.get(learner.id)!;
    for (const word of grouped.get(learner.id)?.values() ?? []) {
      const status = masteryEvidence(word.results).status;
      if (status === "mastered") summary.mastery.mastered += 1;
      else if (status === "needs_review") summary.mastery.needsReview += 1;
      else summary.mastery.learning += 1;
      if (word.misses)
        summary.missedWords.push({ word: word.word, misses: word.misses });
    }
    summary.missedWords.sort(
      (a, b) => b.misses - a.misses || a.word.localeCompare(b.word),
    );
    summary.missedWords = summary.missedWords.slice(0, 20);
  }
  return result;
}

function requireSmartReview(plan: Plan) {
  if (!PLAN_LIMITS[plan].smartReview)
    throw new HttpError(
      403,
      "smart_review_required",
      "Smart Review is included in Parent and Teacher Plans.",
    );
}

async function learnerReview(db: D1Database, learner: LearnerRow, plan: Plan) {
  requireSmartReview(plan);
  const mastery = await learnerMastery(db, learner, plan);
  return {
    words: mastery.words
      .filter((word) => word.incorrectCount > 0 && word.status !== "mastered")
      .sort(
        (a, b) =>
          String(b.lastIncorrectAt).localeCompare(String(a.lastIncorrectAt)) ||
          b.incorrectCount - a.incorrectCount,
      )
      .slice(0, 10)
      .map((word) => word.word),
  };
}

async function assignmentReview(
  db: D1Database,
  assignment: AssignmentRow,
  plan: Plan,
) {
  requireSmartReview(plan);
  const rows = await db
    .prepare(
      `SELECT aw.word, COUNT(*) AS misses, MAX(at.completed_at) AS last_missed_at
       FROM attempt_items ai
       JOIN attempts at ON at.id = ai.attempt_id
       JOIN assignment_words aw ON aw.id = ai.word_id
       WHERE at.assignment_id = ? AND at.status = 'completed'
         AND ai.is_correct = 0 AND at.completed_at >= ?
       GROUP BY lower(aw.word)
       ORDER BY last_missed_at DESC, misses DESC LIMIT 10`,
    )
    .bind(assignment.id, historyCutoff(plan))
    .all<{ word: string }>();
  return { words: rows.results.map((row) => row.word) };
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
  const words = parseWordEntries(
    body.words,
    body.exampleSentences ?? body.example_sentences ?? body.sentences,
  );
  const mode = validateMode(body.mode);
  const maxAttempts = validateMaxAttempts(body.maxAttempts);
  const expiresAt = validateDeadline(body.expiresAt);
  const learnerIds = body.learnerIds === undefined ? [] : body.learnerIds;
  if (
    !Array.isArray(learnerIds) ||
    learnerIds.some((id) => typeof id !== "string")
  )
    throw new HttpError(400, "invalid_learners", "Choose valid students.");
  const uniqueLearnerIds = [...new Set(learnerIds as string[])];
  if (uniqueLearnerIds.length) {
    const placeholders = uniqueLearnerIds.map(() => "?").join(",");
    const owned = await env.DB.prepare(
      `SELECT id FROM learners WHERE owner_user_id = ? AND archived = 0 AND id IN (${placeholders})`,
    )
      .bind(userId, ...uniqueLearnerIds)
      .all<{ id: string }>();
    if (owned.results.length !== uniqueLearnerIds.length)
      throw new HttpError(
        403,
        "learner_forbidden",
        "A selected student is not available.",
      );
  }
  const plan = await getPlan(env, userId);
  enforcePlanWordLimit(words, plan);
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
    ...words.map((entry, position) =>
      env.DB.prepare(
        `INSERT INTO assignment_words (id, assignment_id, position, word, example_sentence)
           SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM assignments WHERE id = ?)`,
      ).bind(
        crypto.randomUUID(),
        id,
        position,
        entry.word,
        entry.example_sentence,
        id,
      ),
    ),
    ...uniqueLearnerIds.map((learnerId) =>
      env.DB.prepare(
        `INSERT INTO assignment_learners (assignment_id, learner_id, created_at)
         SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM assignments WHERE id = ?)`,
      ).bind(id, learnerId, createdAt, id),
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
  const hasWords = Object.hasOwn(body, "words");
  const hasMode = Object.hasOwn(body, "mode");
  const hasTitle = Object.hasOwn(body, "title");
  const hasMaxAttempts = Object.hasOwn(body, "maxAttempts");
  const hasDeadline = Object.hasOwn(body, "expiresAt");
  const hasLearners = Object.hasOwn(body, "learnerIds");
  const hasStatus = Object.hasOwn(body, "status");
  const hasAssignmentChanges =
    hasTitle || hasWords || hasMode || hasMaxAttempts || hasDeadline;

  const title =
    hasTitle || hasWords
      ? validateTitle(body.title ?? assignment.title)
      : assignment.title;
  const mode = hasMode ? validateMode(body.mode) : assignment.mode;
  const maxAttempts = hasMaxAttempts
    ? validateMaxAttempts(body.maxAttempts)
    : assignment.max_attempts;
  const expiresAt = hasDeadline
    ? validateDeadline(body.expiresAt)
    : assignment.expires_at;
  const words = hasWords
    ? parseWordEntries(
        body.words,
        body.exampleSentences ?? body.example_sentences ?? body.sentences,
      )
    : null;

  let learnerIds: string[] | null = null;
  if (hasLearners) {
    if (
      !Array.isArray(body.learnerIds) ||
      body.learnerIds.some((id) => typeof id !== "string")
    )
      throw new HttpError(400, "invalid_learners", "Choose valid students.");
    learnerIds = [...new Set(body.learnerIds as string[])];
    if (learnerIds.length) {
      const placeholders = learnerIds.map(() => "?").join(",");
      const owned = await env.DB.prepare(
        `SELECT id FROM learners WHERE owner_user_id = ? AND archived = 0 AND id IN (${placeholders})`,
      )
        .bind(userId, ...learnerIds)
        .all<{ id: string }>();
      if (owned.results.length !== learnerIds.length)
        throw new HttpError(
          403,
          "learner_forbidden",
          "A selected student is not available.",
        );
    }
  }

  if (hasWords || (hasMode && mode !== assignment.mode)) {
    const attempt = await env.DB.prepare(
      "SELECT 1 FROM attempts WHERE assignment_id = ? LIMIT 1",
    )
      .bind(assignment.id)
      .first();
    if (attempt) {
      throw new HttpError(
        409,
        "assignment_has_results",
        "Assignments with student attempts cannot change their word list or practice mode.",
      );
    }
    if (words) enforcePlanWordLimit(words, await getPlan(env, userId));
  }

  if (hasStatus && body.status !== "published" && body.status !== "closed") {
    throw new HttpError(
      400,
      "invalid_status",
      "Assignments can be published or closed.",
    );
  }
  const status = hasStatus
    ? (body.status as AssignmentRow["status"])
    : assignment.status;
  const reopening =
    hasStatus && status === "published" && assignment.status !== "published";
  if (hasStatus && status === "published") {
    if (expiresAt <= new Date().toISOString()) {
      throw new HttpError(
        409,
        "assignment_expired",
        "Expired assignments cannot be reopened.",
      );
    }
    if (reopening) {
      const plan = await getPlan(env, userId);
      const active = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM assignments
         WHERE owner_user_id = ? AND status = 'published' AND expires_at > ?`,
      )
        .bind(userId, new Date().toISOString())
        .first<{ count: number }>();
      if (Number(active?.count ?? 0) >= PLAN_LIMITS[plan].activeAssignments)
        throw new HttpError(
          403,
          "active_assignment_limit",
          "Your active assignment limit has been reached.",
        );
    }
  }

  if (!hasAssignmentChanges && !hasLearners && !hasStatus)
    throw new HttpError(
      400,
      "invalid_status",
      "Assignments can be published or closed.",
    );

  const statements: D1PreparedStatement[] = [];
  if (hasAssignmentChanges || hasStatus) {
    const closedAt = hasStatus
      ? status === "closed"
        ? new Date().toISOString()
        : null
      : (assignment.closed_at ?? null);
    statements.push(
      env.DB.prepare(
        `UPDATE assignments SET title = ?, mode = ?, max_attempts = ?, expires_at = ?, status = ?, closed_at = ?
         WHERE id = ? AND owner_user_id = ?`,
      ).bind(
        title,
        mode,
        maxAttempts,
        expiresAt,
        status,
        closedAt,
        assignment.id,
        userId,
      ),
    );
  }
  if (words) {
    statements.push(
      env.DB.prepare(
        "DELETE FROM assignment_words WHERE assignment_id = ?",
      ).bind(assignment.id),
      ...words.map((entry, position) =>
        env.DB.prepare(
          "INSERT INTO assignment_words (id, assignment_id, position, word, example_sentence) VALUES (?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          assignment.id,
          position,
          entry.word,
          entry.example_sentence,
        ),
      ),
    );
  }
  if (learnerIds) {
    const createdAt = new Date().toISOString();
    statements.push(
      env.DB.prepare(
        "DELETE FROM assignment_learners WHERE assignment_id = ?",
      ).bind(assignment.id),
      ...learnerIds.map((learnerId) =>
        env.DB.prepare(
          `INSERT INTO assignment_learners (assignment_id, learner_id, created_at)
           VALUES (?, (SELECT id FROM learners
                       WHERE id = ? AND owner_user_id = ? AND archived = 0), ?)`,
        ).bind(assignment.id, learnerId, userId, createdAt),
      ),
    );
  }
  await env.DB.batch(statements);

  if (!hasAssignmentChanges && !hasLearners) return { status };
  return assignmentDetail(
    env.DB,
    {
      ...assignment,
      title,
      mode,
      max_attempts: maxAttempts,
      expires_at: expiresAt,
      status,
    },
    await getPlan(env, userId),
  );
}

async function publicAssignment(
  db: D1Database,
  publicId: string,
  learnerPublicId?: string,
) {
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
  let learner: Pick<LearnerRow, "id" | "public_id" | "name"> | undefined;
  if (learnerPublicId !== undefined) {
    if (!/^[A-Za-z0-9_-]{24}$/.test(learnerPublicId))
      throw new HttpError(404, "learner_not_found", "Learner not found.");
    learner =
      (await db
        .prepare(
          `SELECT id, public_id, name FROM learners
         WHERE public_id = ? AND owner_user_id = ? AND archived = 0`,
        )
        .bind(learnerPublicId, assignment.owner_user_id)
        .first<Pick<LearnerRow, "id" | "public_id" | "name">>()) ?? undefined;
    if (!learner)
      throw new HttpError(404, "learner_not_found", "Learner not found.");
    const relationCount = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM assignment_learners WHERE assignment_id = ?",
      )
      .bind(assignment.id)
      .first<{ count: number }>();
    if (Number(relationCount?.count ?? 0) > 0) {
      const bound = await db
        .prepare(
          "SELECT 1 FROM assignment_learners WHERE assignment_id = ? AND learner_id = ?",
        )
        .bind(assignment.id, learner.id)
        .first();
      if (!bound)
        throw new HttpError(404, "learner_not_found", "Learner not found.");
    }
  }
  const words = await db
    .prepare(
      "SELECT id, position, word, example_sentence FROM assignment_words WHERE assignment_id = ? ORDER BY position",
    )
    .bind(assignment.id)
    .all<AssignmentWord>();
  return { ...assignment, words: words.results, learner };
}

async function loadAttemptResult(
  db: D1Database,
  attemptId: string,
  publicId: string,
) {
  const attempt = await db
    .prepare(
      `SELECT at.id, at.nickname, at.attempt_number, at.score, at.correct_count, at.incorrect_count,
              at.accuracy, at.duration_seconds, at.completed_at, at.status
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
  const hasLearnerToken = Object.hasOwn(body, "learnerPublicId");
  if (hasLearnerToken && typeof body.learnerPublicId !== "string")
    throw new HttpError(404, "learner_not_found", "Learner not found.");
  const learnerPublicId = hasLearnerToken
    ? (body.learnerPublicId as string)
    : undefined;
  const assignment = await publicAssignment(env.DB, publicId, learnerPublicId);
  const existing = await loadAttemptResult(env.DB, attemptId, publicId);
  if (existing) return existing;
  const learner = assignment.learner;
  const { nickname, nicknameKey } = learner
    ? {
        nickname: learner.name,
        nicknameKey: `learner:${learner.id}`,
      }
    : validateNickname(body.nickname);
  const durationSeconds = validateDuration(body.durationSeconds);
  const words = assignment.words;
  const completed = body.completed !== false;
  const result = scoreAnswers(words, body.answers, completed);
  const plan = await getPlan(env, assignment.owner_user_id);
  const limits = PLAN_LIMITS[plan];
  const now = new Date();
  const completedAt = now.toISOString();
  const retentionExpiresAt = addDays(completedAt, limits.retentionDays);
  const monthKey = monthStart(now);
  const monthlyLimit = completed
    ? (limits.monthlyAttempts ?? 2_147_483_647)
    : 2_147_483_647;
  const statements = [
    ...(completed
      ? []
      : [
          env.DB.prepare(
            `DELETE FROM attempts
             WHERE status = 'incomplete' AND nickname_key = ?
               AND assignment_id = (
                 SELECT id FROM assignments
                 WHERE public_id = ? AND status = 'published' AND expires_at > ?
               )`,
          ).bind(nicknameKey, publicId, completedAt),
        ]),
    env.DB.prepare(
      `INSERT OR IGNORE INTO attempts (
            id, assignment_id, nickname, nickname_key, attempt_number, score,
            correct_count, incorrect_count, accuracy, duration_seconds,
            completed_at, retention_expires_at, status, learner_id
          )
         SELECT ?, a.id, ?, ?,
           CASE WHEN ? = 1 THEN
             (SELECT COALESCE(MAX(x.attempt_number), 0) + 1 FROM attempts x
              WHERE x.assignment_id = a.id AND x.nickname_key = ? AND x.status = 'completed')
           END,
            ?, ?, ?, ?, ?, ?, ?, ?, ?
         FROM assignments a
         WHERE a.public_id = ? AND a.status = 'published' AND a.expires_at > ?
           AND (? = 0 OR (SELECT COUNT(*) FROM attempts x
                          WHERE x.assignment_id = a.id AND x.nickname_key = ?
                            AND x.status = 'completed') < a.max_attempts)
            AND (SELECT COUNT(*) FROM monthly_submission_usage mu
                 WHERE mu.user_id = a.owner_user_id AND mu.month_key = ?) < ?`,
    ).bind(
      attemptId,
      nickname,
      nicknameKey,
      completed ? 1 : 0,
      nicknameKey,
      result.score,
      result.correctCount,
      result.incorrectCount,
      result.accuracy,
      durationSeconds,
      completedAt,
      retentionExpiresAt,
      completed ? "completed" : "incomplete",
      learner?.id ?? null,
      publicId,
      completedAt,
      completed ? 1 : 0,
      nicknameKey,
      monthKey,
      monthlyLimit,
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
         JOIN assignments a ON a.id = at.assignment_id
         WHERE at.id = ? AND at.status = 'completed'`,
    ).bind(attemptId, monthKey, completedAt, attemptId),
  ];
  await env.DB.batch(statements);
  const saved = await loadAttemptResult(env.DB, attemptId, publicId);
  if (saved) return saved;
  const attemptCount = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM attempts
     WHERE assignment_id = ? AND nickname_key = ? AND status = 'completed'`,
  )
    .bind(assignment.id, nicknameKey)
    .first<{ count: number }>();
  if (
    completed &&
    Number(attemptCount?.count ?? 0) >= assignment.max_attempts
  ) {
    throw new HttpError(
      403,
      "attempt_limit",
      "This nickname has used all allowed attempts.",
    );
  }
  const currentUsage = await usage(env.DB, assignment.owner_user_id, plan, now);
  if (
    completed &&
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
    409,
    "attempt_conflict",
    "The attempt could not be numbered. Please retry.",
  );
}

async function exportCsv(
  db: D1Database,
  assignment: AssignmentRow,
  plan: Plan,
) {
  if (!PLAN_LIMITS[plan].csvExport)
    throw new HttpError(
      403,
      "pro_required",
      "CSV export is included in the Teacher Plan.",
    );
  const detail = await assignmentDetail(db, assignment, plan);
  const lines = [
    [
      "Nickname",
      "Attempt",
      "Status",
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
        attempt.status,
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
      !(
        (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) ||
        (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET)
      )
    ) {
      throw new HttpError(
        503,
        "auth_not_configured",
        "Teacher sign-in is not configured yet.",
      );
    }
    const authRequest = await restrictTeacherAuthCallback(request);
    return createAuth(env, authRequest).handler(authRequest);
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
      microsoftAuthConfigured: Boolean(
        env.BETTER_AUTH_SECRET &&
        env.MICROSOFT_CLIENT_ID &&
        env.MICROSOFT_CLIENT_SECRET,
      ),
      billingConfigured: Boolean(
        env.STRIPE_SECRET_KEY &&
        env.STRIPE_PRICE_MONTHLY &&
        env.STRIPE_PRICE_YEARLY &&
        env.STRIPE_WEBHOOK_SECRET,
      ),
    });
  }

  if (url.pathname.startsWith("/api/admin/")) {
    await requireAdmin(env, request, getSession);
    if (method !== "GET")
      throw new HttpError(405, "method_not_allowed", "Only GET is allowed.");
    if (url.pathname === "/api/admin/stats") return json(await adminStats(env));
    if (url.pathname === "/api/admin/users")
      return json(await adminUsers(env, url));
    throw new HttpError(404, "admin_not_found", "Admin endpoint not found.");
  }

  const publicMatch = url.pathname.match(
    /^\/api\/public\/assignments\/([A-Za-z0-9_-]{24})$/,
  );
  if (publicMatch && method === "GET") {
    const learnerPublicId = url.searchParams.has("learner")
      ? (url.searchParams.get("learner") ?? "")
      : undefined;
    const assignment = await publicAssignment(
      env.DB,
      publicMatch[1],
      learnerPublicId,
    );
    return json({
      title: assignment.title,
      mode: assignment.mode,
      max_attempts: assignment.max_attempts,
      expires_at: assignment.expires_at,
      words: assignment.words,
      ...(assignment.learner
        ? { learner: { name: assignment.learner.name } }
        : {}),
    });
  }
  const submitMatch = url.pathname.match(
    /^\/api\/public\/assignments\/([A-Za-z0-9_-]{24})\/attempts$/,
  );
  if (submitMatch && method === "POST") {
    requireSameOrigin(request);
    return json(await submitAttempt(env, request, submitMatch[1]), 201);
  }

  const publicLearnerMatch = url.pathname.match(
    /^\/api\/public\/learners\/([A-Za-z0-9_-]{24})$/,
  );
  if (publicLearnerMatch && method === "GET") {
    const learner = await env.DB.prepare(
      `SELECT id, name, owner_user_id FROM learners
       WHERE public_id = ? AND archived = 0`,
    )
      .bind(publicLearnerMatch[1])
      .first<{ id: string; name: string; owner_user_id: string }>();
    if (!learner)
      throw new HttpError(404, "learner_not_found", "Learner not found.");
    const assignments = await env.DB.prepare(
      `SELECT a.public_id, a.title, a.mode, a.expires_at,
              CASE WHEN EXISTS (
                SELECT 1 FROM attempts at WHERE at.assignment_id = a.id
                  AND at.learner_id = ? AND at.status = 'completed'
              ) THEN 1 ELSE 0 END AS completed
       FROM assignments a
       JOIN assignment_learners al ON al.assignment_id = a.id AND al.learner_id = ?
       WHERE a.owner_user_id = ? AND a.status = 'published' AND a.expires_at > ?
       ORDER BY completed, a.expires_at ASC, a.created_at DESC`,
    )
      .bind(
        learner.id,
        learner.id,
        learner.owner_user_id,
        new Date().toISOString(),
      )
      .all<
        Pick<AssignmentRow, "public_id" | "title" | "mode" | "expires_at"> & {
          completed: number;
        }
      >();
    return json({
      learner: { name: learner.name },
      assignments: assignments.results,
    });
  }

  if (url.pathname === "/api/workspace" && method === "PATCH") {
    requireSameOrigin(request);
    const user = await requireTeacher(env, request, getSession);
    const body = await readJson(request);
    if (body.workspaceType !== "family" && body.workspaceType !== "teacher")
      throw new HttpError(
        400,
        "invalid_workspace_type",
        "Choose family or teacher.",
      );
    await env.DB.prepare("UPDATE user SET workspace_type = ? WHERE id = ?")
      .bind(body.workspaceType, user.id)
      .run();
    return json({ workspaceType: body.workspaceType });
  }

  const joinMatch = url.pathname.match(
    /^\/api\/public\/join\/([A-Za-z0-9_-]{8,24})$/,
  );
  if (joinMatch && method === "POST") {
    requireSameOrigin(request);
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const allowed = await env.CREATE_LIMITER.limit({
      key: `join:${joinMatch[1]}:${clientIp}`,
    });
    if (!allowed.success)
      throw new HttpError(
        429,
        "rate_limited",
        "Too many requests. Try again shortly.",
      );
    const body = await readJson(request);
    if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin))
      throw new HttpError(401, "invalid_join", "The PIN is invalid.");
    const hash = await hashPin(body.pin);
    const learner = await env.DB.prepare(
      `SELECT l.public_id, l.owner_user_id
       FROM learners l JOIN user u ON u.id = l.owner_user_id
       WHERE u.class_public_id = ? AND l.join_pin_hash = ? AND l.archived = 0`,
    )
      .bind(joinMatch[1], hash)
      .first<{ public_id: string; owner_user_id: string }>();
    if (!learner || (await getPlan(env, learner.owner_user_id)) !== "teacher")
      throw new HttpError(401, "invalid_join", "The PIN is invalid.");
    return json({ learnerPublicId: learner.public_id });
  }

  if (url.pathname === "/api/me" && method === "GET") {
    const user = await requireTeacher(env, request, getSession);
    const subscription = await env.DB.prepare(
      `SELECT plan, status, billing_interval, current_period_end, stripe_price_id,
              stripe_customer_id, stripe_subscription_id
       FROM subscriptions WHERE user_id = ?`,
    )
      .bind(user.id)
      .first<{
        plan: string;
        status: string;
        billing_interval: "month" | "year" | null;
        current_period_end: string | null;
        stripe_price_id: string | null;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
      }>();
    const workspace = await env.DB.prepare(
      "SELECT workspace_type, class_public_id FROM user WHERE id = ?",
    )
      .bind(user.id)
      .first<{
        workspace_type: "family" | "teacher" | null;
        class_public_id: string | null;
      }>();
    const plan = resolvePlan(
      subscription?.plan,
      workspace?.workspace_type,
      hasActiveSubscription(subscription ?? null, env),
    );
    const classPublicId =
      plan === "teacher"
        ? await ensureTeacherJoinIdentity(
            env.DB,
            user.id,
            overrides.pinGenerator,
          )
        : null;
    return json({
      user: { id: user.id, name: user.name, email: user.email },
      billingInterval: subscription?.billing_interval || null,
      subscriptionStatus: subscription?.status || null,
      workspaceType: workspace?.workspace_type ?? null,
      classPublicId,
      ...(await usage(env.DB, user.id, plan)),
    });
  }

  if (url.pathname === "/api/saved-lists") {
    const user = await requireTeacher(env, request, getSession);
    if (method === "GET")
      return json({ savedLists: await listSavedLists(env.DB, user.id) });
    if (method === "POST") {
      requireSameOrigin(request);
      return json(await createSavedList(env, request, user.id), 201);
    }
  }

  if (url.pathname === "/api/sentence-library/match" && method === "POST") {
    requireSameOrigin(request);
    const user = await requireTeacher(env, request, getSession);
    const plan = await getPlan(env, user.id);
    if (!PLAN_LIMITS[plan].sentenceLibrary)
      throw new HttpError(
        403,
        "sentence_library_required",
        "Sentence library is included in Parent and Teacher Plans.",
      );
    const body = await readJson(request);
    const words = parseWordList(body.words);
    const difficulty =
      body.difficulty === undefined ? "simple" : body.difficulty;
    if (difficulty !== "simple" && difficulty !== "difficult")
      throw new HttpError(
        400,
        "invalid_sentence_level",
        "Choose simple or difficult sentences.",
      );
    return json({
      matches: await matchSentenceLibrary(env.DB, words, difficulty),
    });
  }

  const savedListMatch = url.pathname.match(
    /^\/api\/saved-lists\/([0-9a-f-]{36})$/i,
  );
  if (savedListMatch) {
    const user = await requireTeacher(env, request, getSession);
    const savedList = await getOwnedSavedList(
      env.DB,
      savedListMatch[1],
      user.id,
    );
    if (method === "GET") return json(await savedListDetail(env.DB, savedList));
    if (method === "PATCH") {
      requireSameOrigin(request);
      return json(await updateSavedList(env, request, savedList));
    }
    if (method === "DELETE") {
      requireSameOrigin(request);
      await env.DB.prepare(
        "DELETE FROM saved_lists WHERE id = ? AND owner_user_id = ?",
      )
        .bind(savedList.id, user.id)
        .run();
      return new Response(null, { status: 204 });
    }
  }

  if (url.pathname === "/api/learners") {
    const user = await requireTeacher(env, request, getSession);
    const plan = await getPlan(env, user.id);
    if (method === "GET")
      return json({
        learners: await listLearners(env.DB, user.id, plan),
        historyDays: PLAN_LIMITS[plan].historyDays,
        smartReview: PLAN_LIMITS[plan].smartReview,
      });
    if (method === "POST") {
      requireSameOrigin(request);
      return json(
        await createLearner(env, request, user.id, overrides.pinGenerator),
        201,
      );
    }
  }

  const learnerReviewMatch = url.pathname.match(
    /^\/api\/learners\/([0-9a-f-]{36})\/review$/i,
  );
  if (learnerReviewMatch && method === "POST") {
    requireSameOrigin(request);
    const user = await requireTeacher(env, request, getSession);
    const learner = await getOwnedLearner(
      env.DB,
      learnerReviewMatch[1],
      user.id,
    );
    return json(
      await learnerReview(env.DB, learner, await getPlan(env, user.id)),
    );
  }

  const learnerMatch = url.pathname.match(
    /^\/api\/learners\/([0-9a-f-]{36})$/i,
  );
  if (learnerMatch) {
    const user = await requireTeacher(env, request, getSession);
    const learner = await getOwnedLearner(env.DB, learnerMatch[1], user.id);
    if (method === "GET")
      return json(
        await learnerMastery(env.DB, learner, await getPlan(env, user.id)),
      );
    if (method === "PATCH") {
      requireSameOrigin(request);
      return json(
        ownerLearner(
          await updateLearner(env.DB, request, learner),
          await getPlan(env, user.id),
        ),
      );
    }
  }

  if (url.pathname === "/api/assignments") {
    const user = await requireTeacher(env, request, getSession);
    if (method === "GET") {
      const plan = await getPlan(env, user.id);
      const learners = await listLearners(env.DB, user.id, plan);
      const includeProgress =
        request.headers.get("x-workspace-review-counts") === "1";
      const progress = includeProgress
        ? await workspaceProgress(env.DB, learners, plan)
        : null;
      const learnersWithProgress = includeProgress
        ? learners.map((learner) => {
            const current = progress!.get(learner.id)!;
            return {
              ...learner,
              needs_review_count: current.mastery.needsReview,
              mastery: current.mastery,
              missed_words: current.missedWords,
            };
          })
        : learners;
      return json({
        assignments: await listAssignments(env.DB, user.id, plan),
        savedLists: await listSavedLists(env.DB, user.id),
        learners: learnersWithProgress,
        missedWords: includeProgress
          ? [...progress!.values()]
              .flatMap((value) => value.missedWords)
              .reduce(
                (all, item) => {
                  const existing = all.find(
                    (entry) =>
                      normalizeWord(entry.word) === normalizeWord(item.word),
                  );
                  if (existing) existing.misses += item.misses;
                  else all.push({ ...item });
                  return all;
                },
                [] as Array<{ word: string; misses: number }>,
              )
              .sort(
                (a, b) => b.misses - a.misses || a.word.localeCompare(b.word),
              )
              .slice(0, 20)
          : undefined,
        usage: await usage(env.DB, user.id, plan),
      });
    }
    if (method === "POST") {
      requireSameOrigin(request);
      return json(await createAssignment(env, request, user.id), 201);
    }
  }

  const assignmentReviewMatch = url.pathname.match(
    /^\/api\/assignments\/([0-9a-f-]{36})\/review$/i,
  );
  if (assignmentReviewMatch && method === "POST") {
    requireSameOrigin(request);
    const user = await requireTeacher(env, request, getSession);
    const assignment = await getOwnedAssignment(
      env.DB,
      assignmentReviewMatch[1],
      user.id,
    );
    return json(
      await assignmentReview(env.DB, assignment, await getPlan(env, user.id)),
    );
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
        await assignmentDetail(env.DB, assignment, await getPlan(env, user.id)),
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
    return exportCsv(env.DB, assignment, await getPlan(env, user.id));
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
    if (
      body.plan !== undefined &&
      body.plan !== "parent" &&
      body.plan !== "teacher"
    ) {
      throw new HttpError(
        400,
        "invalid_plan",
        "Choose a supported subscription plan.",
      );
    }
    const checkout = await createCheckout(
      env,
      env.DB,
      user,
      body.interval,
      url.origin,
      {
        locale: typeof body.locale === "string" ? body.locale : undefined,
        plan: body.plan === "parent" ? "parent" : "teacher",
      },
    );
    return json({ url: checkout.url });
  }

  if (url.pathname === "/api/billing/portal" && method === "POST") {
    requireSameOrigin(request);
    const user = await requireTeacher(env, request, getSession);
    const body = await readJson(request);
    const portal = await createPortal(env, env.DB, user.id, url.origin, {
      locale: typeof body.locale === "string" ? body.locale : undefined,
    });
    return json({ url: portal.url });
  }

  if (url.pathname === "/teacher" || url.pathname.startsWith("/teacher/")) {
    return serveShell(env, request, "/src/pages/teacher.html", true);
  }
  if (url.pathname === "/admin") {
    return serveShell(env, request, "/src/pages/admin.html", true);
  }
  if (/^\/a\/[A-Za-z0-9_-]{24}$/.test(url.pathname)) {
    return serveShell(env, request, "/src/pages/assignment.html", true);
  }
  if (/^\/l\/[A-Za-z0-9_-]{24}$/.test(url.pathname)) {
    return serveShell(env, request, "/src/pages/learner.html", true);
  }
  if (/^\/join\/[A-Za-z0-9_-]{8,24}$/.test(url.pathname)) {
    return serveShell(env, request, "/src/pages/join.html", true);
  }
  return env.ASSETS.fetch(request);
}

export async function scheduled(_controller: ScheduledController, env: Env) {
  const now = new Date();
  const staleAssignments = new Date(
    now.getTime() - 366 * 86_400_000,
  ).toISOString();
  const staleUsage = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1),
  ).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM attempts WHERE retention_expires_at < ?").bind(
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
