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
  csvCell,
  masteryStatus,
  monthStart,
  normalizeWord,
  parseWordList,
  randomPublicId,
  scoreAnswers,
  validateAttemptId,
  validateDeadline,
  validateDuration,
  validateMaxAttempts,
  validateMode,
  validateNickname,
  validateSavedListTitle,
  validateTitle,
  type AssignmentWord,
  type Plan,
} from "./domain";
import {
  createCheckout,
  createPortal,
  hasActiveSubscription,
  isTrialEligible,
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
  archived: number;
  created_at: string;
  updated_at: string;
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
       (SELECT COUNT(*) FROM user WHERE createdAt >= ?) AS todayUsers,
       (SELECT COUNT(*) FROM user WHERE createdAt >= ?) AS last7DaysUsers`,
  )
    .bind(today, last7Days)
    .first<{
      totalUsers: number;
      googleUsers: number;
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
  let trialingUsers = 0;
  let activePaidUsers = 0;
  let monthlyUsers = 0;
  let yearlyUsers = 0;
  for (const subscription of subscriptions.results) {
    if (!hasActiveSubscription(subscription, env, now)) continue;
    proUsers += 1;
    if (subscription.status === "trialing") trialingUsers += 1;
    if (subscription.status === "active") activePaidUsers += 1;
    if (subscription.billing_interval === "month") monthlyUsers += 1;
    if (subscription.billing_interval === "year") yearlyUsers += 1;
  }
  return {
    totalUsers: Number(summary?.totalUsers ?? 0),
    googleUsers: Number(summary?.googleUsers ?? 0),
    proUsers,
    trialingUsers,
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
            s.status, s.billing_interval, s.current_period_end,
            s.stripe_price_id, s.trial_used_at
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
      status: string | null;
      billing_interval: "month" | "year" | null;
      current_period_end: string | null;
      stripe_price_id: string | null;
      trial_used_at: string | null;
    }>();
  return {
    users: rows.results.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      loginProvider: row.loginProvider,
      plan: hasActiveSubscription(
        {
          status: row.status ?? "",
          current_period_end: row.current_period_end,
          stripe_price_id: row.stripe_price_id,
        },
        env,
      )
        ? "pro"
        : "free",
      subscriptionStatus: row.status,
      billingInterval: row.billing_interval,
      trialUsed: Boolean(row.trial_used_at),
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
    `SELECT status, current_period_end, stripe_price_id FROM subscriptions
       WHERE user_id = ?`,
  )
    .bind(userId)
    .first<{
      status: string;
      current_period_end: string | null;
      stripe_price_id: string | null;
    }>();
  return hasActiveSubscription(subscription ?? null, env, now) ? "pro" : "free";
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
              COALESCE(ROUND(AVG(CASE WHEN at.status = 'completed' THEN at.accuracy END)), 0) AS average_accuracy
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
  const [wordRows, attemptRows, average] = await Promise.all([
    db
      .prepare(
        "SELECT id, position, word FROM assignment_words WHERE assignment_id = ? ORDER BY position",
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
      "SELECT word FROM saved_list_words WHERE saved_list_id = ? ORDER BY position",
    )
    .bind(savedList.id)
    .all<{ word: string }>();
  return { ...savedList, words: words.results.map((row) => row.word) };
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
  const words = parseWordList(body.words);
  const plan = await getPlan(env, ownerUserId);
  const limit = PLAN_LIMITS[plan].savedLists ?? 2_147_483_647;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO saved_lists (id, owner_user_id, title, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM saved_lists WHERE owner_user_id = ?) < ?`,
    ).bind(id, ownerUserId, title, now, now, ownerUserId, limit),
    ...words.map((word, position) =>
      env.DB.prepare(
        `INSERT INTO saved_list_words (id, saved_list_id, position, word)
         SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM saved_lists WHERE id = ?)`,
      ).bind(crypto.randomUUID(), id, position, word, id),
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
  db: D1Database,
  request: Request,
  savedList: SavedListRow,
) {
  const body = await readJson(request);
  const title = validateSavedListTitle(body.title);
  const words = parseWordList(body.words);
  const updatedAt = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        "UPDATE saved_lists SET title = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?",
      )
      .bind(title, updatedAt, savedList.id, savedList.owner_user_id),
    db
      .prepare("DELETE FROM saved_list_words WHERE saved_list_id = ?")
      .bind(savedList.id),
    ...words.map((word, position) =>
      db
        .prepare(
          "INSERT INTO saved_list_words (id, saved_list_id, position, word) VALUES (?, ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), savedList.id, position, word),
    ),
  ]);
  return savedListDetail(db, { ...savedList, title, updated_at: updatedAt });
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
    .all();
  return learners.results;
}

