# Service Lifecycle

## Overview

This document defines how a service exists and changes throughout its lifecycle in Fikri IDP, from initial creation request through archival.

**Scope:** All lifecycle states, transitions, failure handling, and decommissioning processes.

**Target Personas:** Developer, Service Owner, Platform Administrator

---

## Lifecycle States

| State | Description |
|-------|-------------|
| `REQUESTED` | Developer submitted service creation request; metadata validated and accepted |
| `CREATING` | Repository, application scaffold, Docker configuration, CI/CD pipelines, and Terraform configuration being generated |
| `PROVISIONING` | AWS infrastructure being provisioned via Terraform (ECR, ECS, ALB, service discovery, IAM roles) |
| `DEPLOYING` | Docker image being built, pushed to ECR, and deployed to ECS Fargate |
| `ACTIVE` | Service is fully deployed, health checks passing, catalog registered, monitoring configured |
| `DEPRECATED` | Decommissioning initiated; service is read-only, no new deployments accepted |
| `ARCHIVED` | Fully decommissioned; all infrastructure resources torn down; catalog entry preserved for historical record (terminal state) |
| `FAILED` | Service creation, provisioning, or deployment failed; requires retry or Platform Administrator intervention |

---

## State Transition Diagram

```
REQUESTED → CREATING → PROVISIONING → DEPLOYING → ACTIVE → DEPRECATED → ARCHIVED
                ↓             ↓              ↓                         ↑
                └─────── FAILED ─────────────┘                         │
                      ↓                                               │
                   CREATING (retry)                          ACTIVE (reactivate)
```

---

## Transition Conditions

| From | To | Trigger | Condition | Actor |
|------|----|---------|-----------|-------|
| REQUESTED | CREATING | Service creation initiated | Metadata validated, service name unique | Developer |
| CREATING | PROVISIONING | All artifacts generated | Repository, application, Docker, CI/CD, and Terraform committed successfully | System |
| CREATING | FAILED | Artifact generation failed | After 3 automatic retries exhausted | System |
| PROVISIONING | DEPLOYING | Infrastructure provisioned | All AWS resources created successfully | System |
| PROVISIONING | FAILED | Terraform apply failed | After 3 automatic retries exhausted | System |
| DEPLOYING | ACTIVE | Deployment succeeded | ECS tasks running, health check endpoint returning HTTP 200 | System |
| DEPLOYING | FAILED | Deployment failed | After 3 automatic retries and ECS rollback to previous task definition | System |
| FAILED | CREATING | Retry initiated | Developer triggers retry; system re-runs from the failed phase | Developer |
| ACTIVE | DEPRECATED | Decommissioning initiated | Decision to phase out service | Service Owner / Platform Administrator |
| ACTIVE | ACTIVE | Redeployment | New deployment triggered by developer | Developer |
| DEPRECATED | ACTIVE | Reactivation | Decision to keep service active instead of decommissioning | Service Owner / Platform Administrator |
| DEPRECATED | ARCHIVED | Decommissioning complete | All infrastructure resources torn down, traffic drained, catalog entry updated | Service Owner / Platform Administrator |

---

## Failure State

Services can transition to `FAILED` from three states: `CREATING`, `PROVISIONING`, and `DEPLOYING`.

### Failure Behavior

When a service enters the `FAILED` state:

- Partial resources are preserved (Terraform state, GitHub repository)
- Developer is notified with failure details and error logs
- Service remains in `FAILED` state until retry is initiated

### Recovery Process

1. **Developer initiates retry**: Transitions `FAILED` → `CREATING`
2. **System re-runs from failed phase**: Only the failed phase and subsequent phases are re-executed
3. **Automatic retry limit**: 3 consecutive failures before escalation
4. **Escalation**: After 3 consecutive failures, Platform Administrator must investigate root cause

### Failure is Not Terminal

`FAILED` always transitions back to `CREATING` on retry. The service can be retried multiple times until it succeeds or Platform Administrator intervenes.

---

## Decommissioning Process

### Step 1: Initiate Decommissioning

