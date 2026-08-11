# ShibaQuiz delivery backlog

Last reviewed: 2026-08-11
Source of truth: `SHIBAQUIZ_SPEC.md`
Statuses: `DONE`, `IN PROGRESS`, `PLANNED`, `BLOCKED`

This backlog maps every functional and non-functional requirement to an incremental vertical slice. Security, accessibility, localized attempt-snapshot integrity, and the specification's acceptance criteria take precedence if requirements conflict.

## Delivery slices

| Slice | Outcome                                                                                                   | Included requirements                                   | Exit evidence                                                                           | Status      |
| ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| 1     | Deployable foundation: app shell/design tokens, CI, PostgreSQL schema, repository and media-storage ports | NFR-02, NFR-03, NFR-04, NFR-05, foundation for FR-15/16 | Versioned migration, schema/repository contract tests, bilingual accessible shell, CI   | DONE        |
| 1A    | Zero-dependency local runtime with the same PostgreSQL schema/repository boundaries                       | NFR-03, NFR-05                                          | Idempotent migrate/seed; `/vi`, `/en`, and database health return 200                   | DONE        |
| 2     | Secure account lifecycle and server-side authorization                                                    | FR-01, FR-02, FR-14 (seed/admin guard subset), NFR-02   | Auth migrations, unit/integration tests, bilingual screens/email                        | DONE        |
| 3     | Complete locale routing/catalog and content-translation gates                                             | FR-15                                                   | Catalog parity test, locale resolution tests, bilingual email/templates                 | DONE        |
| 4     | Admin content authoring and publishing                                                                    | FR-10, FR-11, FR-12, FR-14                              | CRUD/audit migrations and integration tests, accessible bilingual editor                | DONE        |
| 5     | Private media lifecycle                                                                                   | FR-16                                                   | Signed upload/finalize/access tests, object signature validation, no binary persistence | DONE        |
| 6     | Transactional import                                                                                      | FR-13                                                   | Preview/validation/rollback tests and safe CSV export                                   | DONE        |
| 7     | Discovery and immutable localized attempts                                                                | FR-03, FR-04, FR-05, FR-06                              | Snapshot/autosave/expiry tests; answer-disclosure policy tests                          | DONE        |
| 8     | Idempotent submission, scoring, review, and history                                                       | FR-07, FR-08                                            | Transaction/scoring/ownership tests and critical E2E flows                              | DONE        |
| 9     | Question discussion, moderation, and audit                                                                | FR-09, remaining FR-14                                  | Ownership/moderation/rate-limit tests                                                   | DONE        |
| 10    | Hardening, accessibility, observability, deployment documentation                                         | all NFRs and MVP DoD                                    | E2E, WCAG checks, scans, restore drill, Vercel verification                             | IN PROGRESS |

## Functional requirements

