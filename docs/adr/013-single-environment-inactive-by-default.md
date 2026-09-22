# ADR-013: Single Production Environment (Inactive by Default)

## Status

Accepted

## Date

2026-09-23

## Context

Fikri IDP is a personal Internal Developer Platform used by a single developer. The original architecture defined three environments (Local, Staging, Production) following enterprise best practices. However, this multi-environment approach introduces unnecessary cost and complexity for a solo-user platform.

Key constraints driving this decision:
- Single user (the platform owner)
- Cost minimisation is a priority
- No need for pre-production validation when the developer is the only consumer
- AWS resources should be inactive by default to avoid charges when not in use

The previous three-environment strategy (Local → Staging → Production) required:
- Duplicate AWS infrastructure (separate VPCs, ECS clusters, ALBs, RDS instances, Cognito user pools)
- Per-environment Terraform state management
- Cross-environment promotion workflows
- ~$475/month in AWS costs even with minimal usage

## Decision

Fikri IDP uses a **two-environment strategy**: Local (Docker Compose + LocalStack, $0 cost) and Production (single AWS environment, inactive by default).

### Environment Structure

| Environment | Purpose | Cost |
|-------------|---------|------|
| **Local** | Development and testing on developer machines | $0 (Docker Compose + LocalStack) |
| **Production** | Live environment for deployed services | ~$19-22/month inactive, ~$45-55/month active |

### Inactive by Default

All compute resources in the Production environment default to inactive:

- ECS Fargate services have `desired_count = 0`
- RDS Serverless v2 scales to 0 ACU (paused)
- ALB remains running as shared infrastructure (~$16.50/month base cost)

Resources are activated via a Terraform variable:

```hcl
variable "enabled" {
  description = "Whether compute resources are active."
  type        = bool
  default     = false
}
```

### Cost-Optimised Configuration

All resources use the smallest practical configuration:

- ECS Fargate: 0.25 vCPU, 0.5 GB memory (minimum size)
- RDS: Serverless v2, 0-2 ACU, single-AZ, 20 GB GP3
- Single shared ALB with path-based routing
- Single Cognito user pool (free tier)
- CloudWatch log retention: 14 days
- No NAT Gateway unless outbound internet access is required

### Golden Path Deployment

Services created through the golden path deploy directly to Production. There is no intermediate Staging environment. The local development environment serves as the testing and validation layer before deployment.

### Per-Service Activation

Each service created via the golden path also defaults to inactive (`desired_count = 0`). The service infrastructure (ECR, task definition, ALB rules, IAM roles) is provisioned, but no tasks run until the service is explicitly activated.

## Alternatives Considered

### Three environments (Local, Staging, Production)

- Full environment progression with pre-production validation
- Rejected: doubles AWS cost (~$475/month), adds operational complexity, unnecessary for single-user platform

### Two environments without inactive-by-default

- Local + Production with all resources always running
- Rejected: ~$80/month even when not in use; the platform is not used continuously

### Serverless-only (Lambda, DynamoDB)

- Eliminate ECS Fargate costs entirely with serverless compute
- Rejected: the platform requires containerised workloads (Next.js, NestJS) and ECS Fargate is the established compute choice (ADR-009)

### Shared account with environment prefixes

- Keep single AWS account but use resource prefixes for logical separation
- Rejected: this was the original approach but still maintained duplicate infrastructure per environment

## Consequences

### Positive

- AWS cost reduced from ~$475/month to ~$19-22/month when inactive
- Simplified Terraform state management (single state file)
- No cross-environment promotion workflow needed
- Golden path is simpler (single deployment target)
- Resources only incur cost when actively used
- Easier to understand and maintain

### Negative

- No pre-production validation environment on AWS
- All changes go directly to Production (mitigated by local development testing)
- RDS Serverless v2 has cold start latency when scaling from 0 ACU
- Cannot test infrastructure changes against a staging-like environment before Production

### Risk Mitigation

- Local development environment (Docker Compose + LocalStack) provides comprehensive testing before deployment
- Terraform plan/apply workflow provides infrastructure change validation
- CI/CD pipeline includes security gates and automated testing
- Single-user scope means deployment risk is limited to the platform owner
