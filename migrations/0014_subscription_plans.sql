CREATE TABLE subscriptions_new (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'parent', 'teacher', 'plus', 'pro')),
  status TEXT NOT NULL DEFAULT 'inactive',
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  stripe_price_id TEXT,
  trial_used_at TEXT
);

INSERT INTO subscriptions_new (
  user_id, plan, status, billing_interval, stripe_customer_id,
  stripe_subscription_id, current_period_end, cancel_at_period_end,
  updated_at, stripe_price_id, trial_used_at
)
SELECT
  user_id, plan, status, billing_interval, stripe_customer_id,
  stripe_subscription_id, current_period_end, cancel_at_period_end,
  updated_at, stripe_price_id, trial_used_at
FROM subscriptions;

DROP TABLE subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;

CREATE INDEX subscriptions_price_status_idx
  ON subscriptions(stripe_price_id, status);
