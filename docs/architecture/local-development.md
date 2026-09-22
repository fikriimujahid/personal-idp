# Local Development Environment

## Overview

Fikri IDP runs entirely locally via Docker Compose, with no AWS account required. The local environment mirrors production architecture using LocalStack to mock AWS services and a dev-only authentication module to replace Amazon Cognito.

```
Docker Compose
│
├── postgres        PostgreSQL 16 — IDP database
├── localstack      LocalStack — mocks SQS, S3, Secrets Manager, DynamoDB
├── api             NestJS API (port 3001)
├── portal          Next.js Portal (port 3000)
└── worker          NestJS Worker (optional, profile: worker)
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker Desktop | 24+ | Container runtime |
| Docker Compose | 2.20+ | Service orchestration (included with Docker Desktop) |
| Git | Any | Source control |

**No AWS credentials, Node.js, or pnpm installation required.**

---

## Services

| Service | Image | Port (Host) | Port (Container) | Access URL |
|---------|-------|-------------|-------------------|------------|
| **Portal** | Build from `apps/web/` | 3000 | 3000 | http://localhost:3000 |
| **API** | Build from `apps/api/` | 3001 | 3001 | http://localhost:3001 |
| **PostgreSQL** | `postgres:16-alpine` | 5433 | 5432 | `localhost:5433` |
| **LocalStack** | `localstack/localstack:4` | 4566 | 4566 | http://localhost:4566 |
| **Worker** | Build from `apps/worker/` | — | 3002 | N/A (post-MVP) |

### Service Dependencies

```
postgres ──┐
           ├──► api ──► portal
localstack ┘        └──► worker (optional)
```

- **API** waits for PostgreSQL (healthy) and LocalStack (healthy) before starting
- **Portal** waits for API before starting
- **Worker** (optional) waits for LocalStack before starting

---

## Environment Variables

### Configuration

Copy `.env.example` to `.env` before starting:

```bash
cp .env.example .env
```

The `.env` file is git-ignored and contains local development secrets.

### Variable Reference

| Variable | Default | Description |
|----------|---------|-------------|
| **PostgreSQL** | | |
| `POSTGRES_USER` | `fikri_idp` | Database user |
| `POSTGRES_PASSWORD` | `fikri_idp` | Database password |
| `POSTGRES_DB` | `fikri_idp` | Database name |
| **Authentication** | | |
| `AUTH_MODE` | `local` | `local` (dev) or `cognito` (production) |
| `AUTH_LOCAL_SECRET` | `fikri-idp-dev-jwt-secret...` | JWT signing secret for local auth |
| `AUTH_LOCAL_ISSUER` | `fikri-idp-local` | JWT issuer claim |
| **AWS / LocalStack** | | |
| `AWS_REGION` | `us-east-1` | AWS region (for SDK clients) |
| `AWS_ACCESS_KEY_ID` | `test` | LocalStack access key |
| `AWS_SECRET_ACCESS_KEY` | `test` | LocalStack secret key |
| `LOCALSTACK_ENDPOINT` | `http://localstack:4566` | LocalStack endpoint (internal) |
| `LOCALSTACK_DEBUG` | `0` | Enable LocalStack debug logging |
| **SQS** | | |
| `SQS_QUEUE_PREFIX` | `http://localstack:4566/000000000000/` | SQS queue URL prefix |
| **S3** | | |
| `TERRAFORM_STATE_BUCKET` | `fikri-idp-tfstate` | S3 bucket for Terraform state |
| **Secrets Manager** | | |
| `SECRETS_PREFIX` | `fikri-idp/dev/` | Secrets Manager name prefix |
| **Portal** | | |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API URL (browser-accessible) |

---

## AWS Dependency Strategy

### LocalStack Coverage

LocalStack mocks the following AWS services:

| AWS Service | Local Usage | Init Script |
|-------------|-------------|-------------|
| **SQS** | Async task queue (API → Worker) | Creates `fikri-idp-tasks` and `fikri-idp-tasks-dlq` queues |
| **S3** | Terraform state storage | Creates `fikri-idp-tfstate` bucket |
| **Secrets Manager** | Platform secrets (Cognito client secret, GitHub token, DB credentials) | Seeds dev secrets |
| **DynamoDB** | Terraform state locking | Creates `fikri-idp-tfstate-lock` table |

### Init Script

`docker/localstack/init.sh` runs automatically when LocalStack starts. It creates:
- S3 bucket for Terraform state
- SQS queues with configured visibility timeout and retention
- Secrets Manager entries with placeholder values
- DynamoDB table for Terraform state locking

### AWS SDK Configuration

All AWS SDK clients in the API and Worker are configured via environment variables:

