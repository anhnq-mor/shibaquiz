# Backup and restore

ShibaQuiz has exactly two durable stores: the PostgreSQL database (all
application data, including immutable attempt snapshots and audit logs) and
the private S3-compatible media bucket (uploaded images/audio/video referenced
by `object_key`). Nothing else needs backing up — the app is otherwise
stateless, and PGlite is local-development only (never used in production).

## PostgreSQL

### What to back up

Everything: `users`, `sessions`, `exams`/`topics`/`questions`/... content
tables, `attempts`/`attempt_questions` (immutable localized snapshots),
`comments`, `media_assets`/`media_translations`, `audit_logs`, `rate_limits`.
There is no separate "critical" subset — attempt history and audit logs are
compliance-relevant and must be restorable exactly.

### Recommended approach: provider point-in-time recovery (PITR)

Use your managed PostgreSQL provider's built-in continuous backup/PITR
(Neon, Supabase, RDS, Vercel Postgres, etc.) as the primary mechanism. It
gives point-in-time restore to any second within the retention window without
custom tooling, and is the only approach that meaningfully covers "restore to
5 minutes before an operator mistake." Enable it and set a retention window
that matches your compliance/recovery requirements (7–30 days is a reasonable
default for an MVP).

### Manual backup (`pg_dump`)

For ad hoc snapshots, or providers without PITR:

```bash
pg_dump --format=custom --file=shibaquiz-$(date +%Y%m%d-%H%M%S).dump "$DATABASE_URL"
```

`--format=custom` is compressed and restorable with `pg_restore`, and supports
parallel restore for large databases. Store the dump somewhere other than the
database host (object storage, off-site), and treat it as sensitive — it
contains password hashes and session token hashes, not plaintext credentials,
but should still not be publicly accessible.

Automate this with your CI/host scheduler (a daily cron job hitting a small
script that runs the command above and uploads the artifact) if the provider
lacks native PITR.

### Restore

```bash
# Into an existing empty database:
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" shibaquiz-20260101-030000.dump

# Then bring the schema up to the migration version the dump predates, if newer
# migrations have shipped since the dump was taken:
npm run db:migrate
```

`--clean --if-exists` drops conflicting objects before recreating them, so
this is safe to run against a database that already has the (older) schema.
Never restore directly into a database with newer data you want to keep —
restore into a fresh database/instance, verify, then cut over.

### Restore drill checklist

Run this at least once before relying on it in an incident, and periodically
thereafter (e.g. each quarter):

1. Provision a scratch PostgreSQL instance (a throwaway Neon/RDS/local Docker
   instance — never the production database).
2. Restore the most recent backup/PITR snapshot into it.
3. Run `npm run db:migrate` against the scratch instance and confirm it
   completes without error (proves the dump's schema version is compatible
   with the current migration chain).
4. Run `npm run db:inspect` against the scratch instance (point `DATABASE_URL`
   at it) and confirm table counts look sane and no password/token/session
   hashes are exposed by the tool.
5. Spot-check: pick a real user's email from the restored data, confirm their
   attempt history and audit trail are present and internally consistent
   (e.g. `attempts.score_percent` matches `attempt_questions` correctness).
6. Record the wall-clock time the drill took — that is your actual recovery
   time, not an estimate.

## Media (S3-compatible object storage)

### What to back up

Only `READY` objects under the `media/` prefix are referenced by anything;
`PENDING`/`QUARANTINED` assets are abandoned uploads. Object keys are
server-generated opaque UUIDs (`media/<uuid>`) and are never reused, so backup
is purely additive — there is no in-place mutation to protect against, only
accidental/malicious deletion.

### Recommended approach: bucket versioning

Enable versioning on the bucket (S3: `PutBucketVersioning`; most
S3-compatible providers, including MinIO, support this). A `DeleteObject`
then creates a delete marker instead of destroying data, and accidental
overwrites keep prior versions. Combine with a lifecycle rule that expires
noncurrent versions after a retention window (30–90 days) to bound storage
cost.

### Cross-region/provider replication

For production, enable the provider's cross-region (or cross-provider)
replication if available. This protects against a regional outage or
provider-level incident, which versioning alone does not.

### Restore

Object storage restore is per-object: locate the object key from
`media_assets.object_key` (or from `question_media`/the attempt snapshot's
`media[].objectKey` for a specific question), and restore that version via
the provider's console/API (`GetObjectVersion` / "restore previous version").
There is no bulk "restore the whole bucket to timestamp T" operation with
versioning alone — that requires the provider's PITR/backup product if one
exists (e.g. some providers offer bucket-level backup jobs).

### What NOT to worry about

Media bytes never touch the database or the application's runtime
filesystem (ADR 0003) — only `object_key`/metadata rows live in PostgreSQL.
Restoring the database and restoring the bucket are independent operations;
neither backup needs to be "consistent" with the other beyond both being
reasonably recent, because a `media_assets` row pointing at a since-deleted
object key simply fails a signed-read request (`NOT_FOUND`) rather than
corrupting anything.

## Runbook: total loss scenario

1. Provision a new PostgreSQL instance; restore the latest backup/PITR
   snapshot; run `npm run db:migrate`.
2. Point `MEDIA_S3_*` env vars at the (versioned, presumably still-intact)
   bucket — object storage failure independent of the database is unlikely
   with provider-managed buckets, but if the bucket itself was lost, restore
   it from provider backup/replication before pointing the app at it.
3. Redeploy the application with `DATABASE_URL`/`MEDIA_S3_*` pointing at the
   restored resources; confirm `/api/health` returns `200` with
   `checks.database: "ok"`.
4. Spot-check a real user login, an attempt-taking flow, and one admin action
   before declaring recovery complete.
