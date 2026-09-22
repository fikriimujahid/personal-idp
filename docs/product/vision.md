# Fikri IDP Vision

## Purpose

Fikri IDP (Internal Developer Platform) reduces the infrastructure and deployment knowledge developers need to manually manage when creating a new service.

The platform abstracts away infrastructure complexity, standardizes deployment practices, and enables developers to focus on business logic rather than operational concerns.

---

## Target Users

| User | Role | Interaction |
|------|------|-------------|
| Backend developers | Primary | Create NestJS API services from templates |
| Frontend developers | Primary | Create React admin frontends from templates |
| Platform engineers | Secondary | Maintain templates, Terraform modules, CI/CD pipelines |
| Engineering managers | Tertiary | Service ownership tracking, health visibility |

---

## Primary Use Cases

1. **Authentication** — Developer authenticates with the IDP via Amazon Cognito through the API
2. **User management** — Platform administrators manage user accounts and assign roles
3. **Service scaffolding** — Developer creates a new service from a standardized template (NestJS API or React admin frontend)
4. **Repository creation** — Repository is automatically created with correct structure, conventions, and configuration
5. **Infrastructure provisioning** — ECS Fargate infrastructure is provisioned via reusable Terraform modules
6. **CI/CD configuration** — GitHub Actions pipeline is automatically configured for lint, test, build, and deploy
7. **Deployment** — Service is deployed through local → production environments
8. **Service health** — CloudWatch logs, ECS task health, ALB health checks, and basic CPU/memory metrics are visible
9. **Service ownership** — Ownership is recorded in a PostgreSQL-backed service catalog

**See [roadmap.md](roadmap.md) for the complete V1 feature list and completion criteria.**

---

## MVP Scope (V1)

V1 delivers a working Internal Developer Platform that enables developers to create, deploy, and monitor services on AWS ECS Fargate with zero infrastructure knowledge.

**See [roadmap.md](roadmap.md) for the detailed feature list, acceptance criteria, and completion criteria.**

### Authentication & User Management
- Login flow via Amazon Cognito (confidential client through API)
- JWT session management (access token, refresh token)
- User account creation and management
- Role-based access control: Platform Administrator, Developer, Service Owner, Viewer
- Frontend never directly accesses Cognito

### Service Catalog
- PostgreSQL-backed service registry
- Metadata per service: owner, repository URL, service URL, status, template type
- Service search and filtering
- Ownership tracking

### Service Creation
- Golden path workflow (metadata → repo → scaffold → provision → deploy → healthy)
- Lifecycle state machine (REQUESTED → CREATING → PROVISIONING → DEPLOYING → ACTIVE → FAILED)
- Step-by-step progress indication
- Failure handling with retry capability

### Service Templates
- NestJS API service template
- React admin frontend template
- Template registry stored in PostgreSQL

### GitHub Integration
- Automated repository creation via GitHub API
- Automated commits of generated artifacts (application scaffold, Dockerfile, CI/CD, Terraform)
- GitHub credentials stored in AWS Secrets Manager

### Infrastructure
- ECS Fargate on AWS
- Reusable Terraform modules for:
  - ECR repositories (per service)
  - ECS task definitions and services (per service)
  - Application Load Balancer listener rules (per service)
  - Service discovery entries (per service)
  - IAM task and execution roles (per service)
  - CloudWatch log groups (per service)
- Terraform state management (S3 + DynamoDB locking)

### CI/CD
- GitHub Actions workflows (per service)
- Automated pipelines for:
  - Linting and type checking
  - Unit and integration tests
  - Docker image build
  - Push to Amazon ECR
  - Deploy to ECS Fargate
- Security gates integrated into pipeline

### Deployment Status
- Lifecycle state display (REQUESTED, CREATING, PROVISIONING, DEPLOYING, ACTIVE, FAILED)
- Failure details and error messages
- Retry capability for failed services
- Deployment history per service

### Basic Operational Visibility
- CloudWatch Logs (per-service log groups, structured JSON, retention ≥ 30 days)
- ECS task/service health status
- ALB health check status
- Basic CPU and memory utilisation metrics
- Deployment status (in progress, succeeded, failed)
- Basic uptime / availability status

