import { featureTrialFromStart, type FeatureTrialState } from "./domain";

export async function readFeatureTrialStart(
  db: D1Database,
  userId: string,
): Promise<string | null> {
  const value = await db
    .prepare("SELECT feature_trial_started_at FROM user WHERE id = ?")
    .bind(userId)
    .first<string | null>("feature_trial_started_at");
  return typeof value === "string" && value ? value : null;
}

export async function startFeatureTrialIfMissing(
  db: D1Database,
  userId: string,
  startedAt = new Date().toISOString(),
): Promise<string> {
  await db
    .prepare(
      `UPDATE user SET feature_trial_started_at = ?
       WHERE id = ? AND feature_trial_started_at IS NULL`,
    )
    .bind(startedAt, userId)
    .run();
  return (await readFeatureTrialStart(db, userId)) ?? startedAt;
}

export async function featureTrialForFreeAccount(
  db: D1Database,
  userId: string,
  now = new Date(),
): Promise<FeatureTrialState> {
  const existing = await readFeatureTrialStart(db, userId);
  const startedAt =
    existing ??
    (await startFeatureTrialIfMissing(db, userId, now.toISOString()));
  return featureTrialFromStart(startedAt, now.getTime());
}
