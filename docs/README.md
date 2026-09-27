# Documentation Index

This directory contains technical documentation and operational guides for the TricklePay backend service:

- [api-error-codes.md](api-error-codes.md): Reference for the stable, machine-readable error codes returned in API failures and their response shape.
- [database-schema.md](database-schema.md): PostgreSQL schema reference covering models (`Stream`, `IndexedEvent`, `FailedEvent`, `IndexerState`), field definitions, types, indexes, and persistence logic.
- [event-replay.md](event-replay.md): Operator guide for the event replay recovery CLI tool (`npm run replay-failed-events`), detailing how to inspect, dry-run, and reprocess failed events.
- [failed-events-retention.md](failed-events-retention.md): Recommended data retention windows and SQL cleanup instructions for pruning unresolved records from the `FailedEvent` table.
- [glossary.md](glossary.md): Terminology definitions for domain and indexer concepts, including cursors, ledgers, backfill, lag, and event application.
- [indexer-failure-policy.md](indexer-failure-policy.md): Explanation of the skip-and-record failure policy, the liveness vs. completeness trade-off, and where failed events are recorded for operator review.
- [indexer-start-ledger.md](indexer-start-ledger.md): Guide for choosing the `INDEXER_START_LEDGER` configuration value for new deployments, explaining the trade-offs between backfill duration and historical data completeness.
- [request-ids.md](request-ids.md): Documentation on Request ID behavior, client-supplied header validation (`x-request-id`), and traceability in responses and logs.