```typescript
const client = new SQSClient({
  endpoint: process.env.LOCALSTACK_ENDPOINT,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

When `LOCALSTACK_ENDPOINT` is set, SDK clients route to LocalStack instead of AWS.

### What Is Not Mocked

The following AWS services are **not** used locally:

| Service | Reason |
|---------|--------|
| **Cognito** | Replaced by local auth module (see below) |
| **ECS Fargate** | Services run as Docker containers, not ECS tasks |
| **ECR** | Images are built locally, not pushed to a registry |
| **ALB** | Services are accessed directly via localhost ports |
| **Service Discovery** | Services communicate via Docker network DNS names |
| **CloudWatch** | Logs go to Docker stdout; view with `docker compose logs` |
| **IAM** | LocalStack accepts any credentials; no IAM policies enforced |

---

## Authentication

### Local Auth Mode (Development)

When `AUTH_MODE=local`, the API uses a dev-only authentication module:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /auth/register` | Register | Create a new user account |
| `POST /auth/login` | Login | Exchange credentials for JWT |
| `POST /auth/refresh` | Refresh | Refresh an expired JWT |

**Characteristics:**
- JWTs signed with `AUTH_LOCAL_SECRET` (HS256)
- Users stored in-memory (or simple DB table for persistence)
- No external dependencies
- Works fully offline
- **Not for production use**

### Cognito Mode (Production)

When `AUTH_MODE=cognito`, the API uses Amazon Cognito:
- Confidential client secret from Secrets Manager
- User pool manages authentication
- JWTs issued by Cognito
- Requires AWS credentials and network access

### Switching Modes

Set `AUTH_MODE` in `.env`:

```env
AUTH_MODE=local    # Development
AUTH_MODE=cognito  # Production
```

The API conditionally loads the appropriate auth module based on this variable.

---

## Database

### PostgreSQL Setup

- **Image:** `postgres:16-alpine`
- **Port:** 5432 (container), 5433 (host)
- **Volume:** `postgres-data` (persists across restarts)
- **Healthcheck:** `pg_isready -U fikri_idp`

### Accessing the Database

From host:
```bash
psql -h localhost -p 5433 -U fikri_idp -d fikri_idp
```

From another container:
```bash
psql -h postgres -U fikri_idp -d fikri_idp
```

Password: `fikri_idp` (or value from `.env`)

### Prisma Migrations

The Prisma schema lives at `apps/api/prisma/schema.prisma`.

**Run migrations:**
```bash
docker compose exec api npx prisma migrate dev
```

**Apply migrations (production):**
```bash
docker compose exec api npx prisma migrate deploy
```

**Open Prisma Studio:**
```bash
docker compose exec api npx prisma studio
```

**Current state:** The schema is empty (only datasource + generator). Models will be added as features are built. `prisma migrate deploy` is a no-op until models exist.

---

## Startup Procedure

### First-Time Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd personal-idp

# 2. Create environment file
cp .env.example .env

# 3. Start all services
docker compose up --build
```

The first build takes 2-5 minutes (installs dependencies, builds workspace packages).

### Access the Application

Once services are healthy:

- **Portal:** http://localhost:3000
- **API:** http://localhost:3001
- **LocalStack:** http://localhost:4566
- **PostgreSQL:** `localhost:5433`

### Starting with Worker (Optional)

The Worker is post-MVP and starts only with the `worker` profile:

```bash
docker compose --profile worker up --build
```

### Stopping Services

```bash
# Stop all services (preserves data volumes)
docker compose down

# Stop and remove data volumes (fresh start)
docker compose down -v
```

---

## Development Workflow

### Hot Reload

**Portal (Next.js):**
- Mounts `apps/web/src` and `apps/web/public` as volumes
- Changes to `src/` trigger automatic reload
- Changes to `public/` are served immediately

**API (NestJS):**
- Mounts `apps/api/src` and `apps/api/prisma` as volumes
- `nest start --watch` detects changes and restarts
- Changes to `src/` trigger automatic rebuild

**Worker (NestJS):**
- Mounts `apps/worker/src` as volume
- `nest start --watch` detects changes and restarts

### Workspace Package Changes

Changes to `packages/types`, `packages/sdk`, or `packages/ui` require a rebuild:

```bash
docker compose up --build
```

**Why:** Workspace packages are built during the Docker build and their `dist/` output is copied into the app containers. Volume mounts only cover app `src/` directories.

**Alternative:** For active development on workspace packages, run the dev server on the host:

```bash
pnpm install
pnpm --filter @fikri-idp/web dev
```

This requires Node.js and pnpm installed locally but provides full hot reload for all packages.

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f portal
docker compose logs -f postgres
docker compose logs -f localstack
```

### Running Commands

```bash
# Execute command in running container
docker compose exec api sh
docker compose exec portal sh

# Run one-off command
docker compose run --rm api npx prisma studio
```

### Rebuilding After Dependency Changes

If you modify `package.json` or add dependencies:

```bash
docker compose up --build
```

---

## Troubleshooting

### Build Fails: "Cannot find module '@fikri-idp/types'"

**Cause:** Workspace packages not built before app build.

**Solution:** The Dockerfiles build workspace packages in the correct order. If the issue persists:

```bash
docker compose build --no-cache
```

### Portal Shows "API Unreachable"

