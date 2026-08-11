# ADR 0012: Fail-closed production switches for email and media

- Status: Accepted
- Date: 2026-08-11

## Context

The first production deployment may intentionally launch without transactional email and media. Production must not use the development console email adapter, store media binary in PostgreSQL, or fall back to the serverless runtime filesystem when provider credentials are absent.

## Decision

Support `EMAIL_PROVIDER=disabled` only when `REQUIRE_EMAIL_VERIFICATION=false`. The email adapter performs no delivery; registration receives the existing durable verification exemption, while resend, forgot-password, and admin reset-email requests retain generic responses without exposing account existence. This means email-based recovery is unavailable until Resend is configured.

Support `MEDIA_STORAGE_DRIVER=disabled` without accepting S3 credentials. The adapter implements the existing object-storage port but fails every signed upload/read/storage mutation with localized `FEATURE_DISABLED` HTTP 503. It never persists binary content in the database or runtime filesystem. Existing media metadata may still be listed by authorized admins, but binary access remains unavailable.

PostgreSQL remains mandatory on Vercel. Enabling either feature later requires only environment configuration and a new deployment; no schema migration or data rewrite is required.

## Consequences

- The app can launch securely with account/password login and non-media content using only managed PostgreSQL.
- Users cannot verify email or recover a forgotten password while email delivery is disabled. Operators must communicate this limitation before public signup.
- Questions that require media cannot be uploaded or consumed while media is disabled.
- `console` email remains rejected in production and no local media driver is introduced.
