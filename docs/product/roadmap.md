# Fikri IDP Roadmap

## Overview

This document defines the V1 (MVP) scope, explicit exclusions, future backlog, and completion criteria for Fikri IDP. It is the authoritative reference for what is in and out of the initial release.

**See also:** [vision.md](vision.md), [golden-path.md](../platform/golden-path.md), [service-lifecycle.md](../platform/service-lifecycle.md)

---

## V1 Scope (MVP)

V1 delivers a working Internal Developer Platform that enables developers to create, deploy, and monitor services on AWS ECS Fargate with zero infrastructure knowledge.

### Feature Summary

| # | Feature | Category |
|---|---------|----------|
| 1 | Authentication | Identity & Access |
| 2 | User Management | Identity & Access |
| 3 | Service Catalog | Service Management |
| 4 | Service Creation | Service Management |
| 5 | Service Templates | Service Management |
| 6 | GitHub Integration | Integrations |
| 7 | AWS Provisioning | Infrastructure |
| 8 | ECS Deployment | Infrastructure |
| 9 | Deployment Status | Observability |
| 10 | CloudWatch Logs | Observability |
| 11 | Basic Service Health | Observability |
| 12 | Security Baseline | Security |
| 13 | CI/CD Pipelines | CI/CD |

---

### 1. Authentication

**Description:** Developers authenticate with the IDP via Amazon Cognito through the API. The frontend never directly accesses Cognito.

**Deliverables:**

- Login flow (email/password) via confidential Cognito client
- JWT session management (access token, refresh token)
- Token refresh endpoint
- Logout / session invalidation
- Session expiry handling

**Acceptance Criteria:**

- Developer can log in with valid credentials
- Expired tokens are refreshed transparently
- Invalid credentials are rejected with appropriate error
- Frontend never holds or accesses Cognito client secrets

---

### 2. User Management

**Description:** Platform administrators can manage user accounts and assign roles.

**Deliverables:**

- User account creation and management
- Role assignment: Platform Administrator, Developer, Service Owner, Viewer
- Role-based access control enforcement
- User listing and search

**Acceptance Criteria:**

- Platform Admin can create users and assign roles
- Each role has the permissions defined in [personas.md](personas.md)
- Unauthorized actions are rejected by the API
- Users can view their own profile and role

---

### 3. Service Catalog

**Description:** A registry of all services managed by the IDP, backed by PostgreSQL.

**Deliverables:**

- Service listing with metadata (name, owner, status, repository URL, service URL)
- Service detail view
- Service status tracking (lifecycle states from [service-lifecycle.md](../platform/service-lifecycle.md))
- Ownership tracking
- Service search and filtering

**Acceptance Criteria:**

- All services created through the golden path appear in the catalog
- Service metadata is accurate and up to date
- Catalog reflects current lifecycle state
- Ownership is visible for every service

---

### 4. Service Creation

**Description:** The golden path workflow for creating a new service end-to-end.

**Deliverables:**

- Service creation wizard in the Portal
- Metadata input and validation (name, description, owner, port, health check path)
- Service name uniqueness enforcement
- Lifecycle state machine (REQUESTED → CREATING → PROVISIONING → DEPLOYING → ACTIVE)
- Failure handling with retry capability
- Step-by-step progress indication

**Acceptance Criteria:**

- Developer can complete the full golden path without platform team intervention
- Invalid metadata is rejected with clear error messages
- Failed services can be retried
- Progress is visible at each step

---

### 5. Service Templates

**Description:** Pre-approved project templates that define the structure, conventions, and configuration for new services.

**Deliverables:**

- NestJS API service template
- React admin frontend template
- Template registry (stored in PostgreSQL)
- Template versioning metadata
- Template selection in service creation wizard

**Acceptance Criteria:**

- Both templates produce working applications
- Generated projects follow platform conventions
- Templates include security baseline controls (see Feature 12)
- Platform Admin can view available templates

---

### 6. GitHub Integration

**Description:** Automated GitHub repository creation and artifact management.

