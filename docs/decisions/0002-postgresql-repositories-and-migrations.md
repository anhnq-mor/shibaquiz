# ADR 0002: PostgreSQL-only durable persistence behind repository ports

- Status: Accepted
- Date: 2026-08-04

## Context

Serverless runtime filesystems are not durable and JSON writes cannot provide the relational constraints or transactions required for attempts, imports, and test configuration.

## Decision

Use PostgreSQL for every durable environment and Drizzle ORM for typed schema plus versioned SQL migrations. Do not implement a JSON write repository. Tests may use in-memory fakes that implement the same ports; they are not deployable persistence drivers.

All business operations use repository interfaces and an explicit `UnitOfWork` for multi-record mutations. Only adapter composition may import Drizzle/database clients. Production and Vercel startup/config validation require `STORAGE_DRIVER=postgres` and `DATABASE_URL`.

The initial migration models all logical entities in spec section 8 so later slices evolve the schema only through migrations. Database constraints protect uniqueness, enum domains, translation identity, ordering, and referential integrity; services add cross-row publishing rules.

## Consequences

- Local development requires PostgreSQL (a documented container command is provided).
- There is one durable behavior to validate, avoiding drift between JSON and SQL implementations.
- Rollback of a production migration uses a reviewed forward-fix unless a migration includes a proven safe down operation; destructive automatic rollback is not assumed.
