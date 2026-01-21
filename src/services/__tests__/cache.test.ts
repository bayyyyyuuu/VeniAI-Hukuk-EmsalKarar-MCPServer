import { describe, it, expect, beforeEach, vi } from "vitest";
import { CacheService } from "../cache";

describe("CacheService", () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  it("should store and retrieve data", () => {
    const key = "test-key";
    const data = { foo: "bar" };

    cache.set(key, data);
    const result = cache.get(key);

    expect(result).toEqual(data);
  });

  it("should return null for non-existent keys", () => {
    const result = cache.get("missing");
    expect(result).toBeNull();
  });

  it("should expire items after TTL", () => {
    vi.useFakeTimers();
    const key = "temp";
    const data = "val";
    const ttl = 1000; // 1s

    cache.set(key, data, ttl);

    // Advance time by 2s
    vi.advanceTimersByTime(2000);

    const result = cache.get(key);
    expect(result).toBeNull();

    vi.useRealTimers();
  });

  it("should track stats correctly", () => {
    cache.get("miss1");
    cache.set("hit1", "data");
    cache.get("hit1");

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
  });
});
