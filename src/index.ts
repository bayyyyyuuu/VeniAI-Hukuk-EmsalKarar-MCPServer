import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { config, logConfig, validateConfig } from "./config/config";
import { initDatabase, getDatabaseService } from "./services/database";
import { browserlessService } from "./services/browserless";
import { unifiedCache } from "./services/unified-cache";
import { yargitayRepository, Decision } from "./services/repository";

type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

const server = new Server(
  {
    name: "veniai-yargitay-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const tools = [
  {
    name: "yargitay_search_optimized",
    description: "Search Yargitay decisions with cache and Browserless scraping.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query."
        },
        refresh: {
          type: "boolean",
          description: "Force cache invalidation before searching."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "yargitay_health",
    description: "Health check for browserless, cache, and database.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "yargitay_stats",
    description: "Cache and database efficiency statistics.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "yargitay_popular",
    description: "List popular queries from the database.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of popular queries to return."
        }
      }
    }
  },
  {
    name: "yargitay_analytics",
    description: "Daily search analytics from the database.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to include."
        }
      }
    }
  },
  {
    name: "yargitay_cache_clear",
    description: "Clear expired cache entries (memory + database cleanup).",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request: { params: { name: string; arguments?: Record<string, unknown> } }) => {
  const name = request.params.name;
  const args = request.params.arguments ?? {};

  switch (name) {
    case "yargitay_search_optimized":
      return await handleSearch(args);
    case "yargitay_health":
      return await handleHealth();
    case "yargitay_stats":
      return await handleStats();
    case "yargitay_popular":
      return await handlePopular(args);
    case "yargitay_analytics":
      return await handleAnalytics(args);
    case "yargitay_cache_clear":
      return await handleCacheClear();
    default:
      return errorResult(`Unknown tool: ${name}`);
  }
});

function textResult(data: unknown): ToolResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

function errorResult(message: string, details?: unknown): ToolResponse {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: message, details }, null, 2)
      }
    ]
  };
}

function formatResults(results: Decision[]): string {
  if (results.length === 0) {
    return "No results found.";
  }

  return results
    .map((result, index) => {
      const content = result.icerik || "";
      const preview = content.substring(0, 1000);
      const suffix = content.length > 1000 ? "..." : "";

      return [
        `Result ${index + 1}`,
        `Sira No: ${result.siraNo}`,
        `Daire: ${result.daire}`,
        `Esas: ${result.esasNo || result.esas || ""}`,
        `Karar: ${result.kararNo || result.karar || ""}`,
        `Tarih: ${result.kararTarihi || result.tarih || ""}`,
        "Icerik:",
        `${preview}${suffix}`,
        "--------------------"
      ].join("\n");
    })
    .join("\n\n");
}

async function handleSearch(args: Record<string, unknown>): Promise<ToolResponse> {
  const query = typeof args.query === "string" ? args.query : "";
  const refresh = typeof args.refresh === "boolean" ? args.refresh : false;

  if (!query || query.trim().length < 2) {
    return errorResult("query must be a string with at least 2 characters");
  }

  const cleanQuery = query.trim();
  const startTime = Date.now();

  try {
    if (refresh) {
      await unifiedCache.invalidate(cleanQuery);
    }

    const cacheResult = await unifiedCache.get(cleanQuery);
    let results = cacheResult.data;
    let usedScrape = false;

    if (!results) {
      usedScrape = true;
      const scrapeResults = await browserlessService.searchYargitay(cleanQuery);
      results = scrapeResults.map((r: any) => ({
        siraNo: r.siraNo,
        daire: r.daire,
        esasNo: r.esas,
        kararNo: r.karar,
        kararTarihi: r.tarih,
        icerik: r.icerik,
        icerikLength: r.icerik?.length || 0
      }));

      unifiedCache.set(cleanQuery, results).catch(console.error);

      yargitayRepository
        .trackScraping({
          query: cleanQuery,
          success: true,
          durationMs: Date.now() - startTime,
          source: "scrape",
          resultCount: results.length
        })
        .catch(console.error);
    } else {
      yargitayRepository
        .trackScraping({
          query: cleanQuery,
          success: true,
          durationMs: Date.now() - startTime,
          source: cacheResult.source,
          resultCount: results.length
        })
        .catch(console.error);
    }

    const totalTime = Date.now() - startTime;
    const formatted = formatResults(results);

    return textResult({
      formatted,
      success: true,
      query: cleanQuery,
      results,
      metadata: {
        source: usedScrape ? "scrape" : cacheResult.source,
        cached: !usedScrape,
        age: cacheResult.metadata?.age,
        resultCount: results.length,
        totalTime
      }
    });
  } catch (error: any) {
    yargitayRepository
      .trackScraping({
        query: cleanQuery,
        success: false,
        durationMs: Date.now() - startTime,
        errorMessage: error?.message || String(error),
        source: "scrape",
        resultCount: 0
      })
      .catch(console.error);

    return errorResult("search failed", {
      message: error?.message || String(error)
    });
  }
}

async function handleHealth(): Promise<ToolResponse> {
  try {
    const browserlessHealth = await browserlessService.healthCheck();
    const cacheStats = await unifiedCache.getStats();
    let databaseHealthy = false;
    let databaseStats = null;

    try {
      const db = getDatabaseService();
      databaseHealthy = await db.healthCheck();
      databaseStats = db.getStats();
    } catch (error) {
      databaseHealthy = false;
      databaseStats = { error: "database not initialized" };
    }

    return textResult({
      status: browserlessHealth && databaseHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        browserless: {
          healthy: browserlessHealth,
          connection: browserlessService.getConnectionStatus()
        },
        cache: {
          healthy: true,
          stats: cacheStats
        },
        database: {
          healthy: databaseHealthy,
          stats: databaseStats
        }
      }
    });
  } catch (error: any) {
    return errorResult("health check failed", { message: error?.message || String(error) });
  }
}

async function handleStats(): Promise<ToolResponse> {
  const stats = await unifiedCache.getStats();

  return textResult({
    timestamp: new Date().toISOString(),
    stats,
    config: {
      database: config.database.type,
      scraping: {
        maxResults: config.scraping.maxResults,
        parallelRequests: config.scraping.parallelRequests
      }
    }
  });
}

async function handlePopular(args: Record<string, unknown>): Promise<ToolResponse> {
  const limit = typeof args.limit === "number" ? args.limit : 20;

  try {
    const results = await yargitayRepository.getPopularQueries(limit);
    return textResult({ results });
  } catch (error: any) {
    return errorResult("failed to load popular queries", { message: error?.message || String(error) });
  }
}

async function handleAnalytics(args: Record<string, unknown>): Promise<ToolResponse> {
  const days = typeof args.days === "number" ? args.days : 7;

  try {
    const results = await yargitayRepository.getSearchStats(days);
    return textResult({ results });
  } catch (error: any) {
    return errorResult("failed to load analytics", { message: error?.message || String(error) });
  }
}

async function handleCacheClear(): Promise<ToolResponse> {
  const cleaned = await unifiedCache.cleanup();
  return textResult({
    message: "cache cleanup completed",
    cleaned,
    timestamp: new Date().toISOString()
  });
}

async function bootstrap(): Promise<void> {
  validateConfig();
  logConfig();

  try {
    await initDatabase(config.database.url);
    console.log(">>> Database connected successfully");
  } catch (error) {
    console.error(">>> Failed to connect to database:", error);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

bootstrap().catch((error) => {
  console.error(">>> MCP server failed to start:", error);
  process.exit(1);
});
