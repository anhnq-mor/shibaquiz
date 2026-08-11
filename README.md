# ShibaQuiz

ShibaQuiz is a bilingual (`vi`/`en`) exam-practice application. All ten delivery slices are implemented: the accessible app foundation; a secure email/password account lifecycle with database sessions and server-side authorization; locale routing and translation-completeness gates; an admin-only content editor for exams, topics, questions, and tests with transactional publishing invariants and a redacted audit trail; a private signed-upload media lifecycle for question images/audio/video; transactional CSV/XLSX question import with preview and rollback; the full learner-facing flow — discovering published exams, taking an attempt across all three scopes and three modes with autosave and server-authoritative timing, idempotent submission and scoring, and owner-only history and review; per-question discussion with owner edit/soft-delete and admin moderation; admin user search/lock/role management with a last-admin guard and an audit-log viewer; and the hardening pass covering security headers/CSP, CI secret scanning, and documented backup/restore and deployment procedures.

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
- Multi-record business mutations run inside a single `database.transaction(...)` call on the owning feature's repository (one cohesive repository per feature area — e.g. `AdminContentRepository`, `AttemptRepository`, `ImportRepository` — rather than a generic unit-of-work).
- API DTOs are purpose-built and omit correct answers/explanations until the attempt mode permits disclosure.
- An attempt fixes one content locale and stores an immutable localized snapshot, including the media it references.
- Object storage is private; only short-lived signed URLs are returned after authorization, and every upload is validated against its declared MIME type by sniffing the real file signature before it can be attached to a question.

See [the backlog](docs/backlog.md) and [architecture decisions](docs/decisions/).

## Deployment and operations

Vercel/production configuration must set `STORAGE_DRIVER=postgres`, `DATABASE_URL`, `MEDIA_STORAGE_DRIVER=s3`, object-storage credentials, HTTPS `APP_URL`, `AUTH_SECRET` (at least 32 characters), and a non-console email provider with its credentials. `STORAGE_DRIVER=pglite` is rejected outside local development. See [docs/operations/deployment.md](docs/operations/deployment.md) for the full Vercel deployment walkthrough (env vars, migrations, first-admin seed, post-deploy verification) and [docs/operations/backup-restore.md](docs/operations/backup-restore.md) for database/media backup strategy, manual `pg_dump`/`pg_restore` commands, and a restore-drill checklist.

Local MinIO for testing the media lifecycle: `docker compose up -d minio minio-init`, then set the `MEDIA_S3_*` variables documented in `.env.example`.

CI (`.github/workflows/ci.yml`) runs `npm run verify` (format, lint, typecheck, catalog parity, tests, build), a `npm audit --audit-level=high` dependency scan, and a `gitleaks` secret scan on every push/PR; see `.gitleaks.toml` for the test-fixture allowlist.

Security headers, including a `Content-Security-Policy` scoped to the app's own origin plus the configured media-storage origin, are set centrally in `next.config.mjs`.

## Admin content editor

Sign in with an `ADMIN` account and open `/vi/admin` or `/en/admin` to manage exams, topics, questions, and tests. Every admin API route re-checks the session role server-side and every create/update/status/delete runs inside one database transaction with a redacted audit-log entry (entity, action, and status only — never question text, options, explanations, or correct answers). Exams, topics, and questions cannot be hard-deleted; they are archived or soft-deleted so existing attempt snapshots stay unaffected. Publishing an exam requires at least one published topic and one valid published question; publishing a test requires either a fully-selected `FIXED` question list or a `DYNAMIC` topic-percentage split totalling 100% with enough published source questions, previewed before saving.

## Taking an exam

Sign in with a `USER` (or `ADMIN`) account and open `/vi/exams` or `/en/exams` to search published exams. An exam's detail page lists its published topics and tests and lets you start an attempt: choose `TOPIC`, `FULL_TEST`, or `QUESTION_BANK` scope, then `STUDY`, `PRACTICE_IMMEDIATE`, or `EXAM_DEFERRED` mode. Answers autosave as you work; a timed `FULL_TEST` shows a server-authoritative countdown and submits automatically when time runs out. Starting the same configuration again resumes the existing in-progress attempt instead of creating a duplicate. After submitting, `/attempts/[id]/result` shows the score, pass/fail (when the scope has a passing threshold), a per-topic breakdown, and full review; `/vi/history` lists every past attempt with exam/mode/status/date filters and cursor pagination. An attempt never discloses correct answers or explanations before the mode/status allows it, and one user can never read or mutate another user's attempt.

The local seed includes one published bilingual sample exam (`SHIBA-SAMPLE`) with two topics, eight questions, and a fixed and a dynamic test, so this flow is usable immediately after `npm run dev`.

## Media library

`/vi/admin/media` lets an admin upload images/audio/video via a signed direct-to-bucket upload. On completion the server fetches the object back, sniffs its real file signature against the declared MIME type, and marks it `READY` (attachable) or `QUARANTINED` (signature mismatch). Only `READY` assets can be attached to a question (up to 5, ordered) from the question editor. Media referenced by a published attempt is frozen into that attempt's localized snapshot, so replacing or deleting an asset later never changes what a learner already saw. Learners access media through a short-lived, per-attempt-question signed-URL endpoint that re-checks attempt ownership on every request — never a public bucket URL.

## Bulk question import

`/vi/admin/import` imports questions from a UTF-8 CSV or XLSX file: pick an exam, preview (every row is fully validated — topic slug, option correctness rules, translation completeness, `READY`-only media references — with per-row errors and zero writes), then confirm. Commit re-validates and writes every row inside one database transaction, so a single invalid row rolls back the entire batch. Rows are upserted by `external_id` when present. "Download template" and "Export existing questions" produce the same column shape, and all CSV output is escaped against formula/CSV-injection (a leading `=`/`+`/`-`/`@` is neutralized).

## Question discussion

Once a question's answer is revealed on the attempt result page, learners can discuss it: plain-text comments (rendered as text, never HTML), owner-only edit/soft-delete, per-user rate limiting, and cursor-paginated threads shared across every attempt that used the question. Admins can hide any comment with a reason without needing a separate moderation queue.

## Admin user management

`/vi/admin/users` supports searching/filtering users and locking/unlocking, promoting/demoting, and sending a password-reset email — every mutating action writes a redacted audit-log entry (`/vi/admin/audit`), and locking a user revokes their active sessions immediately. A concurrency-safe last-admin guard (row-locked inside the same transaction) refuses to lock or demote the last remaining active admin, even under concurrent requests.

## Current limitations

No automated end-to-end (Playwright) suite exists yet for the attempt, media, import, comment, or admin-user flows — they are covered by integration/unit tests and manual verification. No automated accessibility (axe) suite exists yet — accessibility follows the established labeled-input/focus-visible/non-color-status conventions and has had a manual code-level review, not a live browser/screen-reader pass. The health endpoint only verifies application/database readiness, not object storage or email provider connectivity.

## Author / copyright

The legal owner and license are intentionally unresolved and block public release. The package remains private and `UNLICENSED` until the owner supplies the legal name and license decision; see ADR 0005.
