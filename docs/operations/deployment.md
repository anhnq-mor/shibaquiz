# Deployment (Vercel)

ShibaQuiz is a standard Next.js App Router project. This guide covers
deploying it to Vercel with an external PostgreSQL provider and an
S3-compatible object-storage provider, which is the supported production
configuration — `next.config.mjs`/`src/server/config/env.ts` actively reject
PGlite and non-S3 media storage once `NODE_ENV=production` or `VERCEL=1`.

## 1. Provision external services

- **PostgreSQL** — any managed provider (Neon, Supabase, RDS, Vercel
  Postgres, ...). Note the connection string; enable SSL if the provider
  requires it (`DATABASE_SSL=true`). Enable point-in-time recovery/automated
  backups — see [backup-restore.md](./backup-restore.md).
- **S3-compatible object storage** — a private (non-public) bucket for
  question media (AWS S3, Cloudflare R2, Backblaze B2, MinIO, ...). Enable
  versioning (see backup-restore.md). Create an access key scoped to only
  that bucket.
- **Transactional email provider** — Resend is the only built-in adapter
  today (`EMAIL_PROVIDER=resend`). The console adapter used in local
  development is rejected in production.

## 2. Required environment variables

Set these in the Vercel project's Environment Variables settings (Production
and Preview as appropriate). See `.env.example` for the full list with
inline documentation; the ones with no safe default are:

| Variable | Notes |
| --- | --- |
| `STORAGE_DRIVER` | `postgres` (PGlite is rejected outside local dev) |
| `DATABASE_URL` | Connection string from your PostgreSQL provider |
| `DATABASE_SSL` | `true` if the provider requires SSL |
| `AUTH_SECRET` | Random string, 32+ characters (`openssl rand -base64 48`) |
| `APP_URL` | The `https://` URL users open — must match exactly (used for origin validation and email links) |
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_FROM` | A sender address verified with your provider |
| `EMAIL_API_KEY` | Provider API key |
| `MEDIA_STORAGE_DRIVER` | `s3` |
| `MEDIA_S3_REGION` | Provider region (`auto` for R2) |
| `MEDIA_S3_ENDPOINT` | Provider S3-compatible endpoint URL (omit for real AWS S3) |
| `MEDIA_S3_BUCKET` | Bucket name |
| `MEDIA_S3_ACCESS_KEY_ID` / `MEDIA_S3_SECRET_ACCESS_KEY` | Scoped credentials |
| `MEDIA_S3_FORCE_PATH_STYLE` | `true` for most non-AWS providers, `false` for real AWS S3 |

Everything else (`AUTH_BCRYPT_COST`, `AUTH_SESSION_DAYS`,
`REQUIRE_EMAIL_VERIFICATION`, `MEDIA_SIGNED_URL_TTL_SECONDS`,
`MEDIA_MAX_*_MB`, `DEFAULT_LOCALE`, `SUPPORTED_LOCALES`) has a working
default and only needs overriding to change behavior.

`src/server/config/env.ts` validates all of this with zod at first use and
fails loudly (not silently) on a missing/invalid required variable, so a
misconfigured deploy fails fast rather than serving broken requests.

## 3. Vercel project settings

- **Framework preset**: Next.js (auto-detected).
- **Build command**: default (`next build`); the project's `package.json`
  already wires `next build --webpack`.
- **Node.js version**: 22.x (matches `engines.node` in `package.json` and CI).
- **Install command**: default (`npm ci` is used in CI; Vercel's default
  `npm install` also works).

Do not set `VERCEL=1` yourself — Vercel sets it automatically, and the app's
config validation uses it (alongside `NODE_ENV=production`) to enforce the
production-only constraints (HTTPS `APP_URL`, non-console email, Postgres
storage, S3 media).

## 4. Database migrations

Migrations are not run automatically on deploy. Before (or immediately after)
the first deploy pointing at a fresh database, run once from a machine with
`DATABASE_URL` set to the production connection string:

```bash
npm run db:migrate
```

For subsequent deploys, run `npm run db:migrate` as a manual step in your
release process before traffic shifts to the new version, whenever a deploy
includes new migrations (check `drizzle/` for new files). Do this from CI or
a trusted operator machine — never from a Vercel serverless function, since
migrations need a long-lived direct connection and should run at most once
per release, not per cold start.

## 5. Seed the first admin

There is no default admin account. From a machine with production
`DATABASE_URL` (and other required env vars) set:

```bash
npm run db:seed:admin
```

This prompts for a unique email, a spec-compliant password, and a display
name, and in production additionally requires
`SEED_ADMIN_PRODUCTION_CONFIRM=I_UNDERSTAND_PRODUCTION` to be set, as an
explicit guard against accidentally seeding a production database.

## 6. Post-deploy verification

1. `GET https://<your-domain>/api/health` returns `200` with
   `{"status":"ok","checks":{"database":"ok"}}`. A `503` means the app can't
   reach PostgreSQL — check `DATABASE_URL`/network/SSL settings first.
2. Visit `/vi` and `/en` — both should render the localized shell.
3. Register a test account, verify the email link arrives (via your real
   email provider now, not the console adapter), sign in.
4. Sign in as the seeded admin, open `/vi/admin`, and confirm the dashboard
   loads (proves `ADMIN` role/session checks and the content repositories
   work end-to-end against production Postgres).
5. Upload a small image in `/vi/admin/media` and confirm it reaches `READY`
   status (proves the S3 credentials, bucket, and signed URL round-trip all
   work).
6. Response headers include `Content-Security-Policy`,
   `Strict-Transport-Security`, and the other headers from
   `next.config.mjs`'s `headers()` — spot-check with
   `curl -sI https://<your-domain>/vi | grep -i content-security-policy`.

## Rollback

Vercel deployments are immutable and instantly reversible from the
dashboard/CLI (promote a previous deployment). Database migrations are the
one part of a release that isn't automatically reversible — avoid destructive
migrations (dropping columns/tables) in the same release as application code
that depends on their absence; prefer expand/contract (add the new column,
backfill, deploy code that uses it, only drop the old column in a later
release) so a rollback of the application code never needs a matching
database rollback.
