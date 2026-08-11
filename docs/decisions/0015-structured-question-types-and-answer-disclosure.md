# ADR 0015: Structured question types and answer disclosure

## Status

Accepted.

## Context

The original model represented every response as `selectedOptionIds`. That is sufficient for single and multiple choice, but cannot express a matching bijection or an ordered sequence without overloading IDs. Reusing the same option ID for both sides of a match, or returning canonical ordering metadata, would also let a learner infer answers from an in-progress API response.

## Decision

- Support exactly five question types: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`, `MATCHING`, and `ORDERING`.
- Persist responses through a discriminated `answerPayload`: `CHOICE`, `MATCHING`, or `ORDERING`. Keep the legacy `selectedOptionIds` column during migration and backfill existing choice responses.
- Give every matching target an opaque ID independent from its left option ID. Store target text per locale and independently shuffle target presentation into the immutable attempt snapshot.
- Store canonical ordering as server-only option metadata and always shuffle ordering questions when an attempt snapshot is issued, regardless of the test's choice-shuffle setting.
- Public hidden DTOs expose only answerable IDs and localized content. Correctness flags, left-to-right associations, canonical order, and explanations are included only after the existing disclosure policy permits them.
- Score all types with exact-match semantics and no partial credit. Reject duplicate, foreign, wrong-kind, or structurally invalid IDs at the repository boundary.
- Bound `SINGLE_CHOICE` to 2–6, `TRUE_FALSE` to exactly 2, and the remaining types to 2–20 items. The upper bound is an MVP safety limit for request size, validation cost, and accessible UI behavior.
- Use select controls for matching and explicit up/down buttons for ordering so the interaction remains keyboard accessible; drag-and-drop is not required.

## Consequences

Old choice attempts remain readable and retain saved selections. New attempts have a version-2 localized snapshot that is independent of future question edits. Import/export gains localized match-target columns and up to 20 option slots. A later partial-credit feature would require an explicit scoring-policy version rather than changing these snapshot semantics in place.
