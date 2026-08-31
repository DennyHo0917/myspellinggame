ALTER TABLE learners ADD COLUMN avatar TEXT
  CHECK (avatar IS NULL OR length(avatar) BETWEEN 1 AND 160000);
