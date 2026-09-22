# Technology Stack

## Overview

This document defines the technology choices for Fikri IDP. Each major decision is supported by an Architecture Decision Record (ADR) in `docs/adr/`.

The stack is designed to:
- Use a single language (TypeScript) across frontend and backend
- Deploy on AWS with containerised workloads on ECS Fargate
- Manage infrastructure as code with Terraform
- Provide a custom-built developer portal (Backstage is deferred)

---

## Stack Summary

| Category | Technology | ADR |
|----------|-----------|-----|
| Language | TypeScript | [ADR-001](../adr/001-typescript-primary-language.md) |
| Frontend Framework | Next.js | [ADR-002](../adr/002-nextjs-idp-portal.md) |
| Backend Framework | NestJS | [ADR-003](../adr/003-nestjs-api-worker.md) |
| ORM | Prisma | [ADR-004](../adr/004-prisma-orm.md) |
| Database | PostgreSQL | [ADR-005](../adr/005-postgresql-database.md) |
| Package Manager | pnpm | [ADR-006](../adr/006-pnpm-package-manager.md) |
| Cloud Provider | AWS | [ADR-007](../adr/007-aws-cloud-provider.md) |
| Infrastructure as Code | Terraform | [ADR-008](../adr/008-terraform-infrastructure.md) |
| Compute | ECS Fargate | [ADR-009](../adr/009-ecs-fargate-compute.md) |
| Authentication | Amazon Cognito | [ADR-010](../adr/010-cognito-authentication.md) |
| Container Registry | Amazon ECR | — |
| Load Balancer | Application Load Balancer (ALB) | — |
| Message Queue | Amazon SQS | — |
| Secrets Management | AWS Secrets Manager | — |
| Logging & Monitoring | Amazon CloudWatch | — |
| Source Control | GitHub | — |
| CI/CD | GitHub Actions | — |
| Containerisation | Docker | — |

---

## Component Mapping

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **IDP Portal** | Next.js (TypeScript) | User interface for developers and platform administrators. Service creation wizard, service catalog, deployment status, monitoring dashboards. Never directly accesses AWS or Cognito. |
| **IDP API** | NestJS (TypeScript) | Synchronous request handling: authentication, service CRUD, template management, deployment triggers. Sole Cognito client. Sole writer to PostgreSQL. |
| **IDP Worker** | NestJS (TypeScript) | Async task processing: Terraform execution, infrastructure provisioning, health check polling, monitoring configuration. Consumes from SQS. (Later phase) |
| **Database** | PostgreSQL (via Amazon RDS) | Single source of truth for service lifecycle state, template registry, user/role data, deployment history, and audit trail. |
| **Queue** | Amazon SQS | Decouples API from long-running operations. Provides retry, dead-letter queue, and progress observability. |
| **Infrastructure** | Terraform | Platform-level and per-service infrastructure. Reusable modules for VPC, ECS, ALB, service discovery. |

---

## Language

### TypeScript

**Decision:** TypeScript is the primary language for all components.

**Rationale:** Single language across frontend and backend enables shared types, reduces context switching, and leverages the large TypeScript/JavaScript developer ecosystem. Both Next.js and NestJS have first-class TypeScript support.

**See:** [ADR-001](../adr/001-typescript-primary-language.md)

---

## Frontend

### Next.js

**Decision:** Next.js is the framework for the IDP Portal.

**Rationale:** Mature React framework with server-side rendering, excellent TypeScript support, and clean containerised deployment on ECS Fargate. The portal is custom-built; Backstage is explicitly deferred.

**Key constraints:**
- The frontend never directly accesses Amazon Cognito or AWS services
- All authentication flows through the NestJS API
- Business logic resides in the API, not in UI components

**See:** [ADR-002](../adr/002-nextjs-idp-portal.md)

---

## Backend

### NestJS

**Decision:** NestJS is the framework for both the IDP API and the future IDP Worker.

**Rationale:** Structured, modular framework with built-in dependency injection, first-class TypeScript support, and strong integration with Prisma, SQS, and AWS SDK. Provides consistent patterns across API and Worker components.

**Key constraints:**
- The API is the only component that integrates directly with Amazon Cognito
- The confidential client secret is stored in AWS Secrets Manager
- Controllers remain thin; business logic lives in services

**See:** [ADR-003](../adr/003-nestjs-api-worker.md)

---

## Data

### PostgreSQL

**Decision:** PostgreSQL is the database, hosted on Amazon RDS.

**Rationale:** Relational model fits the platform's data requirements (service lifecycle, user roles, audit trail). Strong JSON support, ACID compliance, and first-class Prisma integration.

**See:** [ADR-005](../adr/005-postgresql-database.md)

### Prisma

**Decision:** Prisma is the ORM for database access.

**Rationale:** Type-safe queries at compile time, declarative schema definition, built-in migrations, and excellent NestJS integration.

**See:** [ADR-004](../adr/004-prisma-orm.md)

### Amazon SQS

