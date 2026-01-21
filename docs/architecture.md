# Architecture

This MCP server, developed by Veni AI, utilizes a 3-tier caching architecture designed for high performance and cost optimization.

## Caching Tiers

### 1. L1: Memory Cache (In-Memory)
- **Technology:** Application-level Map structure.
- **Purpose:** Delivering responses within milliseconds for repeated queries in the same session.
- **TTL:** Short-term (Default: 5 minutes).

### 2. L2: PostgreSQL Cache (Persistent)
- **Technology:** PostgreSQL.
- **Purpose:** Persisting previously fetched decisions on disk to reduce Browserless (browser) overhead and costs.
- **TTL:** Long-term (Default: 30 days).
- **Features:** Tracks access counts to extend the life of popular queries.

### 3. L3: Live Scrape
- **Technology:** Browserless.io (Puppeteer) & Cheerio.
- **Purpose:** Fetching fresh data directly from the Yargitay source if the result is not cached or if `refresh=true` is specified.
- **Process:** Renders JavaScript-heavy content via Browserless, then parses it into structured JSON using Cheerio.

## Data Flow

1. Client sends a query.
2. System checks L1 (RAM) -> If found, return.
3. If not in L1, check L2 (DB) -> If found, cache in L1 and return.
4. If not found in any cache, trigger L3 (Scrape) -> Persist in L2 and L1, then return.
