# ADR 0007: Database sessions and explicit authentication boundaries

- Status: Accepted
- Date: 2026-08-04

## Context

Step 2 must implement email/password authentication, one-time verification/reset links, revocable sessions, role authorization, rate limits, bilingual account screens, and a safe admin seed. Authentication data is sensitive and every business operation must remain behind repository interfaces.

## Decision

Use bcrypt through the maintained `bcryptjs` package with cost 12 for password hashes. Use opaque, cryptographically random 256-bit verification/reset/session tokens. Only SHA-256 hashes of tokens are stored in PostgreSQL; raw tokens exist only long enough to enter an email link or an `HttpOnly` cookie.

Sessions are database-backed and revocable. The browser cookie contains only the opaque session token and uses `HttpOnly`, `SameSite=Lax`, `Path=/`, an explicit expiry, and `Secure` in HTTPS/production. Server authorization always resolves the hashed cookie against an unexpired, unrevoked database session and rechecks user verification, lock status, and role near the data access boundary.

Use Route Handlers as transport adapters, Zod for server input validation, a service layer for auth policy, `AuthRepository` for persistence, `EmailService` for delivery, and purpose-built safe DTOs. Route handlers validate request origin for cookie-affecting mutations and return the common error envelope with a request ID.

Rate-limit state is stored in PostgreSQL using hashed keys; raw email/IP identifiers are not persisted as rate-limit keys. Limits are enforced for register, login, resend verification, and forgot-password operations.

The local console email adapter may print a verification/reset URL only in development so the required flow can be exercised without a provider. Production configuration rejects the console provider. Application logs never include passwords, cookie values, password hashes, or token hashes.

Admin seed has no default credential. It requires an explicitly supplied email and spec-compliant password, refuses production unless an additional acknowledgement flag is present, hashes the password, and never prints it.

## Consequences

- Session revocation and account locking take effect on the next server authorization check.
- Database lookups are required for secure authorization; React `cache` may deduplicate checks within one render pass, but authorization results are not shared across requests.
- Password changes revoke every other session while retaining the current session.
- Verification and reset consumption are transactional and one-time.
- Provider-specific email delivery can be added without changing auth services.
