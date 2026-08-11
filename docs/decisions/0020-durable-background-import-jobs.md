# ADR 0020: Durable background import jobs

## Status

Accepted.

## Context

Synchronous import keeps an Admin request open while up to 10,000 rows are revalidated and committed. It provides no durable execution state, no operational visibility, and is vulnerable to a serverless request ending before the work completes. Persisting the uploaded CSV/XLSX binary in PostgreSQL or a Vercel runtime filesystem would violate the project's storage boundaries.

## Decision

- Confirm Import validates the complete source file and stages one canonical `SaveQuestionInput` payload per valid row in PostgreSQL through `ImportRepository`; the original file binary is never persisted.
- The API returns `202 Accepted` with an `ImportJob` in `VALIDATED` state. Next.js `after()` starts the worker after the response, within the route's configured maximum duration.
- A worker atomically claims one `VALIDATED` job by changing it to `COMMITTING`. A 15-minute lease allows a trusted recovery trigger to requeue work abandoned by a terminated invocation.
- The staged rows are revalidated immediately before commit. All question, translation, option, media-link, audit, and final `COMPLETED` job writes remain in one database transaction.
- Job logs contain only operational events, row/count metadata, and stable error codes. They never include question content, answer payloads, credentials, or stack traces.
- Admin APIs expose list/detail/retry operations. An authenticated Admin monitor polls while jobs are active. A separate endpoint protected by `CRON_SECRET` can be called by Vercel Cron or another trusted scheduler for recovery.
- The current UI preserves the existing `UPSERT_BY_EXTERNAL_ID` behavior. `CREATE_ONLY` remains a future explicit selector rather than silently changing existing imports.

## Consequences

Admins receive an immediate job ID and can leave or revisit the monitor without losing state. A failed worker can be retried from durable staged rows without re-uploading the source file. Staging uses bounded JSONB payloads inside relational job rows, consistent with the existing PostgreSQL JSONB policy; PostgreSQL remains the database and no JSON file/database substitute is introduced. Progress is state/count based: because FR-13 requires an all-or-nothing content transaction, row writes are not exposed as independently committed partial progress.
