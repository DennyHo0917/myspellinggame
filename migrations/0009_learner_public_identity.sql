ALTER TABLE learners ADD COLUMN public_id TEXT;

UPDATE learners
SET public_id = lower(hex(randomblob(12)))
WHERE public_id IS NULL;

CREATE UNIQUE INDEX learners_public_id_uidx
  ON learners(public_id);
