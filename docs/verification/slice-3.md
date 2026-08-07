# Slice 3 verification: locales and translation completeness

- Date: 2026-08-05
- Runtime: Node.js 22, Next.js 16.3, local PGlite PostgreSQL-compatible database
- Decision record: ADR 0009

## Automated evidence

The following checks pass:

```text
npm run verify
  format:check       pass
  lint               pass
  typecheck          pass
  catalog:check      92 keys per locale
  metadata:check     pass
  test               11 files, 53 tests
  build              27 pages/routes generated
```

Coverage includes deterministic locale priority, weighted `Accept-Language` parsing, localized path preservation, locale-aware formatting, authenticated preference persistence through `AuthRepository`, the database invariant that an exam's primary locale is enabled, and the transactional content-translation completeness gate.

The translation integration tests prove that an incomplete locale remains disabled and reports aggregate missing counts for question, option, test, and media accessibility translations. After every required translation is added, the same operation enables the locale idempotently without changing locale-neutral question identity.

## Local HTTP smoke

The migrated local app at `http://localhost:3000` passed these checks:

1. `/api/health` returned HTTP 200 with `database: ok`.
2. `/` with English `Accept-Language` returned a 307 redirect to `/en`.
3. `/` with `shibaquiz_locale=en` returned a 307 redirect to `/en`.
4. `/vi/reset-password?token=smoke-token` rendered a progressive-enhancement link to `/en/reset-password?token=smoke-token`.
5. `/en` returned HTTP 200 with `lang="en"` and English catalog content.

## Remaining manual evidence

The in-app browser runtime was unavailable in this session, so the visual click/keyboard smoke remains open under S3-05. The HTTP and rendered-HTML checks above cover routing, query preservation, catalog output, and health but do not replace manual focus/visual verification.

## Security and localization assumptions

- Locale preference priority is authenticated profile, cookie, weighted language header, then Vietnamese.
- The locale cookie is `HttpOnly`, `SameSite=Lax`, path-wide, and one-year; authenticated updates go through the auth repository.
- A persistence failure never traps language navigation, and password/form values are not copied to browser storage.
- Translation-gate reports contain only aggregate counts and never expose answer content or correctness.
- Attempt locale and immutable localized snapshots remain Step 7 work and cannot be rewritten by UI-locale changes.
