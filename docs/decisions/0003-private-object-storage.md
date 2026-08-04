# ADR 0003: Private object storage through a media adapter

- Status: Accepted
- Date: 2026-08-04

## Context

Question media can be large and untrusted. Binary content must not enter PostgreSQL, Git, deployment bundles, or the Vercel runtime filesystem.

## Decision

Define a `MediaStorage` port for server-generated object keys, short-lived signed direct-upload URLs, head/metadata verification, short-lived signed reads, and deletion of eligible orphan objects. Implement an S3-compatible adapter first; provider selection is configuration, not domain behavior.

The application database stores metadata, checksum, object key/version, lifecycle status, and localized accessibility text only. Browser uploads go directly to a private bucket. An asset remains `PENDING` until a service verifies object metadata/signature/checksum and transitions it to `READY`. No adapter accepts or returns file bodies.

Local development uses an S3-compatible service or an in-memory contract fake. It never writes media to the application runtime filesystem.

## Consequences

- Direct upload avoids server-function payload and duration limits.
- Access authorization is checked before signing a read URL.
- Replacement creates a new object/version; snapshots retain immutable object references.
