CREATE TABLE monthly_submission_reservations (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX monthly_submission_reservations_owner_month_idx
  ON monthly_submission_reservations(user_id, month_key);
