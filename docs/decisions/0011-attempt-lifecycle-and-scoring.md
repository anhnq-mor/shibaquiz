# ADR 0011: Attempt lifecycle, disclosure, and scoring

- Status: Accepted
- Date: 2026-08-07

## Context

Steps 7 and 8 give a `USER` the actual product: discover published exams, start an
attempt across all three scopes and three modes, autosave, submit, and review scored
history. This must not bypass the disclosure policy from ADR 0004, must keep attempt
snapshots immutable, and must make server time (not client time) authoritative for
anything timed.

## Decision

`DiscoveryRepository`/`DiscoveryService` expose read-only published-content browsing.
Requesting a locale the exam hasn't enabled falls back to the exam's `primaryLocale`
and reports `localeFallback: true` rather than erroring, per FR-15.

`AttemptRepository`/`AttemptService` own the full lifecycle behind one port, mirroring
the `AdminContentRepository` precedent from ADR 0010 (one cohesive interface, each
mutating method wrapped in its own transaction) rather than the unused generic
`UnitOfWork` scaffold from Step 1.

- **Generation**: `TOPIC`/`QUESTION_BANK` scopes take every published, non-deleted
  question in scope, ordered deterministically. `FULL_TEST` uses the test's fixed list
  or the existing `allocateLargestRemainder` allocator for `DYNAMIC` rules, reused as-is
  from the admin domain. Insufficient source questions raise `INSUFFICIENT_QUESTIONS`
  before any row is written.
- **Resume, not duplicate**: starting an attempt with the same `(user, exam, scope,
mode, topic/test)` while one is `IN_PROGRESS` returns the existing attempt instead of
  creating a second one, satisfying the "one in-progress attempt per configuration"
  acceptance criterion. A separate `abandonAttempt` covers the "discard and restart"
  path.
- **Disclosure stays server-side**: the existing `toQuestionDto`/`mayRevealAnswer` pair
  from ADR 0004 is the only place that decides what a client sees. The server always
  knows every option's correctness internally; only the DTO gates it. `StoredQuestionSnapshot`
  gained a `type` field (single/multiple) so the client can render the right control
  without a second source of truth.
- **Scoring is computed once, uniformly**: `computeAttemptResult` treats an empty
  selection as unanswered and everything else as an exact-set match against the
  snapshot's correct options, for every mode. `PRACTICE_IMMEDIATE`'s per-question
  "check" action uses the same primitive (`isAnswerCorrect`) for its immediate feedback;
  final scoring at submission time recomputes from the snapshot rather than trusting
  whatever was set during checking, so `STUDY`/`EXAM_DEFERRED` attempts that were never
  explicitly checked still score correctly.
- **Server-authoritative timing**: only `FULL_TEST` attempts can carry `expiresAt`
  (`startedAt + test.durationMinutes`). Every read or mutation on an attempt calls the
  same `ensureNotExpired`/`finalizeAttempt` path first; if the deadline has passed while
  still `IN_PROGRESS`, the attempt is scored and moved to `EXPIRED` before anything else
  happens, regardless of whether the client noticed the clock ran out. `submitAttempt` is
  idempotent: once terminal (`SUBMITTED`/`EXPIRED`), it returns the stored result rather
  than rescoring.
- **Ownership**: every attempt lookup is scoped to `(attemptId, userId)`; a mismatch
  returns `NOT_FOUND`, not `FORBIDDEN`, so a guessed ID cannot confirm another user's
  attempt exists.

Read pages (`/exams`, `/exams/[slug]`, `/history`) call the services directly from
Server Components, the same pattern the admin editor already established — no HTTP
round-trip for data that server-rendering can supply directly. Only stateful actions
(start, autosave, check, submit, abandon) go through `/api/attempts/*` routes, each
behind `requireUser()` and `assertTrustedOrigin`.

## Consequences

- No new migration was required; every table this slice needs was already created in
  Step 1's initial migration.
- A published bilingual sample exam (`SHIBA-SAMPLE`) is seeded alongside the existing
  draft foundation seed so the flow is testable immediately after `npm run dev`, without
  touching the pre-existing seed or its tests.
- Media stays an empty array in every snapshot until Step 5 ships real uploads; the
  join is already written defensively so nothing here needs to change when it does.
- Comment threads (FR-09) remain Step 9's concern and are not touched by this slice.
