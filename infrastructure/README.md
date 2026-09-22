# Infrastructure

This directory contains the Terraform configuration for the Fikri IDP platform infrastructure.

Infrastructure code is **not** part of the pnpm workspace. It is managed independently using Terraform.

## Structure

| Directory | Purpose |
|-----------|---------|
| `modules/` | Reusable Terraform modules (VPC, ECS, ALB, service discovery, ECR) |
| `environments/` | Terraform configuration |

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
| `default/` | Production environment configuration (inactive by default) |

## Usage

```bash
cd infrastructure/environments/default
terraform init
terraform plan
terraform apply
```

To activate compute resources, set `enabled = true` in `terraform.tfvars` before running `terraform apply`.
