# Repository Structure

## Overview

This document defines the directory layout, conventions, and rules for the Fikri IDP monorepo. It is the authoritative reference for where code lives and how the workspace is organised.

**See also:** [ADR-011](../adr/011-monorepo-structure.md) for the monorepo decision and alternatives considered.

---

## Directory Layout

```
fikri-idp/
│
├── apps/                        # Deployable applications (pnpm workspace packages)
│   ├── web/                     # IDP Portal — Next.js frontend
│   │   ├── src/
│   │   │   └── app/             # Next.js App Router pages and layouts
│   │   ├── public/              # Static assets
│   │   ├── next.config.ts       # Next.js configuration
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   ├── api/                     # IDP API — NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts          # Application entry point
│   │   │   └── app.module.ts    # Root module
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Database schema (sole source of truth)
│   │   ├── test/                # E2E tests
│   │   ├── nest-cli.json
│   │   ├── jest.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── worker/                  # IDP Worker — NestJS async task processor (post-MVP)
│       ├── src/
│       │   ├── main.ts
│       │   └── app.module.ts
│       ├── test/
│       ├── nest-cli.json
│       ├── jest.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/                    # Shared libraries (pnpm workspace packages)
│   ├── types/                   # API contract types (DTOs, enums, interfaces)
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── sdk/                     # Typed API client (Portal → API communication)
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                      # Shared React UI components
│       ├── src/
│       │   └── index.tsx
│       ├── package.json
│       └── tsconfig.json
│
├── templates/                   # Service scaffolding templates (NOT workspace packages)
│   ├── nestjs-api/              # NestJS API template source
│   └── react-admin/             # React admin frontend template source
│
├── infrastructure/              # Platform Terraform (NOT workspace packages)
│   ├── modules/                 # Reusable Terraform modules
│   │   ├── vpc/
│   │   ├── ecs/
│   │   ├── alb/
│   │   ├── service-discovery/
│   │   └── ecr/
│   └── environments/            # Per-environment configuration
│       ├── staging/
│       └── production/
│
├── docs/                        # Documentation
│   ├── product/                 # Vision, personas
│   ├── platform/                # Golden path, service lifecycle
│   ├── architecture/            # Overview, technology stack, repository structure
│   └── adr/                     # Architecture Decision Records
│
├── .gitignore
├── package.json                 # Root — workspace scripts
├── pnpm-workspace.yaml          # Workspace definition
├── pnpm-lock.yaml
├── tsconfig.base.json           # Shared TypeScript configuration
└── AGENTS.md                    # AI assistant instructions
```

---

## Workspace Packages

### Applications (`apps/`)

Each application is a deployable, independently versioned service.

| App | Technology | Port | Responsibility |
|-----|-----------|------|-----------------|
| `apps/web/` | Next.js | 3000 | Frontend UI. Never accesses Cognito or AWS directly |
| `apps/api/` | NestJS | 3001 | Backend API. Sole Cognito client, sole DB writer |
| `apps/worker/` | NestJS | 3002 | Async task processor. Consumes SQS, runs Terraform |

### Shared Packages (`packages/`)

Shared libraries consumed by applications. Not independently deployable.

| Package | Consumers | Responsibility |
|---------|-----------|----------------|
| `packages/types/` | `apps/web/`, `apps/api/`, `apps/worker/` | API contract types: DTOs, enums, request/response interfaces |
| `packages/sdk/` | `apps/web/` | Typed HTTP client for Portal → API communication |
| `packages/ui/` | `apps/web/` | Shared React UI components (buttons, forms, tables, layout) |

---

## Non-Workspace Directories

### `templates/`

Service scaffolding templates used by the IDP API during the golden path workflow.

**Not part of the pnpm workspace.** Templates are standalone project generators. When rendered, they produce a complete project with its own `package.json`, `Dockerfile`, CI/CD workflows, and Terraform configuration.

| Template | Description |
|----------|-------------|
| `templates/nestjs-api/` | NestJS API service template |
| `templates/react-admin/` | React admin frontend template |

### `infrastructure/`

Platform-level Terraform configuration for AWS infrastructure.

**Not part of the pnpm workspace.** Managed independently using Terraform CLI.

| Directory | Purpose |
|-----------|---------|
| `infrastructure/modules/` | Reusable Terraform modules (VPC, ECS, ALB, service discovery, ECR) |
| `infrastructure/environments/staging/` | Staging environment Terraform configuration |
| `infrastructure/environments/production/` | Production environment Terraform configuration |

---

## Dependency Graph

```
apps/web/  ──→  packages/sdk/  ──→  packages/types/
apps/web/  ──→  packages/ui/
apps/api/  ──→  packages/types/
apps/worker/ ─→ packages/types/
```

### Rules

1. Applications may depend on packages. Packages must not depend on applications.
2. `packages/types/` has no runtime dependencies — it contains only types and interfaces.
3. `packages/sdk/` depends on `packages/types/` for request/response type safety.
4. `packages/ui/` has React as a peer dependency. It does not depend on `types/` or `sdk/`.
5. Cross-app dependencies are not allowed. Applications communicate only via REST API.

---

## Conventions

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Workspace packages | `@fikri-idp/<name>` | `@fikri-idp/web`, `@fikri-idp/types` |
| Source files | `kebab-case.ts` | `service-catalog.ts` |
| React components | `PascalCase.tsx` | `ServiceCard.tsx` |
| Test files | `*.spec.ts` or `*.test.ts` | `service-catalog.spec.ts` |
| E2E test files | `*.e2e-spec.ts` | `service-catalog.e2e-spec.ts` |

### TypeScript

- All packages extend `tsconfig.base.json` from the repository root
- Strict mode is enabled globally
- Each package/app has its own `tsconfig.json` for local overrides

### Testing

- **Unit tests** are co-located with source files: `src/**/*.spec.ts`
- **E2E tests** live in each app's `test/` directory
- There is no top-level `tests/` directory

### Docker

- Each application has a `Dockerfile` at its root
- Multi-stage builds: `deps` → `builder` → `runner`
- Production images use `node:20-alpine`

---

## Root Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root workspace scripts (`build`, `lint`, `typecheck`, `test`, `clean`) |
| `pnpm-workspace.yaml` | Defines workspace packages: `apps/*` and `packages/*` |
| `tsconfig.base.json` | Shared TypeScript compiler options extended by all packages |
| `.gitignore` | Ignores `node_modules`, `dist`, `.next`, `.terraform`, state files |
| `AGENTS.md` | AI assistant instructions |

---

## Alignment

This structure aligns with:

- [Architecture Overview](overview.md) — Component boundaries match `apps/` directories
- [Technology Stack](technology-stack.md) — pnpm workspaces (ADR-006), TypeScript (ADR-001), NestJS (ADR-003), Next.js (ADR-002)
- [Golden Path](../platform/golden-path.md) — Templates directory supports Steps 7-10
- [Service Lifecycle](../platform/service-lifecycle.md) — Prisma schema in `apps/api/` supports lifecycle state management
