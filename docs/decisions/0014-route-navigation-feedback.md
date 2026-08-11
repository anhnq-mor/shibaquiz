# ADR 0014: Route navigation feedback

## Status

Accepted.

## Context

The existing request overlay follows calls made through `apiFetch`. Next.js App Router navigation uses React Server Component requests internally, so clicking a route link can still appear unresponsive while a dynamic destination renders. Same-page anchors such as `#principles` and `#status` do not have this delay and should stay immediate.

## Decision

- Add `src/app/[locale]/loading.tsx` so dynamic localized routes can prefetch and stream a lightweight fallback.
- Add a nested `src/app/[locale]/admin/loading.tsx` boundary so transitions between dynamic Admin pages keep the persistent Admin header while showing a localized spinner and skeleton in the content region.
- Route internal navigation through a shared `RouteLink` wrapper that uses Next.js `useLinkStatus`.
- Show a fixed top progress indicator only when a transition lasts longer than 120 ms. Mark the active link `aria-busy` and prevent repeated pointer activation while it is pending.
- Keep the route fallback lightweight, localized in `vi` and `en`, and non-modal. API mutations continue to use the existing blocking overlay where duplicate actions could change data.
- Keep same-page anchors as native `<a href="#…">` elements, outside `RouteLink`, so they never trigger route loading feedback.

## Consequences

Navigation now responds promptly on slow or uncached routes without flashing a loader for fast transitions. Admin navigation has explicit feedback within its shell, while API mutations retain the global blocking overlay. The shared wrapper must be used for new internal route links, while downloads, external URLs, and hash anchors continue to use native anchors.