| ID    | Acceptance-focused backlog item                                                                                                                            | Slice | Verification                                                                    | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------- | ------ |
| FR-01 | Register normalized unique email; configurable verification gate; durable exemption; hashed one-time 24h token; generic resend with replacement/rate-limit |     2 | Unit + migration + both-policy integration + auth E2E                           | DONE   |
| FR-02 | Login/logout, revocable sessions, password change/reset, generic failure messages, locked-user denial                                                      |     2 | Integration + security tests                                                    | DONE   |
| FR-03 | Published exam search/detail and TOPIC/FULL_TEST/QUESTION_BANK launch summary                                                                              |     7 | Repository integration tests; manual smoke verification                         | DONE   |
| FR-04 | STUDY, PRACTICE_IMMEDIATE and EXAM_DEFERRED disclosure/locking rules                                                                                       |     7 | Mode policy unit/integration tests                                              | DONE   |
| FR-05 | Fixed/dynamic generation, largest-remainder allocation, sufficient-bank guard, stable localized ordered snapshot                                           |     7 | Unit + snapshot immutability integration tests                                  | DONE   |
| FR-06 | Accessible navigator, flags, <=500ms autosave, retry/dirty warning, server-authoritative expiry                                                            |     7 | Component + integration tests; manual smoke verification (no automated E2E yet) | DONE   |
| FR-07 | Confirm submit, transactional idempotency, exact scoring, immutable result and topic breakdown                                                             |     8 | Unit + integration tests; manual smoke verification (no automated E2E yet)      | DONE   |
| FR-08 | Owner-only cursor history/filter/resume/review                                                                                                             |     8 | Authorization integration tests                                                 | DONE   |
| FR-09 | Plain-text paginated comments, owner edit/soft-delete, admin moderation/reason                                                                             |     9 | XSS/ownership/rate-limit integration tests                                      | DONE   |
| FR-10 | Exam/topic CRUD, uniqueness, safe archive, publish invariant                                                                                               |     4 | Service/repository integration tests                                            | DONE   |
| FR-11 | Valid single/multiple-choice editor, translations, audit and soft delete                                                                                   |     4 | Domain validation + integration tests                                           | DONE   |
| FR-12 | Fixed/dynamic test CRUD, 100% rule, source sufficiency, preview and attempt isolation                                                                      |     4 | Unit + transaction integration tests                                            | DONE   |
| FR-13 | UTF-8 CSV/XLSX preview and full validation; atomic create/upsert; localized fields; safe export; READY media references only                               |     6 | Parser unit + rollback integration + E2E                                        | DONE   |
| FR-14 | Safe admin user search/actions, revoke on lock, last-admin guard, reset email, redacted audit                                                              |   2/9 | Permission + concurrency integration tests                                      | DONE   |
| FR-15 | `vi`/`en` UI and content translations, stable locale URLs/preference, completeness gate, fixed attempt locale                                              | 1/3/7 | Catalog parity + locale/snapshot tests + E2E                                    | DONE   |
| FR-16 | Private signed direct upload/read, server-generated key, metadata/fingerprint checks, localized accessibility text and immutable media snapshot references | 1/5/7 | Adapter contract + authorization + media E2E                                    | DONE   |

## Non-functional requirements

| ID     | Backlog item                                                                                                        | Evidence                                                       | Status                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Meet read p95 target; paginate/index; minimize client JS; direct CDN media; change-only autosave                    | Query indexes, bundle/performance review, production telemetry | DONE (indexes/pagination/SSR/direct-signed-media/change-only-autosave in place; production p95 telemetry needs a live deployment)                                 |
| NFR-02 | Secure cookies/CSRF/origin/rate limits; standard hashing; validation; private media; CSP; answer redaction; scans   | Security tests and CI scans                                    | DONE                                                                                                                                                              |
| NFR-03 | Versioned migrations, transactional critical writes, immutable history, documented backup/restore                   | Migration tests and restore drill                              | IN PROGRESS (backup/restore documented with a drill checklist in `docs/operations/backup-restore.md`; the drill itself needs a real provider instance to execute) |
| NFR-04 | Responsive 360px, semantic keyboard UI, visible focus, AA contrast, non-color status, localized media accessibility | Automated axe plus manual keyboard/screen-size checks          | IN PROGRESS (manual code-level review only; no automated axe run or live browser/screen-reader pass yet)                                                          |
| NFR-05 | Strict TypeScript, storage-independent domain, migration-only schema, safe env configuration, translation parity    | CI type/lint/test/catalog/metadata checks                      | DONE                                                                                                                                                              |
| NFR-06 | Structured redacted logging, request IDs, health/readiness, error/latency/auth/import/submit metrics                | Observability integration and runbook                          | IN PROGRESS (structured error logging + `/api/health` readiness done; no metrics/APM backend wired up)                                                            |

## Slice 1 task board

