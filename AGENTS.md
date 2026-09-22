# AGENTS.md

This document provides instructions for AI coding assistants (such as OpenCode, Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, and similar tools) working on the Fikri IDP platform.

---

# Product Documentation

Before acting on any prompt or request, always read the following product documents first:

1. `docs/product/vision.md` — Platform purpose, MVP scope, target users, and success criteria
2. `docs/product/personas.md` — User types, responsibilities, permissions, and relationships
3. `docs/platform/golden-path.md` — Standard workflow for creating a new backend service through the IDP
4. `docs/platform/service-lifecycle.md` — Service lifecycle states, transitions, failure handling, and decommissioning
5. `docs/architecture/overview.md` — High-level component architecture, boundaries, and responsibilities
6. `docs/architecture/technology-stack.md` — Technology choices, rationale, and component mapping
7. `docs/architecture/repository-structure.md` — Monorepo layout, workspace packages, directory conventions
8. `docs/architecture/environments.md` — Environment definitions, isolation strategy, configuration, secrets, and state management
9. `docs/adr/` — Architecture Decision Records for all major technology choices

All work must align with the platform's purpose, MVP scope, target users, and success criteria defined in those documents. If a request conflicts with the vision or personas, raise it before proceeding.

When introducing new technology or changing an existing technology choice, consult `docs/architecture/technology-stack.md` and the relevant ADR. If the change is significant, create a new ADR following the established format in `docs/adr/`.

---

# General Principles

Always:

- preserve the existing architecture
- keep solutions simple
- write production-quality code
- prioritize maintainability
- prioritize readability
- avoid unnecessary complexity
- favour reuse over duplication

Avoid introducing new architectural patterns unless explicitly requested.

---

# Reuse Before Creation

Before creating any new:

- component
- hook
- utility
- helper
- service
- middleware
- validator
- DTO
- Terraform module

Search the project for an existing implementation.

Reuse existing code whenever appropriate.

Avoid duplicate implementations.

---

# Architecture Guidelines

Follow the existing project structure.

Keep modules:

- cohesive
- loosely coupled
- independently maintainable

Avoid:

- circular dependencies
- tightly coupled modules
- unnecessary abstractions
- premature optimisation

Business logic should remain separated from presentation logic.

---

# Code Quality

Produce production-ready code.

Always:

- use strict typing
- remove unused imports
- remove dead code
- use meaningful names
- keep functions focused
- keep files organised
- minimise nesting
- handle edge cases
- write readable code

Do not leave unfinished implementations unless explicitly requested.

---

# Dependencies

Prefer existing project dependencies.

Do not introduce new libraries unless they provide significant value.

If adding a dependency:

- ensure it is actively maintained
- avoid overlapping functionality
- keep the dependency footprint minimal

---

# Monorepo Structure

This is a pnpm workspace monorepo. See `docs/architecture/repository-structure.md` and `docs/adr/011-monorepo-structure.md` for the full specification.

| Directory | Purpose | Workspace Member |
|-----------|---------|-----------------|
| `apps/web/` | IDP Portal (Next.js) | Yes |
| `apps/api/` | IDP API (NestJS) | Yes |
| `apps/worker/` | IDP Worker (NestJS, post-MVP) | Yes |
| `packages/types/` | Shared API contract types (DTOs, enums) | Yes |
| `packages/sdk/` | Typed API client (Portal → API) | Yes |
| `packages/ui/` | Shared React UI components | Yes |
| `templates/` | Service scaffolding templates | No |
| `infrastructure/` | Platform Terraform | No |

### Dependency Rules

- Applications may depend on packages. Packages must not depend on applications.
- Cross-app dependencies are not allowed. Applications communicate only via REST API.
- `packages/types/` has no runtime dependencies — types and interfaces only.
- `packages/sdk/` depends on `packages/types/`.
- `packages/ui/` has React as a peer dependency only.

### Workspace Commands

- `pnpm build` — Build all workspace packages
- `pnpm lint` — Lint all workspace packages
- `pnpm typecheck` — Type-check all workspace packages
- `pnpm test` — Run tests across all workspace packages

---

# Frontend Guidelines

When working in `apps/web/`:

- reuse shared UI components from `packages/ui/`
- use the typed API client from `packages/sdk/` for all API calls
- use contract types from `packages/types/` for request/response shapes
- maintain consistent spacing
- maintain consistent styling
- support responsive layouts
- support accessibility
- avoid duplicated components

Business rules should not live inside UI components.

The frontend **never** directly accesses Amazon Cognito. All authentication is handled by calling the API endpoints. Do not implement direct Cognito SDK integration in the frontend.

---

# Backend Guidelines

When working in the API repository:

- keep controllers thin
- place business logic in services
- validate all inputs
- use consistent response structures
- isolate feature modules
- avoid leaking implementation details
- use contract types from `packages/types/` for request/response shapes

The API is the **only** client that integrates directly with Amazon Cognito. All authentication flows (login, token exchange, refresh) are handled by the API using the confidential client secret stored in AWS Secrets Manager.

The Prisma schema lives in `apps/api/prisma/schema.prisma`. The API is the sole writer to PostgreSQL.

---

# Infrastructure Guidelines

When working in the `infrastructure/` directory:

- infrastructure must be reproducible
- infrastructure should be declarative
- avoid manual configuration where possible
- prefer reusable Terraform modules
- avoid hardcoded values
- use variables and outputs appropriately

Whenever Terraform is modified:

1. Run `terraform fmt -recursive`
2. Run `terraform init`
3. Run `terraform validate`
4. Run `terraform plan`

Fix all issues before considering the task complete.

If multiple environments are affected, validate each affected environment.

---

# Planning

Before implementation:

- understand the objective
- identify affected modules
- identify existing reusable code
- clarify ambiguous requirements before making assumptions

Do not assume business requirements that have not been specified.

---

# Testing

Use the project's existing testing framework.

Where applicable:

- run unit tests
- run integration tests
- verify affected functionality
- ensure no regressions

---

# Completion Checklist

Before considering any task complete:

- project builds successfully
- formatting passes
- lint passes
- type checking passes
- tests pass (where available)
- no unused imports
- no dead code
- no obvious regressions

Do not consider a task complete if build or validation errors remain.

---

# Git Safety

Never perform Git write operations unless explicitly instructed.

Do not:

- commit
- push
- merge
- rebase
- squash
- cherry-pick
- tag
- create branches
- delete branches
- force push

Read-only Git commands such as:

- git status
- git diff
- git log

are acceptable when needed.

Leave all changes uncommitted unless explicitly instructed otherwise.

---

# Do Not

Unless explicitly requested:

- change the overall architecture
- introduce breaking changes
- replace major libraries
- move large parts of the project
- rename public APIs
- modify project conventions
- perform large-scale refactoring
- add unnecessary dependencies

Always prefer incremental, maintainable improvements over large disruptive changes.