# Fikri IDP Architecture Overview

## Overview

This document defines the high-level technical architecture of Fikri IDP. It describes the components, their responsibilities, boundaries, and interactions.

The architecture is designed to abstract infrastructure complexity from developers, standardize deployment practices, and enable self-service service creation through the golden path workflow.

---

## Component Architecture

### Initial Architecture (MVP)

```
Developer
  │
  ▼
┌──────────────┐
│  IDP Portal  │
│   Next.js    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   IDP API    │
│    NestJS    │
└──────┬───────┘
       │
       ├────────────┼────────────┐
       ▼            ▼            ▼
  PostgreSQL      SQS      External APIs
       │                       │
       ├──────────┼────────────┤
       ▼          ▼            ▼
    GitHub       AWS       Terraform
```

### Target Architecture (with Worker)

```
Developer
  │
  ▼
┌──────────────┐
│  IDP Portal  │
│   Next.js    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   IDP API    │
│    NestJS    │
└──────┬───────┘
       │
       ├──────────────────┐
       ▼                  ▼
  PostgreSQL          ┌──────────┐
       │              │   SQS    │
       │              └────┬─────┘
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │  IDP Worker  │
       │            │    NestJS    │
       │            └──────┬───────┘
       │                   │
       ├───────────────────┼────────────┐
       ▼                   ▼            ▼
    GitHub               AWS       Terraform
```

### Component Responsibilities

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **IDP Portal** | Next.js | User interface for developers and platform administrators. Provides service creation wizard, service catalog browsing, deployment status, and monitoring dashboards. Never directly accesses AWS or Cognito. |
| **IDP API** | NestJS | Synchronous request handling: authentication, service CRUD, template management, deployment triggers. Integrates with Cognito for auth. Enqueues async work to SQS. Sole writer to PostgreSQL. |
| **IDP Worker** | NestJS | Async task processing: Terraform execution, infrastructure provisioning, health check polling, monitoring configuration, notifications. Consumes from SQS. (Later phase) |
| **PostgreSQL** | PostgreSQL | Single source of truth for service lifecycle state, template registry, user/role data, deployment history, and audit trail. |
| **SQS** | Amazon SQS | Decouples API from long-running operations. Provides retry, dead-letter queue, and progress observability for async workflows. |
| **External APIs** | Various | GitHub API, AWS APIs (ECS, ECR, ALB, IAM, Service Discovery), Prometheus, Grafana. |

---

## Frontend/Backend Boundary

### Principles

1. **The frontend never directly accesses Amazon Cognito or AWS services.**
2. All authentication flows through the NestJS API.
3. The frontend communicates with the backend exclusively via REST API endpoints.
4. Business logic resides in the API, not in UI components.

### Interaction Model

```
┌──────────────┐         REST/JSON         ┌──────────────┐
│  IDP Portal  │ ◄───────────────────────► │   IDP API    │
│   (Next.js)  │                           │   (NestJS)   │
└──────────────┘                           └──────────────┘
```

### Boundary Rules

| Concern | Owner | Notes |
|---------|-------|-------|
| Authentication | API | Frontend sends credentials, receives JWT. Never handles Cognito SDK. |
| Authorization | API | JWT validation and role-based access control enforced server-side. |
| Service creation | API | Frontend submits metadata, API orchestrates the golden path. |
| Deployment status | API | Frontend polls or subscribes to status updates via API. |
| Monitoring data | API | Frontend requests metrics, API fetches from Prometheus/Grafana. |
| Input validation | Both | Frontend validates for UX; API validates as security boundary. |

### Data Flow

1. Developer interacts with Portal UI
2. Portal makes authenticated REST calls to API (JWT in Authorization header)
3. API processes request, interacts with PostgreSQL and external services
4. API returns structured JSON response to Portal
5. Portal renders response to developer

---

## Worker Responsibility

### Phase: Later (post-MVP)

The IDP Worker is introduced to handle long-running, asynchronous operations that should not block API responses.

### Responsibilities

| Task | Description |
|------|-------------|
| **Terraform execution** | Run `terraform plan` and `terraform apply` for infrastructure provisioning |
| **Infrastructure provisioning** | Create AWS resources: ECR, ECS, ALB rules, service discovery, IAM roles |
| **Health check polling** | Poll service health endpoints after deployment (every 15s for 5min) |
| **Monitoring configuration** | Register Prometheus scrape targets, create Grafana dashboards |
| **Service catalog updates** | Update lifecycle state transitions in PostgreSQL |
| **Notifications** | Send success/failure notifications to developers |
| **Repository operations** | Commit generated artifacts (Dockerfile, CI/CD, Terraform) to GitHub |

### Interaction Model

```
┌──────────────┐    enqueue     ┌──────────┐    consume    ┌──────────────┐
│   IDP API    │ ─────────────► │   SQS    │ ────────────► │  IDP Worker  │
└──────────────┘                └──────────┘               └──────┬───────┘
                                                                  │
                                                                  ▼
                                                          ┌──────────────┐
                                                          │  PostgreSQL  │
                                                          │  (update     │
                                                          │   state)     │
                                                          └──────────────┘
```

