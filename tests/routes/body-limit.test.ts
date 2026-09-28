import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

// The body limit is the service's first line of defence against oversized
// payloads, and it is configurable (`BODY_LIMIT`, default 1 MiB). Nothing
// asserted that the configured value is the one actually applied, so a
// deployment could set a limit and still be protected by nothing but
// Fastify's built-in default — which is what these tests pin down.
//
// `buildServer` takes the resolved config and Fastify applies the `bodyLimit`
// server option to every route on the instance. The service is a read API
// with no POST routes, so each test registers a trivial echo route on the
// built instance: that is the smallest thing that makes Fastify parse a
// request body, which is the step the limit guards.

const { buildServer } = await import("../../src/server.js");

/** A raw JSON payload of exactly `bytes` of request body. */
function payloadOfBytes(bytes: number): string {
  const overhead = Buffer.byteLength(JSON.stringify({ data: "" }), "utf8");
  return JSON.stringify({ data: "x".repeat(bytes - overhead) });
}

/** Builds a server with the given limit and a route that accepts a body. */
async function serverWithBodyLimit(bodyLimit: number): Promise<FastifyInstance> {
  const app = await buildServer({ bodyLimit });
  app.post("/echo", async () => ({ ok: true }));
  await app.ready();
  return app;
}

function post(app: FastifyInstance, payload: string) {
  return app.inject({
    method: "POST",
    url: "/echo",
    headers: { "content-type": "application/json" },
    payload,
  });
}

let app: FastifyInstance | undefined;
const extraServers: FastifyInstance[] = [];

afterEach(async () => {
  await app?.close();
  app = undefined;
  await Promise.all(extraServers.splice(0).map((server) => server.close()));
});

describe("request body size limit", () => {
  it("rejects a body larger than the configured limit", async () => {
    const limit = 1024;
    app = await serverWithBodyLimit(limit);

    const body = payloadOfBytes(limit + 1);
    expect(Buffer.byteLength(body, "utf8")).toBe(limit + 1);

    const response = await post(app, body);

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({ code: "REQUEST_ERROR" });
    expect(response.json().error).toMatch(/too large/i);
  });

  it("accepts a body at the configured limit", async () => {
    const limit = 1024;
    app = await serverWithBodyLimit(limit);

    const body = payloadOfBytes(limit);
    expect(Buffer.byteLength(body, "utf8")).toBe(limit);

    const response = await post(app, body);

    expect(response.statusCode).toBe(200);
  });

  it("applies the configured value rather than a fixed default", async () => {
    // The same body is rejected by one configuration and accepted by the
    // other. Only a server that applies its configured limit can tell them
    // apart: a hard-coded default would answer identically for both.
    const body = payloadOfBytes(4096);
    expect(Buffer.byteLength(body, "utf8")).toBe(4096);

    const strict = await serverWithBodyLimit(1024);
    const permissive = await serverWithBodyLimit(65536);
    extraServers.push(strict, permissive);

    const rejected = await post(strict, body);
    const accepted = await post(permissive, body);

    expect(rejected.statusCode).toBe(413);
    expect(accepted.statusCode).toBe(200);
  });

  it("takes the limit from BODY_LIMIT through the config loader", async () => {
    // End to end over the configuration path a deployment actually uses: the
    // environment variable selects the limit, and the server is built from
    // the config it produces.
    const { loadConfig } = await import("../../src/config.js");
    const saved = {
      DATABASE_URL: process.env.DATABASE_URL,
      STREAM_CONTRACT_ID: process.env.STREAM_CONTRACT_ID,
      NETWORK: process.env.NETWORK,
      BODY_LIMIT: process.env.BODY_LIMIT,
    };
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.STREAM_CONTRACT_ID = "CDMB62RVYAXJJNYYH7K442SHSAJIXTZ6K7JANGSMQF2T7MHCTVSK75SW";
    process.env.NETWORK = "testnet";
    process.env.BODY_LIMIT = "2048";

    try {
      const config = loadConfig();
      expect(config.bodyLimit).toBe(2048);

      app = await buildServer(config);
      app.post("/echo", async () => ({ ok: true }));
      await app.ready();

      const overLimit = await post(app, payloadOfBytes(2049));
      const atLimit = await post(app, payloadOfBytes(2048));

      expect(overLimit.statusCode).toBe(413);
      expect(atLimit.statusCode).toBe(200);
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
