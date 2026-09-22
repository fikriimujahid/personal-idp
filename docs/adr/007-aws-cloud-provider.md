# ADR-007: AWS as Cloud Provider

## Status

Accepted

## Date

2026-09-22

## Context

Fikri IDP requires a cloud provider to host the platform infrastructure and the services it manages. The cloud provider must:
- Offer container orchestration (ECS Fargate)
- Provide a managed relational database (PostgreSQL)
- Support infrastructure as code (Terraform)
- Offer an identity provider (Cognito)
- Provide a container registry (ECR)
- Include a load balancer (ALB)
- Support message queues (SQS)
- Offer secrets management (Secrets Manager)
- Provide logging and monitoring (CloudWatch)

Multi-cloud support is explicitly out of scope for the MVP.

## Decision

Amazon Web Services (AWS) is the cloud provider for Fikri IDP.

## Alternatives Considered

### Google Cloud Platform (GCP)
- Strong container offerings (Cloud Run, GKE)
- Cloud SQL for PostgreSQL
- Google Cloud Build for CI/CD
- Rejected: AWS has broader service coverage for the specific requirements (Cognito, ECS Fargate, SQS) and stronger alignment with the existing architecture decisions

### Microsoft Azure
- Enterprise-grade cloud with strong Microsoft ecosystem integration
- Azure Container Instances, Azure Database for PostgreSQL
- Azure Active Directory for identity
- Rejected: AWS has a more mature container ecosystem and stronger Terraform support; Azure's identity offering (Entra ID) is more complex for this use case

## Consequences

### Positive
- Comprehensive service coverage for all platform requirements
- ECS Fargate provides serverless container execution without cluster management
- Amazon RDS for PostgreSQL provides managed database with automated backups
- Cognito provides managed identity with user pools and groups
- Mature Terraform provider with full AWS service coverage
- Extensive documentation, community resources, and talent pool
- Well-understood pricing model

### Negative
- AWS complexity can be high; many services with overlapping functionality
- Vendor lock-in to AWS-specific services (Cognito, SQS, Secrets Manager)
- Cost can escalate if resources are not properly managed
- Multi-cloud is not supported; migration to another provider would require significant effort
