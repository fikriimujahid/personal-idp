# Security Baseline

## Overview

This document defines the minimum security requirements for every service created through Fikri IDP. The IDP is not merely a scaffolding tool — it enforces engineering standards. Every service, whether generated through the golden path or part of the IDP itself (Portal, API, Worker), must satisfy the mandatory controls defined here.

**Scope:** All services managed by the IDP — golden-path-generated services and IDP's own components.

**Enforcement model:** Hard gate. Mandatory controls block deployment. There is no per-service override path.

**See also:** [ADR-012](../adr/012-security-baseline.md)

---

## Control Classification

| Classification | Description | Enforcement |
|----------------|-------------|-------------|
| **Mandatory** | Must be satisfied before deployment proceeds | CI/CD hard gate — deployment blocked on failure |
| **Optional** | Recommended for enhanced security posture | Not enforced; adopted at service owner's discretion |

---

## Mandatory Controls

Every service must satisfy all of the following controls. Failure in any area blocks deployment.

### 1. Transport Security

All network traffic to and from the service must be encrypted in transit.

| Requirement | Implementation |
|-------------|----------------|
| HTTPS enforced | ALB terminates TLS; HTTP requests are redirected to HTTPS |
| TLS version | TLS 1.2 minimum; TLS 1.3 preferred |
| Certificate management | AWS Certificate Manager (ACM) for ALB certificates |
| No plain HTTP endpoints | Service does not expose unencrypted ports externally |

**Enforcement:** Terraform template configures ALB listener with HTTPS redirect. CI/CD verifies no HTTP-only listeners exist.

---

### 2. IAM Roles

Every service must have dedicated IAM roles following the principle of least privilege.

| Requirement | Implementation |
|-------------|----------------|
| Task role | Per-service IAM task role with only the permissions the container needs |
| Execution role | Per-service IAM execution role for ECS agent (ECR pull, CloudWatch logs) |
| No shared roles | Each service has its own roles; roles are not reused across services |
| Least privilege | Roles grant minimum permissions required for the service to function |
| No wildcard permissions | IAM policies must not use `*` for actions or resources |

**Enforcement:** Terraform template generates per-service IAM roles. CI/CD validates no wildcard permissions in IAM policies.

---

### 3. Secrets Management

No secrets may be hardcoded in source code, Dockerfiles, CI/CD workflows, or Terraform configuration.

| Requirement | Implementation |
|-------------|----------------|
| AWS Secrets Manager | All secrets stored in AWS Secrets Manager |
| No hardcoded secrets | No API keys, passwords, tokens, or credentials in source code |
| No secrets in environment variables | Sensitive values are not passed as plain environment variables in task definitions |
| Secrets injected at runtime | ECS task definition references Secrets Manager ARNs; secrets are injected into the container at runtime |
| No secrets in Terraform state | Secret values are never stored in Terraform state; use Secrets Manager ARN references |
| No secrets in logs | Applications must not log secret values, tokens, or credentials |

**Enforcement:** CI/CD pipeline includes secret scanning (e.g., `git-secrets` or `trufflehog`). Build fails if secrets are detected in source code. Terraform plan is checked for secret values in state.

---

### 4. Container Security

All containers must run as non-root with minimal attack surface.

| Requirement | Implementation |
|-------------|----------------|
| Non-root user | Dockerfile defines a non-root `USER` for the final stage |
| Multi-stage build | Dockerfile uses multi-stage build to minimize final image size and attack surface |
| Minimal base image | Final stage uses a minimal base image (e.g., `node:20-alpine` or `distroless`) |
| No unnecessary packages | Build tools, shells, and utilities are not present in the final image |
| Read-only filesystem | ECS task definition sets `readonlyRootFilesystem: true` where possible |
| No privilege escalation | ECS task definition sets `privileged: false` and `allowEscalation: false` |

**Enforcement:** CI/CD validates Dockerfile contains `USER` instruction in final stage. ECS task definition is validated for security context settings.

---

### 5. Container Scanning

All container images must be scanned for vulnerabilities before deployment.

