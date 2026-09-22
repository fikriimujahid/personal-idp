# Environments

## Overview

Fikri IDP uses a three-environment strategy to promote services from development to production. Each environment serves a distinct purpose in the service lifecycle.

```
Local
  ↓
Staging
  ↓
Production
```

Services progress through environments via the golden path workflow. Each environment provides increasing levels of fidelity to production conditions.

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

### Staging

**Purpose:** Pre-production testing environment for validating services before production deployment.

**Characteristics:**
- Runs on real AWS infrastructure in `ap-southeast-1` (Singapore)
- Uses actual AWS services (ECS Fargate, RDS, Cognito, etc.)
- Mirrors production architecture with reduced scale
- Used for integration testing, acceptance testing, and validation
- Accessible to developers and QA for testing
- Data is isolated from production

### Production

**Purpose:** Live environment serving end users.

**Characteristics:**
- Runs on real AWS infrastructure in `ap-southeast-1` (Singapore)
- Uses actual AWS services with production-grade configuration
- Full scale and redundancy
- Restricted access (platform administrators only)
- Real user data and traffic
- Highest availability and performance requirements

---

## What Changes Between Environments

| Aspect | Local | Staging | Production |
|--------|-------|---------|------------|
| **AWS Account** | N/A (LocalStack) | Shared account | Shared account |
| **AWS Region** | N/A | `ap-southeast-1` | `ap-southeast-1` |
| **Compute** | Docker containers | ECS Fargate | ECS Fargate |
| **Database** | PostgreSQL container | Amazon RDS | Amazon RDS |
| **Authentication** | Local JWT module | Amazon Cognito | Amazon Cognito |
| **Domain** | `localhost` | `staging.idp.fikri.dev` | `idp.fikri.dev` |
| **Instance Sizes** | N/A (local) | Small (e.g., `t3.small` equivalent) | Production-grade |
| **Scaling** | Single instance | Minimal (1-2 tasks) | Auto-scaled |
| **Secrets** | `.env` file | AWS Secrets Manager | AWS Secrets Manager |
| **State Backend** | LocalStack S3 | Real S3 (staging prefix) | Real S3 (production prefix) |
| **Monitoring** | Docker logs | CloudWatch | CloudWatch, Prometheus, Grafana |
| **Data** | Mock/test data | Test data | Real user data |
| **Access** | Developers | Developers, QA | Platform admins |

---

## Environment Isolation Strategy

### Initial Approach: Single AWS Account

The platform starts with a single AWS account containing all environments. Isolation is achieved through resource separation within the account.

**Isolation Mechanisms:**

| Resource | Staging | Production |
|----------|---------|------------|
| **VPC** | `staging-vpc` | `production-vpc` |
| **ECS Cluster** | `staging-cluster` | `production-cluster` |
| **RDS Instance** | `staging-db` | `production-db` |
| **Cognito User Pool** | `staging-user-pool` | `production-user-pool` |
| **ALB** | `staging-alb` | `production-alb` |
| **Service Discovery Namespace** | `staging.local` | `production.local` |

**Naming Convention:**

All resources follow the pattern: `{environment}-{service}-{component}`

Examples:
- `staging-api-cluster`
- `production-api-cluster`
- `staging-rds-instance`
- `production-rds-instance`

**Tagging Strategy:**

All AWS resources are tagged with:

| Tag | Purpose | Example |
|-----|---------|---------|
| `Environment` | Environment name | `staging`, `production` |
| `Service` | Service name | `api`, `portal`, `worker` |
| `ManagedBy` | Management tool | `terraform` |
| `Project` | Project identifier | `fikri-idp` |

**Benefits:**
- Lower cost (single account)
- Simpler IAM management
- Easier resource sharing if needed
- Reduced operational overhead

**Risks:**
- No hard isolation boundary between environments
- Accidental cross-environment access possible
- Blast radius includes all environments

### Future Evolution: Separate AWS Accounts

As the platform matures, environments may be separated into distinct AWS accounts for stronger isolation.

**Account Structure:**

| Account | Environments | Purpose |
|---------|--------------|---------|
| `fikri-idp-dev` | Local, Staging | Development and testing |
| `fikri-idp-prod` | Production | Live environment |

**Migration Path:**

The directory-based Terraform structure already supports this evolution:

```
infrastructure/
├── modules/
└── environments/
    ├── staging/       # Can point to dev account
    └── production/    # Can point to prod account
```

Each environment directory will have its own provider configuration:

```hcl
# environments/staging/provider.tf
provider "aws" {
  region  = "ap-southeast-1"
  profile = "fikri-idp-dev"
}

# environments/production/provider.tf
provider "aws" {
  region  = "ap-southeast-1"
  profile = "fikri-idp-prod"
}
```

**Benefits:**
- Hard isolation boundary between environments
- Separate billing and cost allocation
- Reduced blast radius
- Compliance and audit benefits
- Separate IAM permissions per account

**When to Migrate:**
- Regulatory or compliance requirements demand it
- Team size and complexity justify separate accounts
- Risk tolerance requires stronger isolation
- Cost allocation becomes critical

---

## Configuration Strategy

### Approach: Directory-Based Isolation

