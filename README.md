# ShibaQuiz

ShibaQuiz is a bilingual (`vi`/`en`) exam-practice application. Delivery slices 1, 2, and 4 are implemented: the accessible app foundation, a secure email/password account lifecycle with database sessions and server-side authorization, and an admin-only content editor for exams, topics, questions, and tests with transactional publishing invariants and a redacted audit trail.

## Requirements

- Node.js 22+
- npm 10+

An external PostgreSQL service and private S3-compatible bucket are optional for the foundation UI. They are required when testing the corresponding production adapters.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000/vi` or `http://localhost:3000/en`. The default command creates a local PGlite PostgreSQL cluster below the gitignored `data/` directory, applies every migration, and runs the idempotent bilingual seed before starting Next.js. Stop the server with `Ctrl+C`; rerunning the command preserves local development data.

Account screens are available at `/vi/register`, `/vi/login`, `/vi/forgot-password` and their `/en` equivalents. In local development, verification/reset links are printed to the terminal by the console email adapter. Production rejects that adapter.

To send real email, set `EMAIL_PROVIDER=resend`, `EMAIL_FROM` to a verified sender, `EMAIL_API_KEY`, and an `APP_URL` matching the URL users open. Without these credentials, the local console adapter intentionally does not contact an external mail service.

Email verification is required by default. Set `REQUIRE_EMAIL_VERIFICATION=false` and restart the app to allow immediate registration/login. Accounts created under that setting receive a durable verification exemption; resend is a safe no-op while the setting is disabled. Keep the default enabled for public deployments unless the product owner explicitly accepts the identity/abuse trade-off.

PGlite is local-development only and is rejected by production/Vercel configuration validation. The application has no JSON write driver. Media bytes still require private object storage and are never written to the database or application runtime filesystem.

To use an external PostgreSQL service instead:

```bash
cp .env.example .env.local
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev:postgres
```

## Verification

```bash
npm run verify
```

Generate a migration after changing the Drizzle schema with `npm run db:generate`; review generated SQL before committing it. Apply migrations with `npm run db:migrate`.

To inspect local data safely, stop the dev server first and run `npm run db:inspect`. It prints table counts and redacted authentication summaries without exposing password, token, session, or rate-limit hashes.

To create the first admin, explicitly provide a unique email, a spec-compliant password, a display name, and confirmation before running `npm run db:seed:admin`. There are no default credentials. Production additionally requires `SEED_ADMIN_PRODUCTION_CONFIRM=I_UNDERSTAND_PRODUCTION`.

## Architecture invariants

- UI and use-case services depend on domain repository interfaces, never Drizzle or raw database clients.
- Multi-record business mutations run through `UnitOfWork` transactions.
- API DTOs are purpose-built and omit correct answers/explanations until the attempt mode permits disclosure.
- An attempt fixes one content locale and stores an immutable localized snapshot.
- Object storage is private; only short-lived signed URLs are returned after authorization.

See [the backlog](docs/backlog.md) and [architecture decisions](docs/decisions/).

## Deployment and operations

Vercel/production configuration must set `STORAGE_DRIVER=postgres`, `DATABASE_URL`, `MEDIA_STORAGE_DRIVER=s3`, object-storage credentials, HTTPS `APP_URL`, `AUTH_SECRET` (at least 32 characters), and a non-console email provider with its credentials. `STORAGE_DRIVER=pglite` is rejected outside local development. Database backup/restore and provider-specific deployment instructions are scheduled for the hardening slice; provider-native point-in-time recovery is recommended.

## Admin content editor

Sign in with an `ADMIN` account and open `/vi/admin` or `/en/admin` to manage exams, topics, questions, and tests. Every admin API route re-checks the session role server-side and every create/update/status/delete runs inside one database transaction with a redacted audit-log entry (entity, action, and status only — never question text, options, explanations, or correct answers). Exams, topics, and questions cannot be hard-deleted; they are archived or soft-deleted so existing attempt snapshots stay unaffected. Publishing an exam requires at least one published topic and one valid published question; publishing a test requires either a fully-selected `FIXED` question list or a `DYNAMIC` topic-percentage split totalling 100% with enough published source questions, previewed before saving.

## Current limitations

Imports, media lifecycle endpoints, attempts, scoring, history, and comments are scheduled in later slices. The health endpoint only verifies application/database readiness.

## Author / copyright

The legal owner and license are intentionally unresolved and block public release. The package remains private and `UNLICENSED` until the owner supplies the legal name and license decision; see ADR 0005.
