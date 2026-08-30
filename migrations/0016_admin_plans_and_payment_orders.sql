ALTER TABLE user
ADD COLUMN admin_plan TEXT CHECK (admin_plan IN ('parent', 'teacher'));

ALTER TABLE user
ADD COLUMN admin_plan_updated_at TEXT;

CREATE TABLE payment_orders (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('parent', 'teacher')),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'paid', 'failed', 'canceled', 'expired')),
  stripe_price_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  amount_total INTEGER,
  currency TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX payment_orders_user_created_idx
  ON payment_orders(user_id, created_at DESC);

CREATE INDEX payment_orders_created_idx
  ON payment_orders(created_at DESC);
