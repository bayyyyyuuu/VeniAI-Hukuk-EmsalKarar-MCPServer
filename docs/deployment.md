# Deployment Guide

This MCP server is designed to be flexible and can be deployed in various environments.

## 1. Local Development

### Prerequisites
- Bun (v22+)
- Docker (Optional but recommended)

### Steps
1. Run `bun install`.
2. Configure your `.env` file based on the template.
3. Run `docker-compose up -d` (for Database and Browserless).
4. Run `bun run build`.
5. Add the `dist/index.js` file to your MCP client (e.g., Claude Desktop).

## 2. Docker Deployment

The project includes a multi-stage, optimized `Dockerfile`.

```bash
docker build -t yargitay-mcp .
docker run -e DATABASE_URL=... yargitay-mcp
```

## 3. Cloud Platforms

### Railway / Render
Since the project includes a `nixpacks.toml`, you can deploy it on Railway by simply connecting your repository. Ensure you attach a PostgreSQL database.

### Vercel
Configuration for serverless deployment is available in `vercel.json`. However, please note that stdio-based MCP servers often perform best on persistent server environments (like Railway or Docker) for stable database connectivity.
