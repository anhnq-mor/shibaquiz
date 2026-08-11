# ADR 0013: Nonce CSP and safe authentication form fallback

- Status: Accepted
- Date: 2026-08-11

## Context

The application originally sent `Content-Security-Policy: script-src 'self'` while Next.js emitted inline bootstrap scripts. Browsers correctly blocked those scripts, so client components did not hydrate. Authentication forms then used the HTML default submission method (`GET`), placing email addresses and passwords in the URL query string and bypassing the JSON login route.

Passwords in URLs are unacceptable because URLs can be retained in browser history, request logs, referrer data, screenshots, and monitoring systems. A form must also remain safe when JavaScript is unavailable or fails to initialize.

## Decision

Generate a cryptographically random CSP nonce for every page request in `proxy.ts`. Pass the CSP and nonce to the Next.js renderer so the framework adds the nonce to its bootstrap and page scripts, and return the same CSP in the response. Production does not allow `unsafe-inline` or `unsafe-eval` for scripts. Development permits `unsafe-eval` only for React diagnostics.

Render localized pages dynamically because request-specific nonces cannot be attached to statically generated HTML. This deliberately gives up static page/CDN caching in favor of a strict script policy on an application that handles credentials and authenticated quiz data.

Every authentication form declares its API `action` and `method="post"` in the server-rendered HTML in addition to its enhanced JSON `fetch` handler. The API continues to accept validated JSON only; without hydration, submission fails closed rather than exposing credentials in a URL. Use `Referrer-Policy: strict-origin` as defense in depth so paths and query strings are not propagated through referrer headers.

## Consequences

- Next.js bootstrap scripts execute only when they carry the nonce generated for the current response.
- Login and registration work after hydration, while an initialization failure cannot degrade to a credential-bearing GET request.
- Localized pages require server rendering per request and cannot use static optimization or ordinary CDN page caching.
- Styles retain the existing `unsafe-inline` allowance until the UI removes all inline-style dependencies; this does not weaken the nonce requirement for scripts.
