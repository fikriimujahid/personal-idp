# Golden Path: Creating a New Backend Service

## Overview

The golden path defines the standard workflow for creating a new backend service through Fikri IDP. It is the primary success scenario — the happy path that every developer follows when scaffolding a new NestJS API service.

**Target Persona:** Developer

**Success Criteria:** A fully deployed, monitored, and catalogued service in production within 30 minutes of initiation, with zero platform team intervention.

**Scope:** Service creation through production deployment.

---

## Workflow Diagram

```
Developer
  │
  ▼
Access IDP
  │
  ▼
Create Service
  │
  ▼
Select NestJS Template
  │
  ▼
Enter Service Metadata
  │
  ▼
Create GitHub Repository
  │
  ▼
Generate Application
  │
  ▼
Generate Docker Configuration
  │
  ▼
Generate CI/CD
  │
  ▼
Generate Terraform
  │
  ▼
Provision AWS Infrastructure
  │
  ▼
Deploy ECS Service
  │
  ▼
Health Check
  │
  ▼
Register Service Catalog
  │
  ▼
Configure Monitoring
  │
  ▼
Service Available
```

---

## Prerequisites

| Prerequisite | Description |
|--------------|-------------|
| IDP account | Developer has an authenticated account via Amazon Cognito |
| GitHub org access | Developer has access to the GitHub organization where repositories are created |
| AWS permissions | Developer has no direct AWS access; all infrastructure is provisioned by the IDP via platform-level credentials |
| Service name uniqueness | The chosen service name must not conflict with existing services in the catalog |

---

## Workflow Steps

### Step 1: Developer Initiates

The developer decides to create a new backend service and opens the IDP.

| | |
|---|---|
| **Input** | Developer intent to create a new service |
| **Output** | Developer is ready to interact with the IDP |
| **Failure** | Developer lacks IDP account or GitHub org access |
| **Retry** | N/A — prerequisite issue |
| **Manual Intervention** | Platform Administrator grants access |

---

### Step 2: Access IDP

The developer authenticates with the IDP via the API (login flow using the confidential Cognito client).

| | |
|---|---|
| **Input** | Developer credentials (email/password or SSO) |
| **Output** | Valid session token, access to IDP dashboard |
| **Failure** | Invalid credentials, expired session, Cognito unavailable |
| **Retry** | Developer re-enters credentials; session refresh on expiry |
| **Manual Intervention** | Platform Administrator resets credentials if account is locked |

---

### Step 3: Create Service

The developer clicks "Create Service" in the IDP dashboard, initiating the service creation wizard.

| | |
|---|---|
| **Input** | Developer clicks "Create Service" button |
| **Output** | Service creation wizard is displayed with template selection |
| **Failure** | IDP API unavailable, session expired mid-flow |
| **Retry** | Developer refreshes and restarts the wizard |
| **Manual Intervention** | None |

---

### Step 4: Select NestJS Template

The developer selects the NestJS API template from the list of approved templates.

| | |
|---|---|
| **Input** | Template selection (NestJS API) |
| **Output** | Template loaded, metadata form displayed |
| **Failure** | Template not found or corrupted in IDP template registry |
| **Retry** | Developer selects again; Platform Administrator restores template if missing |
| **Manual Intervention** | Platform Administrator if template is unavailable |

---

### Step 5: Enter Service Metadata

The developer fills in the required metadata for the new service.

| | |
|---|---|
| **Input** | Service name (lowercase, alphanumeric, hyphens), description, owner (developer name/email), port number (default 3000), health check path (default `/health`) |
| **Output** | Validated metadata payload stored in IDP state |
| **Failure** | Validation errors (name taken, invalid characters, port out of range) |
| **Retry** | Developer corrects input and resubmits |
| **Manual Intervention** | None |

**Validation Rules:**
- Service name: 3-63 characters, lowercase alphanumeric and hyphens only, must be unique
- Port: 1024-65535
- Health check path: must start with `/`
- Owner: must be a valid IDP user

---

### Step 6: Create GitHub Repository

The IDP creates a new GitHub repository via the GitHub API with the standard project structure.

| | |
|---|---|
| **Input** | Service name, GitHub organization, repository visibility (private) |
| **Output** | GitHub repository created with initial commit (README, LICENSE, .gitignore) |
| **Failure** | GitHub API rate limit, repository name conflict, insufficient GitHub permissions |
| **Retry** | Automatic retry with exponential backoff (3 attempts); if repository already exists, verify ownership and continue |
| **Manual Intervention** | Platform Administrator if GitHub org permissions are insufficient |

---

### Step 7: Generate Application

