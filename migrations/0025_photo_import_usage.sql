CREATE TABLE photo_import_usage (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  import_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, import_id)
);
