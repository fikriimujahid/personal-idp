# ADR-003: NestJS for IDP API and Worker

## Status

Accepted

## Date

2026-09-22

## Context

The IDP API handles all synchronous request processing: authentication, service CRUD, template management, and deployment triggers. The future IDP Worker will handle asynchronous tasks: Terraform execution, infrastructure provisioning, health check polling, and monitoring configuration.

Both components must:
- Integrate with Amazon Cognito for authentication (API only)
- Communicate with PostgreSQL via Prisma ORM
- Enqueue and consume messages from Amazon SQS (Worker)
- Execute Terraform commands programmatically
- Call external APIs (GitHub, AWS SDK)
- Maintain a consistent, modular architecture

The framework must:
- Provide first-class TypeScript support
- Offer a structured, modular architecture (dependency injection, modules, services)
- Support both REST API and background worker patterns
- Have strong testing support

## Decision

NestJS is the framework for both the IDP API and the future IDP Worker.

## Alternatives Considered

### Express.js
- Minimal, flexible framework
- No built-in structure or conventions
- Would require manual architecture decisions (module system, DI, validation)
- Rejected: NestJS provides the structure and conventions that Express lacks, reducing boilerplate and enforcing consistency

### Fastify
- High-performance HTTP framework
- Plugin-based architecture
- Less opinionated than NestJS; no built-in DI or module system
- Rejected: NestJS provides more structure out of the box, which is valuable for a multi-component platform

### Plain TypeScript (no framework)
- Maximum control and minimal dependencies
- Requires building all infrastructure (routing, validation, DI, error handling)
- Rejected: too much boilerplate; NestJS provides production-ready patterns without sacrificing flexibility

### Go (e.g., Gin, Echo)
- Excellent performance
- Would require a separate language ecosystem
- Rejected: TypeScript is the chosen language for the entire stack (see ADR-001)

## Consequences

### Positive
- Consistent framework across API and Worker components
- Built-in dependency injection, modular architecture, and decorators
- First-class TypeScript support with strict typing
- Rich ecosystem: `@nestjs/bull` for queues, `@nestjs/axios` for HTTP, `@nestjs/config` for configuration
- Strong testing utilities built in
- Familiar patterns for developers coming from Angular or Spring
- Prisma integrates cleanly with NestJS services

### Negative
- NestJS has a steeper learning curve than Express
- Decorator-heavy syntax may be unfamiliar to some developers
- Framework updates may require migration effort
- NestJS opinions may constrain unconventional patterns (which is acceptable for this project)
