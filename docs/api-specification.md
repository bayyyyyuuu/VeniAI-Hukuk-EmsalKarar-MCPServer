# API Specification

This document details the technical specification for all tools provided by the Yargitay MCP Server. All tools communicate via the Model Context Protocol (MCP) using a JSON-wrapped text content model.

## 1. yargitay_search_optimized

High-performance search tool with 3-tier caching.

### Input Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | string | Yes | The search term (e.g., "ihbar tazminatı feshin geçersizliği"). |
| `refresh` | boolean | No | If true, bypasses the cache and forces a live scrape. Default: `false`. |

### Output Structure (JSON)

```json
{
  "formatted": "Readable string of results",
  "success": boolean,
  "query": "cleaned query string",
  "results": [
    {
      "siraNo": "string",
      "daire": "string",
      "esasNo": "string",
      "kararNo": "string",
      "kararTarihi": "string",
      "icerik": "string (snippet or full)"
    }
  ],
  "metadata": {
    "source": "cache | scrape",
    "cached": boolean,
    "age": number,
    "resultCount": number,
    "totalTime": number
  }
}
```

## 2. yargitay_health

Retrieves the structural health of the server's dependencies.

### Output Structure

```json
{
  "status": "healthy | degraded",
  "components": {
    "database": { "connected": boolean, "latency": number },
    "browserless": { "available": boolean },
    "cache": { "l1Size": number }
  }
}
```

## 3. yargitay_stats

Provides internal performance metrics.

### Output Structure

```json
{
  "cacheHitRate": "string (%)",
  "totalRequests": number,
  "averageScrapeTime": number,
  "memoryUsage": "string (MB)"
}
```

## 4. yargitay_popular

Lists the most frequently searched queries from the L2 cache.

### Input Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | number | No | Number of popular queries to return. Default: `20`. |

## 5. yargitay_analytics

Returns daily usage and performance analytics.

### Input Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `days` | number | No | Number of past days to include. Default: `7`. |

## 6. yargitay_cache_clear

Administrative tool to flush local and persistent caches.

### Authorization
Note: This tool is intended for administrative use or manual override sessions.