| Requirement | Implementation |
|-------------|----------------|
| ECR image scanning | ECR repository configured for scan-on-push |
| No HIGH/CRITICAL vulnerabilities | Image is rejected if scan findings include HIGH or CRITICAL severity vulnerabilities |
| Scan before deploy | CI/CD pipeline checks ECR scan results and blocks deployment if thresholds are exceeded |

**Enforcement:** ECR scan-on-push is configured via Terraform. CI/CD pipeline queries ECR scan findings and fails the build if HIGH or CRITICAL vulnerabilities are present.

---

### 6. Dependency Scanning

All application dependencies must be audited for known vulnerabilities.

| Requirement | Implementation |
|-------------|----------------|
| Automated dependency audit | CI/CD pipeline runs `npm audit` (or equivalent) as part of the build |
| Fail on HIGH/CRITICAL | Build fails if HIGH or CRITICAL severity vulnerabilities are found in dependencies |
| Lock files committed | `pnpm-lock.yaml` is committed to ensure reproducible dependency resolution |

**Enforcement:** CI/CD pipeline includes a dependency audit step. Build fails on HIGH/CRITICAL findings.

---

### 7. Static Application Security Testing (SAST)

All source code must be analysed for security vulnerabilities before deployment.

| Requirement | Implementation |
|-------------|----------------|
| SAST in CI/CD | Static analysis runs as part of the CI/CD pipeline |
| Tool | GitHub CodeQL or Trivy (integrated into GitHub Actions) |
| Fail on critical findings | Build fails if critical security issues are detected |
| Covers all source files | Analysis includes application source code, not just dependencies |

**Enforcement:** CI/CD pipeline includes a SAST step. Build fails on critical findings.

---

### 8. Security Headers

All HTTP responses from the service must include standard security headers.

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforce HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Disable legacy XSS filter (modern browsers use CSP) |
| `Content-Security-Policy` | Service-appropriate CSP | Prevent injection attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information |

**Enforcement:** Templates include middleware configuration (e.g., Helmet for NestJS, Next.js security headers) that sets these headers. CI/CD includes a check that verifies security headers are present in responses.

---

### 9. CloudWatch Logging

All services must log to Amazon CloudWatch in a structured format.

| Requirement | Implementation |
|-------------|----------------|
| CloudWatch log group | Per-service CloudWatch log group created via Terraform |
| Structured JSON logs | Application logs are formatted as JSON for parseability |
| Log retention | Log retention policy configured (minimum 30 days) |
| No secrets in logs | Applications must not log sensitive data (tokens, credentials, PII) |
| ECS log driver | ECS task definition uses `awslogs` log driver pointing to the service's log group |

**Enforcement:** Terraform template creates CloudWatch log group and configures log retention. ECS task definition is validated for `awslogs` driver configuration.

---

### 10. Audit Logging

All state-changing operations must be logged with sufficient context for audit trails.

| Requirement | Implementation |
|-------------|----------------|
| Actor identification | Every auditable action includes the identity of the actor (user, service, system) |
| Timestamp | Every auditable action includes a UTC timestamp |
| Action description | Every auditable action includes a description of what was performed |
| Resource identification | Every auditable action includes the resource affected |
| Outcome | Every auditable action includes the result (success, failure) |
| Tamper resistance | Audit logs are stored in CloudWatch with restricted write access; log streams are not deletable by service-level IAM roles |

**Enforcement:** Templates include audit logging middleware. CI/CD validates audit log configuration is present.

---

## Optional Controls

The following controls are recommended for enhanced security posture but are not enforced as hard gates.

| Control | Description | When to Adopt |
|---------|-------------|---------------|
| **Rate limiting** | Limit request rate per client to prevent abuse | Public-facing services, APIs with known traffic patterns |
| **WAF rules** | AWS WAF rules on ALB for common attack patterns (SQL injection, XSS) | Public-facing services |
| **Encryption at rest** | Encrypt data stores beyond Secrets Manager (e.g., RDS encryption, EBS encryption) | Services handling sensitive data |
| **Network policies** | Security groups restricting inter-service communication to required ports and protocols | Services with defined communication patterns |
| **Runtime threat detection** | Amazon GuardDuty or similar runtime threat detection | High-security services, production workloads |
| **SBOM generation** | Software Bill of Materials generated at build time | Services requiring supply chain transparency |
| **Penetration testing** | Periodic penetration testing by security team | Production services handling sensitive data |
| **Mutual TLS (mTLS)** | Service-to-service authentication via mTLS | Services with strict inter-service authentication requirements |