The IDP scaffolds the NestJS application from the template, injecting service metadata.

| | |
|---|---|
| **Input** | NestJS template, service metadata (name, port, health check path) |
| **Output** | Scaffolded NestJS project committed to the GitHub repository |
| **Failure** | Template rendering error, Git push failure |
| **Retry** | Automatic retry (3 attempts); operation is idempotent — repository contents are overwritten |
| **Manual Intervention** | Platform Administrator if template is corrupted |

---

### Step 8: Generate Docker Configuration

The IDP generates Dockerfile and .dockerignore, committed to the repository. The Dockerfile enforces mandatory container security controls from the [security baseline](security-baseline.md).

| | |
|---|---|
| **Input** | Service metadata (port, application type) |
| **Output** | Dockerfile (multi-stage build, non-root user, minimal base image) and .dockerignore committed to repository |
| **Failure** | Git push failure, template rendering error |
| **Retry** | Automatic retry (3 attempts); idempotent |
| **Manual Intervention** | None |

**Security controls embedded:** Non-root user, multi-stage build, minimal base image, no unnecessary packages in final image.

---

### Step 9: Generate CI/CD

The IDP generates GitHub Actions workflow files for lint, test, build, push to ECR, and deploy to ECS. The pipeline includes security gates that enforce the [security baseline](security-baseline.md).

| | |
|---|---|
| **Input** | Service metadata, environment configuration |
| **Output** | `.github/workflows/` directory with CI/CD pipeline committed to repository, including security gates |
| **Failure** | Git push failure, workflow template rendering error |
| **Retry** | Automatic retry (3 attempts); idempotent |
| **Manual Intervention** | Platform Administrator if CI/CD template is misconfigured |

**Security gates embedded:** Secret scanning, dependency audit, SAST, container scan validation, IAM policy validation. Deployment is blocked if any gate fails.

---

### Step 10: Generate Terraform

The IDP generates per-service Terraform configuration using reusable modules. The Terraform configuration enforces mandatory infrastructure security controls from the [security baseline](security-baseline.md).

| | |
|---|---|
| **Input** | Service metadata, platform Terraform module references, environment configuration |
| **Output** | Terraform configuration files committed to the platform infrastructure repository |
| **Failure** | Terraform template rendering error, Git push failure |
| **Retry** | Automatic retry (3 attempts); idempotent |
| **Manual Intervention** | Platform Administrator if Terraform modules are misconfigured |

**Security controls embedded:** Per-service IAM roles (least privilege), HTTPS listener with TLS, CloudWatch log group with retention policy, ECR scan-on-push, ECS security context (non-root, read-only filesystem).

---

### Step 11: Provision AWS Infrastructure

The IDP executes Terraform to provision all required AWS resources.

| | |
|---|---|
| **Input** | Terraform configuration from Step 10 |
| **Output** | Provisioned resources: ECR repository, ECS task definition, ECS service, ALB listener rule, service discovery entry, IAM roles |
| **Failure** | Terraform apply failure (AWS quota exceeded, permission denied, resource conflict, network error) |
| **Retry** | Terraform state is preserved — re-run `terraform apply` is safe and idempotent; automatic retry (3 attempts) |
| **Manual Intervention** | Platform Administrator if AWS quota is exceeded or IAM permissions are insufficient |

**Provisioned Resources:**

| Resource | Purpose |
|----------|---------|
| ECR Repository | Container image storage |
| ECS Task Definition | Container specification (CPU, memory, port, environment variables) |
| ECS Service | Running task management with desired count |
| ALB Listener Rule | Route traffic to service based on path or host |
| Service Discovery Entry | DNS-based service-to-service communication |
| IAM Task Role | Permissions for the running container |
| IAM Execution Role | Permissions for ECS agent (ECR pull, CloudWatch logs) |

---

### Step 12: Deploy ECS Service

The IDP triggers the CI/CD pipeline to build the Docker image, push to ECR, and deploy to ECS Fargate in production.

| | |
|---|---|
| **Input** | GitHub repository with application code and Dockerfile, ECR repository URL, ECS cluster and service name |
| **Output** | Docker image built and pushed to ECR; ECS service updated with new task definition revision; tasks running in production |
| **Failure** | Docker build failure, ECR push failure, ECS deployment timeout, health check failure in ECS |
| **Retry** | CI/CD pipeline retries automatically (3 attempts); ECS rolls back to previous task definition if deployment fails |
| **Manual Intervention** | Developer if application code fails to build or start; Platform Administrator if ECS cluster capacity is insufficient |

---

### Step 13: Health Check

The IDP verifies the deployed service is responding correctly.

