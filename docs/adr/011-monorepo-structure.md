# ADR-011: Monorepo Structure

## Status

Accepted

## Date

2026-09-22

## Context

Fikri IDP consists of multiple deployable applications (Portal, API, Worker), shared packages (types, SDK, UI), service scaffolding templates, and platform infrastructure (Terraform). The code must be organised in a way that:

- Enables shared types and utilities across applications
- Maintains clear application boundaries
- Supports independent deployment of each application
- Keeps infrastructure and templates separate from the TypeScript toolchain
- Allows atomic changes across related components in a single pull request

## Decision

Fikri IDP uses a **pnpm workspace monorepo** with the following top-level structure:

```
fikri-idp/
├── apps/           # Deployable applications (workspace packages)
│   ├── web/        # Next.js — IDP Portal
│   ├── api/        # NestJS — IDP API
│   └── worker/     # NestJS — IDP Worker (post-MVP)
├── packages/       # Shared libraries (workspace packages)
│   ├── types/      # API contract types (DTOs, enums, request/response)
│   ├── sdk/        # Typed API client (Portal → API)
│   └── ui/         # Shared React UI components
├── templates/      # Service scaffolding templates (NOT workspace packages)
│   ├── nestjs-api/
│   └── react-admin/
├── infrastructure/ # Platform Terraform (NOT workspace packages)
│   ├── modules/
│   └── environments/
└── docs/           # Product, architecture, and platform documentation
```

### Workspace Boundaries

| Directory | Workspace Member | Deployable | Description |
|-----------|-----------------|------------|-------------|
| `apps/web/` | Yes | Yes | Next.js frontend. Consumes `packages/sdk/`, `packages/ui/`, `packages/types/` |
| `apps/api/` | Yes | Yes | NestJS backend. Sole Cognito client, sole DB writer. Consumes `packages/types/` |
| `apps/worker/` | Yes | Yes | NestJS async worker. Consumes from SQS, runs Terraform. Consumes `packages/types/` |
| `packages/types/` | Yes | No | Shared API contract types. No runtime dependencies |
| `packages/sdk/` | Yes | No | Typed HTTP client for Portal → API communication. Depends on `packages/types/` |
| `packages/ui/` | Yes | No | Shared React components. Peer-depends on React |
| `templates/` | No | No | Standalone project generators for golden path |
| `infrastructure/` | No | No | Terraform modules and configuration |

### Dependency Graph

```
apps/web/  ──→  packages/sdk/  ──→  packages/types/
apps/web/  ──→  packages/ui/
apps/api/  ──→  packages/types/
apps/worker/ ─→ packages/types/
```

### Key Rules

1. **Templates are not workspace packages.** They are standalone project generators consumed by the IDP API during the golden path. They have their own `package.json` when rendered but are not part of `pnpm install`.
2. **Infrastructure is not a workspace package.** Terraform is managed independently of the TypeScript toolchain.
3. **Prisma schema lives in `apps/api/prisma/`.** The API is the sole writer to PostgreSQL per the architecture. If the Worker needs the Prisma client, it references the generated client.
4. **Tests are co-located.** Unit tests live next to source files (`src/**/*.spec.ts`). E2E tests live in each app's `test/` directory. There is no top-level `tests/` directory.
5. **`packages/types/` is the contract boundary.** Both frontend and backend import from it. It contains only types, enums, and interfaces — no runtime logic.

## Alternatives Considered

### Separate repositories per application

- Each app in its own repository
- Shared packages published to a private npm registry
- Rejected: increases coordination overhead, makes atomic cross-app changes difficult, complicates dependency management

### Nx monorepo

- Full-featured monorepo tool with dependency graph analysis, affected commands, and code generation
- Rejected: adds significant complexity and tooling overhead for a project of this size. pnpm workspaces provide sufficient functionality for the current scope

### Top-level `tests/` directory

- All tests in a central location
- Rejected: makes it harder to find tests for a specific module, breaks co-location conventions used by NestJS and Next.js

### Shared Prisma package

- Prisma schema in `packages/database/` shared between API and Worker
- Rejected: the API is the sole writer to PostgreSQL per the architecture. The Worker accesses the database through the API or uses the generated client from the API's Prisma setup. A separate database package adds unnecessary indirection

## Consequences

### Positive

- Single repository for all platform code; one PR covers cross-cutting changes
- Shared types ensure frontend and backend stay aligned on API contracts
- pnpm workspaces provide fast, disk-efficient dependency management
- Clear application boundaries with independent deployment
- Co-located tests follow framework conventions (NestJS, Next.js)
- Templates and infrastructure remain independent of the TypeScript toolchain

### Negative

- Larger repository with more code to navigate
- CI/CD must handle workspace-aware builds (only build affected packages)
- All apps share the same TypeScript version; upgrading requires coordination
- New contributors must understand the workspace structure