| ID    | Task                                                                                             | Acceptance                                                                                             | Status |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------ |
| S1-01 | Scaffold strict Next.js App Router project with accessible bilingual shell                       | `/vi` and `/en` render correct `lang`, no hard-coded component copy, keyboard-visible locale switch    | DONE   |
| S1-02 | Establish design tokens and primitive components                                                 | Responsive from 360px, AA-oriented palette, reduced-motion support, semantic controls                  | DONE   |
| S1-03 | Define complete relational schema                                                                | All section 8 entities, translation tables, constraints and required indexes represented               | DONE   |
| S1-04 | Generate initial PostgreSQL migration                                                            | Forward migration is versioned and runs against an empty PostgreSQL database                           | DONE   |
| S1-05 | Define repository/unit-of-work ports                                                             | Domain/services import interfaces only; PostgreSQL wiring remains server-side                          | DONE   |
| S1-06 | Define private object-storage port and S3-compatible adapter                                     | Only metadata/object keys cross the boundary; signed URLs are short-lived; no binary DB/runtime writes | DONE   |
| S1-07 | Add configuration guards                                                                         | Vercel/production rejects non-PostgreSQL persistence and non-object media storage                      | DONE   |
| S1-08 | Add seed foundation                                                                              | Deterministic bilingual catalog/content seed without secrets                                           | DONE   |
| S1-09 | Add CI and tests                                                                                 | Format/lint/typecheck/unit/build/schema checks pass                                                    | DONE   |
| S1-10 | Document setup, migrations, repository rules, security invariants and deferred release decisions | A new contributor can verify slice 1 without hidden knowledge                                          | DONE   |

## Slice 2 task board

| ID    | Task                                                                       | Acceptance                                                                                                        | Status |
| ----- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| S2-01 | Add versioned auth/rate-limit migration                                    | PostgreSQL-compatible migration applies to empty and existing local databases                                     | DONE   |
| S2-02 | Implement auth repository and service boundaries                           | No route/component reaches Drizzle; multi-record token/session operations are transactional                       | DONE   |
| S2-03 | Implement registration, verification, and safe resend                      | Normalized email, bcrypt password, hashed 24h one-time token, verified-user gate, generic resend                  | DONE   |
| S2-04 | Implement login, database session, logout, and authorization               | Generic invalid login, revocable secure cookie, lock/verification/role checks next to server data                 | DONE   |
| S2-05 | Implement forgot/reset/change password                                     | Hashed 60m reset token, current-password check, required session revocation semantics                             | DONE   |
| S2-06 | Add origin validation, database rate limits, and redacted error envelopes  | Mutations reject untrusted origins; raw email/token/cookie/password data is absent from rate-limit keys           | DONE   |
| S2-07 | Add accessible bilingual account UI and email templates                    | Register/login/verify/forgot/reset/account screens and emails have `vi`/`en` catalog parity                       | DONE   |
| S2-08 | Add explicit safe admin seed                                               | No default credential; confirmation required; production requires an additional acknowledgement                   | DONE   |
| S2-09 | Verify migration, domain lifecycle, production build, and local HTTP smoke | Automated tests and real local register/verify/login/change/logout flow pass                                      | DONE   |
| S2-10 | Add configurable email-verification policy and complete resend lifecycle   | Server-only default-on toggle; durable exemptions; generic/no-op disabled resend; bilingual UI; both-policy tests | DONE   |
| S2-11 | Require password confirmation for registration, reset, and password change | Matching is enforced by client and server; bilingual accessible fields and validation tests                       | DONE   |

## Slice 3 task board

| ID    | Task                                                                 | Acceptance                                                                                                        | Status |
| ----- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| S3-01 | Resolve locale by profile, cookie, language header, then Vietnamese  | Root redirect follows deterministic tested priority; invalid values are ignored                                   | DONE   |
| S3-02 | Persist locale changes for guests and authenticated users            | Same-origin mutation writes a one-year cookie and updates the active user's profile only through `AuthRepository` | DONE   |
| S3-03 | Preserve localized route and query state in every language switcher  | Header/auth switchers retain the current pathname and query; labels and pending state remain accessible           | DONE   |
| S3-04 | Enforce transactional exam-locale translation completeness           | Missing exam/topic/question/option/test/media accessibility translations prevent enabling a locale                | DONE   |
| S3-05 | Add schema invariant, migration, locale formatting, and verification | Primary locale stays enabled; migration, unit/integration, build, and bilingual browser smoke pass                | DONE   |

## Slice 4 task board

