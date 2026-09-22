CREATE TABLE assignment_words_new (
  id TEXT PRIMARY KEY NOT NULL,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  word TEXT NOT NULL CHECK (length(word) BETWEEN 1 AND 24),
  example_sentence TEXT CHECK (example_sentence IS NULL OR length(example_sentence) <= 300),
  UNIQUE (assignment_id, position),
  UNIQUE (assignment_id, word)
);

CREATE TABLE saved_list_words_new (
  id TEXT PRIMARY KEY NOT NULL,
  saved_list_id TEXT NOT NULL REFERENCES saved_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  word TEXT NOT NULL CHECK (length(word) BETWEEN 1 AND 24),
  example_sentence TEXT CHECK (example_sentence IS NULL OR length(example_sentence) <= 300),
  UNIQUE (saved_list_id, position),
  UNIQUE (saved_list_id, word)
);

CREATE TABLE attempt_items_new (
  attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL REFERENCES assignment_words_new(id) ON DELETE CASCADE,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  PRIMARY KEY (attempt_id, word_id)
);

INSERT INTO assignment_words_new (
  id, assignment_id, position, word, example_sentence
)
SELECT id, assignment_id, position, word, example_sentence
FROM assignment_words;

INSERT INTO saved_list_words_new (
  id, saved_list_id, position, word, example_sentence
)
SELECT id, saved_list_id, position, word, example_sentence
FROM saved_list_words;

INSERT INTO attempt_items_new (attempt_id, word_id, is_correct)
SELECT attempt_id, word_id, is_correct FROM attempt_items;

DROP TABLE attempt_items;
DROP TABLE assignment_words;
DROP TABLE saved_list_words;

ALTER TABLE assignment_words_new RENAME TO assignment_words;
ALTER TABLE saved_list_words_new RENAME TO saved_list_words;
ALTER TABLE attempt_items_new RENAME TO attempt_items;

CREATE INDEX assignment_words_assignment_idx
  ON assignment_words(assignment_id, position);
CREATE INDEX saved_list_words_list_position_idx
  ON saved_list_words(saved_list_id, position);
CREATE INDEX attempt_items_word_correct_idx
  ON attempt_items(word_id, is_correct);
