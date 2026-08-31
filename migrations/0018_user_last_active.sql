ALTER TABLE user ADD COLUMN last_active_at TEXT;

UPDATE user
SET last_active_at = COALESCE(
  (SELECT MAX(session.updatedAt) FROM session WHERE session.userId = user.id),
  last_login_at,
  createdAt
);