**Deliverables:**

- Repository creation via GitHub API
- Automated commits of generated artifacts:
  - Application scaffold
  - Dockerfile and .dockerignore
  - CI/CD workflow files
  - Terraform configuration
- Repository visibility management (private by default)
- GitHub credentials stored in AWS Secrets Manager

**Acceptance Criteria:**

- Repository is created with correct structure and initial commit
- All generated artifacts are committed in a single coherent push
- Repository name conflicts are detected and handled
- GitHub credentials are never exposed in code or logs

---

### 7. AWS Provisioning

**Description:** Automated infrastructure provisioning using Terraform.

**Deliverables:**

- Reusable Terraform modules for:
  - ECR repository (per service)
  - ECS task definition (per service)
  - ECS service (per service)
  - ALB listener rules (per service)
  - Service discovery entries (per service)
  - IAM task and execution roles (per service)
  - CloudWatch log groups (per service)
- Per-service Terraform configuration generation
- Terraform state management (S3 + DynamoDB locking)
- Programmatic Terraform execution

**Acceptance Criteria:**

- All required AWS resources are provisioned successfully
- Terraform state is stored remotely with locking
- Provisioning is idempotent (safe to re-run)
- Per-service IAM roles follow least privilege

---

### 8. ECS Deployment

**Description:** Automated Docker image build, push, and ECS Fargate deployment.

**Deliverables:**

- Docker image build from generated Dockerfile
- Push to Amazon ECR
- ECS task definition update
- ECS service deployment (rolling update)
- Health check verification post-deploy

**Acceptance Criteria:**

- Docker image is built and pushed to ECR successfully
- ECS service is updated with new task definition
- Deployed tasks pass ALB health checks
- Failed deployments trigger ECS rollback

---

### 9. Deployment Status

**Description:** Real-time visibility into service lifecycle state and deployment progress.

**Deliverables:**

- Lifecycle state display (REQUESTED, CREATING, PROVISIONING, DEPLOYING, ACTIVE, FAILED)
- Step-by-step progress during service creation
- Failure details and error messages
- Retry capability for failed services
- Deployment history per service

**Acceptance Criteria:**

- Developer can see current state of any service
- Failed services show failure reason and retry count
- Retry transitions service back through the correct states
- Deployment history is accurate and complete

---

### 10. CloudWatch Logs

**Description:** Structured logging for all managed services via Amazon CloudWatch.

**Deliverables:**

- Per-service CloudWatch log groups (created via Terraform)
- Structured JSON log format
- Log retention policy (minimum 30 days)
- ECS `awslogs` log driver configuration
- Log viewing capability in the Portal

**Acceptance Criteria:**

- Every service has a dedicated CloudWatch log group
- Logs are structured JSON and parseable
- Log retention is configured (≥ 30 days)
- Developer can view service logs through the Portal

---

### 11. Basic Service Health

**Description:** Operational visibility into service health and resource utilisation.

**Deliverables:**

- ECS task health status (running, stopped, pending)
- ECS service health (desired vs. running task count)
- ALB health check status (healthy/unhealthy targets)
- Basic CPU and memory utilisation metrics
- Deployment status (in progress, succeeded, failed)
- Basic uptime / availability status

**Acceptance Criteria:**

- Developer can see whether a service is healthy or degraded
- CPU and memory metrics are visible per service
- ALB health check status is accurate
- Unhealthy services are clearly indicated

---

### 12. Security Baseline

**Description:** Mandatory security controls enforced as hard gates for all services. See [security-baseline.md](../platform/security-baseline.md) for full specification.

**Deliverables:**

- Transport security (HTTPS/TLS via ALB)
- Per-service IAM roles (least privilege, no wildcards)
- Secrets management (AWS Secrets Manager, no hardcoded secrets)
- Container security (non-root, multi-stage build, minimal base image)
- Container scanning (ECR scan-on-push, block on HIGH/CRITICAL)
- Dependency scanning (`npm audit`, fail on HIGH/CRITICAL)
- SAST (CodeQL or Trivy in CI/CD)
- Security headers (Helmet for NestJS, Next.js security headers)
- CloudWatch logging (structured JSON, retention policy)
- Audit logging (actor, timestamp, action, resource, outcome)

