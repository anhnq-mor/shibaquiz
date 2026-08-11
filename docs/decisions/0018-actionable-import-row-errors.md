# ADR 0018: Actionable import row errors

## Status

Accepted.

## Context

Generic schema paths such as `options.0.translations` do not tell an administrator which source cells must be corrected. Commit also revalidates the file, so failures discovered after preview need the same row-level presentation.

## Decision

- Every invalid import outcome carries the physical spreadsheet row number (header included), its `external_id` when present, and one or more error messages.
- Validate missing localized question, option, and matching-target text before the generic schema parser so messages name the corresponding `_vi`/`_en` source columns.
- The Review UI lists every issue under its row and external ID and announces the row numbers needing correction.
- If commit-time revalidation returns row errors, return to the Review state and render those errors instead of showing only the generic request message.
- Keep all validation inside the domain/repository import boundary; the client only presents server results.

## Consequences

Administrators can locate bad cells without translating internal schema paths. Atomic import behavior remains unchanged: any invalid row blocks the entire commit.
