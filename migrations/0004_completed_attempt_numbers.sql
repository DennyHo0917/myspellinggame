CREATE TABLE attempts_new (
  id TEXT PRIMARY KEY NOT NULL,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 2 AND 32),
  nickname_key TEXT NOT NULL,
  attempt_number INTEGER CHECK (attempt_number >= 1),
  score INTEGER NOT NULL CHECK (score >= 0),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  incorrect_count INTEGER NOT NULL CHECK (incorrect_count >= 0),
  accuracy INTEGER NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 7200),
  completed_at TEXT NOT NULL,
  retention_expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'incomplete')),
  CHECK (
    (status = 'completed' AND attempt_number IS NOT NULL)
    OR (status = 'incomplete' AND attempt_number IS NULL)
  )
);

CREATE TABLE attempt_items_new (
  attempt_id TEXT NOT NULL REFERENCES attempts_new(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL REFERENCES assignment_words(id) ON DELETE CASCADE,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  PRIMARY KEY (attempt_id, word_id)
);

INSERT INTO attempts_new (
  id, assignment_id, nickname, nickname_key, attempt_number, score,
  correct_count, incorrect_count, accuracy, duration_seconds, completed_at,
  retention_expires_at, status
)
SELECT id, assignment_id, nickname, nickname_key,
       CASE WHEN status = 'completed' THEN attempt_number END,
       score, correct_count, incorrect_count, accuracy, duration_seconds,
       completed_at, retention_expires_at, status
FROM attempts;

INSERT INTO attempt_items_new (attempt_id, word_id, is_correct)
SELECT attempt_id, word_id, is_correct FROM attempt_items;

DROP TABLE attempt_items;
DROP TABLE attempts;
ALTER TABLE attempts_new RENAME TO attempts;
ALTER TABLE attempt_items_new RENAME TO attempt_items;

CREATE UNIQUE INDEX attempts_completed_number_uidx
  ON attempts(assignment_id, nickname_key, attempt_number)
  WHERE status = 'completed';
CREATE INDEX attempts_assignment_completed_idx ON attempts(assignment_id, completed_at DESC);
CREATE INDEX attempts_assignment_nickname_idx ON attempts(assignment_id, nickname_key);
CREATE INDEX attempts_retention_idx ON attempts(retention_expires_at);
CREATE INDEX attempt_items_word_correct_idx ON attempt_items(word_id, is_correct);
