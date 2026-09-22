# Service Templates

This directory contains the scaffolding templates used by the IDP to generate new services.

Templates are **not** part of the pnpm workspace. They are standalone project generators consumed by the IDP API during the golden path workflow.

## Available Templates

| Template | Description |
|----------|-------------|
| `nestjs-api/` | NestJS API service template |
| `react-admin/` | React admin frontend template |

## Template Structure

Each template contains:

- Application source code scaffold
- `Dockerfile` and `.dockerignore`
- `.github/workflows/` CI/CD pipeline definitions
- Terraform configuration for per-service infrastructure
- Standard configuration files (`.eslintrc`, `tsconfig.json`, etc.)

Templates are rendered with service metadata (name, port, owner, etc.) during the golden path workflow (Step 7-10 in `docs/platform/golden-path.md`).