| ID    | Task                                                            | Acceptance                                                                                                                        | Status |
| ----- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| S4-01 | Define validated admin content commands and repository port     | Domain rejects invalid question correctness and invalid fixed/dynamic structures before persistence                               | DONE   |
| S4-02 | Implement transactional exam/topic/question/test CRUD and audit | Each write and redacted audit event commit atomically; archive/soft-delete preserves references                                   | DONE   |
| S4-03 | Enforce publishing and source-sufficiency invariants            | Exams, topics, questions and tests cannot publish with invalid structure or incomplete enabled-locale content                     | DONE   |
| S4-04 | Add admin-only API and accessible bilingual editor              | Non-admin access is denied; editor provides `vi`/`en` fields, missing-translation cues and localized feedback                     | DONE   |
| S4-05 | Add integration tests, unit tests, and local verification       | Content/schema already versioned in slice 1; CRUD/publish/audit tests, catalog parity, typecheck, lint, and production build pass | DONE   |

## Slice 7 task board

| ID    | Task                                                                                                     | Acceptance                                                                                                                    | Status |
| ----- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| S7-01 | Define discovery/attempt domain ports, DTOs, errors, and pure scoring/expiry/disclosure-adjacent helpers | Domain layer has no persistence dependency; name-based `AttemptError` matches the established `AdminContentError` pattern     | DONE   |
| S7-02 | Implement transactional attempt generation for TOPIC/QUESTION_BANK/FIXED/DYNAMIC                         | Insufficient-bank configurations are rejected before any row is written; dynamic allocation reuses `allocateLargestRemainder` | DONE   |
| S7-03 | Enforce resume-not-duplicate, disclosure-by-mode, and locking after check                                | Starting the same configuration twice resumes the existing attempt; `PRACTICE_IMMEDIATE` locks a question once checked        | DONE   |
| S7-04 | Add autosave, check, and taking-page UI with a server-authoritative timer                                | ≤500ms debounced autosave with saving/saved/error states; countdown reflects server `expiresAt`, not client clock             | DONE   |
| S7-05 | Add discovery/attempt-taking integration and unit tests                                                  | Generation, disclosure, resume, and expiry are covered by PGlite-backed integration tests plus pure-function unit tests       | DONE   |

## Slice 8 task board

| ID    | Task                                                                   | Acceptance                                                                                                                                                              | Status |
| ----- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| S8-01 | Implement idempotent submit and server-side auto-expiry                | Resubmitting a terminal attempt returns the stored result unchanged; an overdue `IN_PROGRESS` attempt is scored and marked `EXPIRED` on the next request                | DONE   |
| S8-02 | Compute exact scoring and per-topic breakdown                          | Unanswered/incorrect/correct counts and rounded percentage match `computeAttemptResult`; pass/fail only applies when a test's passing score exists                      | DONE   |
| S8-03 | Add owner-only result review and cursor-paginated history              | Cross-user access to an attempt or its result returns `NOT_FOUND`; history filters by exam/mode/status/date and paginates by cursor                                     | DONE   |
| S8-04 | Add result and history pages, seed a published sample exam, and verify | Result/history pages render correctly; a bilingual published sample exam is seeded for local testing; typecheck, lint, catalog parity, tests, and production build pass | DONE   |

## Slice 9 task board

| ID    | Task                                                                                | Acceptance                                                                                                                  | Status |
| ----- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| S9-01 | Add comment domain/repository/service with pagination and rate limiting             | Cursor-paginated newest-first listing; per-user rate limit enforced via the shared `rate_limits` table                      | DONE   |
| S9-02 | Enforce ownership on edit/soft-delete and admin moderation with a reason            | Editing/deleting another user's comment returns `FORBIDDEN`; admin hide requires a reason and is redacted-audit-logged      | DONE   |
| S9-03 | Add comment API routes and a discussion thread on the attempt result page           | Thread only renders once a question's answer is disclosed; content renders as plain text (no `dangerouslySetInnerHTML`)     | DONE   |
| S9-04 | Add admin user search/lock/role management with a concurrency-safe last-admin guard | Locking revokes active sessions; two concurrent lock/demote requests against the last two admins never reach zero admins    | DONE   |
| S9-05 | Add a redacted audit-log viewer and integration tests                               | Ownership/moderation/rate-limit/last-admin-guard/concurrency tests pass; audit entries carry no question or credential data | DONE   |

## Slice 10 task board

