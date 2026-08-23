PRAGMA foreign_keys = ON;

CREATE TABLE user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt DATE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX session_userId_idx ON session(userId);

CREATE TABLE account (
  id TEXT PRIMARY KEY NOT NULL,
  issuer TEXT NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt DATE,
  refreshTokenExpiresAt DATE,
  scope TEXT,
  password TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);

CREATE UNIQUE INDEX account_issuer_accountId_uidx ON account(issuer, accountId);
CREATE INDEX account_userId_idx ON account(userId);

CREATE TABLE verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt DATE NOT NULL,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);

CREATE INDEX verification_identifier_idx ON verification(identifier);

CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'inactive',
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  mode TEXT NOT NULL CHECK (mode IN ('dictation', 'typing')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'closed')),
  max_attempts INTEGER NOT NULL CHECK (max_attempts BETWEEN 1 AND 10),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE INDEX assignments_owner_status_idx ON assignments(owner_user_id, status, expires_at);
CREATE INDEX assignments_public_idx ON assignments(public_id);

CREATE TABLE assignment_words (
  id TEXT PRIMARY KEY NOT NULL,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  word TEXT NOT NULL CHECK (length(word) BETWEEN 2 AND 24),
  UNIQUE (assignment_id, position),
  UNIQUE (assignment_id, word)
);

CREATE INDEX assignment_words_assignment_idx ON assignment_words(assignment_id, position);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY NOT NULL,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 2 AND 32),
  nickname_key TEXT NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 10),
  score INTEGER NOT NULL CHECK (score >= 0),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  incorrect_count INTEGER NOT NULL CHECK (incorrect_count >= 0),
  accuracy INTEGER NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 7200),
  completed_at TEXT NOT NULL,
  retention_expires_at TEXT NOT NULL,
  UNIQUE (assignment_id, nickname_key, attempt_number)
);

CREATE INDEX attempts_assignment_completed_idx ON attempts(assignment_id, completed_at DESC);
CREATE INDEX attempts_assignment_nickname_idx ON attempts(assignment_id, nickname_key);
CREATE INDEX attempts_retention_idx ON attempts(retention_expires_at);

CREATE TABLE monthly_submission_usage (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX monthly_submission_usage_owner_month_idx
  ON monthly_submission_usage(user_id, month_key);

CREATE TABLE attempt_items (
  attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL REFERENCES assignment_words(id) ON DELETE CASCADE,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  PRIMARY KEY (attempt_id, word_id)
);

CREATE INDEX attempt_items_word_correct_idx ON attempt_items(word_id, is_correct);

CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  processing_at TEXT,
  processed_at TEXT
);
