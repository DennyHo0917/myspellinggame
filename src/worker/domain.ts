export const PLAN_LIMITS = {
  free: {
    activeAssignments: 2,
    monthlyAttempts: 30,
    savedLists: 3,
    learnerProfiles: 3,
    historyDays: 30,
    retentionDays: 365,
    smartReview: false,
    csvExport: false,
    missedWordStats: false,
  },
  pro: {
    activeAssignments: 20,
    monthlyAttempts: null,
    savedLists: null,
    learnerProfiles: 150,
    historyDays: 365,
    retentionDays: 365,
    smartReview: true,
    csvExport: true,
    missedWordStats: true,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
export type Mode = "dictation" | "typing";

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

export type AssignmentWord = { id: string; word: string; position: number };
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

export function masteryStatus(results: boolean[]): MasteryStatus {
  if (results.length >= 3 && results.slice(-3).every(Boolean))
    return "mastered";
  if (results.includes(false)) return "needs_review";
  return "learning";
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