### MVP Simplification

In the initial MVP, the API handles all operations synchronously. The Worker is extracted later to:
- Prevent API timeouts during long Terraform runs
- Enable parallel processing of multiple service creations
- Provide better observability into pipeline progress
- Allow independent scaling of async workloads

---

## Database Responsibility

### Single Source of Truth

PostgreSQL is the authoritative data store for all platform state. The markdown-based service catalog is a derived artifact, not the source.

### Data Ownership

| Data Domain | Description |
|-------------|-------------|
| **Service lifecycle state** | Current state (REQUESTED, CREATING, PROVISIONING, DEPLOYING, ACTIVE, DEPRECATED, ARCHIVED, FAILED), timestamps, failure reasons, retry counts |
| **Service metadata** | Name, owner, repository URL, service URL, template type, port, health check path |
| **Template registry** | Available templates (NestJS API, React admin), template versions, configuration |
| **User and role data** | User accounts, role assignments (Platform Admin, Developer, Service Owner, Viewer), permissions |
| **Deployment history** | Deployment records per service, status, timestamps, associated pipeline runs |
| **Audit trail** | Who did what and when — all state transitions and administrative actions |
| **SLI/SLO definitions** | Per-service indicators and objectives (latency targets, error rate thresholds, availability targets) |

### Access Rules

| Rule | Description |
|------|-------------|
| **API is the sole writer** | Only the IDP API (and later, the Worker) writes to PostgreSQL. No direct database access from other components. |
| **No shared database** | Each service managed by the IDP has its own infrastructure. The IDP database is for platform metadata only. |
| **State machine enforced** | Lifecycle state transitions follow the rules defined in `service-lifecycle.md`. Invalid transitions are rejected. |
| **Idempotent operations** | Database operations support idempotent retries to handle Worker restarts and SQS redelivery. |

---

## External Integrations

### GitHub

| Integration | Purpose | Method |
|-------------|---------|--------|
| Repository creation | Create new service repositories with standard structure | GitHub REST API |
| Code commits | Push generated artifacts (application scaffold, Dockerfile, CI/CD, Terraform) | GitHub Contents API |
| Repository archiving | Mark repositories as read-only when services are decommissioned | GitHub REST API |
| Webhook consumption | Receive push events to trigger CI/CD pipelines | GitHub Webhooks |

**Authentication:** GitHub App or Personal Access Token stored in AWS Secrets Manager.

### AWS

| Service | Purpose |
|---------|---------|
| **ECS Fargate** | Run containerized services |
| **ECR** | Store Docker images |
| **ALB** | Route traffic to services, health check endpoints |
| **Service Discovery** | DNS-based service-to-service communication |
| **IAM** | Task roles and execution roles for containers |
| **Secrets Manager** | Store Cognito client secret, GitHub credentials, platform secrets |
| **S3** | Terraform state storage |
| **DynamoDB** | Terraform state locking |
| **SQS** | Async task queue for Worker |
| **Cognito** | Identity provider for authentication |

### Terraform

| Usage | Description |
|-------|-------------|
| Platform infrastructure | VPC, ECS cluster, ALB, service discovery namespace (managed by Platform Admin) |
| Per-service infrastructure | ECR, task definition, ECS service, ALB rules, IAM roles (generated and applied by IDP) |
| Reusable modules | Standard patterns for VPC, ALB, ECS, service discovery |

**Execution:** Terraform is executed programmatically by the API (MVP) or Worker (later). State is stored in S3 with DynamoDB locking.

### Prometheus & Grafana

| Integration | Purpose |
|-------------|---------|
| Prometheus scrape targets | Register service metrics endpoints for monitoring |
| Grafana dashboards | Auto-generate dashboards per service (latency, error rate, availability) |
| SLI/SLO tracking | Track service-level indicators against defined objectives |

---

## Authentication Boundary

### Identity Provider

Amazon Cognito is the identity provider for all IDP users.

### Authentication Flow

```
┌──────────────┐    credentials    ┌──────────────┐    confidential    ┌──────────────┐
│  IDP Portal  │ ────────────────► │   IDP API    │ ────────────────► │   Cognito    │
│   (Next.js)  │                   │   (NestJS)   │    client secret  │              │
└──────┬───────┘                   └──────┬───────┘                   └──────────────┘
       │                                  │
       │         JWT                      │         Tokens
       │ ◄────────────────────────────────┘ ◄───────────────────────────────┘
       │
       ▼
  Subsequent API calls
  include JWT in
  Authorization header
```

### Boundary Rules