| | |
|---|---|
| **Input** | ALB endpoint URL, health check path from metadata |
| **Output** | HTTP 200 response from health check endpoint |
| **Failure** | Service not responding after timeout (5 minutes), non-200 response, connection refused |
| **Retry** | Polling every 15 seconds for 5 minutes; if still failing, mark as failed |
| **Manual Intervention** | Developer investigates application logs; Platform Administrator investigates infrastructure if ALB target is unhealthy |

---

### Step 14: Register Service Catalog

The IDP creates a markdown entry in the service catalog with service metadata.

| | |
|---|---|
| **Input** | Service metadata (name, owner, repository URL, service URL, status) |
| **Output** | New markdown file in the service catalog repository with service details and SLI/SLO definitions |
| **Failure** | Git push failure, catalog entry conflict (duplicate name) |
| **Retry** | Automatic retry (3 attempts); idempotent |
| **Manual Intervention** | None |

**Catalog Entry Contents:**
- Service name
- Owner
- Repository URL
- Service URL
- Status (active)
- SLI/SLO definitions (request latency p50/p95/p99, error rate, availability)

---

### Step 15: Configure Monitoring

The IDP configures Prometheus metrics endpoint and creates a Grafana dashboard for the service.

| | |
|---|---|
| **Input** | Service name, ALB endpoint, SLI/SLO definitions from catalog |
| **Output** | Prometheus scrape target registered; Grafana dashboard created with panels for latency, error rate, and availability |
| **Failure** | Prometheus configuration push failure, Grafana API unavailable |
| **Retry** | Automatic retry (3 attempts); idempotent |
| **Manual Intervention** | Platform Administrator if Prometheus or Grafana is misconfigured |

---

### Step 16: Service Available

The service is fully deployed, monitored, and catalogued. The developer is notified.

| | |
|---|---|
| **Input** | All previous steps completed successfully |
| **Output** | Developer receives notification with service URL, repository URL, dashboard URL, and catalog entry link |
| **Failure** | Notification delivery failure |
| **Retry** | Automatic retry (3 attempts) |
| **Manual Intervention** | None |

---

## Failure & Recovery Summary

| Step | Failure Mode | Retry Strategy | Manual Intervention |
|------|-------------|----------------|---------------------|
| 2: Access IDP | Invalid credentials | Developer re-enters credentials | Admin resets if locked |
| 6: Create GitHub Repo | API rate limit / name conflict | Exponential backoff (3x); check existence | Admin if permissions insufficient |
| 7: Generate Application | Template error / push failure | Idempotent retry (3x) | Admin if template corrupted |
| 8: Docker Config | Push failure | Idempotent retry (3x) | None |
| 9: CI/CD | Template error / push failure | Idempotent retry (3x) | Admin if template misconfigured |
| 10: Terraform | Template error / push failure | Idempotent retry (3x) | Admin if modules misconfigured |
| 11: Provision Infra | AWS quota / permissions / conflict | Terraform state preserved; safe re-apply (3x) | Admin if quota or IAM issue |
| 12: Deploy ECS | Build / push / deploy failure | CI/CD retry (3x); ECS auto-rollback | Developer if code fails; Admin if capacity |
| 13: Health Check | Service not responding | Poll every 15s for 5 min | Developer checks logs; Admin checks infra |
| 14: Service Catalog | Push failure / conflict | Idempotent retry (3x) | None |
| 15: Monitoring | Prometheus/Grafana failure | Idempotent retry (3x) | Admin if misconfigured |
| 16: Service Available | Notification failure | Retry (3x) | None |

---

## Expected Developer Experience

1. **Developer logs in** to the IDP dashboard using their credentials.
2. **Clicks "Create Service"** and selects the NestJS API template.
3. **Fills in the metadata form** — service name, description, owner, port, health check path.
4. **Clicks "Create"** — from this point, the workflow is fully automated.
5. **Watches progress** as the IDP displays a step-by-step progress indicator.
6. **Receives notification** (within 15-30 minutes) that the service is available, with:
   - Service URL
    - GitHub repository URL
   - Grafana dashboard URL
   - Service catalog entry link
7. **Clones the repository** and begins developing business logic.

The developer does not need to:
- Provision any infrastructure manually
- Configure CI/CD pipelines
- Set up monitoring or dashboards
- Register the service in any catalog
- Contact the platform team

---

## Out of Scope

The following are not part of this golden path:

- **Additional templates** — React admin frontend, worker services (future)
- **Custom infrastructure patterns** — only standard patterns via templates
- **Database provisioning** — no database setup in the initial golden path
- **Multi-region deployment** — single-region only
- **Advanced deployment strategies** — blue/green, canary (future)