**Cause:** API not ready or `NEXT_PUBLIC_API_URL` misconfigured.

**Solution:**
1. Check API is healthy: `docker compose ps`
2. Verify `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env`
3. Check API logs: `docker compose logs api`

### LocalStack Init Script Fails

**Cause:** LocalStack not fully ready when init script runs.

**Solution:** The init script is mounted to `/etc/localstack/init/ready.d/` and runs after LocalStack is healthy. If resources already exist, the script logs "already exists" and continues.

To manually run the init script:

```bash
docker compose exec localstack bash /etc/localstack/init/ready.d/init.sh
```

### PostgreSQL Connection Refused

**Cause:** PostgreSQL not ready or credentials mismatch.

**Solution:**
1. Check PostgreSQL is healthy: `docker compose ps`
2. Verify credentials in `.env` match `DATABASE_URL`
3. Check API logs for connection errors: `docker compose logs api`

### Port Already in Use

**Cause:** Another service using ports 3000, 3001, 4566, or 5433.

**Solution:** Change port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:3001"  # Change to "3002:3001" if 3001 is taken
```

### Prisma Migrate Fails

**Cause:** Database not initialized or schema out of sync.

**Solution:**

```bash
# Reset database (WARNING: deletes all data)
docker compose exec api npx prisma migrate reset

# Generate Prisma client
docker compose exec api npx prisma generate

# Run migrations
docker compose exec api npx prisma migrate dev
```

### Docker Build is Slow

**Cause:** Large build context or missing `.dockerignore`.

**Solution:** The `.dockerignore` at the repo root excludes `node_modules`, `.next`, `dist`, and other large directories. If builds are still slow:

```bash
docker compose build --no-cache
```

### LocalStack Services Not Accessible

**Cause:** LocalStack not fully started.

**Solution:** Wait for the healthcheck to pass:

```bash
docker compose ps  # Check STATUS column shows "(healthy)"
```

Or manually check:

```bash
curl http://localhost:4566/_localstack/health
```

---

## Architecture Decisions

### Why Docker Compose?

- **Consistency:** All developers run the same environment
- **Isolation:** No conflicts with host system (Node.js versions, databases)
- **Simplicity:** Single command (`docker compose up`) to start everything
- **Parity:** Mirrors production architecture (separate services, network, volumes)

### Why LocalStack Instead of AWS?

- **Cost:** No AWS charges for local development
- **Speed:** No network latency, instant resource creation
- **Offline:** Works without internet connection
- **Isolation:** Each developer has their own isolated AWS environment

### Why Local Auth Instead of LocalStack Cognito?

- **Simplicity:** No need to configure Cognito user pools, clients, and test users
- **Speed:** Faster startup, no LocalStack Cognito emulation quirks
- **Flexibility:** Easy to add test users, modify JWT claims
- **Offline:** Works fully offline, no LocalStack Cognito dependencies

### Why Not Redis?

No current use case. Redis would be added if:
- Caching layer is introduced
- BullMQ is used for job queues (instead of SQS)
- Session storage is needed (currently JWT-based)

---

## File Structure

```
fikri-idp/
├── docker-compose.yml          # Service definitions
├── .env.example                # Environment variable template (committed)
├── .env                        # Local environment values (git-ignored)
├── .dockerignore               # Excludes files from Docker build context
├── docker/
│   └── localstack/
│       └── init.sh             # LocalStack initialization script
├── apps/
│   ├── api/
│   │   └── Dockerfile          # Monorepo-aware, multi-stage
│   ├── web/
│   │   └── Dockerfile          # Monorepo-aware, multi-stage
│   └── worker/
│       └── Dockerfile          # Monorepo-aware, multi-stage
└── docs/
    └── architecture/
        └── local-development.md  # This document
```

---

## Comparison: Local vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| **Compute** | Docker containers | ECS Fargate |
| **Database** | PostgreSQL container | Amazon RDS |
| **Auth** | Local JWT module | Amazon Cognito |
| **Queue** | LocalStack SQS | Amazon SQS |
| **Secrets** | LocalStack Secrets Manager | AWS Secrets Manager |
| **Registry** | Local Docker build | Amazon ECR |
| **Load Balancer** | Direct port access | Application Load Balancer |
| **Service Discovery** | Docker DNS | AWS Service Discovery |
| **State Storage** | LocalStack S3 | Amazon S3 |
| **Monitoring** | Docker logs | CloudWatch, Prometheus, Grafana |

---

## Next Steps

1. **Add Prisma models** — Define the data schema for services, users, templates
2. **Implement auth endpoints** — Build `/auth/register`, `/auth/login`, `/auth/refresh`
3. **Add AWS SDK clients** — Configure SQS, S3, Secrets Manager clients to use LocalStack
4. **Build service CRUD** — Implement service creation, listing, status updates
5. **Connect Portal to API** — Use `@fikri-idp/sdk` to call API endpoints

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review `docker compose logs` for error details
- Consult the architecture docs in `docs/architecture/`
