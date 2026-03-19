FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy workspace config + lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy relevant packages
COPY packages/attnres-memory/package.json packages/attnres-memory/
COPY packages/orchestrator/package.json packages/orchestrator/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/mcp-servers/package.json packages/mcp-servers/
COPY packages/templates/package.json packages/templates/
COPY apps/api/package.json apps/api/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ packages/
COPY apps/api/ apps/api/

EXPOSE 3001
ENV PORT=3001
ENV HOST=0.0.0.0

CMD ["pnpm", "--filter", "@factory/api", "run", "dev"]
