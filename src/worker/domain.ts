export const PLAN_LIMITS = {
  free: {
    activeAssignments: 1,
    monthlyAttempts: 8,
    savedLists: 1,
    learnerProfiles: 1,
    historyDays: 14,
    retentionDays: 14,
    smartReview: false,
    csvExport: false,
    missedWordStats: false,
    sentenceLibrary: false,
  },
  plus: {
    activeAssignments: 20,
    monthlyAttempts: null,
    savedLists: null,
    learnerProfiles: 150,
    historyDays: 365,
    retentionDays: 365,
    smartReview: true,
    csvExport: true,
    missedWordStats: true,
    sentenceLibrary: true,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
export type Mode = "dictation" | "typing";

export function planWordLimit(plan: Plan): number {
  return plan === "plus" ? 80 : 40;
}

export function enforcePlanWordLimit(words: readonly unknown[], plan: Plan) {
  const limit = planWordLimit(plan);
  if (words.length > limit) {
    throw new HttpError(
      403,
      "word_limit",
      `${plan === "plus" ? "Plus" : "Free accounts"} support up to ${limit} words per list.`,
    );
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function normalizeWord(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function parseWordList(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.map(String).join("\n")
    : String(value ?? "");
  const words = [
    ...new Set(
      raw
        .toLowerCase()
        .split(/[^a-z'-]+/)
        .map((word) => word.trim())
        .filter(Boolean),
    ),
  ];
  if (
    !words.length ||
    words.length > 80 ||
    words.some((word) => word.length < 2 || word.length > 24)
  ) {
    throw new HttpError(
      400,
      "invalid_words",
      "Use 1–80 words, each 2–24 characters long.",
    );
  }
  return words;
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateExampleSentence(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new HttpError(
      400,
      "invalid_example_sentence",
      "Example sentences must be plain text.",
    );
  }
  const sentence = cleanText(value);
  if (sentence.length > 300) {
    throw new HttpError(
      400,
      "invalid_example_sentence",
      "Example sentences must be 300 characters or fewer.",
    );
  }
  return sentence || null;
}

type WordEntryInput = {
  word: unknown;
  example_sentence?: unknown;
  exampleSentence?: unknown;
};
export type WordEntry = { word: string; example_sentence: string | null };

function isWordEntry(value: unknown): value is WordEntryInput {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "word" in value,
  );
}

export function parseWordEntries(
  value: unknown,
  exampleSentences?: unknown,
): WordEntry[] {
  const source =
    Array.isArray(value) && value.every(isWordEntry) ? value : null;
  const words = parseWordList(
    source ? source.map((entry) => entry.word) : value,
  );
  const sentences = new Map<string, string | null>();
  if (source) {
    for (const entry of source) {
      sentences.set(
        normalizeWord(entry.word),
        validateExampleSentence(
          entry.example_sentence ?? entry.exampleSentence,
        ),
      );
    }
  }
  const orderedSentences =
    typeof exampleSentences === "string"
      ? exampleSentences.split(/\r?\n/)
      : Array.isArray(exampleSentences)
        ? exampleSentences
        : null;
  if (orderedSentences) {
    orderedSentences.forEach((sentence, index) => {
      if (index < words.length)
        sentences.set(words[index], validateExampleSentence(sentence));
    });
  } else if (exampleSentences && typeof exampleSentences === "object") {
    for (const [word, sentence] of Object.entries(exampleSentences)) {
      sentences.set(normalizeWord(word), validateExampleSentence(sentence));
    }
  } else if (exampleSentences !== undefined) {
    validateExampleSentence(exampleSentences);
  }
  return words.map((word) => ({
    word,
    example_sentence: sentences.get(word) ?? null,
  }));
}

export function validateTitle(value: unknown): string {
  const title = cleanText(value);
  if (title.length < 1 || title.length > 80) {
    throw new HttpError(
      400,
      "invalid_title",
      "Assignment titles must be 1–80 characters.",
    );
  }
  return title;
}

export function validateSavedListTitle(value: unknown): string {
  const title = cleanText(value);
  if (title.length < 1 || title.length > 80) {
    throw new HttpError(
      400,
      "invalid_list_title",
      "Saved-list titles must be 1–80 characters.",
    );
  }
  return title;
}

export function validateNickname(value: unknown): {
  nickname: string;
  nicknameKey: string;
} {
  const nickname = cleanText(value).normalize("NFKC");
  if (nickname.length < 2 || nickname.length > 32) {
    throw new HttpError(
      400,
      "invalid_nickname",
      "Nicknames must be 2–32 characters.",
    );
  }
  if (nickname.includes("@") || /https?:\/\//i.test(nickname)) {
    throw new HttpError(
      400,
      "personal_info_not_allowed",
      "Use a nickname or classroom number, not contact information.",
    );
  }
  return { nickname, nicknameKey: nickname.toLocaleLowerCase("en-US") };
}

export function validateMode(value: unknown): Mode {
  if (value !== "dictation" && value !== "typing") {
    throw new HttpError(400, "invalid_mode", "Choose dictation or typing.");
  }
  return value;
}

export function validateMaxAttempts(value: unknown): number {
  const attempts = Number(value);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
    throw new HttpError(
      400,
      "invalid_max_attempts",
      "Maximum attempts must be between 1 and 10.",
    );
  }
  return attempts;
}

export function validateDeadline(value: unknown, now = new Date()): string {
  const deadline = new Date(String(value ?? ""));
  const latest = new Date(now.getTime() + 366 * 86_400_000);
  if (
    !Number.isFinite(deadline.getTime()) ||
    deadline <= now ||
    deadline > latest
  ) {
    throw new HttpError(
      400,
      "invalid_deadline",
      "Choose a deadline within the next year.",
    );
  }
  return deadline.toISOString();
}

export function validateAttemptId(value: unknown): string {
  const id = String(value ?? "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new HttpError(
      400,
      "invalid_attempt_id",
      "The attempt identifier is invalid.",
    );
  }
  return id;
}

export function validateDuration(value: unknown): number {
  const duration = Math.round(Number(value));
  if (!Number.isFinite(duration) || duration < 1 || duration > 7200) {
    throw new HttpError(
      400,
      "invalid_duration",
      "Practice duration must be between 1 second and 2 hours.",
    );
  }
  return duration;
}

export type AssignmentWord = {
  id: string;
  word: string;
  position: number;
  example_sentence: string | null;
};
export type SubmittedAnswer = { wordId: string; answer: string };

export function scoreAnswers(
  words: AssignmentWord[],
  input: unknown,
  requireAll = true,
) {
  if (!Array.isArray(input) || input.length > 80) {
    throw new HttpError(
      400,
      "invalid_answers",
      "Answers must match the assignment word list.",
    );
  }
  const answers = new Map<string, string>();
  for (const item of input as Array<Record<string, unknown>>) {
    const wordId = String(item?.wordId ?? "");
    const answer = String(item?.answer ?? "");
    if (!wordId || answer.length > 64 || answers.has(wordId)) {
      throw new HttpError(
        400,
        "invalid_answers",
        "Answers must contain one value for each word.",
      );
    }
    answers.set(wordId, answer);
  }
  const knownIds = new Set(words.map((word) => word.id));
  if ([...answers.keys()].some((id) => !knownIds.has(id))) {
    throw new HttpError(
      400,
      "invalid_answers",
      "An answer does not belong to this assignment.",
    );
  }
  if (requireAll && answers.size !== words.length) {
    throw new HttpError(
      400,
      "invalid_answers",
      "Answers must contain one value for each word.",
    );
  }
  const items = words
    .filter((word) => requireAll || answers.has(word.id))
    .map((word) => ({
      wordId: word.id,
      word: word.word,
      correct: normalizeWord(answers.get(word.id)) === normalizeWord(word.word),
    }));
  const correctCount = items.filter((item) => item.correct).length;
  const incorrectCount = items.length - correctCount;
  return {
    items,
    score: correctCount,
    correctCount,
    incorrectCount,
    accuracy: items.length
      ? Math.round((correctCount / items.length) * 100)
      : 0,
    missedWords: items.filter((item) => !item.correct).map((item) => item.word),
  };
}

export function randomPublicId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function monthStart(now = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

export type MasteryStatus = "mastered" | "learning" | "needs_review";

export type ReviewResult = {
  correct: boolean;
  practicedAt: string;
};

export type MasteryResult = ReviewResult;

export type MasteryEvidence = {
  status: MasteryStatus;
  consecutiveCorrect: number;
  practiceDays: number;
  crossDayConfirmed: boolean;
  lastPracticedAt: string | null;
  lastMissAt: string | null;
};

export function masteryEvidence(results: MasteryResult[]): MasteryEvidence {
  if (!results.length)
    return {
      status: "learning",
      consecutiveCorrect: 0,
      practiceDays: 0,
      crossDayConfirmed: false,
      lastPracticedAt: null,
      lastMissAt: null,
    };
  let lastMiss = -1;
  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (!results[index].correct) {
      lastMiss = index;
      break;
    }
  }
  const consecutiveCorrectAfterLastMiss = results.length - lastMiss - 1;
  const qualifyingResults = results.slice(lastMiss + 1);
  const practiceDays = new Set(
    qualifyingResults.map((result) => result.practicedAt.slice(0, 10)),
  ).size;
  const crossDayConfirmed =
    consecutiveCorrectAfterLastMiss >= 3 && practiceDays >= 2;
  const status =
    results.at(-1)!.correct === false
      ? "needs_review"
      : crossDayConfirmed
        ? "mastered"
        : "learning";
  return {
    status,
    consecutiveCorrect: consecutiveCorrectAfterLastMiss,
    practiceDays,
    crossDayConfirmed,
    lastPracticedAt: results.at(-1)!.practicedAt,
    lastMissAt: lastMiss >= 0 ? results[lastMiss].practicedAt : null,
  };
}

export function masteryStatus(results: MasteryResult[]): MasteryStatus;
export function masteryStatus(results: boolean[]): MasteryStatus;
export function masteryStatus(
  results: MasteryResult[] | boolean[],
): MasteryStatus {
  if (!results.length) return "learning";
  if (typeof results[0] === "boolean") {
    const legacy = results as boolean[];
    if (legacy.length >= 3 && legacy.slice(-3).every(Boolean))
      return "mastered";
    if (legacy.includes(false)) return "needs_review";
    return "learning";
  }
  return masteryEvidence(results as MasteryResult[]).status;
}

export function calculateReviewState(
  results: ReviewResult[],
  now = new Date(),
) {
  const evidence = masteryEvidence(results);
  if (!evidence.lastMissAt || evidence.status === "mastered") return null;
  const delayDays =
    evidence.consecutiveCorrect >= 3
      ? 3
      : [0, 1, 3][evidence.consecutiveCorrect];
  const dueAt = delayDays
    ? addDays(evidence.lastPracticedAt!, delayDays)
    : now.toISOString();
  return {
    lastPracticedAt: evidence.lastPracticedAt!,
    recentMissCount: results.filter((result) => !result.correct).length,
    consecutiveCorrectAfterLastMiss: evidence.consecutiveCorrect,
    dueAt,
    due: new Date(dueAt).getTime() <= now.getTime(),
  };
}

export function accuracyRange(value: number): string {
  if (value < 50) return "0-49";
  if (value < 75) return "50-74";
  if (value < 90) return "75-89";
  return "90-100";
}

export function durationRange(seconds: number): string {
  if (seconds < 60) return "<1m";
  if (seconds < 180) return "1-3m";
  if (seconds < 600) return "3-10m";
  return "10m+";
}

export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
