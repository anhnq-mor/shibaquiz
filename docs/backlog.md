# ShibaQuiz delivery backlog

Last reviewed: 2026-08-04
Source of truth: `SHIBAQUIZ_SPEC.md`
Statuses: `DONE`, `IN PROGRESS`, `PLANNED`, `BLOCKED`

This backlog maps every functional and non-functional requirement to an incremental vertical slice. Security, accessibility, localized attempt-snapshot integrity, and the specification's acceptance criteria take precedence if requirements conflict.

## Delivery slices

| Slice | Outcome                                                                                                   | Included requirements                                   | Exit evidence                                                                           | Status  |
| ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------- |
| 1     | Deployable foundation: app shell/design tokens, CI, PostgreSQL schema, repository and media-storage ports | NFR-02, NFR-03, NFR-04, NFR-05, foundation for FR-15/16 | Versioned migration, schema/repository contract tests, bilingual accessible shell, CI   | DONE    |
| 1A    | Zero-dependency local runtime with the same PostgreSQL schema/repository boundaries                       | NFR-03, NFR-05                                          | Idempotent migrate/seed; `/vi`, `/en`, and database health return 200                   | DONE    |
| 2     | Secure account lifecycle and server-side authorization                                                    | FR-01, FR-02, FR-14 (seed/admin guard subset), NFR-02   | Auth migrations, unit/integration tests, bilingual screens/email                        | DONE    |
| 3     | Complete locale routing/catalog and content-translation gates                                             | FR-15                                                   | Catalog parity test, locale resolution tests, bilingual email/templates                 | PLANNED |
| 4     | Admin content authoring and publishing                                                                    | FR-10, FR-11, FR-12, FR-14                              | CRUD/audit migrations and integration tests, accessible bilingual editor                | PLANNED |
| 5     | Private media lifecycle                                                                                   | FR-16                                                   | Signed upload/finalize/access tests, object signature validation, no binary persistence | PLANNED |
| 6     | Transactional import                                                                                      | FR-13                                                   | Preview/validation/rollback tests and safe CSV export                                   | PLANNED |
| 7     | Discovery and immutable localized attempts                                                                | FR-03, FR-04, FR-05, FR-06                              | Snapshot/autosave/expiry tests; answer-disclosure policy tests                          | PLANNED |
| 8     | Idempotent submission, scoring, review, and history                                                       | FR-07, FR-08                                            | Transaction/scoring/ownership tests and critical E2E flows                              | PLANNED |
| 9     | Question discussion, moderation, and audit                                                                | FR-09, remaining FR-14                                  | Ownership/moderation/rate-limit tests                                                   | PLANNED |
| 10    | Hardening, accessibility, observability, deployment documentation                                         | all NFRs and MVP DoD                                    | E2E, WCAG checks, scans, restore drill, Vercel verification                             | PLANNED |

## Functional requirements

| ID    | Acceptance-focused backlog item                                                                                                                            | Slice | Verification                                          | Status      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: | ----------------------------------------------------- | ----------- |
| FR-01 | Register normalized unique email; configurable verification gate; durable exemption; hashed one-time 24h token; generic resend with replacement/rate-limit |     2 | Unit + migration + both-policy integration + auth E2E | DONE        |
| FR-02 | Login/logout, revocable sessions, password change/reset, generic failure messages, locked-user denial                                                      |     2 | Integration + security tests                          | DONE        |
| FR-03 | Published exam search/detail and TOPIC/FULL_TEST/QUESTION_BANK launch summary                                                                              |     7 | Repository integration + E2E                          | PLANNED     |
| FR-04 | STUDY, PRACTICE_IMMEDIATE and EXAM_DEFERRED disclosure/locking rules                                                                                       |     7 | Mode policy unit/integration tests                    | PLANNED     |
| FR-05 | Fixed/dynamic generation, largest-remainder allocation, sufficient-bank guard, stable localized ordered snapshot                                           |     7 | Unit + snapshot immutability integration tests        | PLANNED     |
| FR-06 | Accessible navigator, flags, <=500ms autosave, retry/dirty warning, server-authoritative expiry                                                            |     7 | Component + integration + resume E2E                  | PLANNED     |
| FR-07 | Confirm submit, transactional idempotency, exact scoring, immutable result and topic breakdown                                                             |     8 | Unit + concurrent integration + E2E                   | PLANNED     |
| FR-08 | Owner-only cursor history/filter/resume/review                                                                                                             |     8 | Authorization integration + E2E                       | PLANNED     |
| FR-09 | Plain-text paginated comments, owner edit/soft-delete, admin moderation/reason                                                                             |     9 | XSS/ownership/rate-limit integration tests            | PLANNED     |
| FR-10 | Exam/topic CRUD, uniqueness, safe archive, publish invariant                                                                                               |     4 | Service/repository integration tests                  | PLANNED     |
| FR-11 | Valid single/multiple-choice editor, translations, audit and soft delete                                                                                   |     4 | Domain validation + integration tests                 | PLANNED     |
| FR-12 | Fixed/dynamic test CRUD, 100% rule, source sufficiency, preview and attempt isolation                                                                      |     4 | Unit + transaction integration tests                  | PLANNED     |
| FR-13 | UTF-8 CSV/XLSX preview and full validation; atomic create/upsert; localized fields; safe export; READY media references only                               |     6 | Parser unit + rollback integration + E2E              | PLANNED     |
| FR-14 | Safe admin user search/actions, revoke on lock, last-admin guard, reset email, redacted audit                                                              |   2/9 | Permission + concurrency integration tests            | PLANNED     |
| FR-15 | `vi`/`en` UI and content translations, stable locale URLs/preference, completeness gate, fixed attempt locale                                              | 1/3/7 | Catalog parity + locale/snapshot tests + E2E          | IN PROGRESS |
| FR-16 | Private signed direct upload/read, server-generated key, metadata/fingerprint checks, localized accessibility text and immutable media snapshot references | 1/5/7 | Adapter contract + authorization + media E2E          | IN PROGRESS |

## Non-functional requirements

| ID     | Backlog item                                                                                                        | Evidence                                                       | Status      |
| ------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------- |
| NFR-01 | Meet read p95 target; paginate/index; minimize client JS; direct CDN media; change-only autosave                    | Query indexes, bundle/performance review, production telemetry | IN PROGRESS |
| NFR-02 | Secure cookies/CSRF/origin/rate limits; standard hashing; validation; private media; CSP; answer redaction; scans   | Security tests and CI scans                                    | IN PROGRESS |
| NFR-03 | Versioned migrations, transactional critical writes, immutable history, documented backup/restore                   | Migration tests and restore drill                              | IN PROGRESS |
| NFR-04 | Responsive 360px, semantic keyboard UI, visible focus, AA contrast, non-color status, localized media accessibility | Automated axe plus manual keyboard/screen-size checks          | IN PROGRESS |
| NFR-05 | Strict TypeScript, storage-independent domain, migration-only schema, safe env configuration, translation parity    | CI type/lint/test/catalog/metadata checks                      | IN PROGRESS |
| NFR-06 | Structured redacted logging, request IDs, health/readiness, error/latency/auth/import/submit metrics                | Observability integration and runbook                          | PLANNED     |

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

## Product-owner decisions (non-blocking for development)

- `BLOCKED FOR PUBLIC RELEASE`: legal author/owner name and license choice.
- `PLANNED`: production database, email, object-storage and error-tracking providers; adapters avoid coupling domain logic to these choices.
- `PLANNED`: brand assets/domain, orphan-media retention, privacy/terms and user-deletion policy.
