# Environments

## Overview

Fikri IDP uses a two-environment strategy: Local for development and a single Production environment on AWS. The Production environment is **inactive by default** to minimise cost. All resources are activated on demand via Terraform configuration.

```
Local
  ↓
Production (inactive by default)
```

Services progress through environments via the golden path workflow. Local development uses Docker Compose with LocalStack at zero cost. Production runs on real AWS infrastructure in `ap-southeast-1` (Singapore) and is only active when explicitly enabled.

---

## Environment Definitions

### Local

**Purpose:** Developer machines for building and testing services before deployment.

**Characteristics:**
- Runs entirely via Docker Compose with no AWS account required
- Uses LocalStack to mock AWS services (SQS, S3, Secrets Manager, DynamoDB)
- Uses a local authentication module instead of Amazon Cognito
- No real AWS resources or costs
- Works fully offline
- Each developer has an isolated environment

**See:** [Local Development Environment](local-development.md)

### Production

**Purpose:** Live environment serving end users.

**Characteristics:**
- Runs on real AWS infrastructure in `ap-southeast-1` (Singapore)
- Uses actual AWS services with production-grade configuration
- **Inactive by default** — all ECS tasks have `desired_count = 0` and RDS is stopped when not in use
- Activated via Terraform variable `enabled = true`
- Domain: `idp.fikri.dev`
- Restricted access (platform administrator only)
- Real user data and traffic

---

## Inactive by Default

The Production environment is designed to minimise AWS cost when not actively in use. By default, no compute resources are running.

### Default State

| Resource | Default State | Cost When Inactive |
|----------|--------------|-------------------|
| **ECS Fargate tasks** | `desired_count = 0` | $0.00 |
| **RDS PostgreSQL** | Serverless v2, scaled to 0 ACU | $0.00 |
| **ALB** | Running (shared infrastructure) | ~$16.50/mo |
| **Cognito** | Active (managed service) | $0.00 (< 50K MAUs) |
| **ECR** | Active (container storage) | ~$0.10/mo |
| **Secrets Manager** | Active (secrets stored) | ~$1.20/mo |
| **CloudWatch** | Active (log groups exist) | ~$0.50/mo |
| **S3 + DynamoDB** | Active (Terraform state) | ~$0.35/mo |
| **Service Discovery** | Active (namespace exists) | ~$0.50/mo |

**Total inactive cost: ~$19-22/month (~$0.65-0.73/day)**

### Activating Resources

All compute resources are controlled by a single Terraform variable:

```hcl
variable "enabled" {
  description = "Whether compute resources are active. Set to true to start all services."
  type        = bool
  default     = false
}
```

When `enabled = false`:
- All ECS services have `desired_count = 0`
- RDS Serverless v2 scales to 0 ACU (paused)
- ALB remains running (required for routing when activated)

When `enabled = true`:
- ECS services scale to their configured `desired_count`
- RDS Serverless v2 scales up to handle traffic
- All services become accessible via the ALB

### Per-Service Activation

Services created through the golden path also default to inactive:

```hcl
variable "service_enabled" {
  description = "Whether this service is active."
  type        = bool
  default     = false
}
```

Each service's ECS `desired_count` is controlled by this variable. The service infrastructure (ECR, task definition, ALB rules, IAM roles) is always provisioned, but no tasks run until the service is activated.

**Total per active service: ~$15-20/month (~$0.50-0.67/day)**

---

## Cost-Optimised Configuration

All resources use the smallest practical configuration to minimise cost for a single-user platform.

### Compute

| Component | Configuration | Notes |
|-----------|--------------|-------|
| **IDP Portal** | 0.25 vCPU, 0.5 GB memory | Minimum Fargate size |
| **IDP API** | 0.25 vCPU, 0.5 GB memory | Minimum Fargate size |
| **IDP Worker** | 0.25 vCPU, 0.5 GB memory | Minimum Fargate size |
| **Golden-path services** | 0.25 vCPU, 0.5 GB memory | Minimum Fargate size |
| **Task count** | 1 (when active) | No redundancy needed for single user |

