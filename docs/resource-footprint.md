# Expected Resource Footprint

This guide gives a starting point for sizing a small, single-instance deployment. The repository does not include load-test results, so these figures are indicative planning values, not measured minimums or performance guarantees. Measure the service and PostgreSQL under representative traffic before committing to production capacity.

## Small deployment starting point

For one API/indexer process serving light to moderate traffic, start with:

| Component | Initial allocation |
|---|---|
| API and indexer | 1 vCPU and 512 MiB to 1 GiB RAM |
| PostgreSQL | 1 to 2 vCPU and 1 to 2 GiB RAM |
| PostgreSQL data volume | At least 10 GiB to start, with room to expand as indexed events accumulate |

These values assume one contract, ordinary API traffic, and no unusually large backfill or event backlog. A backfill, high concurrent read traffic, slow storage, or a large event history can require more CPU, memory, and disk. Keep the API and database on separate resource budgets when they run on separate hosts; the Docker Compose example defines separate containers but does not set container resource limits.

Watch API/container memory and CPU, PostgreSQL memory and CPU, database connections, query latency, and free disk space. Increase capacity based on observed peak use and growth rather than treating the starting values as limits.

## Database connections

The service creates one process-wide `PrismaClient` in `src/db.ts`, shared by the API routes and indexer. It does not create a new client for each request or event. Each running API replica therefore has one Prisma connection pool; total database connections can grow with the number of replicas, and a separate migration or replay process can open its own pool while it runs.

This repository uses Prisma ORM v6 with PostgreSQL and does not set `connection_limit` in its example `DATABASE_URL`. Prisma v6's default pool maximum is `num_physical_cpus * 2 + 1` per process. For example, a process seeing 2 physical CPUs can open up to 5 pool connections. Multiply the per-process limit by the maximum number of concurrently running replicas, then leave database capacity for administration, migrations, and other clients.

You can cap the pool in `DATABASE_URL` with the PostgreSQL `connection_limit` parameter, for example:

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE?connection_limit=5
```

Choose a limit that fits the database's connection budget across all replicas. The pool is a maximum; it does not mean every connection is continuously busy. See Prisma's [v6 connection pool documentation](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/connection-pool) for details.

## Storage growth and event volume

The `IndexedEvent` table keeps an audit row for each decoded contract event and has a primary key plus indexes on `(streamId, ledger)` and `ledger`. Event volume therefore drives ongoing PostgreSQL growth: more events mean more table rows, index entries, and write-ahead-log activity. The `Stream` table holds the latest state per stream, while `FailedEvent` holds unresolved failures and is typically much smaller; successful replay clears its failure row.

There is no fixed storage-per-event figure in this repository. Row size varies with event kind and populated payload fields, PostgreSQL row and index overhead, database settings, and vacuum behavior. A long backfill can cause faster disk growth while historical events are inserted. Plan disk using observed growth over a representative sample, including indexes and operational headroom, and monitor the database volume rather than extrapolating only from raw payload sizes.

To measure current table and index sizes in PostgreSQL:

```sql
SELECT
  relname AS table_name,
  pg_size_pretty(pg_table_size(relid)) AS table_size,
  pg_size_pretty(pg_indexes_size(relid)) AS indexes_size,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
WHERE relname IN ('IndexedEvent', 'Stream', 'FailedEvent', 'IndexerState')
ORDER BY pg_total_relation_size(relid) DESC;
```

For a growth estimate, record `IndexedEvent` total size and row count at two points around normal operation or a representative backfill, then use the observed bytes per added event for planning. The event history is intentionally retained for history and incident review; do not assume it is automatically pruned. Any retention or deletion policy should account for the API's event-history behavior and operational requirements.