| Rule | Description |
|------|-------------|
| **API is the only Cognito client** | Only the NestJS API holds the confidential client secret. The frontend never integrates with Cognito SDK. |
| **Client secret in Secrets Manager** | The Cognito confidential client secret is stored in AWS Secrets Manager, accessed by the API at runtime. |
| **JWT-based sessions** | After successful authentication, the API returns a JWT to the frontend. All subsequent requests include this JWT. |
| **Token refresh via API** | When the JWT expires, the frontend calls the API's refresh endpoint. The API handles the refresh flow with Cognito. |
| **Role-based access** | Cognito user groups or API-level role mapping enforce persona permissions (Platform Admin, Developer, Service Owner, Viewer). |

### What the Frontend Does NOT Do

- Initialize Cognito SDK
- Store Cognito client secrets
- Perform direct token exchange with Cognito
- Handle Cognito refresh tokens directly

---

## AWS Boundary

### Platform-Level Access

All AWS mutations are performed using platform-level IAM credentials. Developers have **zero direct AWS access**.

### Boundary Rules

| Rule | Description |
|------|-------------|
| **No direct AWS access for developers** | Developers cannot access AWS Console, CLI, or APIs. All infrastructure changes go through the IDP. |
| **Platform credentials for provisioning** | The API and Worker use IAM roles with permissions to create/manage ECS, ECR, ALB, IAM, and Service Discovery resources. |
| **Terraform is the only mutation path** | All infrastructure changes are executed via Terraform. No manual AWS Console or CLI changes. |
| **State is version-controlled** | Terraform state is stored in S3 with DynamoDB locking. All changes are reproducible and auditable. |
| **Secrets in Secrets Manager** | Cognito client secret, GitHub credentials, and other sensitive values are stored in AWS Secrets Manager, not in code or environment variables. |

### AWS Resource Ownership

| Resource | Owner | Managed By |
|----------|-------|------------|
| VPC, subnets, internet gateway | Platform | Terraform (Platform Admin) |
| ECS cluster | Platform | Terraform (Platform Admin) |
| ALB (shared) | Platform | Terraform (Platform Admin) |
| Service discovery namespace | Platform | Terraform (Platform Admin) |
| ECR repository (per service) | Service | Terraform (IDP API/Worker) |
| ECS task definition (per service) | Service | Terraform (IDP API/Worker) |
| ECS service (per service) | Service | Terraform (IDP API/Worker) |
| ALB listener rules (per service) | Service | Terraform (IDP API/Worker) |
| IAM task/execution roles (per service) | Service | Terraform (IDP API/Worker) |

### Developer Experience

Developers interact with AWS **only** through the IDP Portal and API. They:
- Do not need AWS credentials
- Do not need to understand ECS, ECR, or ALB configuration
- Do not run Terraform commands
- Do not access the AWS Console

The IDP abstracts all AWS complexity, enabling developers to focus on business logic.

---

## Security Baseline

### Cross-Cutting Concern

The security baseline defines mandatory security controls for all services managed by the IDP. It is a cross-cutting concern that applies to golden-path-generated services and the IDP's own components (Portal, API, Worker).

**Enforcement model:** Hard gate. Mandatory controls block deployment.

### Control Areas

| Control | Enforcement Point |
|---------|-------------------|
| HTTPS / TLS | ALB configuration (Terraform) |
| IAM roles | Per-service task and execution roles (Terraform) |
| Secrets management | AWS Secrets Manager; secret scanning in CI/CD |
| Container security | Non-root, multi-stage, minimal base (Dockerfile template) |
| Container scanning | ECR scan-on-push; CI/CD gate blocks on HIGH/CRITICAL |
| Dependency scanning | `npm audit` in CI/CD pipeline |
| SAST | CodeQL / Trivy in CI/CD pipeline |
| Security headers | Middleware in application scaffold |
| CloudWatch logging | Log group and log driver (Terraform) |
| Audit logging | Audit middleware in application scaffold |

**Full specification:** See `docs/platform/security-baseline.md`

**Decision record:** See [ADR-012](../adr/012-security-baseline.md)

---

## Alignment with Product Documentation

| Document | Alignment |
|----------|-----------|
| `vision.md` | Architecture supports all MVP scope items: templates, repository management, infrastructure provisioning, CI/CD, observability, security baseline, service catalog |
| `personas.md` | Authentication boundary enforces persona permissions. Role-based access control maps to Platform Admin, Developer, Service Owner, Viewer |
| `golden-path.md` | Component architecture supports all 16 steps of the golden path. Steps 8, 9, 10 embed security baseline controls. Worker handles async steps (provisioning, deployment, health check, monitoring) |
| `service-lifecycle.md` | PostgreSQL stores the service lifecycle state machine. State transitions are enforced by the API/Worker |

---

## Future Considerations

The following architectural additions are planned for future iterations:

- **IDP Worker** — Extract async processing from API to dedicated Worker service
- **Observability layer** — Centralized logging, tracing, and metrics for the IDP itself
- **SLO tracking** — Platform-level SLOs for the IDP's own reliability
- **Audit system** — Comprehensive audit log of all platform actions
- **Acceptance testing** — Automated validation that services meet quality gates before promotion
- **Advanced policy-as-code** — OPA or similar for complex policy enforcement beyond CI/CD gates
