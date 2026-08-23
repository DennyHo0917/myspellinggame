ALTER TABLE attempts ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'
  CHECK (status IN ('completed', 'incomplete'));