async function associateLearnerAttempts(db: D1Database, learner: LearnerRow) {
  await db
    .prepare(
      `UPDATE attempts SET learner_id = ?
       WHERE learner_id IS NULL AND nickname_key = ?
         AND assignment_id IN (SELECT id FROM assignments WHERE owner_user_id = ?)`,
    )
    .bind(learner.id, learner.name_key, learner.owner_user_id)
    .run();
}

async function createLearner(env: Env, request: Request, ownerUserId: string) {
  const body = await readJson(request);
  const { nickname: name, nicknameKey: nameKey } = validateNickname(body.name);
  const existing = await env.DB.prepare(
    "SELECT 1 FROM learners WHERE owner_user_id = ? AND name_key = ?",
  )
    .bind(ownerUserId, nameKey)
    .first();
  if (existing)
    throw new HttpError(409, "learner_exists", "That learner already exists.");
  const plan = await getPlan(env, ownerUserId);
  const limit = PLAN_LIMITS[plan].learnerProfiles;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(
    `INSERT INTO learners (id, owner_user_id, name, name_key, archived, created_at, updated_at)
     SELECT ?, ?, ?, ?, 0, ?, ?
     WHERE (SELECT COUNT(*) FROM learners WHERE owner_user_id = ?) < ?`,
  )
    .bind(id, ownerUserId, name, nameKey, now, now, ownerUserId, limit)
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
    archived: 0,
    created_at: now,
    updated_at: now,
  } satisfies LearnerRow;
  await associateLearnerAttempts(env.DB, learner);
  return learner;
}

