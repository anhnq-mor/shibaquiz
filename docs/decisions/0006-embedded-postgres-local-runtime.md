# ADR 0006: Embedded PostgreSQL-compatible runtime for zero-dependency local development

- Status: Accepted
- Date: 2026-08-04
- Supersedes: the local-development-only portion of ADR 0002 that required an external PostgreSQL process

## Context

The current development host does not provide Docker, `psql`, or a PostgreSQL service. The application shell can render, but database readiness, migration, and seed cannot run from a fresh checkout without installing external infrastructure.

The production constraints remain unchanged: Vercel/serverless persistence must use managed PostgreSQL, JSON files are not a write database, and media must never be written to the application runtime filesystem.

## Decision

Support `STORAGE_DRIVER=pglite` only when `NODE_ENV` is not `production` and `VERCEL` is absent. PGlite runs the PostgreSQL engine in-process and stores its local cluster below the gitignored `data/` directory. It uses the same Drizzle schema, SQL migrations, repository interfaces, and seed repository as managed PostgreSQL.

`npm run dev` performs an idempotent local migration and seed before starting Next.js. `npm run dev:postgres` remains available for testing against an external PostgreSQL service.

Configuration validation rejects PGlite in production/Vercel. No PGlite path is selected implicitly outside the local development command.

## Consequences

- A fresh checkout can run locally with Node/npm only.
- Migration and repository behavior stay PostgreSQL-compatible rather than introducing a JSON or SQLite variant.
- Local PGlite data is disposable development state, not a production backup format.
- Provider-level behavior such as pooling, network failure, TLS, backup, and concurrency must still be verified against the selected managed PostgreSQL service before release.
- The local database may write relational database files under `data/`; the media rule is unchanged and no media binary is stored there.
