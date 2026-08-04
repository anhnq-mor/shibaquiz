# ADR 0004: Translation records, immutable localized snapshots, and explicit disclosure DTOs

- Status: Accepted
- Date: 2026-08-04

## Context

The product supports Vietnamese and English UI/content. An attempt must remain stable when source content or UI locale changes. Correct answers and explanations are sensitive until the selected mode permits disclosure.

## Decision

Store localized content in translation tables keyed by entity identity and `vi`/`en`; structural option identity and correctness remain locale-neutral. An attempt fixes its content locale at creation and snapshots question/option order, localized copy, correctness data, explanation, and immutable media references transactionally.

Snapshot correctness is stored server-side for grading, but never exposed through persistence-shaped API objects. Services return one of explicit DTOs:

- study question: correctness and explanation allowed;
- immediate-practice question before check: hidden, after check: allowed for that locked question;
- deferred-exam question before submission/expiry: hidden, after submission: allowed.

Changing UI locale does not rewrite `Attempt.locale` or its snapshot. Publication/enabling a locale requires complete translations for every required published item.

## Consequences

- API tests must assert absence, not merely null values, of `isCorrect`, correct option IDs, and explanations before disclosure.
- Snapshot JSON is permitted as an immutable relational column; it is not a JSON database/file persistence driver.
- Admin source edits cannot alter an existing attempt or submitted history.
