CREATE TABLE diagnostic_events (
  event_id TEXT PRIMARY KEY NOT NULL CHECK(length(event_id)=24),
  trace_id TEXT NOT NULL CHECK(length(trace_id)=24),
  source TEXT NOT NULL CHECK(source IN ('server','client')),
  event_name TEXT NOT NULL,
  route_template TEXT NOT NULL,
  error_code TEXT NOT NULL,
  http_status INTEGER NOT NULL CHECK(http_status BETWEEN 0 AND 599),
  owner_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
  occurred_at TEXT NOT NULL,
  release_version TEXT NOT NULL
);
CREATE INDEX diagnostic_events_trace_time ON diagnostic_events(trace_id,occurred_at);
CREATE INDEX diagnostic_events_time ON diagnostic_events(occurred_at);
