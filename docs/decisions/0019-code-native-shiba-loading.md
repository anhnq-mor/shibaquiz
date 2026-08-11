# ADR 0019: Code-native Shiba loading states

## Status

Accepted.

## Context

Generic spinners provide little product personality and do not communicate the transition from an active request to successful completion. A supplied visual reference establishes an orange Shiba running left-to-right with dust and a happy stopped state.

## Decision

- Implement the Shiba as an inline, decorative SVG with CSS animation rather than shipping a GIF, sprite sheet, or generated binary asset.
- Reuse one `ShibaLoading` component for localized route fallbacks, Admin route fallbacks, and the global API overlay.
- Keep bilingual copy in a typed `loading-catalogs` module. The selected locale is primary and the alternate locale is secondary.
- While an API request is active, run Shiba from left to right with dust, alternating paws, head bounce, and tail movement.
- When the last concurrent API request completes, show a 720 ms stopped state with a faster tail wag and small celebratory sparks, then remove the overlay. The completed overlay does not intercept pointer input and `aria-busy` is cleared immediately.
- Honor `prefers-reduced-motion: reduce` by centering a static Shiba and disabling running, dust, bob, paw, tail, and sparkle animation.
- Keep the SVG `aria-hidden`; localized text remains the accessible `role=status` announcement.

## Consequences

Loading feedback is brand-specific, lightweight, resolution-independent, and driven by real request state. Route transitions cannot retain a completion phase after their fallback unmounts, while API requests can show both running and completion states.