**Decision:** SQS decouples the API from long-running operations.

**Rationale:** Managed message queue with built-in retry, dead-letter queue support, and visibility timeout. Eliminates the need to operate a message broker.

---

## Infrastructure

### AWS

**Decision:** AWS is the cloud provider.

**Rationale:** Comprehensive service coverage for all platform requirements. ECS Fargate, RDS, Cognito, ECR, ALB, SQS, Secrets Manager, and CloudWatch are all natively available.

**See:** [ADR-007](../adr/007-aws-cloud-provider.md)

### Terraform

**Decision:** Terraform manages all infrastructure as code.

**Rationale:** Industry-standard IaC tool with mature AWS provider, reusable modules, remote state management (S3 + DynamoDB), and programmatic execution support.

**Key constraints:**
- All infrastructure changes are executed via Terraform
- State is stored in S3 with DynamoDB locking
- Terraform is the only mutation path for AWS resources

**See:** [ADR-008](../adr/008-terraform-infrastructure.md)

### ECS Fargate

**Decision:** ECS Fargate is the compute platform for all containerised workloads.

**Rationale:** Serverless container execution without instance management. Native integration with ALB, ECR, Service Discovery, and IAM task roles.

**See:** [ADR-009](../adr/009-ecs-fargate-compute.md)

### Amazon ECR

**Decision:** ECR stores Docker images for all services.

**Rationale:** Native AWS container registry with IAM-based access control, image scanning, and seamless ECS integration.

### Application Load Balancer (ALB)

**Decision:** ALB routes traffic to services.

**Rationale:** Shared ALB with path-based or host-based routing rules. Health check support, SSL termination, and native ECS integration.

### Amazon Cognito

**Decision:** Cognito is the identity provider.

**Rationale:** Managed authentication service with user pools, groups, JWT issuance, and native AWS integration. The API is the only Cognito client; the frontend never accesses Cognito directly.

**See:** [ADR-010](../adr/010-cognito-authentication.md)

### AWS Secrets Manager

**Decision:** Secrets Manager stores sensitive configuration.

**Rationale:** Managed secrets storage with IAM-based access, automatic rotation support, and native integration with ECS task definitions. Used for: Cognito client secret, GitHub credentials, database credentials, and other platform secrets.

### Amazon CloudWatch

**Decision:** CloudWatch provides logging and monitoring for the IDP itself.

**Rationale:** Native AWS logging and metrics service. ECS tasks log to CloudWatch by default. Used for platform-level observability (API logs, Worker logs, Terraform execution logs).

---

## Developer Tools

### pnpm

**Decision:** pnpm is the package manager.

**Rationale:** Fast, disk-efficient, strict dependency resolution, and native workspace support for monorepo management.

**See:** [ADR-006](../adr/006-pnpm-package-manager.md)

### Docker

**Decision:** Docker is the containerisation standard.

**Rationale:** Industry-standard container format. All services (IDP Portal, IDP API, IDP Worker, and golden-path-generated services) are packaged as Docker containers.

### GitHub

**Decision:** GitHub is the source control platform.

**Rationale:** Industry-standard Git hosting with API support for repository creation, code commits, and webhook consumption. All service repositories are created and managed via the GitHub API.

### GitHub Actions

**Decision:** GitHub Actions is the CI/CD platform.

**Rationale:** Native GitHub integration for automated pipelines. Each service gets a generated GitHub Actions workflow for lint, test, build, push to ECR, and deploy to ECS Fargate.

---

## Deferred Decisions

### Backstage

**Status:** Deferred

Backstage is not part of the initial stack. The IDP Portal will be built as a custom Next.js application. Backstage can be evaluated later as:
- An integration point (embedding Backstage components within the portal)
- A replacement for specific portal features (e.g., service catalog)
- A complementary tool for software catalog and plugin ecosystem

**Rationale:** Building the IDP first provides deeper understanding of the domain, ensuring that any future Backstage adoption is informed by actual platform requirements rather than assumptions.

---

## Alignment with Architecture

This technology stack directly supports the component architecture defined in `overview.md`:

| Architecture Component | Technology | Alignment |
|------------------------|-----------|-----------|
| IDP Portal | Next.js | Custom portal for developer and admin interaction |
| IDP API | NestJS | Synchronous request handling, Cognito integration |
| IDP Worker | NestJS | Async task processing via SQS (later phase) |
| PostgreSQL | PostgreSQL (RDS) | Single source of truth for platform state |
| SQS | Amazon SQS | Decouples API from long-running operations |
| GitHub | GitHub | Repository creation, code commits, webhook consumption |
| AWS | AWS (multiple services) | ECS, ECR, ALB, Cognito, Secrets Manager, CloudWatch |
| Terraform | Terraform | Platform and per-service infrastructure management |

All technology choices align with the MVP scope defined in `vision.md`, the persona permissions defined in `personas.md`, the golden path workflow defined in `golden-path.md`, and the service lifecycle defined in `service-lifecycle.md`.
