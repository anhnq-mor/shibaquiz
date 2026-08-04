# ADR 0008: Configurable email-verification policy

- Status: Accepted
- Date: 2026-08-04

## Context

ShibaQuiz must support deployments that either require verified email addresses or allow immediate account access. The policy affects registration, login, session authorization, verification links, resend behavior, localized UI, and auditability. A temporary configuration change must not silently misrepresent an unverified address as verified or unexpectedly lock accounts that were created under an explicit exemption.

## Decision

Use the server-only boolean environment variable `REQUIRE_EMAIL_VERIFICATION`, defaulting to `true`. It is validated with the rest of the authentication configuration and takes effect after process restart/deploy. Client input never controls the policy.

Add nullable `users.email_verification_exempted_at` through a versioned migration. When registration occurs with verification disabled, the repository stores an exemption timestamp transactionally, does not create an email-verification token, and the email adapter is not called. `email_verified_at` remains reserved for evidence that a verification token was consumed.

Authorization eligibility is evaluated near the repository boundary:

- while verification is disabled, an active user may create and use a session without verification;
- while verification is enabled, an active user must have either `email_verified_at` or `email_verification_exempted_at`;
- accounts created during the disabled period retain their explicit exemption if the policy is later enabled;
- older unverified, non-exempt accounts are temporarily allowed while the policy is disabled and are gated again if it is re-enabled.

Resend remains a public, origin-checked, database-rate-limited operation with a generic response. It replaces all unused verification tokens before sending a new 24-hour token only when the policy is enabled and the active account is neither verified nor exempt. Missing, locked, verified, exempt, and policy-disabled cases are indistinguishable to the caller and do not send email.

The server returns only the non-sensitive policy outcome needed for localized registration feedback. The verification page reads server configuration and hides verification/resend controls when the feature is disabled.

## Consequences

- The secure default remains unchanged for deployments that do not set the new variable.
- Email verification facts and policy exemptions remain distinguishable for future administration and audit work.
- The repository interface remains the only path for the transactional user/token/session operations.
- Changing the setting requires restart/deploy; a runtime admin setting is intentionally outside this slice.
- A schema migration is required, with integration coverage for empty and upgraded databases.
