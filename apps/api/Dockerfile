FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable

# ─── Dependencies ───────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# ─── Builder ────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/sdk/node_modules ./packages/sdk/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

COPY tsconfig.base.json ./
COPY packages/types/ ./packages/types/
COPY packages/sdk/ ./packages/sdk/
COPY packages/ui/ ./packages/ui/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @fikri-idp/types build && \
    pnpm --filter @fikri-idp/sdk build && \
    pnpm --filter @fikri-idp/ui build && \
    pnpm --filter @fikri-idp/api prisma:generate && \
    pnpm --filter @fikri-idp/api build

# ─── Dev ────────────────────────────────────────────────────────────────────
FROM deps AS dev
WORKDIR /app

COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=builder /app/packages/ui/dist ./packages/ui/dist

COPY tsconfig.base.json ./
COPY apps/api/ ./apps/api/

WORKDIR /app/apps/api

EXPOSE 3001
CMD ["pnpm", "dev"]

# ─── Runner ─────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main"]
