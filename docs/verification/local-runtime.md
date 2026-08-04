# Local runtime verification record

- Date: 2026-08-04
- Result: Passed

## Fresh-start path

`npm run dev` now performs these operations in order:

1. Selects the explicitly local-only `pglite` storage driver.
2. Creates the validated `./data/pglite` cluster location.
3. Applies the versioned Drizzle SQL migrations.
4. Runs the bilingual idempotent foundation seed through `FoundationSeedRepository`.
5. Starts Next.js with Webpack, which is compatible with the current Windows Application Control policy.

The setup command was executed twice consecutively without migration or duplicate-seed errors.

## Runtime smoke test

The running local server returned:

- `GET /vi`: HTTP 200 with `<html lang="vi">`.
- `GET /en`: HTTP 200 with `<html lang="en">`.
- `GET /api/health`: HTTP 200 with `{"status":"ok","checks":{"database":"ok"},...}`.

PGlite is externalized from the Next.js server bundle because it loads PostgreSQL WASM and Node filesystem support directly. Production validation rejects the local driver and continues to require managed PostgreSQL.
