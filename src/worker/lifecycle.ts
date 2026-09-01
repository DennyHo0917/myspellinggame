export type LifecycleEventName =
  | "signup_created"
  | "signup_context_captured"
  | "login"
  | "workspace_type_selected"
  | "saved_list_created"
  | "learner_created"
  | "assignment_created"
  | "assignment_started"
  | "assignment_result_received"
  | "assignment_attempt_abandoned"
  | "subscription_started";

export type LifecycleProperties = Record<string, unknown>;

export const SIGNUP_CONTEXTS = {
  copy_track: "track_shared_practice",
  assign_homework: "create_assignment",
  practice_result: "continue_from_practice",
  workspace: "set_up_workspace",
} as const;

export type SignupSource = keyof typeof SIGNUP_CONTEXTS;

export function isSignupSource(value: unknown): value is SignupSource {
  return typeof value === "string" && Object.hasOwn(SIGNUP_CONTEXTS, value);
}

export function signupIntentForSource(source: SignupSource) {
  return SIGNUP_CONTEXTS[source];
}

export async function recordLifecycleEvent(
  db: D1Database,
  userId: string,
  eventName: LifecycleEventName,
  properties: LifecycleProperties = {},
  eventKey: string = eventName,
) {
  try {
    await db
      .prepare(
        `INSERT OR IGNORE INTO lifecycle_events
           (id, user_id, event_name, event_key, occurred_at, properties_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        userId,
        eventName,
        eventKey,
        new Date().toISOString(),
        JSON.stringify(properties),
      )
      .run();
  } catch (error) {
    // Analytics must never make an otherwise successful user action fail.
    console.error(`Failed to record lifecycle event: ${eventName}`, error);
  }
}
