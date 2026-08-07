# ADR 0010: Admin content transactions and publishing invariants

- Status: Accepted
- Date: 2026-08-05

## Context

Step 4 introduces mutable source content containing correct-answer data. Admin operations must not bypass repository boundaries, partial writes must not leave translations/options/rules inconsistent, and no answer-bearing DTO may become public accidentally. Existing attempt snapshots must remain independent from later source edits.

## Decision

Introduce an `AdminContentRepository` port and a service that accepts an authenticated actor ID. Every create/update/status/delete operation runs in one database transaction and appends a redacted audit event in that same transaction. Routes authenticate with `requireAdmin` before parsing or returning admin DTOs. The admin DTO is never reused by public discovery or attempt APIs.

Exam and topic removal is represented by `ARCHIVED`. Question deletion sets `deleted_at` and `ARCHIVED`; rows remain available for historical foreign keys while attempt history continues to use immutable snapshots. Editing a question increments its source version, replaces its option set transactionally, and does not mutate any attempt snapshot.

Question correctness is validated in the domain before persistence: both types require at least two options; `SINGLE_CHOICE` has exactly one correct option; `MULTIPLE_CHOICE` has at least two correct and at least one incorrect option. Each enabled exam locale must have non-empty question, explanation, and option translations before the question can be published.

Exam publication obtains a row lock and requires at least one published topic and one valid published non-deleted question. Every enabled locale is rechecked using the translation completeness gate before publication. Publishing a topic requires its parent exam to exist and its enabled-locale translations to be complete.

Test writes replace their structure transactionally. `FIXED` tests require an ordered, unique list of published questions from the same exam and `question_count` must equal the list length. `DYNAMIC` tests require unique topics from the same exam, percentages totaling exactly 100, and a largest-remainder preview whose per-topic allocation does not exceed the published source bank. Published tests require complete translations in every enabled exam locale.

The editor uses a Server Component for authorization/initial data and a focused Client Component for interactive forms. Mutations use same-origin JSON Route Handlers and refresh from the server response. All labels, validation summaries, status text, and empty states come from parity-checked `vi`/`en` catalogs.

## Consequences

- Source authoring remains PostgreSQL-backed and repository-only; no JSON file or runtime filesystem persistence is introduced.
- Audit metadata contains field/status summaries and entity IDs, never question text, explanations, option text, correctness arrays, tokens, cookies, or password data.
- Correct-answer fields are visible only behind admin authorization in this slice. Public and attempt DTOs remain separate and continue to follow ADR 0004.
- Full user administration from FR-14 remains assigned to Slice 9; Step 4 supplies the reusable admin authorization and transactional audit pattern.
- Media attachment remains an object-storage-backed Step 5 concern; Step 4 does not accept binary uploads or binary fields.
