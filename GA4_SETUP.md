# GA4 setup

The site initializes GA4 with `page_location` limited to the origin and pathname. New practice links keep word lists in the URL fragment, and game events send aggregate values only—not word lists or typed answers.

In the GA4 property, complete these manual steps:

1. In the web data stream, add `words` to **Redact URL query parameters**. This protects visits that still use the supported legacy `?words=` share format.
2. In **Admin → Events**, mark these events as Key Events:
   - `word_list_created`
   - `practice_started`
   - `game_completed`
   - `practice_link_copied`
   - `missed_words_replayed`
   - `return_visit`
   - `assignment_created`
   - `assignment_results_viewed`
   - `assignment_completed`
   - `subscription_started`
   - `purchase`
3. After traffic arrives, verify event parameters in DebugView or Realtime. Do not mark `word_completed` or `word_missed` as Key Events; they are per-word diagnostic events.

Key Event configuration is an administrative GA4 setting and cannot be completed by static front-end code.

Teacher analytics also include `teacher_auth_started`, `teacher_auth_completed`, `assignment_entry_clicked`, `assignment_link_copied`, `assignment_opened`, `usage_limit_reached`, `upgrade_viewed`, `upgrade_clicked`, `checkout_started`, and `checkout_redirected`. `teacher_auth_completed` means a Google or Microsoft OAuth attempt returned to an authenticated teacher session; it does not mean that a new account was registered. `checkout_started` records an authenticated attempt to create Checkout, while `checkout_redirected` requires a returned Checkout URL. `purchase` uses a server-verified paid invoice or Checkout transaction, and `purchase.value` is its actual amount in major currency units. Current USD list prices are Parent $7.99/month or $79.90/year and Teacher $14.99/month or $149.90/year; prorations, discounts, and taxes can change the recorded amount. The shared analytics helper accepts only aggregate allowlisted parameters. Never add student nicknames, words, answers, assignment IDs, URL fragments, or Stripe IDs to GA4.

Photo Import funnel: `photo_import_clicked` records each import-button click (including paid users), and `photo_import_blocked` records each entitlement denial. Both accept `locale`; blocked also accepts `current_plan`. Unlike `locked_feature_attempted` (deduplicated per feature per page), these events count repeated attempts. Paywall `upgrade_cta_clicked` accepts `cta_location`, plus `plan` and `billing_interval` when a specific checkout choice is offered. Workspace pricing links report their displayed recommendation and carry the same plan and interval in the destination URL. Photo filenames, image contents, and spelling words must never be sent. New visitors default to Parent annual billing; known teacher workspaces default to Teacher, saved explicit checkout choices are preserved, and subscribed accounts see their current billing interval.

# Tracked-practice funnel

The existing result-page CTA now leads to `/workspace/assignments/new?tracking=1`, where adults choose or create a learner and start the next practice with their existing words, examples, and mode. It does not import the already-finished ordinary practice result.

- `tracking_cta_viewed`: both signed-in and anonymous result-page exposure (`signed_in`, mode and aggregate counts). Anonymous exposure also retains `signup_cta_viewed` for existing reports.
- `assignment_entry_clicked`: existing click event with `entry_point=practice_result` or `copy_track`.
- `tracking_setup_viewed`: setup exposure, plan, entry point and whether the free tracking trial is used.
- `assignment_created`: existing event also emitted by simplified setup after successful creation.
- `tracking_practice_ready`: successful setup and handoff to a learner-specific practice URL; this is not a practice-start event.
- `premium_feature_used`: `photo_import` only when recognized words are accepted into the list; `smart_review` / `todays_review` only when the review assignment is successfully published. Includes aggregate word count, plan, and `after_upgrade`. The last field attributes the first matching feature use within 24 hours of verified activation, in the same browser tab and account. Closing the tab or using another device breaks this attribution. File selection, OCR preview, canceled imports, empty review lists and failed publishing do not count as use.

Server-side `lifecycle_events` additionally records `first_bound_practice_started` and `first_bound_practice_completed`, once per owner account. Anonymous nickname submissions are excluded; incomplete attempts never count as completed. The existing unique event key prevents retries from inflating these milestones. These are server events, not GA4 events. Join their assignment IDs to `assignment_created` lifecycle properties (`tracked_entry`, `entry_point`) to distinguish the simplified flow from other learner-bound assignments. Existing accounts receive their first observed milestone after this instrumentation is enabled; no historical backfill is performed.

New GA4 events allow only aggregate dimensions, not learner names/IDs, words, answers, or email addresses. These changes do not configure GA4 dashboards or prove production event delivery; verify those after deployment.

Checkout intent expires after 15 minutes. Only an explicit purchase interrupted by a 401 resumes automatically after sign-in, once; failed requests require manual retry. Choosing a paywall recommendation alone does not authorize automatic checkout. Existing subscriptions retain their plan-change flow.

`tracking_trial_used` emits `locked_feature_attempted` both for the client-side trial gate and API errors, deduplicated per feature per page. Navigation-sensitive upgrade and checkout-redirect events use `transport_type: beacon` in the sending layer, outside the event parameter allowlist. Delivery is still best-effort.

GA4 administrator follow-up (not configured by this code change): in Admin > Custom definitions, verify/create event-scoped dimensions for `cta_location`, `plan`, and `billing_interval` using those exact event parameter names. Verify events in DebugView and dimensions in reports after processing. Never register child identity or practice content. Local tests do not verify the live GA4 property.
