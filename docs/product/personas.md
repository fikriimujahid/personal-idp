# Fikri IDP Personas

## Overview

This document defines the types of users who interact with Fikri IDP and their responsibilities, permissions, and relationships to services.

Users can hold multiple roles simultaneously. For example, a developer who creates a service becomes its Service Owner, and a Platform Administrator can also act as a Developer.

---

## Personas

### Platform Administrator

**Description**

Platform engineers responsible for maintaining the IDP infrastructure, templates, and overall platform health.

**Responsibilities**

- Platform configuration and settings
- Template creation and maintenance (NestJS API, React admin frontend)
- Infrastructure management (Terraform modules, ECS Fargate, VPC, ALB)
- CI/CD pipeline configuration (GitHub Actions workflows)
- Permission management and user access control
- Platform health monitoring and incident response

**Permissions**

- Full access to platform configuration
- Create, read, update, delete templates
- Manage infrastructure and Terraform modules
- Configure CI/CD pipelines
- Manage user roles and permissions
- Access all platform health metrics and logs

---

### Developer

**Description**

Backend and frontend developers who use the platform to create and deploy services.

**Responsibilities**

- Creating new services from templates
- Deploying applications through environments (local → production)
- Viewing service logs and health metrics
- Following deployment runbooks and troubleshooting guides
- Adhering to platform conventions and standards

**Permissions**

- Create new services from approved templates
- Trigger deployments to production
- View logs, health metrics, and monitoring dashboards for all services
- Access documentation and deployment runbooks
- View service catalog entries

---

### Service Owner

**Description**

Individual accountable for a service's success, reliability, and operational health.

**Responsibilities**

- Maintaining service metadata in the service catalog
- Defining and documenting service ownership
- Setting and monitoring SLI/SLO (request latency, error rate, availability)
- Monitoring service health and responding to incidents
- Reviewing deployment history and ensuring deployment quality

**Permissions**

- Read and write service catalog entries for owned services
- Define and update SLI/SLO definitions
- View deployment history and health metrics for owned services
- Access monitoring dashboards and Grafana configurations
- View service documentation and runbooks

---

### Viewer

**Description**

Read-only users who need visibility into services, deployments, and platform health without the ability to make changes.

**Responsibilities**

- No active responsibilities; observes and monitors

**Permissions**

- Read-only access to all services in the service catalog
- View deployment history and status
- Access monitoring dashboards and health metrics
- Read documentation and runbooks
- No write or create permissions

---

## Multi-Role Support

Users can hold multiple roles simultaneously. Common combinations include:

- **Developer + Service Owner**: A developer who creates a service and becomes accountable for its success
- **Platform Administrator + Developer**: A platform engineer who also creates and deploys services
- **Service Owner + Viewer**: An owner who also monitors services they don't directly develop

Role permissions are cumulative. A user with both Developer and Service Owner roles has permissions from both personas.

---

## User-Service Relationships

- Services have one or more Service Owners recorded in the service catalog
- Developers can create and deploy any service
- Service Owners are accountable for the services they own
- Viewers have read access to all services regardless of ownership
- No team-based access control; relationships are direct between users and services

---

## Permission Summary Matrix

| Resource | Platform Admin | Developer | Service Owner | Viewer |
|----------|----------------|-----------|---------------|--------|
| Platform Configuration | R/W | — | — | — |
| Templates | R/W | R | R | R |
| Infrastructure (Terraform) | R/W | — | — | — |
| CI/CD Pipelines | R/W | R | R | R |
| Service Catalog | R/W | R/W (owned) | R/W (owned) | R |
| Service Creation | ✓ | ✓ | — | — |
| Deployments | R/W | R/W | R | R |
| Logs | R | R | R (owned) | R |
| Monitoring & Health | R | R | R (owned) | R |
| SLI/SLO Definitions | R/W | — | R/W (owned) | R |
| Documentation | R/W | R | R | R |
| User Permissions | R/W | — | — | — |

**Legend**

- **R** = Read access
- **W** = Write access
- **R/W** = Read and write access
- **R (owned)** = Read access to services the user owns
- **R/W (owned)** = Read and write access to services the user owns
- **✓** = Can perform action
- **—** = No access
