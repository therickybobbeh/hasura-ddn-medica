# Database Subgraph

This subgraph provides GraphQL access to your PostgreSQL database. It uses the Hasura PostgreSQL Native Data Connector (NDC) to automatically expose your database schema as a type-safe GraphQL API.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Directory Structure](#directory-structure)
4. [Database Connection](#database-connection)
5. [Introspection and Models](#introspection-and-models)
6. [Connection Pooling](#connection-pooling)
7. [Read Replicas](#read-replicas)
8. [Adding and Updating Models](#adding-and-updating-models)
9. [Permissions](#permissions)
10. [Performance Tuning](#performance-tuning)
11. [Troubleshooting](#troubleshooting)
12. [Further Reading](#further-reading)

---

## Overview

### What This Subgraph Does

**Automatically exposes**:
- Database tables as GraphQL queries and mutations
- Foreign keys as GraphQL relationships
- Database functions as GraphQL queries
- Views as read-only GraphQL queries
- Aggregation functions (count, sum, avg, etc.)

**Features**:
- Type-safe GraphQL schema from database schema
- Automatic relationship inference from foreign keys
- Complex filtering and sorting
- Pagination (limit/offset)
- Aggregations
- Connection pooling
- Read replica support

### Architecture

```
GraphQL Query
      ↓
Hasura DDN Engine
      ↓
PostgreSQL Connector (NDC)
      ↓
PostgreSQL Database
```

---

## Quick Start

### 1. Configure Database Connection

**Edit `.env.local`** (or appropriate environment file):

```bash
# TODO: Update with your actual database URL
DATABASE_URL=postgresql://user:password@host:5432/database_name

# Optional: Read replicas for scaling reads
# READ_REPLICA_1_URL=postgresql://user:password@replica1:5432/database_name
# READ_REPLICA_2_URL=postgresql://user:password@replica2:5432/database_name

# Connection pool settings
POSTGRES_POOL_MAX_CONNECTIONS=50
POSTGRES_POOL_TIMEOUT=30
POSTGRES_POOL_IDLE_TIMEOUT=180
```

### 2. Test Database Connection

```bash
# Test with psql
psql "$DATABASE_URL" -c "SELECT version();"

# Or with docker
docker run --rm postgres:15 psql "$DATABASE_URL" -c "SELECT version();"
```

### 3. Introspect Database Schema

```bash
# Discover all tables, views, and functions in your database
ddn connector introspect postgres --subgraph database

# This updates:
# - connector/postgres/configuration.json (with discovered schema)
```

### 4. Generate GraphQL Models

```bash
# Generate .hml files for all tables
ddn model add postgres '*' --subgraph database

# Or generate for specific tables only
ddn model add postgres 'users' --subgraph database
ddn model add postgres 'orders' --subgraph database
```

**Result**: Creates `.hml` files in `metadata/` directory.

### 5. Build and Deploy

```bash
# Build supergraph
ddn supergraph build local

# Build engine Docker image
./scripts/build-engine.sh v1.0.0

# Deploy to Kubernetes
./scripts/deploy-metadata.sh local v1.0.0
```

---

## Directory Structure

```
subgraphs/database/
├── README.md                          # This file
├── subgraph.yaml                      # Subgraph configuration
├── connector/
│   └── postgres/
│       ├── connector.yaml             # Connector manifest
│       ├── configuration.json         # Database schema introspection results
│       └── Dockerfile                 # (Optional) Custom connector build
└── metadata/
    ├── User.hml                       # Generated model files
    ├── Order.hml
    ├── OrderItem.hml
    └── ...                            # One .hml file per table/view
```

---

## Database Connection

### Connection String Format

**Standard PostgreSQL**:
```
postgresql://username:password@hostname:5432/database_name
```

**With SSL** (recommended for production):
```
postgresql://username:password@hostname:5432/database_name?sslmode=require
```

**Common providers**:

**Neon**:
```bash
DATABASE_URL=postgresql://user:pass@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Supabase**:
```bash
DATABASE_URL=postgresql://postgres:pass@db.abcdefghijk.supabase.co:5432/postgres
```

**AWS RDS**:
```bash
DATABASE_URL=postgresql://username:password@mydb.abcdefghijk.us-east-1.rds.amazonaws.com:5432/mydb
```

**Google Cloud SQL**:
```bash
DATABASE_URL=postgresql://username:password@/dbname?host=/cloudsql/project:region:instance
```

**Azure Database for PostgreSQL**:
```bash
DATABASE_URL=postgresql://username@servername:password@servername.postgres.database.azure.com:5432/dbname?sslmode=require
```

### Environment Variables

**Required**:
- `DATABASE_URL` - Primary database connection string

**Optional**:
- `READ_REPLICA_1_URL` - First read replica
- `READ_REPLICA_2_URL` - Second read replica
- `POSTGRES_POOL_MAX_CONNECTIONS` - Max connections (default: 50)
- `POSTGRES_POOL_TIMEOUT` - Connection timeout in seconds (default: 30)
- `POSTGRES_POOL_IDLE_TIMEOUT` - Idle connection timeout (default: 180)

---

## Introspection and Models

### What is Introspection?

**Introspection** = Discovering your database schema (tables, columns, types, relationships)

**When to introspect**:
- ✅ Initial setup
- ✅ After database schema changes (new tables, columns)
- ✅ To update relationship detection
- ❌ Don't introspect on every deployment (slow, unnecessary)

### Introspection Workflow

**Step 1: Run introspection**
```bash
ddn connector introspect postgres --subgraph database
```

**What it does**:
- Connects to database
- Queries `information_schema` tables
- Discovers tables, views, functions
- Detects foreign keys → relationships
- Updates `connector/postgres/configuration.json`

**Step 2: Review introspection results**
```bash
# Check what was discovered
cat connector/postgres/configuration.json | jq '.metadata.tables | keys'
```

**Step 3: Generate models from introspection**
```bash
# Generate all models
ddn model add postgres '*' --subgraph database

# Or selective generation
ddn model add postgres 'users,orders,products' --subgraph database
```

**Step 4: Add permissions to generated models**

Edit `.hml` files in `metadata/` and add permissions. See `examples/sample-models/User.hml` for examples.

### Selective Introspection

**Exclude specific schemas**:

Edit `connector/postgres/configuration.json`:
```json
{
  "introspectionOptions": {
    "excludedSchemas": [
      "information_schema",
      "pg_catalog",
      "internal_schema"  // Add your schema to exclude
    ]
  }
}
```

**Include only specific schemas**:
```json
{
  "introspectionOptions": {
    "unqualifiedSchemasForTables": [
      "public",
      "app_schema"  // Only introspect these schemas
    ]
  }
}
```

---

## Connection Pooling

### Why Connection Pooling?

**Without pooling**: Each GraphQL request = new database connection (slow, resource-intensive)

**With pooling**: Reuse connections across requests (fast, efficient)

### Configuration

**In `connector/postgres/configuration.json`**:

```json
{
  "connectionSettings": {
    "poolSettings": {
      "maxConnections": 50,        // Max connections in pool
      "poolTimeout": 30,            // Wait time for available connection (seconds)
      "idleTimeout": 180,           // Close idle connections after (seconds)
      "connectionLifetime": 600     // Close connection after (seconds)
    }
  }
}
```

### Tuning Pool Size

**Formula**: `maxConnections = (CPU cores * 2) + effective_spindle_count`

**Examples**:

**Development** (local, low traffic):
```json
{
  "poolSettings": {
    "maxConnections": 10,
    "poolTimeout": 10,
    "idleTimeout": 60
  }
}
```

**Production** (high traffic):
```json
{
  "poolSettings": {
    "maxConnections": 100,
    "poolTimeout": 30,
    "idleTimeout": 300
  }
}
```

**Read-heavy workload**:
- Increase `maxConnections`
- Use read replicas (see below)

**Write-heavy workload**:
- Moderate `maxConnections` (writes are slower)
- Consider application-level queuing

### Monitoring Pool Health

**Check active connections**:
```sql
SELECT count(*)
FROM pg_stat_activity
WHERE datname = 'your_database';
```

**Check connection limits**:
```sql
SHOW max_connections;
```

**Warning**: `maxConnections` in pool should be < database `max_connections`

---

## Read Replicas

### What are Read Replicas?

**Read replica** = Read-only copy of your database

**Use cases**:
- ✅ Scale read-heavy workloads
- ✅ Reduce load on primary database
- ✅ Geographic distribution
- ❌ Not for writes (read-only)

### Configuration

**Step 1: Add replica connection strings**

In `.env.local`:
```bash
DATABASE_URL=postgresql://user:pass@primary:5432/db
READ_REPLICA_1_URL=postgresql://user:pass@replica1:5432/db
READ_REPLICA_2_URL=postgresql://user:pass@replica2:5432/db
```

**Step 2: Configure in `configuration.json`**

```json
{
  "connectionSettings": {
    "connectionUri": {
      "variable": "DATABASE_URL"  // Primary for writes
    },
    "dynamicSettings": {
      "mode": "named",
      "connectionUris": {
        "map": {
          "primary": {
            "variable": "DATABASE_URL"  // Primary
          },
          "readReplica1": {
            "variable": "READ_REPLICA_1_URL"  // Replica 1
          },
          "readReplica2": {
            "variable": "READ_REPLICA_2_URL"  // Replica 2
          }
        }
      },
      "eagerConnections": true  // Connect to replicas on startup
    }
  }
}
```

**Step 3: Rebuild and deploy**

```bash
ddn supergraph build local
./scripts/build-engine.sh v1.0.1
./scripts/deploy-metadata.sh production v1.0.1
```

### How Routing Works

**Automatic routing**:
- Writes (mutations) → Primary database
- Reads (queries) → Load-balanced across primary + replicas

**No code changes needed** - routing is transparent!

### Read Replica Lag

**Problem**: Replicas may be slightly behind primary (replication lag)

**Symptoms**:
- User creates record, immediately queries, doesn't see it
- "Eventual consistency" issues

**Solutions**:

1. **Read from primary after writes** (in application logic)
2. **Add delay before read** (not recommended)
3. **Use primary for critical reads** (requires connector support)
4. **Accept eventual consistency** (best for most use cases)

---

## Adding and Updating Models

### Adding a New Table

**Scenario**: You added a new `products` table to your database.

**Step 1: Run introspection** (to discover new table)
```bash
ddn connector introspect postgres --subgraph database
```

**Step 2: Generate model**
```bash
ddn model add postgres 'products' --subgraph database
```

**Step 3: Add permissions** (edit `metadata/Product.hml`)

See `examples/sample-models/User.hml` for permission examples.

**Step 4: Build and deploy**
```bash
ddn supergraph build local
./scripts/build-engine.sh v1.0.1
./scripts/deploy-metadata.sh production v1.0.1
```

---

### Updating an Existing Table

**Scenario**: You added a `phone_number` column to the `users` table.

**Option 1: Re-introspect and regenerate** (destructive)
```bash
# This will OVERWRITE your User.hml file!
ddn connector introspect postgres --subgraph database
ddn model add postgres 'users' --subgraph database --force
```

⚠️ **Warning**: This overwrites your manual changes (permissions, etc.)

**Option 2: Manual update** (recommended)
```bash
# 1. Check database schema
psql "$DATABASE_URL" -c "\d users"

# 2. Manually edit metadata/User.hml
# Add the new field:
```

```yaml
kind: ObjectType
version: v1
definition:
  name: User
  fields:
    - name: id
      type: Uuid!
    - name: name
      type: String!
    - name: phone_number      # Add this
      type: String            # Add this
```

**Step 3: Build and deploy**
```bash
ddn supergraph build local
./scripts/build-engine.sh v1.0.1
./scripts/deploy-metadata.sh production v1.0.1
```

---

### Removing a Table

**Scenario**: You dropped the `old_logs` table from your database.

**Step 1: Delete `.hml` file**
```bash
rm metadata/OldLog.hml
```

**Step 2: Re-introspect** (to update connector config)
```bash
ddn connector introspect postgres --subgraph database
```

**Step 3: Build and deploy**
```bash
ddn supergraph build local
./scripts/build-engine.sh v1.0.1
./scripts/deploy-metadata.sh production v1.0.1
```

---

## Permissions

Permissions control who can access what data. See `examples/sample-models/README.md` for comprehensive permission guide.

### Quick Example

```yaml
---
# metadata/User.hml
kind: ModelPermissions
version: v1
definition:
  modelName: User
  permissions:
    # Admin role - full access
    - role: admin
      select:
        filter: null  # No filter = can see all users

    # User role - only see own record
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
```

**Common patterns**:
- User sees only their own data
- Organization-scoped data (multi-tenancy)
- Role-based access (admin, manager, user)
- Public vs private fields

**See**: `examples/sample-models/User.hml` for complete examples

---

## Performance Tuning

### 1. Database Indexes

**Query slow?** Check if you have indexes.

```sql
-- Find missing indexes
SELECT schemaname, tablename, attname
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct < 100
  AND null_frac < 0.5
ORDER BY schemaname, tablename, attname;
```

**Add indexes for**:
- Foreign keys (for relationships)
- Fields used in `where` filters
- Fields used in `order_by`
- Fields in session variable comparisons

```sql
-- Example: Add index for permission filtering
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Example: Add index for sorting
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

### 2. Connection Pool Tuning

**Symptoms of poor pool configuration**:
- Slow query times
- Connection timeouts
- High database connection count

**Check current connections**:
```sql
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
```

**Tune pool size**:
```json
{
  "poolSettings": {
    "maxConnections": 100,  // Increase if seeing timeouts
    "poolTimeout": 30,      // Increase if queries are slow
    "idleTimeout": 300      // Decrease to free connections faster
  }
}
```

### 3. Query Complexity Limits

Set limits in `globals/metadata/GraphqlConfig.hml`:

```yaml
# Prevent deeply nested queries
depthLimit:
  enabled: true
  maxDepth: 10  # Adjust based on schema

# Prevent overly complex queries
nodeLimit:
  enabled: true
  maxNodes: 500  # Adjust based on use case
```

### 4. Response Caching

Cache frequently accessed, slow-changing data:

```yaml
# globals/metadata/GraphqlConfig.hml
cache:
  enabled: true
  defaultTtl: 60  # Cache for 60 seconds
```

### 5. N+1 Query Prevention

**Problem**: Loading relationships in loops causes N+1 queries.

**Solution**: Hasura automatically batches relationship queries (no action needed)

**Verify**: Check database logs for query patterns.

---

## Troubleshooting

### "Cannot connect to database"

**Symptoms**:
- Connector fails to start
- GraphQL queries return connection errors

**Causes & Fixes**:

1. **Wrong connection string**
   ```bash
   # Test connection
   psql "$DATABASE_URL" -c "SELECT 1"
   ```

2. **Network/firewall issues**
   ```bash
   # Test network connectivity
   telnet your-db-host 5432
   # Or
   nc -zv your-db-host 5432
   ```

3. **SSL/TLS required**
   ```bash
   # Add sslmode to connection string
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

4. **Database not ready**
   - Check database status in your cloud provider
   - Check database logs

---

### "Table not showing in GraphQL"

**Causes & Fixes**:

1. **Not introspected**
   ```bash
   ddn connector introspect postgres --subgraph database
   ```

2. **No model generated**
   ```bash
   ddn model add postgres 'table_name' --subgraph database
   ```

3. **No permissions defined**
   - Add permissions to `.hml` file
   - See `examples/sample-models/User.hml`

4. **Schema not in introspection**
   - Check `configuration.json` → `introspectionOptions` → `excludedSchemas`
   - Ensure your schema is not excluded

5. **Supergraph not rebuilt**
   ```bash
   ddn supergraph build local
   ./scripts/build-engine.sh v1.0.1
   ./scripts/deploy-metadata.sh local v1.0.1
   ```

---

### "Permission denied" in queries

**Symptoms**:
```json
{
  "errors": [
    {
      "message": "Permission denied for field: users"
    }
  ]
}
```

**Causes & Fixes**:

1. **No permissions defined**
   - Add `ModelPermissions` to `.hml` file
   - Example: `examples/sample-models/User.hml`

2. **Wrong role**
   - Check JWT token contains correct `x-hasura-role`
   - Verify role matches permission definition

3. **Session variable mismatch**
   - Check JWT contains required session variables
   - Example: Permission uses `x-hasura-user-id` but token doesn't have it

4. **Filter too restrictive**
   - Review permission filter logic
   - Test with simpler filter first

---

### "Too many connections"

**Symptoms**:
- `FATAL: sorry, too many clients already`
- Connector errors about connection pool

**Causes & Fixes**:

1. **Pool size too high**
   ```json
   {
     "poolSettings": {
       "maxConnections": 20  // Reduce this
     }
   }
   ```

2. **Database max_connections too low**
   ```sql
   -- Check limit
   SHOW max_connections;

   -- Increase (requires restart)
   ALTER SYSTEM SET max_connections = 200;
   ```

3. **Connection leak**
   - Check for long-running queries
   - Review application connection management

4. **Multiple connectors**
   - Each connector has its own pool
   - Reduce pool size per connector

---

### "Slow queries"

**Debug steps**:

1. **Enable query logging**
   ```sql
   -- In PostgreSQL
   ALTER DATABASE your_db SET log_statement = 'all';
   ALTER DATABASE your_db SET log_duration = 'on';
   ```

2. **Check for missing indexes**
   ```sql
   -- Find slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Analyze query plan**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
   ```

4. **Add indexes**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   ```

---

## Further Reading

### Official Hasura DDN v3 Documentation

**PostgreSQL Connector**:
- [PostgreSQL Connector Overview](https://hasura.io/docs/3.0/connectors/postgresql/)
- [Connector Configuration](https://hasura.io/docs/3.0/connectors/postgresql/configuration/)
- [Connection Pooling](https://hasura.io/docs/3.0/connectors/postgresql/connection-pooling/)

**Models and Relationships**:
- [Models Overview](https://hasura.io/docs/3.0/schema/models/)
- [Relationships](https://hasura.io/docs/3.0/schema/relationships/)
- [Aggregations](https://hasura.io/docs/3.0/schema/aggregations/)

**Permissions**:
- [Permissions Overview](https://hasura.io/docs/3.0/auth/permissions/)
- [Row-Level Security](https://hasura.io/docs/3.0/auth/permissions/row-level-permissions/)
- [Column-Level Permissions](https://hasura.io/docs/3.0/auth/permissions/column-level-permissions/)

**Performance**:
- [Performance Best Practices](https://hasura.io/docs/3.0/performance/best-practices/)
- [Caching Guide](https://hasura.io/docs/3.0/caching/overview/)
- [Query Analysis](https://hasura.io/docs/3.0/observability/query-analysis/)

### PostgreSQL Resources

**Connection Pooling**:
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PgBouncer Guide](https://www.pgbouncer.org/usage.html)

**Performance Tuning**:
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [EXPLAIN Guide](https://www.postgresql.org/docs/current/using-explain.html)

### Related Documentation

- **Main README**: `../../README.md` - Project overview
- **Subgraphs**: `../README.md` - Understanding subgraphs
- **Examples**: `../../examples/sample-models/README.md` - Model and permission examples
- **QUICKSTART**: `../../QUICKSTART.md` - Getting started guide

---

## Questions?

**Common scenarios**:
- New to Hasura? Start with `../../QUICKSTART.md`
- Need permission examples? See `../../examples/sample-models/User.hml`
- Multiple databases? Create separate subgraphs (`subgraphs/postgres-analytics/`)
- Custom business logic? Add `subgraphs/business-logic/` (see `../../examples/typescript-connector/`)

**Need help?**
- [Hasura Discord](https://discord.com/invite/hasura) - #ddn-postgres channel
- [GitHub Discussions](https://github.com/hasura/graphql-engine/discussions)
- [PostgreSQL Community](https://www.postgresql.org/community/)
