# ADR-009: ECS Fargate for Compute

## Status

Accepted

## Date

2026-09-22

## Context

Fikri IDP must run containerised services: the IDP Portal, the IDP API, the future IDP Worker, and all services created through the golden path (NestJS APIs, React admin frontends). The compute platform must:
- Run Docker containers without managing underlying infrastructure
- Support auto-scaling based on demand
- Integrate with ALB for traffic routing
- Integrate with ECR for container image storage
- Support service discovery for inter-service communication
- Provide task-level IAM roles
- Be available on AWS

## Decision

Amazon ECS with AWS Fargate is the compute platform for Fikri IDP.

## Alternatives Considered

### Amazon EKS (Elastic Kubernetes Service)
- Full Kubernetes orchestration on AWS
- Industry-standard container orchestration
- Significant operational complexity (cluster management, node groups, networking)
- Overkill for the MVP scope; services are relatively simple container workloads
- Rejected: Fargate provides the same container execution without the operational burden of managing Kubernetes clusters. EKS can be evaluated later if Kubernetes-specific features are required

### AWS Lambda
- Serverless compute with automatic scaling
- No container management required
- Cold start latency; execution time limits (15 minutes)
- Not suitable for long-running HTTP services
- Rejected: the golden path produces containerised services that run continuously; Lambda's execution model does not align with this pattern

### Amazon EC2
- Full control over compute instances
- Requires manual instance management, patching, and scaling
- Higher operational burden than Fargate
- Rejected: Fargate abstracts away instance management while providing the same container execution capabilities; EC2 adds unnecessary operational complexity

## Consequences

### Positive
- Serverless container execution; no instance management, patching, or scaling of underlying infrastructure
- Native integration with ALB, ECR, Service Discovery, and IAM
- Task-level IAM roles provide fine-grained permissions per service
- Auto-scaling based on CPU, memory, or custom metrics
- Pay-per-use pricing; no cost for idle capacity
- Simplifies the golden path: generated services are Fargate task definitions
- Well-supported by Terraform AWS provider

### Negative
- Less control over underlying infrastructure compared to EC2
- Fargate pricing can be higher than equivalent EC2 instances at scale
- Container image size affects task start time
- VPC networking configuration is still required (subnets, security groups)
- Debugging running tasks requires CloudWatch Logs or ECS Exec
