-- Existing results stay open, including results saved by the previous worker.
ALTER TABLE attempts ADD COLUMN free_result_visible INTEGER NOT NULL DEFAULT 1
  CHECK (free_result_visible IN (0, 1));