Each environment has its own directory containing environment-specific Terraform configuration. This provides clear separation and makes it explicit which configuration applies to which environment.

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
├── environments/
│   ├── staging/
│   │   ├── main.tf            # Calls modules with staging values
│   │   ├── variables.tf       # Environment-specific variables
│   │   ├── outputs.tf
│   │   ├── terraform.tfvars   # Staging-specific values
│   │   └── backend.tf         # S3 backend with staging key prefix
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       ├── terraform.tfvars   # Production-specific values
│       └── backend.tf         # S3 backend with production key prefix
```

**Why Not Workspaces?**

Terraform workspaces are not used because:
- Directory-based isolation is more explicit and easier to understand
- Each environment can have different backend configurations
- Clearer separation of concerns
- Easier to implement different provider configurations per environment
- Better alignment with future separate-accounts strategy

### Configuration Layers

Configuration flows through four layers, with later layers overriding earlier ones:

1. **Module Defaults** — Sensible baseline values defined in module `variables.tf`
2. **Environment Variables** — Environment-specific overrides in `environments/{env}/variables.tf`
3. **Variable Files** — Concrete values in `environments/{env}/terraform.tfvars`
4. **Secrets Manager** — Sensitive values injected at runtime (never in Terraform state)

**Example:**

```hcl
# modules/ecs/variables.tf (module default)
variable "instance_cpu" {
  default = 256
}

# environments/staging/variables.tf (environment override)
variable "instance_cpu" {
  description = "CPU units for ECS tasks"
}

# environments/staging/terraform.tfvars (concrete value)
instance_cpu = 256

# environments/production/terraform.tfvars (concrete value)
instance_cpu = 1024
```

### Environment-Specific Configuration

**Staging:**
- Smaller instance sizes
- Minimal scaling (1-2 tasks)
- Relaxed resource limits
- Test data and mock external services
- Shorter retention periods for logs

**Production:**
- Production-grade instance sizes
- Auto-scaling enabled
- Strict resource limits
- Real data and external services
- Longer retention periods for logs
- Multi-AZ deployment for critical services

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

### Staging and Production

**Storage:** AWS Secrets Manager in `ap-southeast-1`

**Characteristics:**
- All sensitive values stored in Secrets Manager
- Secrets referenced by ARN in Terraform, never stored in state
- Injected into ECS tasks via environment variables from Secrets Manager
- Access controlled via IAM policies
- Encrypted at rest using AWS-managed keys

**Secrets Stored:**

| Secret | Purpose | Environments |
|--------|---------|--------------|
| Cognito client secret | API authentication with Cognito | Staging, Production |
| Database credentials | RDS connection | Staging, Production |
| GitHub token | Repository creation and code commits | Staging, Production |
| JWT signing secret | Token signing (if not using Cognito) | Staging, Production |

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
  name = "fikri-idp/${var.environment}/cognito-client-secret"
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

- **Initial approach:** Manual rotation by platform administrators
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

Each environment has its own state file with a unique key prefix:

```
s3://fikri-idp-terraform-state/
├── staging/
│   └── terraform.tfstate
└── production/
    └── terraform.tfstate
```

**Backend Configuration per Environment:**

```hcl
# environments/staging/backend.tf
terraform {
  backend "s3" {
    bucket         = "fikri-idp-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "fikri-idp-terraform-locks"
    encrypt        = true
  }
}

# environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "fikri-idp-terraform-state"
    key            = "production/terraform.tfstate"
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
- Share state files between environments
- Commit state files to version control
- Store sensitive data in state (use Secrets Manager)

### State Isolation

Each environment's state is completely isolated:
- Staging state cannot reference production resources
- Production state cannot reference staging resources
- State locking prevents concurrent modifications within an environment
- Separate state files prevent accidental cross-environment changes

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
- All environments use the same region initially
- Multi-region deployment is explicitly out of scope (see [Vision](../product/vision.md))
- Future multi-region support would require significant architectural changes

---

## Alignment with Other Documentation

| Document | Alignment |
|----------|-----------|
| [Vision](../product/vision.md) | Three environments (local, staging, production) are part of MVP scope |
| [Personas](../product/personas.md) | Developers deploy through environments; Platform Admins manage infrastructure |
| [Golden Path](../platform/golden-path.md) | Golden path deploys to staging; production promotion is a separate workflow |
| [Service Lifecycle](../platform/service-lifecycle.md) | Services progress through environments as part of lifecycle states |
| [Architecture Overview](overview.md) | Environment strategy supports component architecture and boundaries |
| [Technology Stack](technology-stack.md) | Terraform, AWS, and ECS Fargate choices support multi-environment deployment |
| [Local Development](local-development.md) | Local environment details and Docker Compose setup |

---

## Next Steps

1. **Create Terraform modules** — Implement reusable modules for VPC, ECS, ALB, RDS, Cognito, and service discovery
2. **Create environment configurations** — Set up `environments/staging/` and `environments/production/` with backend configuration
3. **Bootstrap state backend** — Create S3 bucket and DynamoDB table in `ap-southeast-1`
4. **Implement CI/CD** — GitHub Actions workflows for `terraform plan` and `terraform apply` per environment
5. **Define promotion workflow** — Document process for promoting services from staging to production
