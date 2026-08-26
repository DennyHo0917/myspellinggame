ALTER TABLE assignment_words ADD COLUMN example_sentence TEXT
  CHECK (example_sentence IS NULL OR length(example_sentence) <= 300);

ALTER TABLE saved_list_words ADD COLUMN example_sentence TEXT
  CHECK (example_sentence IS NULL OR length(example_sentence) <= 300);