### Database

| Component | Configuration | Notes |
|-----------|--------------|-------|
| **RDS Engine** | PostgreSQL Serverless v2 | Scales to 0 ACU when inactive |
| **Min ACU** | 0 | Fully paused when `enabled = false` |
| **Max ACU** | 2 | Sufficient for single-user workload |
| **Storage** | 20 GB GP3 | Minimum practical size |
| **Multi-AZ** | Disabled | Single-user, cost optimisation |

### Networking

| Component | Configuration | Notes |
|-----------|--------------|-------|
| **ALB** | Single shared ALB | Path-based routing for all services |
| **VPC** | Single VPC | 2 private subnets, 2 public subnets |
| **NAT Gateway** | Single NAT Gateway | Shared across all services |
| **Service Discovery** | Cloud Map namespace | DNS-based service-to-service communication |

### Other Services

| Component | Configuration | Notes |
|-----------|--------------|-------|
| **Cognito** | Single user pool | Free tier (< 50K MAUs) |
| **ECR** | Scan-on-push enabled | Minimal storage |
| **Secrets Manager** | 3-4 secrets | Cognito secret, DB credentials, GitHub token |
| **CloudWatch** | 14-day retention | Reduced from 30 days for cost |
| **S3** | Terraform state bucket | Versioning enabled |
| **DynamoDB** | State locking table | On-demand pricing |

---

## What Changes Between Environments

| Aspect | Local | Production |
|--------|-------|------------|
| **AWS Account** | N/A (LocalStack) | Single account |
| **AWS Region** | N/A | `ap-southeast-1` |
| **Compute** | Docker containers | ECS Fargate (inactive by default) |
| **Database** | PostgreSQL container | RDS Serverless v2 (scales to 0) |
| **Authentication** | Local JWT module | Amazon Cognito |
| **Domain** | `localhost` | `idp.fikri.dev` |
| **Instance Sizes** | N/A (local) | Minimum Fargate (0.25 vCPU, 0.5 GB) |
| **Scaling** | Single instance | 1 task (when active) |
| **Secrets** | `.env` file | AWS Secrets Manager |
| **State Backend** | LocalStack S3 | Real S3 |
| **Monitoring** | Docker logs | CloudWatch |
| **Data** | Mock/test data | Real user data |
| **Access** | Developers | Platform admin |

---

## Resource Naming Convention

All resources follow the pattern: `{service}-{component}`

Examples:
- `idp-vpc`
- `idp-cluster`
- `idp-alb`
- `idp-rds`
- `idp-user-pool`

Per-service resources (created by golden path):
- `{service-name}-ecr`
- `{service-name}-task-definition`
- `{service-name}-service`
- `{service-name}-log-group`

### Tagging Strategy

All AWS resources are tagged with:

| Tag | Purpose | Example |
|-----|---------|---------|
| `Service` | Service name | `api`, `portal`, `worker` |
| `ManagedBy` | Management tool | `terraform` |
| `Project` | Project identifier | `fikri-idp` |

---

## Configuration Strategy

### Approach: Directory-Based Isolation

A single Terraform configuration manages the Production environment. Environment-specific values are controlled through Terraform variables.

**Structure:**

```
infrastructure/
├── modules/                    # Reusable Terraform modules
│   ├── vpc/
│   ├── ecs/
│   ├── alb/
│   ├── rds/
│   ├── cognito/
│   └── service-discovery/
└── environments/
    └── default/
        ├── main.tf            # Calls modules with production values
        ├── variables.tf       # Configuration variables (including enabled)
        ├── outputs.tf
        ├── terraform.tfvars   # Concrete values
        └── backend.tf         # S3 backend configuration
```

### Configuration Layers

Configuration flows through three layers, with later layers overriding earlier ones:

1. **Module Defaults** — Sensible baseline values defined in module `variables.tf`
2. **Variable Files** — Concrete values in `environments/default/terraform.tfvars`
3. **Secrets Manager** — Sensitive values injected at runtime (never in Terraform state)

**Example:**

```hcl
# modules/ecs/variables.tf (module default)
variable "instance_cpu" {
  default = 256
}

variable "enabled" {
  default = false
}

# environments/default/terraform.tfvars (concrete value)
instance_cpu = 256
enabled      = false
```

---

## Secrets Strategy

### Local Environment

**Storage:** `.env` file (git-ignored)

**Characteristics:**
- Plain text secrets for development convenience
- LocalStack Secrets Manager seeded with placeholder values
- No real sensitive data
- Each developer manages their own `.env` file

**Example:**

```env
# .env
POSTGRES_PASSWORD=fikri_idp
AUTH_LOCAL_SECRET=fikri-idp-dev-jwt-secret-do-not-use-in-production
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### Production Environment

**Storage:** AWS Secrets Manager in `ap-southeast-1`

**Characteristics:**
- All sensitive values stored in Secrets Manager
- Secrets referenced by ARN in Terraform, never stored in state
- Injected into ECS tasks via environment variables from Secrets Manager
- Access controlled via IAM policies
- Encrypted at rest using AWS-managed keys

**Secrets Stored:**

| Secret | Purpose |
|--------|---------|
| Cognito client secret | API authentication with Cognito |
| Database credentials | RDS connection |
| GitHub token | Repository creation and code commits |

**Access Pattern:**

```
Terraform creates Secrets Manager entries
         ↓
ECS task definition references secret ARNs
         ↓
ECS injects secrets as environment variables at runtime
         ↓
Application reads environment variables
```

**Example:**

```hcl
# Terraform creates the secret
resource "aws_secretsmanager_secret" "cognito_client_secret" {
  name = "fikri-idp/cognito-client-secret"
}

# ECS task definition references it
resource "aws_ecs_task_definition" "api" {
  container_definitions = jsonencode([
    {
      name  = "api"
      image = "..."
      secrets = [
        {
          name      = "COGNITO_CLIENT_SECRET"
          valueFrom = aws_secretsmanager_secret.cognito_client_secret.arn
        }
      ]
    }
  ])
}
```

**Secret Rotation:**

- **Initial approach:** Manual rotation by platform administrator
- **Process:**
  1. Generate new secret value
  2. Update Secrets Manager entry
  3. Restart ECS tasks to pick up new value
  4. Verify service health
- **Future:** Automated rotation via Lambda functions for supported secrets

**Rules:**
- Never store secrets in Terraform state
- Never commit secrets to version control
- Never log secrets to CloudWatch or other logging systems
- Always reference secrets by ARN, never hardcode values
- Use IAM policies to restrict secret access

---

## Terraform State Strategy

### Backend Configuration

**Storage:** Amazon S3 bucket in `ap-southeast-1`

**Locking:** Amazon DynamoDB table for state locking

**Bucket Details:**
- **Name:** `fikri-idp-terraform-state`
- **Region:** `ap-southeast-1`
- **Versioning:** Enabled (allows state recovery)
- **Encryption:** Server-side encryption with S3-managed keys (SSE-S3)
- **Access:** Restricted via IAM policies

**Locking Table Details:**
- **Name:** `fikri-idp-terraform-locks`
- **Region:** `ap-southeast-1`
- **Purpose:** Prevents concurrent Terraform operations

### State Key Strategy

A single state file manages the Production environment:

```
s3://fikri-idp-terraform-state/
└── default/
    └── terraform.tfstate
