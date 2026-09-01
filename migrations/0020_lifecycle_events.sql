ALTER TABLE user ADD COLUMN signup_source TEXT;
ALTER TABLE user ADD COLUMN signup_intent TEXT;

CREATE INDEX user_signup_source_idx ON user(signup_source);

CREATE TABLE lifecycle_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_key TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  properties_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE (user_id, event_name, event_key)
);

CREATE INDEX lifecycle_events_user_occurred_idx
  ON lifecycle_events(user_id, occurred_at DESC);

CREATE INDEX lifecycle_events_name_occurred_idx
  ON lifecycle_events(event_name, occurred_at DESC);
