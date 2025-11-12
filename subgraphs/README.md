# Subgraphs

This directory contains all **subgraphs** for your Hasura DDN v3 supergraph. Each subdirectory represents an independent domain or data source that contributes to your unified GraphQL API.

## Table of Contents

1. [What is a Subgraph?](#what-is-a-subgraph)
2. [When to Create a Subgraph](#when-to-create-a-subgraph)
3. [Directory Structure](#directory-structure)
4. [Creating a New Subgraph](#creating-a-new-subgraph)
5. [Subgraph Patterns](#subgraph-patterns)
6. [Naming Conventions](#naming-conventions)
7. [Cross-Subgraph Relationships](#cross-subgraph-relationships)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Further Reading](#further-reading)

---

## What is a Subgraph?

A **subgraph** is an independent unit within your supergraph that represents:
- A data source (database, API, etc.)
- A domain or business capability
- A microservice boundary

**Think of it as**: A microservice in your GraphQL federation.

**Key characteristics**:
- ✅ **Independent**: Can be developed and tested separately
- ✅ **Composable**: Multiple subgraphs combine into one unified API
- ✅ **Isolated**: Changes to one subgraph don't break others (usually)
- ✅ **Deployable**: Can be versioned and deployed independently

### Supergraph vs Subgraph

```
┌─────────────────────────────────────────────────────────┐
│                    SUPERGRAPH                           │
│              (Unified GraphQL API)                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  SUBGRAPH 1  │  │  SUBGRAPH 2  │  │  SUBGRAPH 3  │ │
│  │              │  │              │  │              │ │
│  │   Database   │  │   Business   │  │  External    │ │
│  │              │  │    Logic     │  │     API      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## When to Create a Subgraph

### Create a Subgraph When:

**Different data source**:
- ✅ New PostgreSQL database
- ✅ MongoDB collection
- ✅ REST API wrapper
- ✅ Third-party service (Stripe, Twilio, etc.)

**Different domain**:
- ✅ User management vs order management
- ✅ Core product vs analytics
- ✅ Public API vs internal API

**Different team ownership**:
- ✅ Team A owns user data, Team B owns billing data
- ✅ Platform team vs product teams
- ✅ Different deployment schedules

**Different lifecycle**:
- ✅ Stable core functionality vs experimental features
- ✅ Different versioning requirements
- ✅ Different SLA requirements

### DON'T Create a Subgraph When:

**Same data source, related tables**:
- ❌ `users` and `profiles` tables in same DB → Same subgraph
- ❌ `orders` and `order_items` tables → Same subgraph
- Use: Relationships within the same subgraph

**Organizational convenience only**:
- ❌ "Let's split models by initial letter" → No real benefit
- ❌ "We have too many files" → Use better organization within subgraph

**Premature optimization**:
- ❌ "We might use a different database someday" → Wait until you need it
- ❌ Start with fewer subgraphs, split later when needed

---

## Directory Structure

### Current Subgraphs

```
subgraphs/
├── README.md         # This file
└── database/         # PostgreSQL database subgraph
    ├── README.md     # Database-specific documentation
    ├── subgraph.yaml # Subgraph configuration
    ├── connector/    # Database connector config
    │   └── postgres/
    │       ├── connector.yaml
    │       └── configuration.json
    └── metadata/     # Generated .hml model files
        ├── User.hml
        ├── Order.hml
        └── ...
```

### Example: Multiple Subgraphs

```
subgraphs/
├── database/              # Primary PostgreSQL database
│   ├── subgraph.yaml
│   └── metadata/
│
├── analytics/             # Analytics database (separate)
│   ├── subgraph.yaml
│   └── metadata/
│
├── business-logic/        # Custom TypeScript functions
│   ├── subgraph.yaml
│   ├── connector/
│   └── metadata/
│
└── stripe-api/            # Stripe REST API wrapper
    ├── subgraph.yaml
    ├── connector/
    └── metadata/
```

---

## Creating a New Subgraph

### Method 1: Using DDN CLI (Recommended)

**Step 1: Initialize subgraph**
```bash
# From project root
ddn subgraph init my-subgraph

# This creates:
# subgraphs/my-subgraph/
# ├── subgraph.yaml
# └── connector/
```

**Step 2: Add to supergraph.yaml**
```yaml
# supergraph.yaml
definition:
  name: my-api
  subgraphs:
    - globals
    - database
    - my-subgraph  # Add your new subgraph here
```

**Step 3: Add connector (if needed)**
```bash
cd subgraphs/my-subgraph

# For database connector
ddn connector init postgres \
  --subgraph my-subgraph \
  --configure-port 8081

# For custom TypeScript connector
ddn connector init typescript \
  --subgraph my-subgraph \
  --configure-port 8082
```

**Step 4: Add metadata**
```bash
# For database: Introspect and generate models
ddn connector introspect postgres
ddn model add postgres '*'

# For custom connector: Manually create .hml files
# See examples/sample-models/README.md
```

**Step 5: Build and test**
```bash
ddn supergraph build local

# Verify compilation
ls engine/build/
# Should see: open_dd.json, metadata.json, auth_config.json
```

---

### Method 2: Manual Setup

**Step 1: Create directory structure**
```bash
mkdir -p subgraphs/my-subgraph/metadata
mkdir -p subgraphs/my-subgraph/connector
```

**Step 2: Create subgraph.yaml**
```yaml
---
# subgraphs/my-subgraph/subgraph.yaml
kind: Subgraph
version: v2
definition:
  name: my-subgraph
  description: "My custom subgraph"

  generator:
    # Preserve naming from source
    namingConvention: none

    # Optional: Add prefix to avoid naming conflicts
    graphqlTypeNamePrefix: "MySubgraph"

  # Include paths for metadata
  includePaths:
    - metadata
    - connector

  # Environment variable mappings
  envMapping:
    MY_API_KEY:
      fromEnv: MY_API_KEY
```

**Step 3: Add connector configuration** (if using a connector)

See connector-specific docs for configuration details.

**Step 4: Create metadata files**

Create `.hml` files in `metadata/` directory. See `examples/sample-models/README.md` for examples.

**Step 5: Add to supergraph and build**
```bash
# Edit supergraph.yaml to include new subgraph
# Then build
ddn supergraph build local
```

---

## Subgraph Patterns

### Pattern 1: Database Subgraph

**Use case**: Expose database tables as GraphQL types

**Structure**:
```
subgraphs/database/
├── subgraph.yaml
├── connector/
│   └── postgres/
│       ├── connector.yaml         # Connector definition
│       └── configuration.json     # Connection settings
└── metadata/
    ├── User.hml                   # Generated from introspection
    ├── Order.hml
    └── OrderItem.hml
```

**Workflow**:
1. Connect to database
2. Introspect schema: `ddn connector introspect postgres`
3. Generate models: `ddn model add postgres '*'`
4. Add permissions to `.hml` files
5. Build supergraph

**Example subgraph.yaml**:
```yaml
kind: Subgraph
version: v2
definition:
  name: database
  description: "Primary PostgreSQL database"

  generator:
    namingConvention: none

  includePaths:
    - metadata
    - connector

  envMapping:
    DATABASE_URL:
      fromEnv: DATABASE_URL
```

---

### Pattern 2: Business Logic Subgraph

**Use case**: Custom TypeScript/Python functions for business rules

**Structure**:
```
subgraphs/business-logic/
├── subgraph.yaml
├── connector/
│   └── typescript/
│       ├── connector.yaml
│       ├── src/
│       │   ├── index.ts
│       │   └── functions/
│       │       ├── calculate-tax.ts
│       │       └── validate-order.ts
│       ├── package.json
│       └── Dockerfile
└── metadata/
    ├── CalculateTax.hml          # Function definitions
    └── ValidateOrder.hml
```

**Workflow**:
1. Copy example connector: `cp -r examples/typescript-connector subgraphs/business-logic/connector/typescript`
2. Implement your functions
3. Create `.hml` files for each function
4. Build Docker image
5. Build supergraph

**Example function in HML**:
```yaml
---
kind: Command
version: v1
definition:
  name: calculateTax
  description: "Calculate tax for an order"

  arguments:
    - name: orderId
      type: String!
    - name: region
      type: String!

  outputType: TaxCalculation!

  source:
    dataConnectorName: typescript_connector
    functionName: calculateTax
```

**See**: `examples/typescript-connector/HOW_TO_USE.md` for complete guide

---

### Pattern 3: REST API Wrapper Subgraph

**Use case**: Expose third-party REST APIs as GraphQL

**Structure**:
```
subgraphs/stripe-api/
├── subgraph.yaml
├── connector/
│   └── rest/
│       ├── connector.yaml
│       └── openapi.yaml           # OpenAPI spec
└── metadata/
    ├── Customer.hml
    ├── Payment.hml
    └── Subscription.hml
```

**Workflow**:
1. Get OpenAPI/Swagger spec from API provider
2. Initialize REST connector: `ddn connector init rest`
3. Configure connector with API spec
4. Generate models from spec
5. Add authentication headers
6. Build supergraph

**Example connector.yaml**:
```yaml
kind: Connector
version: v2
definition:
  name: stripe_api

  source:
    hasuraHubConnector:
      connectorId: hasura/rest
      version: v1.0.0

  envMapping:
    STRIPE_API_KEY:
      fromEnv: STRIPE_API_KEY
    STRIPE_API_URL:
      fromEnv: STRIPE_API_URL
```

---

### Pattern 4: MongoDB Subgraph

**Use case**: NoSQL document database

**Structure**:
```
subgraphs/mongodb/
├── subgraph.yaml
├── connector/
│   └── mongo/
│       ├── connector.yaml
│       └── configuration.json
└── metadata/
    ├── Product.hml
    └── Review.hml
```

**Workflow**:
1. Initialize MongoDB connector: `ddn connector init mongodb`
2. Configure connection string
3. Introspect collections
4. Generate models
5. Build supergraph

**Example connector.yaml**:
```yaml
kind: Connector
version: v2
definition:
  name: mongodb_connector

  source:
    hasuraHubConnector:
      connectorId: hasura/mongodb
      version: v1.0.0

  envMapping:
    MONGODB_URL:
      fromEnv: MONGODB_URL
```

---

### Pattern 5: Multi-Database Subgraph

**Use case**: Multiple databases for different purposes

**Structure**:
```
subgraphs/
├── postgres-primary/       # Main transactional database
│   └── metadata/
│       ├── User.hml
│       └── Order.hml
│
├── postgres-analytics/     # Read-heavy analytics database
│   └── metadata/
│       ├── DailySales.hml
│       └── UserMetrics.hml
│
└── redis-cache/            # Cache layer
    └── metadata/
        └── CachedData.hml
```

**When to use**:
- Different performance characteristics (OLTP vs OLAP)
- Different scaling requirements
- Different data retention policies

---

## Naming Conventions

### Subgraph Names

**Guidelines**:
- Use lowercase with hyphens: `user-service`, `order-management`
- Be descriptive but concise: `database` not `db`, `business-logic` not `bl`
- Match domain language: `payments` not `stripe-wrapper`
- Avoid version numbers: `analytics` not `analytics-v2` (use Git tags instead)

**Good examples**:
- ✅ `database` - Primary database
- ✅ `analytics` - Analytics database
- ✅ `auth-service` - Authentication service
- ✅ `payment-processor` - Payment processing logic
- ✅ `notification-service` - Notification system

**Bad examples**:
- ❌ `db` - Too cryptic
- ❌ `mySubgraph` - Not descriptive
- ❌ `subgraph_1` - Meaningless
- ❌ `new-database` - "New" is relative
- ❌ `johns-api` - Personal names

### GraphQL Type Prefixes

Use `graphqlTypeNamePrefix` to avoid naming conflicts:

```yaml
# subgraphs/analytics/subgraph.yaml
definition:
  name: analytics

  generator:
    # Prefix all types with "Analytics"
    graphqlTypeNamePrefix: "Analytics"
```

**Result**:
```graphql
# Without prefix (conflict with main database)
type User { ... }

# With prefix (no conflict)
type AnalyticsUser { ... }
```

**When to use**:
- Multiple subgraphs with same table names
- Public API vs internal API types
- Different versions of same entity

---

## Cross-Subgraph Relationships

### What are Cross-Subgraph Relationships?

Relationships that connect data across different subgraphs.

**Example**:
```graphql
# User from "database" subgraph
type User {
  id: ID!
  name: String!

  # Relationship to "business-logic" subgraph
  loyaltyPoints: Int!  # From calculateLoyaltyPoints function

  # Relationship to "payments" subgraph
  subscriptions: [Subscription!]!
}
```

### Creating Cross-Subgraph Relationships

**Method 1: Manual (in .hml files)**

```yaml
---
# subgraphs/database/metadata/User.hml
kind: Relationship
version: v1
definition:
  name: subscriptions
  sourceType: User

  target:
    # Reference another subgraph
    subgraph: payments
    modelName: Subscription

  mapping:
    - source:
        fieldPath:
          - fieldName: id
      target:
        modelField:
          - fieldName: user_id
```

**Method 2: Using DDN CLI**

```bash
ddn relationship add \
  --from-subgraph database \
  --from-model User \
  --to-subgraph payments \
  --to-model Subscription
```

### Relationship Best Practices

**DO**:
- ✅ Document relationships in comments
- ✅ Use meaningful relationship names
- ✅ Consider performance (N+1 queries)
- ✅ Test cross-subgraph queries

**DON'T**:
- ❌ Create circular dependencies
- ❌ Over-complicate with too many hops
- ❌ Assume relationships are free (they have cost)

---

## Best Practices

### 1. Start Small, Grow Later

**Recommended progression**:
1. **Start**: Single `database` subgraph
2. **Add auth**: Implement permissions
3. **Add logic**: Create `business-logic` subgraph for complex functions
4. **Add integrations**: External API subgraphs as needed
5. **Split databases**: When you actually have multiple databases

### 2. Clear Ownership

**Define for each subgraph**:
- Who maintains it?
- Who approves changes?
- What's the SLA?
- How to contact the team?

**Document in subgraph README**:
```markdown
# Subgraph: Payments

**Owner**: Payments Team (@payments-team)
**Slack**: #payments-eng
**On-call**: payments-oncall@example.com
**SLA**: 99.9% uptime
```

### 3. Independent Testing

Each subgraph should be testable independently:

```bash
# Test only one subgraph
cd subgraphs/business-logic
npm test

# Build only this subgraph (for development)
ddn supergraph build local --subgraph business-logic
```

### 4. Environment Parity

Maintain same subgraph structure across environments:

```bash
# Development
subgraphs/
├── database/
└── business-logic/

# Staging (same structure)
subgraphs/
├── database/
└── business-logic/

# Production (same structure)
subgraphs/
├── database/
└── business-logic/
```

### 5. Documentation

**Each subgraph should have**:
- `README.md` - Purpose, setup, examples
- Inline comments in `subgraph.yaml`
- Comments in `.hml` files
- Example queries

---

## Troubleshooting

### "Subgraph not found"

**Cause**: Subgraph not added to `supergraph.yaml`

**Fix**:
```yaml
# supergraph.yaml
definition:
  subgraphs:
    - globals
    - database
    - my-subgraph  # Add this
```

Then rebuild:
```bash
ddn supergraph build local
```

---

### "Duplicate type name"

**Cause**: Two subgraphs have types with same name

**Example**:
```
subgraphs/database/metadata/User.hml        → type User
subgraphs/analytics/metadata/User.hml       → type User
                                             ❌ Conflict!
```

**Fix 1: Use type prefix**
```yaml
# subgraphs/analytics/subgraph.yaml
definition:
  generator:
    graphqlTypeNamePrefix: "Analytics"
```

Result: `AnalyticsUser` instead of `User`

**Fix 2: Rename one type**
```yaml
# subgraphs/analytics/metadata/User.hml
kind: ObjectType
definition:
  name: UserMetrics  # Different name
```

---

### "Relationship not working"

**Cause**: Missing or incorrect mapping

**Check**:
1. Both subgraphs are in `supergraph.yaml`
2. Field names match exactly (case-sensitive)
3. Types are compatible
4. Relationship is defined in `.hml` file

**Debug**:
```bash
# Check compiled metadata
cat engine/build/open_dd.json | grep -A20 '"name": "your_relationship"'
```

---

### "Slow cross-subgraph queries"

**Cause**: N+1 query problem or missing indexes

**Fix**:
1. Use `@cached` directive for expensive relationships
2. Add database indexes on foreign keys
3. Use DataLoader pattern in custom connectors
4. Consider denormalization if performance critical

---

## Further Reading

### Official Hasura DDN v3 Documentation

**Subgraphs**:
- [Subgraph Overview](https://hasura.io/docs/3.0/project-configuration/subgraphs/)
- [Multiple Subgraphs Guide](https://hasura.io/docs/3.0/project-configuration/tutorials/work-with-multiple-subgraphs/)
- [Subgraph Best Practices](https://hasura.io/docs/3.0/project-configuration/best-practices/)

**Relationships**:
- [Relationships Overview](https://hasura.io/docs/3.0/schema/relationships/)
- [Cross-Subgraph Relationships](https://hasura.io/docs/3.0/schema/relationships/cross-subgraph/)
- [Relationship Performance](https://hasura.io/docs/3.0/performance/relationships/)

**Connectors**:
- [Connector Overview](https://hasura.io/docs/3.0/connectors/introduction/)
- [Available Connectors](https://hasura.io/docs/3.0/connectors/overview/)
- [Custom Connectors](https://hasura.io/docs/3.0/connectors/build-a-connector/)

### Related Documentation

- **Main README**: `../README.md` - Project overview
- **Supergraph**: `../supergraph.yaml` - See how subgraphs are composed
- **Database Subgraph**: `database/README.md` - Database-specific docs
- **Examples**: `../examples/` - Working examples to copy from

---

## Questions?

**Common scenarios**:
- One database? Start with single `database` subgraph
- Multiple databases? Create `postgres-primary`, `postgres-analytics`, etc.
- Custom functions? Add `business-logic` subgraph
- External API? Add API-specific subgraph (`stripe-api`, `twilio-api`, etc.)
- Microservices? One subgraph per service

**Need help?**
- [Hasura Discord](https://discord.com/invite/hasura)
- [GitHub Discussions](https://github.com/hasura/graphql-engine/discussions)
