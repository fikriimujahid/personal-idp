# Infrastructure

This directory contains the Terraform configuration for the Fikri IDP platform infrastructure.

Infrastructure code is **not** part of the pnpm workspace. It is managed independently using Terraform.

## Structure

| Directory | Purpose |
|-----------|---------|
| `modules/` | Reusable Terraform modules (VPC, ECS, ALB, service discovery, ECR) |
| `environments/` | Per-environment configuration (staging, production) |

## Modules

| Module | Description |
|--------|-------------|
| `vpc/` | VPC, subnets, internet gateway, NAT gateway |
| `ecs/` | ECS cluster, task definitions, services |
| `alb/` | Application Load Balancer, listeners, target groups |
| `service-discovery/` | AWS Cloud Map namespace and service entries |
| `ecr/` | Elastic Container Registry repositories |

## Environments

| Environment | Description |
|-------------|-------------|
| `staging/` | Staging environment configuration |
| `production/` | Production environment configuration |

## Usage

```bash
cd infrastructure/environments/staging
terraform init
terraform plan
terraform apply
```