**Acceptance Criteria:**

- All 10 mandatory controls are satisfied for every deployed service
- CI/CD pipeline blocks deployment if any gate fails
- Templates embed security controls by default
- No secrets are present in source code, Dockerfiles, or Terraform state

---

### 13. CI/CD Pipelines

**Description:** Automated GitHub Actions workflows for every service.

**Deliverables:**

- GitHub Actions workflow generation (per service)
- Pipeline stages:
  - Linting and type checking
  - Unit and integration tests
  - Docker image build
  - Push to Amazon ECR
  - Deploy to ECS Fargate
- Security gates integrated into pipeline (see Feature 12)
- Environment-specific deployment (staging, production)

**Acceptance Criteria:**

- Every generated service has a working CI/CD pipeline
- Push to main triggers the full pipeline automatically
- Pipeline fails fast on lint, test, or security gate failures
- Deployment only proceeds if all gates pass

---

## Non-MVP (V1 Exclusions)

The following features are **explicitly excluded** from V1. They will not be addressed in the initial release under any circumstances.

| Feature | Reason for Exclusion |
|---------|---------------------|
| **Kubernetes / EKS** | V1 uses ECS Fargate exclusively. Kubernetes adds significant operational complexity. |
| **Multi-cloud support** | V1 is AWS-only. Multi-cloud abstraction is premature without production experience. |
| **Complex FinOps / cost management** | V1 has no cost tracking or optimisation features. Basic AWS Cost Explorer is sufficient. |
| **AI infrastructure provisioning** | No GPU workloads or AI/ML service support in V1. |
| **Multi-region deployment** | V1 is single-region only. Multi-region adds complexity in networking, data, and failover. |
| **Advanced incident management** | V1 has basic health monitoring. PagerDuty/Opsgenie-style incident management is deferred. |
| **Full Backstage replacement** | V1 uses a custom Next.js portal. Backstage evaluation is deferred to V2+. |
| **Prometheus / Grafana** | V1 uses CloudWatch for observability. Prometheus/Grafana adds operational overhead. |
| **SLI / SLO tracking** | V1 has basic health metrics. Formal SLI/SLO tracking is deferred. |
| **IDP Worker (async SQS)** | V1 API handles operations synchronously. Worker extraction is a V2 optimisation. |
| **Advanced deployment strategies** | V1 uses ECS rolling updates only. Canary, blue/green are deferred. |
| **Database provisioning** | V1 does not provision databases for services. Manual database setup is required. |
| **Feature flag management** | V1 has no feature flag system integration. |

---

## Backlog (V2+)

Features deferred to future iterations. Prioritisation will be determined based on user feedback and organisational needs after V1 launch.

### V2 Candidates

| Feature | Description | Depends On |
|---------|-------------|------------|
| Prometheus / Grafana observability | Centralised metrics, dashboards, and alerting | V1 CloudWatch Logs |
| SLI / SLO tracking | Formal service-level indicators and objectives | Prometheus/Grafana |
| IDP Worker | Extract async processing from API to dedicated NestJS Worker via SQS | V1 API |
| Advanced deployment strategies | Canary, blue/green deployments | V1 ECS Deployment |
| Database provisioning | Automated RDS / DynamoDB provisioning for services | V1 AWS Provisioning |
| Additional templates | Worker services, static sites, CLI tools | V1 Service Templates |
| Self-service environment provisioning | Developer-requested staging/preview environments | V1 Environments |
| Backstage evaluation | Evaluate Backstage as portal replacement or integration | V1 Portal |
| Feature flag management | Integration with LaunchDarkly, Unleash, or similar | V1 CI/CD |
| Cost allocation and optimisation | Per-service cost tracking and budget alerts | V1 AWS Provisioning |
| Multi-region deployment | Cross-region deployment support | V1 single-region |
| Advanced compliance | SOC 2, ISO 27001, HIPAA compliance automation | V1 Security Baseline |
| Policy-as-code (OPA) | Complex policy enforcement beyond CI/CD gates | V1 Security Baseline |
| Service dependency mapping | Visualise and track inter-service dependencies | V1 Service Catalog |
| Enhanced incident management | PagerDuty / Opsgenie integration, on-call rotation | V1 Basic Health |
| Runtime debugging and profiling | Integrated debugging tools for deployed services | V1 ECS Deployment |
| Local development tooling | Docker Compose or similar for local service orchestration | V1 Templates |