---

## CI/CD Security Gates

Security checks are integrated into the CI/CD pipeline at specific stages. Each gate blocks deployment if the check fails.

### Pipeline Stage Mapping

```
Source Code
  │
  ▼
┌─────────────────────┐
│ Secret Scanning      │ ── Gate 1: No hardcoded secrets
│ (git-secrets/trufflehog)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Dependency Audit     │ ── Gate 2: No HIGH/CRITICAL dependency vulnerabilities
│ (npm audit)          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SAST                 │ ── Gate 3: No critical SAST findings
│ (CodeQL / Trivy)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Docker Build         │ ── Gate 4: Non-root user, multi-stage, minimal base
│ (Dockerfile checks)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Container Scan       │ ── Gate 5: No HIGH/CRITICAL image vulnerabilities
│ (ECR scan-on-push)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ IAM Validation       │ ── Gate 6: No wildcard permissions, per-service roles
│ (Terraform validate) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Deploy               │ ── All gates passed; deployment proceeds
└─────────────────────┘
```

### Gate Summary

| Gate | Control | CI/CD Step | Fail Action |
|------|---------|------------|-------------|
| 1 | Secrets Management | Secret scan (`git-secrets` / `trufflehog`) | Build fails; developer notified |
| 2 | Dependency Scanning | `npm audit --audit-level=high` | Build fails; developer notified |
| 3 | SAST | CodeQL / Trivy analysis | Build fails; developer notified |
| 4 | Container Security | Dockerfile lint (non-root, multi-stage) | Build fails; developer notified |
| 5 | Container Scanning | ECR scan findings check | Build fails; developer notified |
| 6 | IAM Roles | Terraform plan validation | Build fails; developer notified |

### Additional Runtime Checks

The following controls are validated at deployment time or via post-deployment checks:

| Control | Validation Method | Fail Action |
|---------|-------------------|-------------|
| Transport Security | ALB listener configuration check (HTTPS redirect) | Deployment blocked; Terraform fix required |
| Security Headers | HTTP response header check against deployed service | Post-deploy alert; service flagged |
| CloudWatch Logging | ECS task definition log driver validation | Deployment blocked; Terraform fix required |
| Audit Logging | Audit middleware presence check | Post-deploy alert; service flagged |

---

## Template Enforcement

Security controls are embedded into the templates that generate service artifacts. This ensures security is the default, not an afterthought.

| Template Artifact | Security Controls Embedded |
|-------------------|--------------------------|
| **Dockerfile** | Non-root user, multi-stage build, minimal base image, no unnecessary packages |
| **CI/CD workflow** | Secret scanning, dependency audit, SAST, container scan gate, IAM validation |
| **Terraform configuration** | Per-service IAM roles, CloudWatch log group, HTTPS listener, ECR scan-on-push, ECS security context |
| **Application scaffold** | Security headers middleware (Helmet), structured JSON logging, audit logging middleware |

---

## Alignment with Existing Documentation

| Document | Alignment |
|----------|-----------|
| `vision.md` | Security baseline is part of MVP scope; all services meet security standards at launch |
| `golden-path.md` | Steps 8 (Docker), 9 (CI/CD), and 10 (Terraform) embed mandatory security controls |
| `service-lifecycle.md` | Security controls are validated during PROVISIONING and DEPLOYING states |
| `overview.md` | Security baseline is a cross-cutting concern enforced across all components |
| `technology-stack.md` | Security controls leverage existing stack: AWS Secrets Manager, CloudWatch, ECR scanning, IAM |
| `environments.md` | Security baseline applies to staging and production; local development has relaxed controls |
