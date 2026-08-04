# Slice 2 verification: secure accounts

- Date: 2026-08-04
- Runtime: Node.js 22, Next.js 16.3, local PGlite PostgreSQL-compatible database
- Decision record: ADR 0007

## Automated evidence

The following checks pass:

```text
npm run format:check
npm run lint
npm run typecheck
npm run catalog:check
npm test                 # 9 files, 39 tests
npm run build            # 25 pages/routes generated; auth routes remain dynamic
```

Integration coverage applies both versioned migrations to an empty PGlite database and exercises register, verification, pre-verification login denial, safe DTOs, password reset, session revocation, generic missing-account reset behavior, and immediate locked-user denial. Tests also assert that the raw email verification token is not stored.

## Local HTTP smoke

With `npm run dev -- -p 3210`, a real browser-compatible HTTP flow completed successfully:

1. `/vi`, `/en`, `/vi/register`, `/en/login`, and `/vi/forgot-password` returned HTTP 200.
2. Registration returned 201 and the development email adapter emitted a one-time verification link.
3. The verification endpoint consumed the link once.
4. Login set the database-backed `HttpOnly` session cookie and `/api/auth/me` returned only the safe user DTO.
5. Password change succeeded while retaining the current session.
6. Logout revoked the session; the following `/api/auth/me` returned `user: null`.

The smoke account remains only in the gitignored local PGlite development database. Its verification token was consumed.

## Security/localization assumptions

- Verification and reset links render a confirmation button; page `GET` requests never consume tokens, avoiding mail-scanner/crawler side effects.
- Password change keeps the current session and revokes all other sessions. Password reset revokes every session.
- Forgot-password and resend responses are intentionally generic to avoid account enumeration.
- Console email is accepted only in development/test. Production validates a strong auth secret and a configured Resend sender/API key.
- Rate-limit keys are HMACs of action plus normalized email, never raw identifiers.
