# ADR 0016: Import locale mirroring

## Status

Accepted.

## Context

Question imports often contain content in only one of the two supported locales. Rejecting an otherwise complete row forces administrators to duplicate the same text manually before a real translation is available.

## Decision

- Apply fallback only while building an import row, before schema and publication validation.
- Treat each localized field independently. When one of `_vi` or `_en` is blank, copy the non-blank counterpart unchanged into it.
- Apply the rule to question content, explanation, option content, and matching-target content.
- Keep the row invalid when both counterparts are blank or when another structural rule fails.
- Persist both translation records through the existing import repository transaction. Attempts continue to snapshot the selected locale normally.
- This is a content fallback, not machine translation. Administrators may replace the copied value with a proper translation later.

## Consequences

Single-language CSV/XLSX rows can satisfy bilingual publication completeness without manual duplication. The copied locale can temporarily display text in the other language, but localized identity, snapshot integrity, disclosure rules, and repository boundaries remain unchanged.
