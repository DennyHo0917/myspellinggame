CREATE TABLE saved_lists (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX saved_lists_owner_updated_idx
  ON saved_lists(owner_user_id, updated_at DESC);

CREATE TABLE saved_list_words (
  id TEXT PRIMARY KEY NOT NULL,
  saved_list_id TEXT NOT NULL REFERENCES saved_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  word TEXT NOT NULL CHECK (length(word) BETWEEN 2 AND 24),
  UNIQUE (saved_list_id, position),
  UNIQUE (saved_list_id, word)
);

CREATE INDEX saved_list_words_list_position_idx
  ON saved_list_words(saved_list_id, position);

CREATE TABLE learners (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 32),
  name_key TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (owner_user_id, name_key)
);

CREATE INDEX learners_owner_archived_idx
  ON learners(owner_user_id, archived, updated_at DESC);

ALTER TABLE attempts ADD COLUMN learner_id TEXT REFERENCES learners(id) ON DELETE SET NULL;

CREATE INDEX attempts_learner_completed_idx
  ON attempts(learner_id, status, completed_at DESC);
