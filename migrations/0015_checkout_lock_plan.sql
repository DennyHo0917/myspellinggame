ALTER TABLE checkout_locks
ADD COLUMN plan TEXT CHECK (plan IN ('parent', 'teacher'));
