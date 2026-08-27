# Cloudflare deployment checks

The site now uses a Cloudflare Worker with static assets and a D1 binding. Do not deploy until the D1 database ID, secrets, OAuth callback, Stripe products, and webhook described in `TEACHER_MVP_SETUP.md` are configured.

Before release:

1. In **SSL/TLS → Edge Certificates**, enable **Always Use HTTPS**.
2. Add a Redirect Rule for `http://myspellinggame.com/*` to the matching `https://myspellinggame.com/*`, preserving the path and query string with a permanent redirect.
3. Add a permanent Redirect Rule from `www.myspellinggame.com/*` to the matching non-www HTTPS URL, preserving the path and query string.
4. Confirm both hostnames have valid certificates and the redirects work without a loop.
5. Enable HSTS only after the HTTPS and hostname checks pass. Start with a short max-age before increasing it or including subdomains.
6. Apply D1 migrations before sending teacher or student traffic to the new Worker.
7. Verify `/teacher` and `/a/*` return `X-Robots-Tag: noindex, nofollow, noarchive`, while `/pricing` remains indexable.

The existing `_redirects` file continues to redirect old `.html` paths to extensionless URLs. These dashboard settings are manual deployment tasks and are not claimed as active by this repository.

## IndexNow

The public verification key is stored at `/c8e75d1227e47ac22dd5464a576d8bcf.txt`. After a production deployment is live and that URL is reachable, run `npm run indexnow`. The command submits only canonical public HTML pages changed in the latest Git commit; use `npm run indexnow -- --base=<previous-deployed-commit>` when a deployment spans multiple commits. Use `--dry-run` to inspect the URL list without sending it.

Submission status can be checked in **Bing Webmaster Tools → IndexNow**. IndexNow notifies participating search engines about changed URLs; it does not guarantee crawling or indexing.
