# ADR-010: Cognito for Authentication

## Status

Accepted

## Date

2026-09-22

## Context

Fikri IDP requires authentication for all users (Platform Administrators, Developers, Service Owners, Viewers). The authentication system must:
- Support user registration and login (email/password)
- Support user groups for role-based access control
- Integrate with the NestJS API via a confidential client
- Issue JWT tokens for session management
- Support token refresh flows
- Be available as a managed service on AWS
- Never be accessed directly from the frontend (all auth flows through the API)

## Decision

Amazon Cognito is the identity provider for Fikri IDP.

## Alternatives Considered

### Auth0
- Managed identity platform with extensive features
- Strong developer experience and documentation
- Third-party service; additional cost and vendor dependency
- Rejected: Cognito is natively integrated with AWS, reducing operational complexity and cost; Auth0's additional features are not required for the MVP

### Keycloak
- Open-source identity and access management
- Self-hosted; full control over configuration
- Requires operational overhead (hosting, patching, scaling)
- Rejected: Cognito is a managed service that eliminates operational burden; Keycloak's self-hosted model adds unnecessary complexity for the MVP

### Custom Authentication
- Full control over authentication logic
- No third-party dependency
- Requires implementing password hashing, token generation, refresh flows, and security best practices
- High risk of security vulnerabilities
- Rejected: building custom authentication is a security risk and unnecessary when managed solutions are available

### AWS IAM / SSO
- Native AWS identity management
- Designed for AWS resource access, not application authentication
- Poor fit for end-user authentication (developers, service owners)
- Rejected: Cognito is purpose-built for application-level authentication; IAM is for infrastructure access

## Consequences

### Positive
- Managed service; no operational overhead for identity infrastructure
- Native AWS integration; works seamlessly with IAM, API Gateway, and ALB
- Built-in support for user pools, groups, and role-based access control
- Confidential client flow aligns with the architecture (API is the only Cognito client)
- JWT token issuance and refresh are natively supported
- The confidential client secret is stored in AWS Secrets Manager, accessed by the API at runtime
- Supports MFA, email verification, and password policies out of the box

### Negative
- Cognito's customisation options are more limited than Auth0 or Keycloak
- UI customisation for hosted UI is restricted (not used; API handles auth flows)
- Pricing scales with user count; cost must be monitored
- Cognito-specific quirks (token formats, group claims) require careful handling in the API