```

**Backend Configuration:**

```hcl
# environments/default/backend.tf
terraform {
  backend "s3" {
    bucket         = "fikri-idp-terraform-state"
    key            = "default/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "fikri-idp-terraform-locks"
    encrypt        = true
  }
}
```

### State Management Rules

**Do:**
- Always use `terraform plan` before `terraform apply`
- Use `terraform import` for existing resources
- Review state changes carefully before applying
- Keep state files encrypted at rest
- Restrict S3 bucket access via IAM policies
- Enable versioning for state recovery

**Do Not:**
- Manually edit state files
- Delete state files
- Commit state files to version control
- Store sensitive data in state (use Secrets Manager)

### Bootstrap Process

Before using Terraform, the S3 bucket and DynamoDB table must be created. This is a one-time manual process:

1. Create S3 bucket `fikri-idp-terraform-state` in `ap-southeast-1`
2. Enable versioning on the bucket
3. Enable server-side encryption
4. Create DynamoDB table `fikri-idp-terraform-locks` with partition key `LockID` (String)
5. Apply IAM policies to restrict access

**Note:** The local development environment uses LocalStack to mock these resources. See [Local Development Environment](local-development.md) for details.

---

## Region Configuration

**Default Region:** `ap-southeast-1` (Singapore)

**Rationale:**
- Low latency for target users
- Comprehensive AWS service availability
- Cost-effective region
- Compliance with data residency requirements

**Scope:**
- Single-region deployment only
- Multi-region deployment is explicitly out of scope (see [Vision](../product/vision.md))

---

## Cost Summary

| State | Monthly | Daily |
|-------|---------|-------|
| **Inactive** (everything off) | ~$19-22 | ~$0.65-0.73 |
| **Active** (IDP platform running) | ~$45-55 | ~$1.50-1.83 |
| **Per active golden-path service** | +$15-20 | +$0.50-0.67 |

### Cost Breakdown (Inactive)

| Service | Monthly Cost |
|---------|-------------|
| ALB (shared) | ~$16.50 |
| Secrets Manager (3 secrets) | ~$1.20 |
| ECR (container storage) | ~$0.10 |
| CloudWatch (log groups) | ~$0.50 |
| S3 (Terraform state) | ~$0.25 |
| DynamoDB (state locking) | ~$0.10 |
| Service Discovery (namespace) | ~$0.50 |
| **Total** | **~$19.15** |

### Cost Breakdown (Active — IDP Platform)

| Service | Monthly Cost |
|---------|-------------|
| Inactive base | ~$19.15 |
| ECS Fargate (Portal + API) | ~$17.00 |
| RDS Serverless v2 (0-2 ACU) | ~$12.00 |
| NAT Gateway | ~$32.00 |
| **Total** | **~$80.15** |

**Note:** NAT Gateway is the largest single cost driver at ~$32/month. If services do not need outbound internet access, this can be removed to save ~$32/month.

---

## Alignment with Existing Documentation

| Document | Alignment |
|----------|-----------|
| [Vision](../product/vision.md) | Two environments (local, production) are part of MVP scope |
| [Personas](../product/personas.md) | Developers deploy through environments; Platform Admins manage infrastructure |
| [Golden Path](../platform/golden-path.md) | Golden path deploys directly to production |
| [Service Lifecycle](../platform/service-lifecycle.md) | Services progress through environments as part of lifecycle states |
| [Architecture Overview](overview.md) | Environment strategy supports component architecture and boundaries |
| [Technology Stack](technology-stack.md) | Terraform, AWS, and ECS Fargate choices support environment deployment |
| [Local Development](local-development.md) | Local environment details and Docker Compose setup |

---

## Next Steps

1. **Create Terraform modules** — Implement reusable modules for VPC, ECS, ALB, RDS, Cognito, and service discovery
2. **Create environment configuration** — Set up `environments/default/` with backend configuration and `enabled` variable
3. **Bootstrap state backend** — Create S3 bucket and DynamoDB table in `ap-southeast-1`
4. **Implement CI/CD** — GitHub Actions workflows for `terraform plan` and `terraform apply`
5. **Implement activation workflow** — Document process for enabling/disabling resources via Terraform variable