### Security Baseline
- Mandatory security controls enforced as hard gates in CI/CD
- Security controls baked into templates (Dockerfile, CI/CD workflow, Terraform)
- Container scanning, dependency scanning, SAST
- Secrets management via AWS Secrets Manager
- Non-root containers, HTTPS, IAM roles, security headers
- CloudWatch logging and audit logging
- See `docs/platform/security-baseline.md` for full specification

### Environments
- Local development
- Production (inactive by default)

### Documentation
- Onboarding guide for developers
- Template usage documentation
- Deployment runbook
- Troubleshooting guide

---

## Explicitly Out of Scope (V1 Exclusions)

The following capabilities are **not** part of V1 and will not be addressed in the initial release. See [roadmap.md](roadmap.md) for the complete exclusion list and rationale.

- **Kubernetes / EKS** — V1 uses ECS Fargate exclusively
- **Multi-cloud support** — AWS only
- **Complex FinOps / cost management** — No cost tracking or optimisation features
- **AI infrastructure provisioning** — No GPU workloads or AI/ML service support
- **Multi-region deployment** — Single-region deployment only
- **Advanced incident management** — No PagerDuty/Opsgenie-style incident management
- **Full Backstage replacement** — Custom Next.js portal in V1
- **Prometheus / Grafana** — V1 uses CloudWatch for observability
- **SLI / SLO tracking** — V1 has basic health metrics only
- **IDP Worker (async SQS)** — V1 API handles operations synchronously
- **Advanced deployment strategies** — No blue/green, canary deployments beyond basic ECS rolling updates
- **Database provisioning for services** — No automated database setup for managed services
- **Feature flag management** — No feature flag system integration
- **Runtime debugging and profiling** — No integrated debugging tools
- **Advanced compliance frameworks** — No SOC 2, ISO 27001, or HIPAA compliance automation (basic security baseline is in scope)
- **Database migration tooling** — No database schema migration automation
- **Local development environment tooling** — No Docker Compose or similar local orchestration
- **Custom infrastructure patterns** — Only standard patterns via templates

---

## Definition of Success

A successful Fikri IDP deployment meets the following criteria:

| Metric | Target |
|--------|--------|
| Time to first deployment (new service) | < 30 minutes |
| Infrastructure-related tickets for new services | 80% reduction |
| New services using standardized templates | 100% |
| Services with monitoring configured at launch | 100% |
| Services passing security baseline at launch | 100% |
| Services with documented ownership | 100% |
| Developer satisfaction (survey) | ≥ 4/5 |

### Qualitative Success Indicators

- Developers can create and deploy a new service without platform team intervention
- Infrastructure changes are reproducible and version-controlled
- All services follow consistent patterns and conventions
- All services meet the security baseline at launch
- Service health and ownership are visible to the entire organization
- Platform maintenance burden is predictable and manageable

---

## Future Considerations (V2+)

The following capabilities may be added in future iterations based on user feedback and organizational needs. See [roadmap.md](roadmap.md) for the full backlog.

- Prometheus / Grafana observability (centralised metrics, dashboards, alerting)
- SLI / SLO tracking (formal service-level indicators and objectives)
- IDP Worker (extract async processing from API to dedicated NestJS Worker via SQS)
- Advanced deployment strategies (canary, blue/green)
- Database provisioning for services (automated RDS / DynamoDB)
- Additional service templates (worker services, static sites, CLI tools)
- Self-service environment provisioning (developer-requested preview environments)
- Backstage evaluation (as portal replacement or integration)
- Feature flag management (LaunchDarkly, Unleash, or similar)
- Cost allocation and optimisation (per-service cost tracking, budget alerts)
- Multi-region deployment support
- Advanced compliance and policy-as-code (OPA)
- Enhanced service catalog with dependency mapping
- Advanced incident management (PagerDuty / Opsgenie integration, on-call rotation)
- Runtime debugging and profiling
- Local development tooling (Docker Compose or similar)
