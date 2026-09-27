# Structured Logging and Log Fields

The TricklePay backend outputs all logs in newline-delimited JSON format using [Pino](https://github.com/pinojs/pino) via [`src/logger.ts`](../src/logger.ts) and Fastify's built-in request logger in [`src/server.ts`](../src/server.ts).

This consistent structure enables straightforward querying, filtering, and metric alerting in log aggregators (e.g., Datadog, Grafana Loki, CloudWatch).

---

## Log Severity Levels

Pino logs numeric severity levels in the `level` field:

| Numeric Level | Label | Description |
| --- | --- | --- |
| `10` | `trace` | Fine-grained internal debug events |
| `20` | `debug` | RPC request/response payloads and internal loop steps |
| `30` | `info` | Normal operational events (server startup, poll heartbeats, shutdowns) |
| `40` | `warn` | Deprecation notices, handled recoverable anomalies |
| `50` | `error` | Unhandled exceptions, failed RPC polls, request 500 errors |
| `60` | `fatal` | Fatal bootstrap crashes leading to immediate process exit |

Configured via the `LOG_LEVEL` environment variable (defaults to `info`).

---

## Common Log Fields (All Log Lines)

Every structured log entry contains the following base fields:

- **`level`** (`number`): The numeric log severity level (e.g. `30` for info, `50` for error).
- **`time`** (`number`): Unix epoch timestamp in milliseconds (e.g. `1790543180128`).
- **`pid`** (`number`): Process ID of the running Node.js instance.
- **`hostname`** (`string`): Hostname or container ID where the process is executing.
- **`msg`** (`string`): Human-readable summary of the logged event (e.g. `"incoming request"`, `"shutting down"`).
- **`module`** (`string`, optional): Component tag attached by child loggers (e.g. `indexer`, `chain`, `rpc`).

---

## Request-Specific Log Fields

HTTP request lifecycle logs emitted by Fastify attach additional context to trace requests end-to-end:

- **`reqId`** (`string`): Unique request identifier (forwarded from `x-request-id` header if safe, or a fresh UUID). Appears in all log lines generated during request processing and is echoed in the `x-request-id` response header and error bodies.
- **`req`** (`object`, on incoming request log):
  - `method` (`string`): HTTP verb (`GET`, `POST`, etc.).
  - `url` (`string`): Request URL path and query parameters (e.g. `/streams?limit=10`).
  - `host` (`string`): Host header received from client or proxy.
  - `remoteAddress` (`string`): Client IP address (or trusted forwarded IP if `trustProxy` matches).
  - `remotePort` (`number`): Client source TCP port.
- **`res`** (`object`, on request completion log):
  - `statusCode` (`number`): HTTP status code returned to client (e.g. `200`, `400`, `404`, `503`).
- **`responseTime`** (`number`, on request completion log): Duration in milliseconds from request receipt to response transmission.
- **`err`** (`object`, on 500 server errors):
  - `type` (`string`): Error constructor name.
  - `message` (`string`): Unredacted internal error message.
  - `stack` (`string`): Full stack trace for server-side troubleshooting.

---

## Example Log Entries

### Standard Info Log
```json
{
  "level": 30,
  "time": 1790543180000,
  "pid": 1234,
  "hostname": "tricklepay-app-1",
  "msg": "poller started"
}
```

### Request Completion Log
```json
{
  "level": 30,
  "time": 1790543180139,
  "pid": 1234,
  "hostname": "tricklepay-app-1",
  "reqId": "f79ff125-8c18-47bf-bae1-6940eaa1efb6",
  "res": { "statusCode": 200 },
  "responseTime": 9.16,
  "msg": "request completed"
}
```
