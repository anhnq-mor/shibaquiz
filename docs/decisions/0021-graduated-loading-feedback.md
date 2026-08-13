# ADR 0021: Graduated loading feedback and a logo-only route fallback

## Status

Accepted.

## Context

The app had three independent loading triggers — route transitions, API
requests, and durable import jobs — but the two request-driven indicators
(`ApiProgressBar`, a thin top bar, and `ApiLoadingOverlay`, a full-screen
blocking overlay) both appeared the instant any `apiFetch` call started,
with no delay. This ignores the Nielsen Norman Group response-time
guidance industry practice follows: under ~0.1s needs no feedback, 0.1–1s
only needs a light local cue, and a disruptive full-screen block should be
reserved for waits long enough that the user would otherwise wonder if the
app froze. Blocking the whole screen for a sub-second status change felt
heavier than the action warranted, and the two indicators firing together
was redundant.

Separately, the full-page route fallback (`RouteLoading` /
`AdminRouteLoading`) reused the same animated running-Shiba-plus-copy
treatment as the API overlay (ADR 0019). For a route still rendering,
product wants the simpler "just the brand mark" treatment common on large
sites (e.g. Facebook's centered logo while the app boots) rather than a
character animation with copy.

## Decision

- Add a new `LogoLoading` component: the existing `BrandMark` icon, enlarged
  and gently pulsing, with no character animation and no visible copy — only
  a `sr-only` localized label for the `role="status"` announcement. Use it
  in `RouteLoading` and `AdminRouteLoading` in place of `ShibaLoading`.
  `ShibaLoading` is unchanged and still used by `ApiLoadingOverlay`, which is
  a different trigger (a real in-flight request, not "the route hasn't
  rendered yet") and keeps its own running/done personality.
- Give `ApiProgressBar` and `ApiLoadingOverlay` their own show-delay,
  matching the tier of disruption each represents: `API_PROGRESS_BAR_DELAY_MS`
  (120 ms, same delay already used for route transitions) for the
  lightweight top bar, and a larger `API_OVERLAY_DELAY_MS` (500 ms) before
  the blocking overlay appears. A request that resolves before its
  component's delay elapses never shows that indicator at all.
- Both constants live in `api-activity.ts` next to `API_COMPLETION_DURATION_MS`
  so all three loading-duration knobs stay in one place.
- Fixed a latent bug found while touching `ApiLoadingOverlay`'s className
  template: it concatenated `"api-loading-overlay"` and `"is-done"` with no
  separating space, producing one unmatched class token and silently
  dropping all overlay styling during the completion phase.

## Consequences

Sub-second API-driven actions (most admin status/save clicks) now show
nothing extra beyond whatever local pending state the component already
has, matching how brief interactions feel on other large sites. Only
requests that genuinely run long enough escalate first to the top bar, then
to the blocking overlay. Route fallbacks are visually simpler and
brand-neutral; the Shiba personality is now scoped to real request activity
only. A new indicator added later should pick a delay proportional to how
disruptive it is, rather than defaulting to instant.
