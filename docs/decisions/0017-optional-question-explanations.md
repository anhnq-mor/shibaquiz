# ADR 0017: Optional question explanations

## Status

Accepted.

## Context

Some question banks do not provide an explanation. Requiring localized explanation text prevents otherwise valid questions from being reviewed, imported, saved, or published.

## Decision

- Question content and answer structure remain required; question explanations are optional in every locale.
- Normalize a missing explanation in the API/import domain model to an empty string. Keep the database column non-null so attempt snapshots and disclosure DTOs retain a stable string shape.
- Relax the PostgreSQL length constraint to allow 0–20,000 characters.
- Do not count a blank explanation as an incomplete translation when enabling an exam locale.
- The import locale-mirroring rule still copies an explanation when exactly one locale contains one. When both are blank, both remain blank and the row may still be valid.
- Hide an empty explanation section in learner review UI. Existing answer-disclosure timing remains unchanged for non-empty explanations.

## Consequences

Administrators can save and import questions without explanations, including published questions. Localized attempt snapshots remain immutable and repository-backed, while APIs still omit the explanation field entirely until disclosure is permitted.
