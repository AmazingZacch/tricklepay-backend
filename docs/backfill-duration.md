# Backfill Duration Expectations

When the indexer starts from an early ledger — a fresh deployment with
[`INDEXER_START_LEDGER`](indexer-start-ledger.md) set well before the chain
head, or a re-index from scratch — it can spend anywhere from seconds to hours
catching up before it looks "caught up" in [`GET /status`](../README.md#api).
A service that appears idle during this stretch is not stuck; this document
explains what determines how long it takes and how to tell how much is left.

## What affects backfill duration

### 1. The ledger range to scan

The single biggest factor is the distance between the starting point —
`INDEXER_START_LEDGER`, or a saved cursor if one exists — and the chain head
at the time the backfill begins. This is exactly what
[`lagLedgers`](indexer-lag.md) measures. A start ledger set far before the
contract was deployed (see [Choosing a start
ledger](indexer-start-ledger.md#what-happens-when-set-too-low)) adds ledgers
to scan that contain no relevant events at all, which lengthens the backfill
without adding any data.

### 2. How much contract activity is in that range

The indexer fetches events, not ledgers: each call to `getContractEvents`
(`src/chain/rpc.ts`) asks the Soroban RPC for up to `EVENT_PAGE_LIMIT` (100)
matching `created`/`withdrawn`/`cancelled` events at a time, and the RPC scans
forward through ledgers on the indexer's behalf until it fills that page or
reaches the chain head. A ledger range with dense stream activity takes more
pages — and therefore more RPC round trips — than the same range on a quiet
contract, even though both cover the same number of ledgers.

### 3. RPC round-trip latency

Each page is one network round trip to the Soroban RPC endpoint
(`SOROBAN_RPC_URL`). During a backfill, `Poller.tick` (`src/indexer/poller.ts`)
fetches pages back-to-back with no delay between them — sleeping between pages
would cap a hundred-thousand-event backfill at one page per poll interval,
turning minutes of work into hours. So overall duration scales directly with
per-page RPC latency times the number of pages needed.

### 4. Reconciliation reads

If a `withdrawn` or `cancelled` event arrives for a stream the database
doesn't have yet — typically because `INDEXER_START_LEDGER` was set after that
stream's `created` event — `applyEvent` (`src/indexer/apply.ts`) falls back to
one `get_stream` RPC call to read the stream's full on-chain state. This is
one extra round trip per affected stream (not per event), but a start ledger
chosen too late can trigger many of these across a backfill; see [Indexer
Start Ledger: what happens when set too high](indexer-start-ledger.md#what-happens-when-set-too-high).

### 5. Per-event database writes

Every decoded event costs one `IndexedEvent` insert plus one transactional
`Stream` write (`Poller.applyPage`). This is deliberately cheap — one query,
no chain round-trip per event — which is what makes replaying history fast
compared to simulating each event against the contract. Database latency
still multiplies by the number of events applied, so a slow or
connection-starved Postgres instance lengthens the backfill.

### 6. The per-tick page cap and poll interval

`INDEXER_MAX_PAGES_PER_TICK` (default 1000, `src/config.ts`) bounds how many
pages a single tick fetches before the poller returns and sleeps for
`INDEXER_POLL_INTERVAL_MS` (default 5000ms). A backlog large enough to exceed
this cap in one tick — at the defaults, roughly 100,000 events — resumes on
the next tick from the saved cursor rather than stalling, but it pays the poll
interval as idle time between each batch of that size. Raising
`INDEXER_MAX_PAGES_PER_TICK` (and confirming the RPC and database can sustain
the resulting throughput) reduces that idle time for very large backfills.

### External RPC constraints

The event range an RPC provider is willing to scan on a single `getEvents`
call, and how far back it retains events at all, is a property of the RPC
deployment rather than this codebase. Confirm those limits with your RPC
provider before setting a very old `INDEXER_START_LEDGER`.

## How to estimate remaining progress

There is no single "percent complete" figure, but `lagLedgers` — returned by
[`GET /status`](../README.md#api) and exposed as the
`tricklepay_indexer_lag_ledgers` gauge on [`GET
/metrics`](../README.md#metrics) — is the number to watch. It reports the gap
between the chain head and the highest ledger the indexer has actually applied
(see [Understanding the Indexer Lag Figure](indexer-lag.md) for the full
definition), and during a backfill it shrinks over time.

To estimate time remaining:

1. Sample `lagLedgers` (or `tricklepay_indexer_lag_ledgers`) at two points in
   time, a few minutes apart.
2. Compute the rate of decrease: `(lag_at_t1 - lag_at_t2) / (t2 - t1)`,
   ledgers per second.
3. Divide the current `lagLedgers` by that rate to project the remaining
   duration.

Before trusting that projection, confirm the indexer is actually making
progress rather than stalled: check that `indexer.updatedAt` in `GET /status`
is advancing between samples. A `lagLedgers` value that is large but not
shrinking, alongside an `updatedAt` that isn't moving, means the indexer has
stopped rather than that it is almost done — see [Indexer Lag: distinguishing
"caught up but quiet" from "genuinely behind"](indexer-lag.md#how-to-distinguish-caught-up-but-quiet-from-genuinely-behind)
and the [stalled-indexer runbook](indexer-stalled-runbook.md) if it has.

`tricklepay_indexer_pages_fetched_total` and
`tricklepay_indexer_events_applied_total` (both on `GET /metrics`) are useful
supplementary signals: a steadily increasing rate on either confirms the
indexer is actively working through the backlog, independent of the lag
figure itself.

## The metric that shows progress

**`lagLedgers`** (`GET /status`) / **`tricklepay_indexer_lag_ledgers`**
(`GET /metrics`) is the metric to graph. It is the authoritative measure of
backfill progress: it falls as the indexer applies ledgers with events, and it
reaches a small, stable value once the indexer has caught up to the chain
head (it does not necessarily reach exactly zero on a quiet contract — see
[Indexer Lag](indexer-lag.md) for why).

## Related documentation

- [Indexer Start Ledger](indexer-start-ledger.md) — choosing where a backfill begins.
- [Understanding the Indexer Lag Figure](indexer-lag.md) — the full definition of `lagLedgers` and what it does and doesn't imply.
- [Indexer Stalled Runbook](indexer-stalled-runbook.md) — recovery steps if progress stops advancing.
- [Indexer Retry & Backoff](indexer-retry-backoff.md) — how poll failures affect timing during a backfill.
