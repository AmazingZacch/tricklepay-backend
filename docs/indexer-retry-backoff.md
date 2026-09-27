# Indexer Retry and Backoff

The indexer polls Soroban RPC on a fixed interval while healthy. If a poll iteration fails, it logs the error, records a poll error, and retries after an exponentially increasing delay. This slows repeated requests to an unavailable RPC provider while allowing the poller to recover without an operator restart.

## Retry timing

`INDEXER_POLL_INTERVAL_MS` sets the normal delay between completed poll iterations. It defaults to **5,000 ms** and must be an integer of at least **1,000 ms**.

After each consecutive failed iteration, the next delay is:

```text
min(INDEXER_POLL_INTERVAL_MS × 2^consecutive_failures, INDEXER_BACKOFF_MAX_MS)
```

`INDEXER_BACKOFF_MAX_MS` defaults to **60,000 ms** and must be an integer of at least **1,000 ms**. The ceiling is configurable independently of the poll interval. The delay has no jitter, so instances configured identically may retry on similar schedules.

With the defaults, consecutive failures are followed by delays of **10 seconds, 20 seconds, 40 seconds, then 60 seconds**; further failures remain at 60 seconds. A successful poll resets the failure count, and the next delay returns to the normal 5-second interval.

| Consecutive failed iterations | Delay with defaults |
|---:|---:|
| 1 | 10 seconds |
| 2 | 20 seconds |
| 3 | 40 seconds |
| 4 or more | 60 seconds |

The poll loop catches iteration errors and continues retrying. The `poll iteration failed` log message and `tricklepay_indexer_poll_errors_total` metric indicate these failures. `tricklepay_rpc_errors_total{operation="getContractEvents"}` counts errors specifically from fetching contract-event pages; not every failed poll is necessarily an RPC fetch error.

## Startup behavior

The retry loop only handles failures after the poller has resolved its starting position. The configured RPC endpoint is checked before the server starts; if that check fails, service startup fails. The poller then resolves its initial position before entering the retry loop. If this position lookup fails, the poller stops and logs `indexer stopped`; it does not retry that startup lookup, while the HTTP server may still start. Once the poll loop is running, a transient RPC error is retried using the delays above.

## Configuration

Set these variables in the service environment:

```dotenv
INDEXER_POLL_INTERVAL_MS=5000
INDEXER_BACKOFF_MAX_MS=60000
```

Increasing the interval reduces normal RPC polling frequency as well as the starting point for retry delays. Increasing the maximum backoff reduces retry frequency during a sustained outage but can lengthen recovery detection. Both values are validated as integers with a minimum of 1,000 ms. See [`src/config.ts`](../src/config.ts) for defaults and validation, and [`src/indexer/poller.ts`](../src/indexer/poller.ts) for the retry loop and delay calculation.
