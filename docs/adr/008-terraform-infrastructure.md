# ADR-008: Terraform for Infrastructure

## Status

Accepted

## Date

2026-09-22

## Context

All Fikri IDP infrastructure must be reproducible, declarative, and version-controlled. This includes:
- Platform-level infrastructure: VPC, ECS cluster, ALB, service discovery namespace
- Per-service infrastructure: ECR, ECS task definition, ECS service, ALB rules, IAM roles
- State must be stored remotely (S3) with locking (DynamoDB)

The infrastructure tool must:
- Support AWS as the primary cloud provider
- Enable reusable modules for standard patterns
- Be executable programmatically by the IDP API and future Worker
- Have a mature provider ecosystem
- Support declarative, version-controlled configuration

## Decision

Terraform is the infrastructure as code tool for Fikri IDP.

## Alternatives Considered

### AWS CDK (Cloud Development Kit)
- Programmatic infrastructure definition using TypeScript
- Strong AWS integration
- Tightly coupled to AWS; multi-cloud would require significant rewrite
- Rejected: Terraform is cloud-agnostic and has broader ecosystem support; CDK's AWS-specificity conflicts with the principle of avoiding unnecessary vendor lock-in at the tooling level

### Pulumi
- Programmatic infrastructure using general-purpose languages (TypeScript, Python, Go)
- Multi-cloud support
- Smaller community and fewer modules than Terraform
- Rejected: Terraform has a larger ecosystem, more mature AWS provider, and broader industry adoption; HCL is purpose-built for infrastructure and easier to review

### AWS CloudFormation
- Native AWS infrastructure as code
- No external tooling required
- AWS-only; verbose YAML/JSON templates
- No multi-cloud support
- Rejected: Terraform provides better modularity, reusability, and developer experience; CloudFormation templates are harder to maintain and review

## Consequences

### Positive
- Industry-standard infrastructure as code tool
- Mature AWS provider with comprehensive service coverage
- Reusable modules for VPC, ECS, ALB, and service discovery patterns
- Remote state storage in S3 with DynamoDB locking
- Executable programmatically by the IDP API and Worker
- Declarative HCL is easy to review and version-control
- Large community, extensive documentation, and third-party modules
- `terraform plan` provides safe preview of changes before apply

### Negative
- HCL is a domain-specific language; contributors must learn it
- Terraform state management requires careful handling (locking, drift detection)
- Terraform execution during service creation can be slow (mitigated by future Worker extraction)
- Provider updates may introduce breaking changes
