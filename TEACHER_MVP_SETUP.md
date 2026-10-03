# Teacher MVP setup

## Local development

Use Node.js 22 or newer.

1. Run `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and replace the placeholders with test credentials. Do not commit `.dev.vars`.
3. Run `npm run db:migrate:local`.
4. Run `npm run dev` and open `http://localhost:5173/workspace`.

The local D1 state is kept in `../.myspellinggame-wrangler-state` so Wrangler's generated SQLite files do not trigger the static-asset watcher.

## Cloudflare

1. Create a D1 database, then replace the placeholder `database_id` in `wrangler.json`. Keep the binding name `DB`.
2. Keep both rate-limit bindings in `wrangler.json`; production namespace IDs must be unique within the account.
3. Add each value from `.dev.vars.example` with `wrangler secret put`; production secrets must not be placed in `vars` or committed files.
4. Set `BETTER_AUTH_URL` to the final HTTPS origin, for example `https://myspellinggame.com`.
5. Apply migrations with `npm run db:migrate:remote` before deploying the Worker.
6. After configuration, run `npm run build`, then deploy through the existing Cloudflare workflow. This repository does not deploy automatically.

### Submission rate limiting

Student submissions use an assignment-wide limit of 300 requests per minute. This allows a 150-student Pro class to submit together with room for retries while bounding abuse against a shared assignment link. The limiter key contains only the assignment public ID; My Spelling Game does not read or persist student IP addresses, User-Agent values, or additional personal information for rate limiting.

## Google OAuth

Create a Google OAuth web client and configure:

- Local authorized redirect URI: `http://localhost:5173/api/auth/callback/google`
- Production authorized redirect URI: `https://myspellinggame.com/api/auth/callback/google`
- Authorized JavaScript origins for the matching local and production origins

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a high-entropy `BETTER_AUTH_SECRET` of at least 32 characters.

## Microsoft OAuth

Create a Microsoft Entra web app registration that supports the intended account types and configure:

- Local redirect URI: `http://localhost:5173/api/auth/callback/microsoft`
- Production redirect URI: `https://myspellinggame.com/api/auth/callback/microsoft`

Set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`. Google and Microsoft login can be configured independently.

## Admin dashboard

Set `ADMIN_EMAIL` in the Cloudflare Worker variables (or with `wrangler secret put ADMIN_EMAIL`) to the login email allowed to open `/admin`. Do not commit the real email. If this variable is missing, all Admin API requests are denied.

## Welcome email

Set `RESEND_API_KEY` as a Cloudflare secret. The first time Better Auth creates a user, the Worker sends a localized welcome email from `hello@myspellinggame.com`. Sending failures are logged without blocking registration.

## Stripe

1. Create one recurring monthly Price at USD 5.99 and one recurring yearly Price at USD 49.99.
2. Set their IDs as `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY`.
3. Create one recurring monthly Parent Price at USD 4.99 and one recurring yearly Parent Price at USD 49.99.
4. Set their IDs as `STRIPE_PARENT_PRICE_MONTHLY` and `STRIPE_PARENT_PRICE_YEARLY`.
5. Create one recurring monthly Teacher Price at USD 9.99 and one recurring yearly Teacher Price at USD 99.99.
6. Set their IDs as `STRIPE_TEACHER_PRICE_MONTHLY` and `STRIPE_TEACHER_PRICE_YEARLY`.
7. Enable and configure the Stripe Customer Portal for subscription management.
8. Create a webhook endpoint at `https://myspellinggame.com/api/stripe/webhook` for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.created`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
9. Store the API key and webhook signing secret as `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` Cloudflare secrets.

Confirm that the Customer Portal allows switching between the Parent and Teacher products and subscription cancellation, and verify the Parent Prices remain USD 4.99/month and USD 49.99/year and the Teacher Prices remain USD 9.99/month and USD 99.99/year. Keep the legacy Prices configured for existing subscriptions.

For local webhook testing, run Stripe CLI forwarding to `http://localhost:5173/api/stripe/webhook` and use its temporary `whsec_...` value only in `.dev.vars`.

## Verification commands

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run build`

## Google Classroom sharing (local v1)

Assignment details, including the screen reached after creation, offer Share to Google Classroom beside Copy link. This uses the official `https://classroom.google.com/share` flow with URL, title, body and assignment type. It does not request Classroom OAuth or access rosters/grades. A share click means an attempt to open the Google dialog, never confirmed publication.

