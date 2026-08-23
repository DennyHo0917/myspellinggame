# GA4 setup

The site initializes GA4 with `page_location` limited to the origin and pathname. New practice links keep word lists in the URL fragment, and game events send aggregate values only—not word lists or typed answers.

In the GA4 property, complete these manual steps:

1. In the web data stream, add `words` to **Redact URL query parameters**. This protects visits that still use the supported legacy `?words=` share format.
2. In **Admin → Events**, mark these events as Key Events:
   - `word_list_created`
   - `game_completed`
   - `practice_link_copied`
   - `missed_words_replayed`
   - `return_visit`
   - `assignment_created`
   - `assignment_completed`
   - `subscription_started`
3. After traffic arrives, verify event parameters in DebugView or Realtime. Do not mark `word_completed` or `word_missed` as Key Events; they are per-word diagnostic events.

Key Event configuration is an administrative GA4 setting and cannot be completed by static front-end code.

Teacher analytics also include `teacher_signup_started`, `teacher_signup_completed`, `assignment_link_copied`, `assignment_opened`, `upgrade_viewed`, and `checkout_started`. The shared analytics helper accepts only aggregate allowlisted parameters. Never add student nicknames, words, answers, assignment IDs, URL fragments, or Stripe IDs to GA4.