---

## MVP Completion Criteria

V1 is considered complete when **all** of the following criteria are met.

### Functional Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Developer can authenticate (login, refresh, logout) | Manual test of all auth flows |
| 2 | Platform Admin can create users and assign roles | Manual test of user management |
| 3 | Developer can create a service end-to-end via golden path | Complete golden path without platform team intervention |
| 4 | Service appears in catalog with correct metadata | Catalog entry matches service creation inputs |
| 5 | Deployed service passes ALB health checks | Health check returns HTTP 200 |
| 6 | Deployment status is visible and accurate | Lifecycle states transition correctly in Portal |
| 7 | Failed services can be retried | Retry transitions service through correct states |
| 8 | CloudWatch logs are accessible per service | Log group exists, logs are structured JSON |
| 9 | Service health metrics are visible | CPU, memory, task status shown in Portal |
| 10 | All services pass security baseline | All 6 CI/CD security gates green |
| 11 | CI/CD pipeline runs automatically on push | Push to main triggers full pipeline |
| 12 | Both templates (NestJS API, React admin) produce working services | Deploy from each template, verify health |

### Performance Criteria

| # | Criterion | Target |
|---|-----------|--------|
| 13 | Time to first deployment (new service) | < 30 minutes |
| 14 | Infrastructure-related tickets for new services | 80% reduction vs. manual process |

### Quality Criteria

| # | Criterion | Target |
|---|-----------|--------|
| 15 | New services using standardised templates | 100% |
| 16 | Services with monitoring configured at launch | 100% |
| 17 | Services passing security baseline at launch | 100% |
| 18 | Services with documented ownership | 100% |
| 19 | Platform build, lint, typecheck, tests | All pass (`pnpm build && pnpm lint && pnpm typecheck && pnpm test`) |

### Qualitative Criteria

| # | Criterion | Indicator |
|---|-----------|-----------|
| 20 | Developer self-service | Developer creates and deploys without platform team intervention |
| 21 | Reproducible infrastructure | All infrastructure changes are version-controlled via Terraform |
| 22 | Consistent patterns | All services follow the same conventions and structure |
| 23 | Security by default | All services meet security baseline at launch without manual effort |
| 24 | Predictable maintenance | Platform maintenance burden is manageable and well-understood |

---

## Alignment with Existing Documentation

| Document | Alignment |
|----------|-----------|
| [vision.md](vision.md) | V1 scope is a refined, focused version of the MVP scope in vision.md. Prometheus/Grafana and SLI/SLO are deferred to V2. |
| [personas.md](personas.md) | All V1 features serve the personas defined in personas.md. Authentication and user management directly support all four roles. |
| [golden-path.md](../platform/golden-path.md) | The golden path (Steps 1–16) is fully covered by V1 Features 3–11. Steps 15 (Configure Monitoring) is simplified to CloudWatch-only in V1. |
| [service-lifecycle.md](../platform/service-lifecycle.md) | All lifecycle states (REQUESTED through ARCHIVED) are supported in V1 except DEPRECATED/ARCHIVED which are V2. |
| [security-baseline.md](../platform/security-baseline.md) | All mandatory controls are V1. Optional controls are deferred to V2+. |
| [overview.md](../architecture/overview.md) | V1 uses the "Initial Architecture" (API only, no Worker). Worker is V2. |