Link-only assignments share `/a/:publicId`. Teacher assignments with selected learners share `/join/:classPublicId?assignment=:publicId`; each learner enters their own existing PIN and the server verifies class ownership and assignment membership before returning the existing learner identity. Legacy generic links recover through the same PIN entry. Other plans keep individual links and cannot use class-wide PIN sharing for selected learners. Closed/expired work cannot be shared or entered.

No new migration, secret or environment variable is required. Existing lifecycle events now include `assignment_share_clicked` (adult owner, assignment, controlled channel), `assignment_entry`, and a `channel` on start/result/abandonment. Channels are `direct`, `copy_link`, `google_classroom`. UUID click/entry keys deduplicate network retries; each intentional new click remains a separate event. Result attribution follows the server-recorded start when available.

`adult_acquisition_captured` retains the adult account's first source/medium/campaign independently of `signup_source` and student distribution. Browser session storage and controlled callback parameters preserve it through OAuth. Sources are direct/google/bing/google_classroom/chatgpt/facebook/instagram/external_other; mediums are organic/referral/social/email/cpc/ai_assistant; campaigns are classroom_launch/teacher_resources/parent_resources. Unknown fields and full URLs are discarded. Student routes do not capture adult acquisition. DNT/GPC and GA disable flags suppress adult capture. Nothing from these new server dimensions is added to GA4's allowlist.

Local checks: `npm ci`, `npm run db:migrate:local`, `npm run dev` (http://127.0.0.1:5173), then lint/typecheck/test/build and Playwright. The shared browser fixture blocks external network calls; Classroom popups and OAuth use test doubles. Real Google login, class selection and publication require separate authorized account testing and are not established by local tests. `npm run build` is a Wrangler dry run; do not run remote migrations or push without separate approval.

## First-party diagnostics

Apply `0023_diagnostics.sql` locally with `npm run db:migrate:local`. A separately authorized production migration must precede eventual release; this implementation does not run any remote migration. Diagnostics storage is optional and failures do not block the app.

Sign in to `/admin` using the existing `ADMIN_EMAIL` account. In 分享与作业诊断 click 查询诊断 for the last seven days' grouped event/reason/status/version counts and latest 50 observations. Paste a 24-hex diagnostic ID to inspect at most 100 records in one browser-session chain. The same authenticated read-only API is `GET /api/admin/diagnostics?trace=<24-hex-id>`; anonymous and ordinary adult accounts cannot access it. A user's local chain ID can be read from `JSON.parse(sessionStorage.getItem('mySpellingDiagnosticContext') || 'null')?.trace` in their own browser, without copying the ticket, URL, PIN or learner identity.

Server observations cover share-link generation, PIN validation, entry GET, practice start and result submission; existing lifecycle share-click/start/result counts retain their original meanings. Client-only reports cover popup blockers, request timeout/network failure, invalid response and the first JS error/unhandled rejection per page. Do not sum lifecycle activity and diagnostic observations as two actions. Browser reports are explicitly unverified and Google selection/publication inside Classroom is unobservable.

Only controlled route templates/reason codes, HTTP status, source, random trace/event IDs, server-resolved adult/assignment IDs, server time and fixed release version are retained. No learner token, PIN, student name/email, full URL/query/referrer, answers, exception message/stack, IP or user agent is saved. DNT/GPC/GA-disable suppress browser reports and the workflow sends an opt-out header for server observations. Signed 24-hour diagnostic tickets, same-origin checks, request size limits, per-IP transient rate limiting, deduplication and database caps protect intake: 20 rows per trace/minute, 100 per trace, 10,000/day, 70,000 retained rows. The existing daily scheduled handler prunes rows older than seven days; queries exclude expired rows even before pruning. Fixed release version is `2026-10-02.classroom-diagnostics-v1` and must be changed in both diagnostic modules for a later instrumented release.

Workflow requests time out after 20 seconds, with existing UI retry handling; diagnostic bootstrap/report requests are capped at three seconds and never awaited by payment, OAuth, loading or assignment submission. Late successful submissions remain safely retryable with the existing attempt ID. Stripe implementation/configuration remains unchanged.
