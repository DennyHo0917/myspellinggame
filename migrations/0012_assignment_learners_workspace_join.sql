ALTER TABLE user ADD COLUMN workspace_type TEXT CHECK (workspace_type IN ('family', 'teacher'));
ALTER TABLE user ADD COLUMN class_public_id TEXT;

CREATE UNIQUE INDEX user_class_public_id_uidx ON user(class_public_id);

CREATE TABLE assignment_learners (
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (assignment_id, learner_id)
);

CREATE INDEX assignment_learners_learner_idx ON assignment_learners(learner_id, assignment_id);

ALTER TABLE learners ADD COLUMN join_pin_hash TEXT;
CREATE UNIQUE INDEX learners_owner_join_pin_uidx ON learners(owner_user_id, join_pin_hash);
