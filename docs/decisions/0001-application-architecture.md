# ADR 0001: Modular Next.js application with dependency inversion

- Status: Accepted
- Date: 2026-08-04

## Context

The MVP needs server-rendered public/auth pages, interactive attempt screens, strict server authorization, and deployment to Vercel. Business rules must remain testable independently from UI and infrastructure.

## Decision

Use Next.js App Router with strict TypeScript. Keep dependencies pointing inward:

1. `domain` owns entities, policies, value types, and repository/storage ports.
2. `server/services` orchestrates use cases using those ports.
3. `server/repositories` and `server/storage` implement PostgreSQL and object-storage adapters.
4. `app` and `components` translate HTTP/UI concerns and never query the database directly.

React Server Components are the default. Client components are limited to interaction that needs browser state. Zod validates untrusted boundaries.

## Consequences

- Services can be tested with in-memory fakes without creating a second production persistence mechanism.
- Route handlers cannot serialize database records directly; response DTOs enforce disclosure policy.
- Some mapping code is intentional to prevent UI/storage coupling and accidental answer leakage.