| ID     | Task                                                               | Acceptance                                                                                                                                                                                                 | Status                                                                                                               |
| ------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| S10-01 | Add a Content-Security-Policy and remaining security headers       | `next.config.mjs` sets CSP (scoped to the app origin plus the configured media-storage origin) and HSTS                                                                                                    | DONE                                                                                                                 |
| S10-02 | Add CI secret scanning                                             | `gitleaks` runs in CI with a `.gitleaks.toml` allowlist for known-safe test fixtures; verified locally with zero findings outside `tests/`/build artifacts                                                 | DONE                                                                                                                 |
| S10-03 | Review structured logging/request-ID consistency across API routes | Every mutating route funnels unexpected errors through a shared `*ErrorResponse` helper that logs a redacted, request-ID-tagged entry                                                                      | DONE                                                                                                                 |
| S10-04 | Manual accessibility pass over Slice 5/6/9 UI                      | Found and fixed unlabeled comment textareas; confirmed existing label/focus-visible/non-color-status conventions were followed elsewhere                                                                   | DONE (code-level only; no automated axe run or live screen-reader pass)                                              |
| S10-05 | Document backup/restore and Vercel deployment procedures           | `docs/operations/backup-restore.md` and `docs/operations/deployment.md` cover PostgreSQL + media-bucket backup/restore, a restore-drill checklist, and the full Vercel deployment/verification walkthrough | DONE (documented; the drill and a live Vercel deploy still need to be executed against real provider infrastructure) |
| S10-06 | Independent security review of the session's new surface area      | Reviewed media/import/comments/admin-user-management for injection, authz/IDOR, and CSRF/origin gaps; no high-confidence findings                                                                          | DONE                                                                                                                 |
| S10-07 | Refresh global request feedback and Home navigation/progress UX    | Concurrent API requests drive one localized accessible loading overlay; Home has a sticky responsive header, account dropdown, locale toggle, and accurate 10-step progress                                | DONE                                                                                                                 |
| S10-08 | Add responsive feedback for route navigation                       | Internal route links expose a delayed, accessible pending state and localized streaming fallback; same-page anchors remain immediate and do not show a loader                                              | DONE                                                                                                                 |
| S10-09 | Add an explicit Admin route loading boundary                       | Admin-to-Admin navigation preserves the shell and shows a delayed localized spinner/skeleton; API mutations retain the shared blocking overlay                                                             | DONE                                                                                                                 |

## Slice 11 task board — complete question interaction model

| ID     | Backlog item                                                 | Acceptance evidence                                                                                 | Status |
| ------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------ |
| S11-01 | Extend the domain and PostgreSQL enum to five question types | Additive migration, domain validation, repository-only persistence                                  | DONE   |
| S11-02 | Store matching targets and structured attempt answers        | Opaque target IDs, localized target text, backward-compatible `answer_payload` migration            | DONE   |
| S11-03 | Preserve disclosure and localized attempt snapshots          | Hidden DTO omits correct matches/order/correctness; snapshot v2 freezes issued locale/content       | DONE   |
| S11-04 | Extend admin editor and CSV/XLSX import/export               | All five types, per-type limits, localized matching targets and accessible ordering controls        | DONE   |
| S11-05 | Extend attempt and result UI                                 | Choice, true/false, matching and ordering can be answered/reviewed in `vi`/`en`                     | DONE   |
| S11-06 | Verify migration, validation, scoring and disclosure         | Unit/integration tests plus lint, typecheck and production build                                    | DONE   |
| S11-07 | Mirror missing localized import cells                        | Field-level `vi`/`en` fallback for questions, explanations, options and matching targets            | DONE   |
| S11-08 | Make question explanations optional                          | Editor/API/import accept blank explanations; locale publishing ignores them; DB allows empty values | DONE   |
| S11-09 | Report actionable spreadsheet row errors                     | Review and commit errors identify the CSV/XLSX row, external ID, source columns, and all row issues | DONE   |

## Product-owner decisions (non-blocking for development)

- `BLOCKED FOR PUBLIC RELEASE`: legal author/owner name and license choice.
- `PLANNED`: production database, email, object-storage and error-tracking providers; adapters avoid coupling domain logic to these choices.
- `PLANNED`: brand assets/domain, orphan-media retention, privacy/terms and user-deletion policy.
