import Fastify from "fastify";

import { beforeEach, describe, expect, it, vi } from "vitest";

// Tests for the status route server-side cache: the no-store header, hits
// within the TTL window, and fresh values once the TTL has elapsed.

const indexerState = vi.hoisted(() => ({
  getIndexerPosition: vi.fn(),
  saveIndexerPosition: vi.fn(),
}));

const failedEvents = vi.hoisted(() => ({
  recordFailedEvent: vi.fn(),
  clearFailedEvent: vi.fn(),
  listFailedEvents: vi.fn(),
  countFailedEvents: vi.fn(),
  failedEventFromDecoded: vi.fn(),
}));

vi.mock("../../src/repositories/indexer-state.js", () => indexerState);
vi.mock("../../src/repositories/failed-events.js", () => failedEvents);

const { statusRoutes } = await import("../../src/routes/status.js");

// Build an isolated Fastify instance with a custom TTL so tests can exercise
// cache expiry without sleeping for the production 2 s window.
async function buildApp(cacheTtlMs: number) {
  const app = Fastify();
  await app.register(statusRoutes, { cacheTtlMs });
  return app;
}

async function getStatus(app: Awaited<ReturnType<typeof buildApp>>) {
  return app.inject({ method: "GET", url: "/status" });
}

const POSITION_A = {
  lastLedger: 56_000_000,
  chainLedger: 56_999_999,
  cursor: "0241763773516349440-0000000001",
  updatedAt: new Date("2025-11-14T03:00:00.000Z"),
};

const POSITION_B = {
  lastLedger: 57_000_000,
  chainLedger: 57_500_000,
  cursor: "0241763773516349440-0000000002",
  updatedAt: new Date("2025-11-14T04:00:00.000Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
  failedEvents.countFailedEvents.mockResolvedValue(0);
});

describe("GET /status", () => {
  it("returns no-store cache-control header", async () => {
    indexerState.getIndexerPosition.mockResolvedValue(null);
    const app = await buildApp(500);
    try {
      const response = await getStatus(app);
      expect(response.headers["cache-control"]).toBe("no-store");
    } finally {
      await app.close();
    }
  });

  it("serves a cached value within the TTL window", async () => {
    // First request populates the cache with POSITION_A.
    indexerState.getIndexerPosition.mockResolvedValue(POSITION_A);
    const app = await buildApp(60_000); // 60 s TTL — will not expire during this test
    try {
      const first = await getStatus(app);
      expect(first.statusCode).toBe(200);
      expect(first.json().indexer.lastLedger).toBe(56_000_000);

      // Switch the mock to POSITION_B. Because the cache has not expired, the
      // route must still return the previously cached POSITION_A value.
      indexerState.getIndexerPosition.mockResolvedValue(POSITION_B);

      const second = await getStatus(app);
      expect(second.statusCode).toBe(200);
      expect(second.json().indexer.lastLedger).toBe(56_000_000);

      // The repository should only have been called once (on the first request).
      expect(indexerState.getIndexerPosition).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it("serves a fresh value once the TTL has elapsed", async () => {
    // Use an expired TTL so every request is treated as a cache miss.
    indexerState.getIndexerPosition.mockResolvedValue(POSITION_A);
    const app = await buildApp(0); // 0 ms TTL — every request is a cache miss
    try {
      const first = await getStatus(app);
      expect(first.statusCode).toBe(200);
      expect(first.json().indexer.lastLedger).toBe(56_000_000);

      // With the TTL at 0 the cache entry is immediately stale. Switch the
      // mock — the next request must fetch fresh data and return POSITION_B.
      indexerState.getIndexerPosition.mockResolvedValue(POSITION_B);

      const second = await getStatus(app);
      expect(second.statusCode).toBe(200);
      expect(second.json().indexer.lastLedger).toBe(57_000_000);

      // Both requests must have hit the repository.
      expect(indexerState.getIndexerPosition).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });
});
