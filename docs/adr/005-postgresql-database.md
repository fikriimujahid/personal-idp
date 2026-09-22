# ADR-005: PostgreSQL as Database

## Status

Accepted

## Date

2026-09-22

## Context

PostgreSQL is the single source of truth for all Fikri IDP platform state: service lifecycle, template registry, user/role data, deployment history, and audit trail. The database must:
- Support relational data with complex relationships
- Handle transactional writes reliably (state machine transitions)
- Be available as a managed service on AWS
- Integrate with Prisma ORM
- Support JSON columns for flexible metadata storage
- Provide strong data integrity guarantees

## Decision

PostgreSQL is the database for Fikri IDP.

## Alternatives Considered

### MySQL / Amazon Aurora MySQL
- Widely used relational database
- Available as Amazon Aurora (managed)
- Less strict SQL compliance than PostgreSQL
- Fewer advanced features (JSON support, extensibility)
- Rejected: PostgreSQL has superior JSON support, better extensibility, and stronger alignment with Prisma's feature set

### Amazon DynamoDB
- Fully managed NoSQL database on AWS
- Excellent performance for key-value access patterns
- No relational model; complex queries require secondary indexes or denormalisation
- Poor fit for relational data (service lifecycle, user roles, audit trail)
- Rejected: the platform data model is inherently relational; DynamoDB would require significant schema redesign and complicate state machine enforcement

### MongoDB
- Document-oriented NoSQL database
- Flexible schema
- Available on AWS via DocumentDB
- Rejected: same relational model concerns as DynamoDB; PostgreSQL is a better fit for structured, relational platform data

## Consequences

### Positive
- Mature, battle-tested relational database
- Excellent JSON support for flexible metadata fields
- Strong transactional guarantees (ACID compliance)
- Available as Amazon RDS for PostgreSQL (managed service)
- First-class Prisma support with all features available
- Rich ecosystem of tools, extensions, and community resources
- Supports enum types natively (useful for lifecycle states)
- Strong data integrity with foreign keys and constraints

### Negative
- Requires database administration (backups, patching, scaling) — mitigated by using Amazon RDS
- Vertical scaling has limits; horizontal scaling requires read replicas or sharding
- Schema migrations require careful planning to avoid downtime
