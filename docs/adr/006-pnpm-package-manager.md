# ADR-006: pnpm as Package Manager

## Status

Accepted

## Date

2026-09-22

## Context

Fikri IDP is a monorepo-style project with multiple packages: the IDP Portal (Next.js), the IDP API (NestJS), the future IDP Worker (NestJS), and shared infrastructure code. The package manager must:
- Handle multiple packages efficiently
- Provide fast, reliable dependency installation
- Minimise disk usage
- Enforce strict dependency resolution (no phantom dependencies)
- Support workspace protocols for shared packages

## Decision

pnpm is the package manager for Fikri IDP.

## Alternatives Considered

### npm
- Default Node.js package manager
- No workspace-native support (workspaces added in npm 7, but less mature)
- Slower installation due to flat `node_modules` structure
- Phantom dependencies possible (packages can access undeclared dependencies)
- Rejected: pnpm is faster, more disk-efficient, and enforces stricter dependency resolution

### Yarn (Classic / Berry)
- Popular alternative to npm
- Yarn Berry (PnP) eliminates `node_modules` but has compatibility issues with some packages
- Yarn Classic has similar issues to npm (phantom dependencies, slower installs)
- Rejected: pnpm provides the best balance of speed, disk efficiency, and compatibility

## Consequences

### Positive
- Significantly faster dependency installation via content-addressable storage
- Minimal disk usage; shared dependencies are stored once globally
- Strict dependency resolution prevents phantom dependencies
- Native workspace support for monorepo management
- Compatible with the vast majority of npm packages
- Lockfile is human-readable and git-friendly
- Active maintenance and strong community adoption

### Negative
- Less widely known than npm; new contributors may need to learn pnpm commands
- Some edge cases with packages that rely on flat `node_modules` structure (rare)
- CI/CD pipelines must install pnpm before running `pnpm install`