- **Actor**: Service Owner or Platform Administrator
- **Action**: Transition service from `ACTIVE` to `DEPRECATED`
- **Effect**: Service becomes read-only; no new deployments accepted

### Step 2: Notify Stakeholders

- Notify service owner team
- Notify teams owning dependent services (if dependency mapping exists)
- Notify all viewers with access to the service

### Step 3: Block New Deployments

- Disable deployment triggers in CI/CD pipelines
- Prevent manual deployment requests via IDP API

### Step 4: Drain Traffic

- Remove ALB routing rules for the service
- Update service discovery entries to mark service as unavailable
- Update service catalog entry to reflect `DEPRECATED` status

### Step 5: Notify Dependent Service Owners

- If service dependency mapping is configured, notify owners of dependent services
- Provide guidance on migration to alternative services

### Step 6: Tear Down Infrastructure

- Delete ECS service and task definitions
- Remove ALB listener rules
- Delete ECR repository (after confirming no active consumers)
- Remove service discovery entries
- Delete IAM roles and policies

### Step 7: Preserve Historical Record

- Update service catalog entry with `ARCHIVED` status
- Preserve `createdAt`, `lastDeployedAt`, and `owner` fields for historical reference
- Set `archivedAt` timestamp

### Step 8: Transition to ARCHIVED

- **Actor**: Service Owner or Platform Administrator
- **Action**: Transition service from `DEPRECATED` to `ARCHIVED`
- **Effect**: Service is fully decommissioned; only historical metadata remains

### Step 9: Archive GitHub Repository

- Mark GitHub repository as archived (read-only)
- Repository is preserved, not deleted

---

## Service Status Model

The service status model defines the data structure for tracking service lifecycle state.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique service identifier (e.g., `online-exam-api`) |
| `status` | enum | Current lifecycle state: `REQUESTED`, `CREATING`, `PROVISIONING`, `DEPLOYING`, `ACTIVE`, `DEPRECATED`, `ARCHIVED`, `FAILED` |
| `createdAt` | datetime | Timestamp when service entered `ACTIVE` state |
| `lastDeployedAt` | datetime | Timestamp of last successful deployment |
| `owner` | string | Service Owner name or team |
| `repositoryUrl` | string | GitHub repository URL |
| `serviceUrl` | string | Service endpoint URL |
| `templateType` | enum | Template used: `nestjs-api`, `react-admin` |
| `deprecatedAt` | datetime? | Timestamp when decommissioning was initiated (null if not deprecated) |
| `archivedAt` | datetime? | Timestamp when service was archived (null if not archived) |
| `failureReason` | string? | Last failure message (null if not in `FAILED` state) |
| `retryCount` | number | Consecutive failure count; resets to 0 on successful deployment |

---

## Developer-Facing Display

The IDP exposes the service lifecycle to developers through the service catalog and dashboard.

### Example: Active Service

```
online-exam-api

Status:          ACTIVE
Created:         2026-09-25
Last Deployment: 2026-09-27
Owner:           Exam Team
Repository:      https://github.com/fikri/online-exam-api
Service URL:     https://online-exam-api.fikri.dev
```

### Example: Failed Service

```
payment-service

Status:          FAILED
Created:         2026-09-28
Last Deployment: —
Owner:           Payments Team
Repository:      https://github.com/fikri/payment-service
Failure Reason:  ECS deployment timeout after 10 minutes
Retry Count:     2
```

### Example: Archived Service

```
legacy-user-api

Status:          ARCHIVED
Created:         2025-03-15
Last Deployment: 2026-06-10
Owner:           Platform Team
Repository:      https://github.com/fikri/legacy-user-api (archived)
Deprecated:      2026-07-01
Archived:        2026-08-15
```

---

## Alignment with Existing Documentation

- **vision.md**: Service catalog metadata includes `Status` field — this document defines the valid values
- **golden-path.md**: Steps 3-16 map directly to the lifecycle: `REQUESTED` → `CREATING` → `PROVISIONING` → `DEPLOYING` → `ACTIVE`
- **personas.md**: Actors in state transitions align with defined permissions (Developer, Service Owner, Platform Administrator)
