DELETE FROM attempts
WHERE status = 'incomplete'
  AND EXISTS (
    SELECT 1 FROM attempts newer
    WHERE newer.assignment_id = attempts.assignment_id
      AND newer.nickname_key = attempts.nickname_key
      AND newer.status = 'incomplete'
      AND (
        newer.completed_at > attempts.completed_at
        OR (newer.completed_at = attempts.completed_at AND newer.id > attempts.id)
      )
  );

CREATE UNIQUE INDEX attempts_incomplete_nickname_uidx
  ON attempts(assignment_id, nickname_key)
  WHERE status = 'incomplete';

CREATE TABLE checkout_locks (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  session_url TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
