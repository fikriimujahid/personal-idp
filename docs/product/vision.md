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

1. **Service scaffolding** — Developer creates a new service from a standardized template (NestJS API or React admin frontend)
2. **Repository creation** — Repository is automatically created with correct structure, conventions, and configuration
3. **Infrastructure provisioning** — ECS Fargate infrastructure is provisioned via reusable Terraform modules
4. **CI/CD configuration** — GitHub Actions pipeline is automatically configured for lint, test, build, and deploy
5. **Deployment** — Service is deployed through local → staging → production environments
6. **Monitoring** — Prometheus metrics endpoint and Grafana dashboards are attached automatically
7. **SLI/SLO** — Service-level indicators and objectives are generated (request latency, error rate, availability)
8. **Service ownership** — Ownership is recorded in a markdown-based service catalog

---

## MVP Scope

### Templates
- NestJS API service template
- React admin frontend template

### Repository Management
- Automated repository creation via GitHub API
- Standardized project structure and conventions

### Infrastructure
- ECS Fargate on AWS
- Reusable Terraform modules for:
  - VPC and networking
  - Application Load Balancer
  - ECS cluster and task definitions
  - Service discovery
  - ECR repositories

### CI/CD
- GitHub Actions workflows
- Automated pipelines for:
  - Linting and type checking
  - Unit and integration tests
  - Docker image build
  - Push to Amazon ECR
  - Deploy to ECS Fargate

### Environments
- Local development
- Staging
- Production

### Observability
- Prometheus metrics endpoint per service
- Grafana dashboards automatically configured
- SLI/SLO metrics:
  - Request latency (p50, p95, p99)
  - Error rate (5xx responses)
  - Availability (uptime percentage)

### Service Catalog
- Markdown-based registry
- Metadata per service:
  - Owner
  - Repository URL
  - Service URL
  - Status
  - SLI/SLO definitions

### Documentation
- Onboarding guide for developers
- Template usage documentation
- Deployment runbook
- Troubleshooting guide

---

## Explicitly Out of Scope

The following capabilities are **not** part of the MVP and will not be addressed in the initial release:

- **Multi-cloud support** — AWS only
- **Non-ECS compute** — Lambda, EC2, EKS not supported
- **Custom infrastructure patterns** — Only standard patterns via templates
- **Runtime debugging and profiling** — No integrated debugging tools
- **Cost management and optimization** — No cost tracking or optimization features
- **Security scanning and compliance** — No automated security scanning or compliance checks
- **Database migration tooling** — No database schema migration automation
- **Feature flag management** — No feature flag system integration
- **Local development environment tooling** — No Docker Compose or similar local orchestration
- **Multi-region deployment** — Single-region deployment only
- **Advanced deployment strategies** — No blue/green, canary, or rolling deployments beyond basic ECS rolling updates

---

## Definition of Success

A successful Fikri IDP deployment meets the following criteria:

| Metric | Target |
|--------|--------|
| Time to first deployment (new service) | < 30 minutes |
| Infrastructure-related tickets for new services | 80% reduction |
| New services using standardized templates | 100% |
| Services with monitoring configured at launch | 100% |
| Services with documented ownership | 100% |
| Developer satisfaction (survey) | ≥ 4/5 |

### Qualitative Success Indicators

- Developers can create and deploy a new service without platform team intervention
- Infrastructure changes are reproducible and version-controlled
- All services follow consistent patterns and conventions
- Service health and ownership are visible to the entire organization
- Platform maintenance burden is predictable and manageable

---

## Future Considerations

The following capabilities may be added in future iterations based on user feedback and organizational needs:

- Additional service templates (worker services, static sites)
- Self-service environment provisioning
- Advanced deployment strategies (canary, blue/green)
- Integrated security scanning
- Cost allocation and optimization
- Multi-region deployment support
- Enhanced service catalog with dependency mapping
