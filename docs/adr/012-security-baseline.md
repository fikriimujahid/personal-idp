# ADR-012: Security Baseline for All Services

## Status

Accepted

## Date

2026-09-23

## Context

Fikri IDP creates and deploys services on behalf of developers. Without enforced security standards, each service could have a different security posture depending on the developer's knowledge and attention to security. This creates inconsistent risk exposure across the platform.

The IDP is not merely a scaffolding tool — it is an enforcement mechanism for engineering standards. Security requirements must be baked into every service from day one, not bolted on later.

The platform needs:
- A defined set of mandatory security controls that every service must satisfy
- Automated enforcement through CI/CD gates and template defaults
- A clear distinction between mandatory and optional controls
- Consistent security posture across golden-path-generated services and IDP's own components (Portal, API, Worker)

## Decision

Fikri IDP enforces a **mandatory security baseline** for all services. The baseline is:

1. **Defined** in `docs/platform/security-baseline.md`
2. **Baked into templates** — Dockerfiles, CI/CD workflows, and Terraform modules include security controls by default
3. **Enforced as hard gates** in CI/CD — deployment is blocked if mandatory controls fail
4. **Universal** — applies to all golden-path-generated services and IDP's own components (Portal, API, Worker)

The baseline covers ten mandatory control areas: transport security, IAM roles, secrets management, container security, container scanning, dependency scanning, SAST, security headers, CloudWatch logging, and audit logging.

There is no per-service override path. If a control needs exemption, the Platform Administrator must update the baseline or the template.

## Alternatives Considered

### Optional guidelines only

- Document security best practices as recommendations
- Rely on developers to implement them manually
- Rejected: inconsistent adoption, no enforcement, security gaps between services

### Post-deployment scanning

- Deploy first, scan later, remediate findings over time
- Rejected: vulnerabilities are live in production during remediation window; does not prevent secrets in code or missing IAM roles

### Third-party policy engine (Open Policy Agent)

- Use OPA or similar policy-as-code tool to evaluate infrastructure and container configurations
- Adds significant complexity and a new technology dependency
- Rejected: CI/CD gates and template defaults provide sufficient enforcement for MVP scope; OPA can be evaluated later for advanced policy enforcement

## Consequences

### Positive

- Consistent security posture across all services from day one
- Developers get security by default without additional effort
- CI/CD gates prevent insecure deployments from reaching any environment
- Compliance-ready foundation for future regulatory requirements
- Reduces platform risk surface area
- Security becomes a platform concern, not a per-team concern

### Negative

- Slightly longer CI/CD pipelines due to additional security checks
- Template maintenance burden increases as baseline controls must be embedded in all templates
- Developers cannot override security controls for special cases without Platform Administrator involvement
- Initial template development requires more upfront effort to embed all mandatory controls
