# ── Stage 1: Builder ─────────────────────────────────
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package manifests for dependency resolution
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/web/package.json apps/web/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ packages/
COPY apps/ apps/

# Build all packages + app
RUN pnpm build

# ── Stage 2: Production ─────────────────────────────
FROM node:20-slim AS production

# Install Litestream
RUN apt-get update && apt-get install -y wget && \
    wget -qO- https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz | tar xz -C /usr/local/bin && \
    apt-get purge -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Install pnpm and tsx
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate && \
    npm install -g tsx

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/web/package.json apps/web/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/apps/web/build apps/web/build
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/db/dist packages/db/dist

# Copy source needed at runtime
# - packages/db/src/ for migrations (SQL files + migrate.ts)
# - packages/db/drizzle.config.ts if needed
COPY packages/db/src/ packages/db/src/
COPY packages/shared/src/ packages/shared/src/

# Copy Litestream config and startup script
COPY litestream.yml ./
COPY scripts/start.sh ./

# Ensure start script is executable
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["/app/start.sh"]
