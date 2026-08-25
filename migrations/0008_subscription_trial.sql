ALTER TABLE subscriptions ADD COLUMN trial_used_at TEXT;

UPDATE subscriptions
SET trial_used_at = COALESCE(trial_used_at, updated_at)
WHERE stripe_customer_id IS NOT NULL
   OR stripe_subscription_id IS NOT NULL;
