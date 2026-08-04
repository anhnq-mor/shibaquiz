# Slice 1 verification record

- Date: 2026-08-04
- Scope: project foundation, design system, CI, PostgreSQL schema/migration, repository ports, private object-storage adapter
- Result: Passed

## Automated evidence

- `npm run typecheck`: passed with strict TypeScript and exact optional-property checking.
- `npm run lint`: passed with zero warnings.
- `npm test`: 6 files and 24 tests passed.
- Migration integration: initial SQL applied to an empty embedded PostgreSQL-compatible PGlite database, created all 23 tables, and enforced case-insensitive email uniqueness.
- Disclosure tests: deferred and unchecked immediate modes serialize neither `isCorrect` nor `explanation`; public question DTOs also omit private object keys/versions.
- Locale tests: Vietnamese and English catalogs have parity across 30 keys.
- `npm run build`: passed and statically generated `/vi` and `/en`; generated HTML contains the matching `lang` attribute and localized copy.
- `npm audit --omit=dev --audit-level=high`: zero production vulnerabilities.

## Environment notes and residual risk

- Docker and a system PostgreSQL client were not installed in this workspace. The migration was therefore executed against PGlite rather than a provider instance. CI/deployment still needs to run `npm run db:migrate` against the chosen PostgreSQL service before release.
- Windows Application Control blocks the native Next.js SWC binary. Webpack plus the official SWC WASM fallback produced a successful production build. Linux CI/Vercel is not expected to have this host-specific restriction.
- A full development-dependency audit reports four moderate findings inherited by `drizzle-kit` through a legacy development-only esbuild loader. There are no high/critical findings and no affected package is shipped at runtime. CI scans all dependencies at the `high` threshold; the moderate chain remains tracked for an upstream Drizzle fix.
- Automated color-contrast and screen-reader audits remain part of each UI slice and the final hardening pass. Slice 1 includes semantic landmarks, a skip link, visible focus, reduced-motion handling, non-color status text, and a 360px layout baseline.
