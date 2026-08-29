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

Teacher analytics also include `teacher_auth_started`, `teacher_auth_completed`, `assignment_entry_clicked`, `assignment_link_copied`, `assignment_opened`, `usage_limit_reached`, `upgrade_viewed`, `upgrade_clicked`, `checkout_started`, and `checkout_redirected`. `teacher_auth_completed` means a Google or Microsoft OAuth attempt returned to an authenticated teacher session; it does not mean that a new account was registered. `checkout_started` records an authenticated attempt to create Checkout, while `checkout_redirected` requires a returned Checkout URL. `subscription_started` and `purchase` require both a pending Checkout from the same browser tab and `/api/me` confirmation that the signed-in teacher has an active Pro plan; the URL return alone is not treated as payment confirmation. `purchase.value` uses the displayed USD plan price ($5.99 monthly or $49.99 yearly), not net revenue after taxes, discounts, or refunds. The shared analytics helper accepts only aggregate allowlisted parameters. Never add student nicknames, words, answers, assignment IDs, URL fragments, or Stripe IDs to GA4.
