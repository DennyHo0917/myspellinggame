# Cloudflare deployment checks

This repository is a static Cloudflare Pages site. HTTPS and hostname normalization must be configured in Cloudflare; static HTML and `_redirects` cannot reliably enforce them for every request.

Before release:

1. In **SSL/TLS → Edge Certificates**, enable **Always Use HTTPS**.
2. Add a Redirect Rule for `http://myspellinggame.com/*` to the matching `https://myspellinggame.com/*`, preserving the path and query string with a permanent redirect.
3. Add a permanent Redirect Rule from `www.myspellinggame.com/*` to the matching non-www HTTPS URL, preserving the path and query string.
4. Confirm both hostnames have valid certificates and the redirects work without a loop.
5. Enable HSTS only after the HTTPS and hostname checks pass. Start with a short max-age before increasing it or including subdomains.

The existing `_redirects` file continues to redirect old `.html` paths to extensionless URLs. The Cloudflare dashboard settings above are manual deployment tasks and are not claimed as active by this repository.
