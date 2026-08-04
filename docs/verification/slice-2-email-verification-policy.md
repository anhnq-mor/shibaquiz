# Slice 2 extension verification: configurable email verification

Date: 2026-08-04

## Automated evidence

`npm run verify` passed after migration `0002_smiling_the_renegades.sql` was generated and applied:

- Prettier, ESLint, strict TypeScript, project metadata, and 86-key `vi`/`en` catalog parity passed.
- 44 unit/integration tests passed across 9 test files.
- Migration coverage confirmed `email_verified_at` and `email_verification_exempted_at` remain separate facts.
- Auth integration covered required registration, replacement resend tokens, one-time consumption, disabled-policy registration without token/email, durable exemptions, temporary access for legacy unverified accounts, session authorization under both policies, rate limiting, and generic resend behavior during provider failure.
- The Next.js production build completed and kept `/[locale]/verify-email` dynamic so it reads the server policy at request time.

## Local HTTP and browser smoke

With the default `REQUIRE_EMAIL_VERIFICATION=true`:

- registration returned `201` with `verificationRequired: true`;
- resend returned the generic `200` response and the console adapter emitted a replacement link;
- the Vietnamese resend form exposed an accessible status message and no browser console errors.

With `REQUIRE_EMAIL_VERIFICATION=false` in a restarted local process:

- registration returned `201` with `verificationRequired: false`;
- resend returned the same generic `200` shape without invoking the console email adapter;
- login returned `200` immediately;
- `/vi/verify-email` and `/en/verify-email` hid token/resend controls and explained that verification was not required;
- no browser console errors were observed.

The app was restored to the secure default policy on `http://localhost:3000` after the smoke test.
