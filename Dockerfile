# Build stage
FROM oven/sh/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN bun run build

# Final stage
FROM oven/sh/bun:latest-distroless

WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lockb ./bun.lockb
COPY --from=builder /app/node_modules ./node_modules

# Standard MCP environment variables (defaults)
ENV NODE_ENV=production

# Entry point
ENTRYPOINT ["bun", "run", "dist/index.js"]
