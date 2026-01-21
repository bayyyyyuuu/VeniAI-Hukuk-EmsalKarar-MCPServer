<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Scale_of_Justice.svg" width="96" alt="Scale of justice" />
  <h1>Yargitay Emsal Karar MCP Server</h1>
  <p>
    Veni AI tarafindan gelistirilen ve dunyanin en iyi Yargitay emsal karar arama MCP sunucusu olmak uzere tasarlanan,
    stdio tabanli, uctan uca teknik odakli bir arama altyapisi.
  </p>
</div>

<p align="center">
  <img alt="MCP" src="https://img.shields.io/badge/MCP-stdio-000000?style=flat-square" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D18-3C873A?style=flat-square&logo=node.js&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Cache-336791?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Browserless" src="https://img.shields.io/badge/Browserless-Puppeteer-0A7FFF?style=flat-square" />
  <img alt="Built by Veni AI" src="https://img.shields.io/badge/Built%20by-Veni%20AI-111111?style=flat-square" />
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> |
  <a href="#tools">Tools</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#environment">Environment</a> |
  <a href="#claude-desktop-config">Claude Desktop</a> |
  <a href="#security-and-privacy">Security</a>
</p>

<details>
<summary>Table of contents (click to show)</summary>

- [Overview](#overview)
- [Highlights](#highlights)
- [Architecture](#architecture)
- [Tools](#tools)
- [Quickstart](#quickstart)
- [Claude Desktop Config](#claude-desktop-config)
- [Environment](#environment)
- [Database Schema](#database-schema)
- [Browserless Setup](#browserless-setup)
- [Caching Model](#caching-model)
- [Output Contract](#output-contract)
- [Performance Tuning](#performance-tuning)
- [Security and Privacy](#security-and-privacy)
- [Operational Notes](#operational-notes)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [Credits](#credits)
- [License](#license)
</details>

## Overview

This repository contains a pure MCP (Model Context Protocol) server for Yargitay precedent search. It runs on stdio,
is designed for MCP clients like Claude Desktop, and provides high quality results via a 3 tier cache:
memory, PostgreSQL, and Browserless based scraping.

The server is intentionally HTTP free. It focuses on MCP tool ergonomics, deterministic outputs, and a clean
deployment footprint for secure usage in local or controlled environments.

## Highlights

- MCP stdio transport only, no HTTP surface.
- 3 tier cache with unified telemetry and controlled expiry.
- Browserless + Puppeteer scraping for reliable content extraction.
- PostgreSQL backed analytics for popularity and performance insights.
- Strict input validation and predictable output format.
- Built by Veni AI to be the worlds best Yargitay precedent search MCP server.

## Architecture

```
[MCP Client]
    |
    | stdio
    v
[MCP Server] ----> [L1 Memory Cache]
    |                   |
    |                   v
    |               [PostgreSQL]
    |
    v
[Browserless + Puppeteer] ---> [karararama.yargitay.gov.tr]
```

## Tools

All tools return a single text payload that contains JSON for easy parsing in clients.

### yargitay_search_optimized

Search Yargitay decisions using cache and Browserless scraping.

Input:

```json
{
  "query": "string",
  "refresh": "boolean (optional)"
}
```

Output keys:

- formatted: human friendly plain text list of results
- success: boolean
- query: normalized query
- results: array of decisions
- metadata: source, cached, age, resultCount, totalTime

### yargitay_health

Returns health status for Browserless, cache, and database.

### yargitay_stats

Returns cache hit rates, timing metrics, and basic scraping config.

### yargitay_popular

Lists popular queries from the database.

Input:

```json
{ "limit": 20 }
```

### yargitay_analytics

Returns daily analytics for the last N days.

Input:

```json
{ "days": 7 }
```

### yargitay_cache_clear

Triggers cache cleanup for memory and database.

## Quickstart

1) Install dependencies

```bash
npm install
```

2) Create your environment file

```bash
copy .env.example .env
# macOS or Linux:
# cp .env.example .env
```

3) Initialize database schema

```bash
psql "$DATABASE_URL" -f src/database/schema.sql
```

4) Build and run

```bash
npm run build
npm start
```

## Claude Desktop Config

```json
{
  "mcpServers": {
    "yargitay": {
      "command": "node",
      "args": ["C:/path/to/yargitay-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@host:5432/dbname?sslmode=require",
        "BROWSERLESS_URL": "wss://your-browserless-host",
        "BROWSERLESS_TOKEN": "your-token"
      }
    }
  }
}
```

## Environment

Use `.env.example` as the base. The following variables are supported:

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| DATABASE_URL | yes | - | PostgreSQL connection string |
| DATABASE_TYPE | no | postgresql | Display only |
| DATABASE_POOL_MIN | no | 2 | Pool min size |
| DATABASE_POOL_MAX | no | 10 | Pool max size |
| BROWSERLESS_URL | yes | - | wss or https endpoint |
| BROWSERLESS_TOKEN | yes | - | Token appended to ws endpoint |
| BROWSERLESS_TIMEOUT | no | 30000 | Milliseconds |
| BROWSERLESS_RETRIES | no | 3 | Retry count |
| SCRAPING_MAX_RESULTS | no | 10 | Per query limit |
| SCRAPING_PARALLEL_REQUESTS | no | 3 | Parallel detail fetch |
| SCRAPING_ADAPTIVE_TIMEOUT | no | true | Adaptive timeouts |
| SCRAPING_RETRY_STRATEGY | no | exponential | exponential, linear, fixed |
| SCRAPING_BASE_TIMEOUT | no | 10000 | Milliseconds |
| CACHE_L1_TTL_MS | no | 300000 | Memory cache TTL |
| CACHE_L2_TTL_DAYS | no | 30 | DB cache TTL |
| CACHE_POPULAR_THRESHOLD | no | 5 | Popularity threshold |
| CACHE_CLEANUP_INTERVAL_MS | no | 3600000 | Cleanup interval |
| NODE_ENV | no | development | development or production |

## Database Schema

Schema file:

- `src/database/schema.sql`

It creates tables for search results, decisions, scraping stats, and utility views for analytics. It also includes
stored procedures for updating access counts and cleanup.

## Browserless Setup

- Set `BROWSERLESS_URL` to your Browserless endpoint (wss or https).
- The server will append `?token=` automatically if not present.
- `BROWSERLESS_TOKEN` is required and never logged.

## Caching Model

- L1: in memory, ultra fast, short TTL.
- L2: PostgreSQL, medium latency, long TTL.
- L3: live scrape through Browserless.

Cache promotion flows from L3 to L2 and L1. The `refresh` flag forces invalidation.

## Output Contract

All tools return JSON inside MCP text content. Example from `yargitay_search_optimized`:

```json
{
  "formatted": "Result 1 ...",
  "success": true,
  "query": "tazminat",
  "results": [
    {
      "siraNo": "1",
      "daire": "1. Hukuk Dairesi",
      "esasNo": "2023/1234",
      "kararNo": "2023/5678",
      "kararTarihi": "15.12.2023",
      "icerik": "..."
    }
  ],
  "metadata": {
    "source": "scrape",
    "cached": false,
    "age": 0,
    "resultCount": 1,
    "totalTime": 1240
  }
}
```

## Performance Tuning

- Increase `SCRAPING_PARALLEL_REQUESTS` if Browserless capacity is high.
- Raise `BROWSERLESS_TIMEOUT` for long queries or slow networks.
- Extend `CACHE_L2_TTL_DAYS` to reduce scraping load.
- Use `yargitay_stats` to track cache hit rate and response time.

## Security and Privacy

- No secrets are stored in the repository.
- All credentials are supplied via environment variables.
- Database URL is masked in logs.
- Inputs are validated and sanitized before use.

## Operational Notes

- The data source is the public Yargitay search site. Availability and markup can change.
- Database is strongly recommended for analytics and L2 cache. The server still runs if DB is down, but
  analytics and L2 cache will degrade.
- Use `yargitay_health` for quick status checks.

## FAQ

**Why no HTTP API?**  
This server is MCP first and communicates over stdio by design.

**Can I run it without PostgreSQL?**  
Yes, but you will lose L2 cache and analytics.

**Does it support detailed search filters?**  
Current tools focus on query based search. Advanced filters can be added as tool arguments.

## Roadmap

- Advanced search filters and richer query schema.
- SQLite support for lightweight deployments.
- Structured result formatting presets.
- Resource endpoints for cached datasets.

## Credits

Built by Veni AI.

## License

MIT. See `LICENSE`.
