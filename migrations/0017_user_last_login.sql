ALTER TABLE user ADD COLUMN last_login_at TEXT;

UPDATE user
SET last_login_at = (
  SELECT MAX(session.createdAt)
  FROM session
  WHERE session.userId = user.id
);
