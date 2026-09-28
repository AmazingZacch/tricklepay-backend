# Database Requirements & Versioning

To ensure full compatibility with TricklePay backend migrations, Prisma ORM queries, and indexing performance, operators must deploy against a supported PostgreSQL version.

---

## 1. Minimum Supported Database Version

* **Minimum Supported Version**: **PostgreSQL 15.0** (or higher)
* **Compose Alignment**: This version strictly aligns with the official `postgres:15-alpine` image specified in the repository's `docker-compose.yml` setup.

---

## 2. Dependencies on PostgreSQL 15+

TricklePay utilizes specific features and performance optimizations introduced in PostgreSQL 15:

1. **`gen_random_uuid()` Native Functionality**:
   * Our UUID primary key generation relies on the built-in cryptographic functions standard in PostgreSQL 13+, fully leveraged across core migration tables.
2. **Improved JSON / JSONB Indexing & Querying**:
   * Indexer payloads and Soroban event metadata store complex JSON structures that utilize modern JSONB operators for high-throughput querying.
3. **Advanced Locking and Concurrency (MERGE / UPSERT enhancements)**:
   * Stream ingestion routines utilize advanced upsert clauses (`ON CONFLICT ... DO UPDATE`) optimized in PostgreSQL 15 to prevent race conditions during parallel event indexing.