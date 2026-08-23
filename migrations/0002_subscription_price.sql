ALTER TABLE subscriptions ADD COLUMN stripe_price_id TEXT;

CREATE INDEX subscriptions_price_status_idx ON subscriptions(stripe_price_id, status);
