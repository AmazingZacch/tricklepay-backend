# Graceful Shutdown Ordering and Rationale

When the TricklePay backend process receives a termination signal (`SIGTERM` or `SIGINT`), it initiates a graceful shutdown sequence.

The sequence is strictly ordered in [`src/index.ts`](../src/index.ts) to guarantee zero data loss, prevent half-applied event pages, and ensure all in-flight HTTP requests complete cleanly.

---

## Shutdown Sequence

```
[Signal: SIGTERM / SIGINT]
       │
       ▼
1. poller.stop()          ───► Stop polling loop; finish active page & persist cursor
       │
       ▼
2. await app.close()      ───► Stop accepting new HTTP requests; drain in-flight requests
       │
       ▼
3. await disconnect()     ───► Drain and close Prisma database connection pool
       │
       ▼
4. process.exit(0)        ───► Process exits cleanly with code 0
```

---

## Step-by-Step Rationale

### Step 1: Stop the Indexer Poller (`poller.stop()`)
- **Action**: Signals the poller loop to stop initiating new poll ticks. If a poll tick is actively processing an event page, the poller is permitted to finish applying that page, execute database transactions, and persist the RPC cursor.
- **Why First?**: If the database or server were stopped before the poller, an active event batch would crash mid-transaction or fail cursor persistence, requiring re-indexing or reconciliation upon reboot.

### Step 2: Close the HTTP Server (`await app.close()`)
- **Action**: Instructs Fastify to close its listening sockets so no new incoming TCP connections are accepted. Fastify allows all active, in-flight HTTP requests to complete and send their responses to clients.
- **Why Second?**: Halting new traffic stops new database queries from being spawned, while allowing pending client queries to resolve against the database while it is still open.

### Step 3: Disconnect the Database Pool (`await disconnect()`)
- **Action**: Calls `prisma.$disconnect()` to gracefully drain all open connections in the PostgreSQL client pool.
- **Why Third?**: Because both the poller and the HTTP server have finished all active queries in steps 1 and 2, the connection pool can be terminated without cutting off running queries.

### Step 4: Clean Exit (`process.exit(0)`)
- **Action**: Terminates the Node.js runtime with exit code 0.

---

## Behavior for In-Flight Requests

When a shutdown signal arrives:
1. **Existing In-Flight Requests**: Continue processing uninterrupted. Handlers read from the database, compute vesting views, and return their HTTP response headers/body before Fastify terminates the connection.
2. **New Incoming Requests**: Rejected at the TCP socket layer as the listener stops accepting connections, allowing reverse proxies (e.g. Nginx, Kubernetes ingress) to failover or retry against healthy sibling instances.
