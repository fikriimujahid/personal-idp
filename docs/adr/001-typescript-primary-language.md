# ADR-001: TypeScript as Primary Language

## Status

Accepted

## Date

2026-09-22

## Context

Fikri IDP requires a single language for both frontend and backend to maximise developer productivity, enable code sharing, and reduce onboarding friction. The platform serves backend developers (NestJS API templates) and frontend developers (Next.js portal), so the language must be well-supported across both domains.

The language must:
- Provide strong typing for production safety
- Have a mature ecosystem for web application development
- Be familiar to the target developer audience
- Support both frontend (React/Next.js) and backend (NestJS) codebases
- Enable shared types and interfaces between frontend and backend

## Decision

TypeScript is the primary language for all components of Fikri IDP: the IDP Portal (Next.js), the IDP API (NestJS), and the future IDP Worker (NestJS).

## Alternatives Considered

### JavaScript (plain)
- No type safety; runtime errors surface only in production
- No shared interfaces between frontend and backend
- Poor developer experience for large codebases
- Rejected: TypeScript is a strict superset and provides all the benefits of JavaScript with type safety

### Go
- Excellent performance and concurrency
- Strong typing and mature ecosystem
- Not suitable for the frontend (IDP Portal is React-based)
- Would require two separate language ecosystems
- Rejected: introduces language fragmentation across the stack

### Python
- Strong ecosystem for backend services
- Not suitable for the frontend
- Dynamic typing (without mypy) reduces safety
- Rejected: same language fragmentation concern; less natural fit for the chosen frameworks

## Consequences

### Positive
- Single language across frontend, backend, and future worker
- Shared types and interfaces between IDP Portal and IDP API
- Strong type safety reduces runtime errors
- Large talent pool; most web developers are familiar with TypeScript
- Excellent IDE support and developer experience
- Both NestJS and Next.js have first-class TypeScript support

### Negative
- TypeScript compilation step adds build complexity
- Type definitions for some third-party libraries may be incomplete
- Strict typing requires more upfront design effort
