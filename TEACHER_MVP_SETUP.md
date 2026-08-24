# Teacher MVP setup

## Local development

Use Node.js 22 or newer.

1. Run `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and replace the placeholders with test credentials. Do not commit `.dev.vars`.
3. Run `npm run db:migrate:local`.
4. Run `npm run dev` and open `http://localhost:5173/teacher`.

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

## Stripe

1. Create one recurring monthly Price at USD 5.99 and one recurring yearly Price at USD 49.
2. Set their IDs as `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY`.
3. Enable and configure the Stripe Customer Portal for subscription management.
4. Create a webhook endpoint at `https://myspellinggame.com/api/stripe/webhook` for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Store the API key and webhook signing secret as `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` Cloudflare secrets.

For local webhook testing, run Stripe CLI forwarding to `http://localhost:5173/api/stripe/webhook` and use its temporary `whsec_...` value only in `.dev.vars`.

## Verification commands

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run build`
