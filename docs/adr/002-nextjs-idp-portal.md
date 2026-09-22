# ADR-002: Next.js for IDP Portal

## Status

Accepted

## Date

2026-09-22

## Context

The IDP Portal is the primary user interface for developers and platform administrators. It must support:
- Service creation wizard (golden path workflow)
- Service catalog browsing
- Deployment status and progress tracking
- Monitoring dashboards
- Authentication flows (via API, never directly to Cognito)

The portal must be a custom-built application. Backstage is explicitly deferred — the IDP application will be built first, and Backstage can be evaluated later as an integration or component.

The framework must:
- Provide server-side rendering or static generation where beneficial
- Support complex interactive UI (wizards, forms, real-time status)
- Integrate cleanly with the NestJS API backend
- Have a mature ecosystem and strong TypeScript support

## Decision

Next.js is the framework for the IDP Portal.

## Alternatives Considered

### Remix
- Strong server-side rendering and data loading model
- Smaller ecosystem and community compared to Next.js
- Fewer deployment options and less infrastructure maturity
- Rejected: Next.js has broader ecosystem support and more mature deployment options on ECS

### Plain React SPA (Vite + React)
- Simpler build pipeline
- No server-side rendering
- Would require a separate backend for any server-rendered pages
- Rejected: Next.js provides SSR capabilities that may be useful for SEO and initial load performance; also simplifies deployment by combining frontend and API serving

### Backstage
- Purpose-built for developer portals
- Rich plugin ecosystem for service catalogs
- Rejected: Backstage is deferred per product decision. The IDP will be built as a custom Next.js application first. Backstage can be evaluated later as an integration point or replacement for specific portal features. Building the IDP first provides deeper understanding of the domain before adopting a framework

### Angular
- Full-featured framework with strong typing
- Heavier learning curve and larger bundle size
- Less alignment with the React ecosystem used in templates
- Rejected: Next.js (React) aligns better with the React admin frontend template and has broader developer familiarity

## Consequences

### Positive
- Mature, widely-adopted framework with excellent TypeScript support
- Server-side rendering improves initial load performance and SEO
- API routes can serve as a lightweight BFF if needed
- Large community, extensive documentation, and plugin ecosystem
- Clean deployment as a containerised application on ECS Fargate
- Custom build allows full control over UX and feature set

### Negative
- Next.js conventions must be learned by contributors
- Server-side rendering adds complexity compared to a pure SPA
- Framework updates may require migration effort
- Building a custom portal requires more initial development effort than adopting Backstage
