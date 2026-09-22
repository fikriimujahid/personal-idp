# ADR-004: Prisma as ORM

## Status

Accepted

## Date

2026-09-22

## Context

The IDP API is the sole writer to PostgreSQL. It manages service lifecycle state, template registry, user/role data, deployment history, and audit trail. The ORM must:
- Provide type-safe database access from TypeScript
- Support schema migrations
- Integrate cleanly with NestJS
- Handle the service lifecycle state machine enforcement
- Support idempotent operations for Worker retries

## Decision

Prisma is the ORM for Fikri IDP.

## Alternatives Considered

### TypeORM
- Mature TypeScript ORM with decorator-based entity definitions
- Active record and data mapper patterns supported
- Historically had maintenance and stability concerns
- Rejected: Prisma provides better type safety, a more intuitive schema definition language, and stronger momentum in the TypeScript ecosystem

### Drizzle
- Lightweight, SQL-like TypeScript ORM
- Strong type safety and performance
- Younger ecosystem with fewer community resources
- Rejected: Prisma has a more mature ecosystem, better migration tooling, and broader adoption

### Knex.js
- SQL query builder (not a full ORM)
- Flexible and performant
- No schema definition language or built-in migrations
- Rejected: Prisma provides schema management, migrations, and type-safe queries in a single tool; Knex would require additional tooling

### Sequelize
- Mature JavaScript ORM with TypeScript support
- Large feature set
- TypeScript support is secondary; type definitions can be inconsistent
- Rejected: Prisma offers superior type safety and a more modern developer experience

## Consequences

### Positive
- Type-safe queries and mutations at compile time
- Declarative schema definition in Prisma Schema Language
- Built-in migration system with versioned migration files
- Excellent NestJS integration via `@prisma/client` and `nestjs-prisma`
- Auto-generated client reduces boilerplate
- Strong community and active maintenance
- Schema serves as single source of truth for database structure

### Negative
- Prisma's query engine is a binary (Rust-based), adding a runtime dependency
- Some complex SQL queries may require raw SQL escapes
- Migration system is less flexible than hand-written migrations for edge cases
- Auto-generated client must be regenerated after schema changes
