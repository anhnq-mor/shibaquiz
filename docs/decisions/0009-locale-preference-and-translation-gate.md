# ADR 0009: Locale preference and transactional translation gate

- Status: Accepted
- Date: 2026-08-05

## Context

Step 3 completes the `vi`/`en` foundation before admin authoring and attempts are implemented. Locale selection must remain stable across routes and sessions, while an exam locale must never be exposed if required published content would mix languages. Proxy must stay lightweight and cannot perform database-backed session resolution.

## Decision

Use stable locale-prefixed URLs. The unprefixed root is a dynamic Server Component that resolves locale in this order: authenticated profile, `shibaquiz_locale` cookie, weighted `Accept-Language`, then `vi`. Proxy handles only lightweight normalization of other unprefixed paths using cookie/header resolution and never queries the database.

Language switchers are Client Components with real localized links for progressive enhancement. With JavaScript, a same-origin POST persists the locale in a one-year `HttpOnly`, `SameSite=Lax` cookie, updates `users.preferred_locale` for a valid active session through `AuthRepository`, and navigates to the equivalent locale-prefixed pathname while retaining the query string. Failure to persist does not trap navigation. Password/form values are never copied into browser storage; attempt answer preservation remains server-backed in Step 7.

Add a `ContentTranslationRepository` port and service. Enabling an exam locale obtains a row lock, computes missing translations for the exam and every published topic, question, option and test, plus localized accessibility text for READY media referenced by published questions, and updates `enabled_locales` only when the report is complete. Image media requires localized alt text; audio/video media requires a localized transcript. The report contains aggregate counts, not answer data or localized content.

Add a database check requiring `primary_locale` to be present in `enabled_locales`. Cross-row completeness remains a transactional service/repository invariant because PostgreSQL check constraints cannot safely enforce it across translation tables.

Formatting uses explicit locale-aware helpers over UTC dates and canonical numeric values. Attempt content locale remains immutable and independent from the UI locale as decided in ADR 0004.

## Consequences

- Direct `/vi/...` and `/en/...` URLs remain authoritative explicit choices; preference resolution is used for unprefixed entry and updated by the switcher.
- Guest preference survives browser restarts; authenticated preference also follows the user to another browser after login.
- Content managers receive actionable missing-count categories without exposing correct answers.
- Translation deletions after a locale was enabled must be prevented or revalidated by the admin mutation layer in Step 4; all enable operations use the gate introduced here.
- This slice adds a schema migration but no attempt or answer-disclosure endpoint.