async function updateLearner(
  db: D1Database,
  request: Request,
  learner: LearnerRow,
) {
  const body = await readJson(request);
  let name = learner.name;
  let nameKey = learner.name_key;
  if (body.name !== undefined) {
    const validated = validateNickname(body.name);
    name = validated.nickname;
    nameKey = validated.nicknameKey;
    const conflict = await db
      .prepare(
        "SELECT 1 FROM learners WHERE owner_user_id = ? AND name_key = ? AND id != ?",
      )
      .bind(learner.owner_user_id, nameKey, learner.id)
      .first();
    if (conflict)
      throw new HttpError(
        409,
        "learner_exists",
        "That learner already exists.",
      );
  }
  const archived =
    body.archived === undefined ? learner.archived : body.archived ? 1 : 0;
  const updatedAt = new Date().toISOString();
  await db
    .prepare(
      `UPDATE learners SET name = ?, name_key = ?, archived = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ?`,
    )
    .bind(name, nameKey, archived, updatedAt, learner.id, learner.owner_user_id)
    .run();
  const updated = {
    ...learner,
    name,
    name_key: nameKey,
    archived,
    updated_at: updatedAt,
  };
  await associateLearnerAttempts(db, updated);
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
        `SELECT at.id AS attempt_id, at.completed_at, aw.word, aw.position, ai.is_correct
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
        is_correct: number;
      }>(),
  ]);
  const grouped = new Map<
    string,
    {
      word: string;
      results: boolean[];
      correctCount: number;
      incorrectCount: number;
      lastPracticedAt: string;
      lastIncorrectAt: string | null;
    }
  >();
  for (const row of itemRows.results) {
    const key = normalizeWord(row.word);
    const current = grouped.get(key) ?? {
      word: row.word,
      results: [],
      correctCount: 0,
      incorrectCount: 0,
      lastPracticedAt: row.completed_at,
      lastIncorrectAt: null,
    };
    const correct = row.is_correct === 1;
    current.word = row.word;
    current.results.push(correct);
    current.correctCount += correct ? 1 : 0;
    current.incorrectCount += correct ? 0 : 1;
    current.lastPracticedAt = row.completed_at;
    if (!correct) current.lastIncorrectAt = row.completed_at;
    grouped.set(key, current);
  }
  const words = [...grouped.values()].map(({ results, ...word }) => ({
    ...word,
    status: masteryStatus(results),
    lastResult: results.at(-1) ? "correct" : "incorrect",
  }));
  const correctItems = words.reduce((sum, word) => sum + word.correctCount, 0);
  const totalItems = words.reduce(
    (sum, word) => sum + word.correctCount + word.incorrectCount,
    0,
  );
  return {
    learner: { ...learner, archived: Boolean(learner.archived) },
    historyDays: PLAN_LIMITS[plan].historyDays,
    smartReview: PLAN_LIMITS[plan].smartReview,
    summary: {
      completedAttempts: Number(attempts?.count ?? 0),
      accuracy: totalItems ? Math.round((correctItems / totalItems) * 100) : 0,
      lastPracticedAt: attempts?.last_practiced_at ?? null,
      mastered: words.filter((word) => word.status === "mastered").length,
      learning: words.filter((word) => word.status === "learning").length,
      needsReview: words.filter((word) => word.status === "needs_review")
        .length,
    },
    words: words.sort((a, b) =>
      b.lastPracticedAt.localeCompare(a.lastPracticedAt),
    ),
  };
}

function requireSmartReview(plan: Plan) {
  if (!PLAN_LIMITS[plan].smartReview)
    throw new HttpError(
      403,
      "smart_review_required",
      "Smart review is available on Pro.",
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
  const words = parseWordList(body.words);
  const mode = validateMode(body.mode);
  const maxAttempts = validateMaxAttempts(body.maxAttempts);
  const expiresAt = validateDeadline(body.expiresAt);
  const plan = await getPlan(env, userId);
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
      const plan = await getPlan(env, userId);
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
  const existing = await loadAttemptResult(env.DB, attemptId, publicId);
  if (existing) return existing;
  const assignment = await publicAssignment(env.DB, publicId);
  const { nickname, nicknameKey } = validateNickname(body.nickname);
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
  const learner = await env.DB.prepare(
    "SELECT id FROM learners WHERE owner_user_id = ? AND name_key = ?",
  )
    .bind(assignment.owner_user_id, nicknameKey)
    .first<{ id: string }>();
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
    throw new HttpError(403, "pro_required", "CSV export requires Pro.");
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
      !env.GOOGLE_CLIENT_ID ||
      !env.GOOGLE_CLIENT_SECRET
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
    const subscription = await env.DB.prepare(
      `SELECT status, billing_interval, current_period_end, stripe_price_id,
              stripe_customer_id, stripe_subscription_id, trial_used_at
       FROM subscriptions WHERE user_id = ?`,
    )
      .bind(user.id)
      .first<{
        status: string;
        billing_interval: "month" | "year" | null;
        current_period_end: string | null;
        stripe_price_id: string | null;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        trial_used_at: string | null;
      }>();
    const plan = hasActiveSubscription(subscription ?? null, env)
      ? "pro"
      : "free";
    return json({
      user: { id: user.id, name: user.name, email: user.email },
      billingInterval: subscription?.billing_interval || null,
      subscriptionStatus: subscription?.status || null,
      trialEligible: isTrialEligible(subscription ?? null),
      trialEndsAt:
        subscription?.status === "trialing"
          ? subscription.current_period_end
          : null,
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
      return json(await updateSavedList(env.DB, request, savedList));
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
      return json(await createLearner(env, request, user.id), 201);
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
      return json(await updateLearner(env.DB, request, learner));
    }
  }

  if (url.pathname === "/api/assignments") {
    const user = await requireTeacher(env, request, getSession);
    if (method === "GET") {
      const plan = await getPlan(env, user.id);
      return json({
        assignments: await listAssignments(env.DB, user.id, plan),
        savedLists: await listSavedLists(env.DB, user.id),
        learners: await listLearners(env.DB, user.id, plan),
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
    const checkout = await createCheckout(
      env,
      env.DB,
      user,
      body.interval,
      url.origin,
      { locale: typeof body.locale === "string" ? body.locale : undefined },
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
