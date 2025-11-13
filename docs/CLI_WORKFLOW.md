# DDN CLI Workflow Reference

Complete reference for using the Hasura DDN CLI for self-hosted deployments.

## CLI Installation

```bash
# Install globally
npm install -g @hasura/ddn

# Verify installation
ddn version

# Update to latest
npm update -g @hasura/ddn

# Get help
ddn --help
ddn <command> --help
```

## Project Initialization

### Create New Project

```bash
# Initialize new DDN project
ddn project init my-api

# Creates:
# my-api/
# ├── app/
# │   ├── globals/
# │   │   ├── subgraph.yaml
# │   │   └── metadata/
# │   │       ├── AuthConfig.hml
# │   │       └── GraphqlConfig.hml
# │   ├── subgraphs/
# │   │   └── default/
# │   │       ├── subgraph.yaml
# │   │       └── metadata/
# │   └── supergraph.yaml
# └── .hasura/
#     └── context.yaml

cd my-api
```

### Project Structure

```
my-api/
├── app/
│   ├── globals/              # Global configuration
│   │   ├── subgraph.yaml
│   │   └── metadata/
│   │       ├── AuthConfig.hml      # Authentication
│   │       └── GraphqlConfig.hml   # GraphQL settings
│   ├── subgraphs/            # Data source subgraphs
│   │   └── default/
│   │       ├── subgraph.yaml
│   │       ├── connector/    # Connector configs
│   │       └── metadata/     # Model files (.hml)
│   └── supergraph.yaml       # Supergraph composition
└── .hasura/
    └── context.yaml          # Environment contexts
```

## Adding Connectors

### Interactive Mode (Recommended)

```bash
# Add connector with interactive prompts
ddn connector add my_postgres -i

# Prompts:
# 1. Connector type: hasura/postgres
# 2. Connection string: postgresql://...
# 3. Subgraph: default (or custom name)
```

### Non-Interactive Mode

```bash
# Add PostgreSQL connector
ddn connector add my_postgres \
  --connector-type hasura/postgres \
  --connection-string "postgresql://user:pass@host:5432/db" \
  --subgraph default

# Add MongoDB connector
ddn connector add my_mongo \
  --connector-type hasura/mongodb \
  --connection-string "mongodb://user:pass@host:27017/db" \
  --subgraph default

# Add custom TypeScript connector
ddn connector add my_custom \
  --connector-type typescript \
  --subgraph default
```

### Multiple Databases

```bash
# Add first database (users)
ddn connector add users_db -i

# Add second database (orders)
ddn connector add orders_db -i

# Add third database (analytics)
ddn connector add analytics_db -i
```

## Generating Models

### Auto-Generate from Database

```bash
# Generate models for all tables
ddn model add my_postgres "*"

# Generate specific tables
ddn model add my_postgres users
ddn model add my_postgres posts
ddn model add my_postgres comments

# Generate with prefix (avoid naming conflicts)
ddn model add my_postgres "*" --prefix MyPrefix
```

### What Gets Generated

```yaml
# app/subgraphs/default/metadata/Users.hml
kind: ObjectType
version: v1
definition:
  name: Users
  fields:
    - name: id
      type: Int!
    - name: email
      type: String!
    - name: name
      type: String
  graphql:
    typeName: Users

---
kind: Model
version: v1
definition:
  name: Users
  objectType: Users
  source:
    dataConnectorName: my_postgres
    collection: users
  graphql:
    selectUniques:
      - queryRootField: usersById
        uniqueIdentifier: [id]
    selectMany:
      queryRootField: users
```

## Adding Permissions

Permissions are added manually to `.hml` files after generation.

### Basic Permissions

```yaml
# Add to end of Users.hml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    # Admin sees everything
    - role: admin
      select:
        filter: null

    # Users see only themselves
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
```

### Organization-Based Permissions

```yaml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Documents
  permissions:
    - role: user
      select:
        filter:
          fieldComparison:
            field: organization_id
            operator: _eq
            value:
              sessionVariable: x-hasura-org-id
```

### Insert/Update/Delete Permissions

```yaml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Posts
  permissions:
    - role: user
      # Can insert their own posts
      insert:
        check:
          fieldComparison:
            field: user_id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id

      # Can update their own posts
      update:
        filter:
          fieldComparison:
            field: user_id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id

      # Can delete their own posts
      delete:
        filter:
          fieldComparison:
            field: user_id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
```

## Building the Supergraph

### Compile Metadata

```bash
# Build for local context
ddn supergraph build local

# Build with verbose output
ddn supergraph build local --verbose

# Output: app/supergraph/build/supergraph.json
```

### What Gets Compiled

The build process:
1. Reads all `.hml` files from `app/`
2. Validates configuration
3. Compiles to `supergraph.json`
4. Ready for Docker packaging

## Local Development

### Run Locally with Docker

```bash
# Start DDN engine locally
ddn run docker-start

# Engine runs on http://localhost:3000

# Stop
ddn run docker-stop
```

### Test Your API

```bash
# Health check
curl http://localhost:3000/healthz

# GraphQL query
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id email } }"}'

# Open GraphiQL
open http://localhost:3000/graphql
```

### Watch Mode

```bash
# Watch for changes and rebuild
ddn watch

# Changes to .hml files trigger automatic rebuild
```

## Docker Deployment Workflow

### 1. Build Supergraph

```bash
ddn supergraph build local
```

### 2. Build Docker Image

```bash
# Using this template's script
../docker-helpers/scripts/build-engine.sh v1.0.0
```

### 3. Push to Registry

```bash
docker push your-registry/ddn-engine:v1.0.0
```

### 4. Deploy to Kubernetes

```bash
kubectl set image deployment/ddn-engine \
  engine=your-registry/ddn-engine:v1.0.0
```

## Common Workflows

### Adding a New Table

```bash
# 1. Create table in database
psql "$DATABASE_URL" -c "CREATE TABLE products (...);"

# 2. Generate model
ddn model add my_postgres products

# 3. Add permissions to app/subgraphs/default/metadata/Products.hml

# 4. Rebuild
ddn supergraph build local

# 5. Test locally
ddn run docker-start
```

### Updating Schema

```bash
# 1. Make database changes

# 2. Regenerate models
ddn model add my_postgres "*"

# 3. Review changes in .hml files

# 4. Rebuild
ddn supergraph build local

# 5. Deploy
../docker-helpers/scripts/build-engine.sh v1.1.0
docker push your-registry/ddn-engine:v1.1.0
```

### Adding Relationships

```yaml
# In Users.hml
kind: Model
version: v1
definition:
  name: Users
  # ... other config ...

  relationships:
    - name: posts
      target:
        model: Posts
      mapping:
        - source:
            fieldPath: [id]
          target:
            fieldPath: [user_id]
```

```graphql
# Now you can query:
query {
  users {
    id
    name
    posts {
      id
      title
    }
  }
}
```

### Cross-Database Relationships

```yaml
# In database1/Users.hml
relationships:
  - name: orders
    target:
      subgraph: database2  # Different database!
      model: Orders
    mapping:
      - source:
          fieldPath: [id]
        target:
          fieldPath: [user_id]
```

## Environment Management

### Contexts

```yaml
# .hasura/context.yaml
contexts:
  - name: local
    supergraph: app/supergraph.yaml
    env_file: .env.local

  - name: staging
    supergraph: app/supergraph.yaml
    env_file: .env.staging

  - name: production
    supergraph: app/supergraph.yaml
    env_file: .env.production

currentContext: local
```

### Switch Contexts

```bash
# Use staging context
ddn context use staging

# Build for staging
ddn supergraph build staging

# List contexts
ddn context list

# Show current context
ddn context current
```

## Troubleshooting

### Build Failures

```bash
# Verbose output
ddn supergraph build local --verbose

# Common issues:
# - Invalid .hml syntax
# - Missing connector configuration
# - Invalid permissions

# Validate individual files
ddn validate app/subgraphs/default/metadata/Users.hml
```

### Connection Issues

```bash
# Test database connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check connector configuration
cat app/subgraphs/default/connector/my_postgres/connector.yaml

# Verify environment variables
source .env.local
echo $DATABASE_URL
```

### Model Generation Issues

```bash
# Check connector is working
ddn connector introspect my_postgres

# Generate with verbose output
ddn model add my_postgres "*" --verbose

# Check for permission issues on database
# Ensure user has SELECT on all tables
```

## Advanced Features

### Custom Types

```yaml
# Define custom scalar
kind: ScalarType
version: v1
definition:
  name: JSON
  graphql:
    typeName: JSON
```

### Computed Fields

```yaml
# In ObjectType definition
kind: ObjectType
version: v1
definition:
  name: Users
  fields:
    - name: id
      type: Int!
    - name: first_name
      type: String
    - name: last_name
      type: String
    - name: full_name
      type: String
      # Computed via database function
      source:
        function: get_full_name
        arguments:
          - name: user_id
            value: $.id
```

### Native Queries

```yaml
# Custom SQL query
kind: NativeQuery
version: v1
definition:
  name: searchUsers
  query: |
    SELECT * FROM users
    WHERE name ILIKE {{search}}
    LIMIT {{limit}}
  arguments:
    search:
      type: String!
    limit:
      type: Int!
      default: 10
  returns:
    model: Users
```

## Best Practices

### 1. Always Version Your Builds

```bash
# Use semantic versioning
../docker-helpers/scripts/build-engine.sh v1.0.0
../docker-helpers/scripts/build-engine.sh v1.1.0
../docker-helpers/scripts/build-engine.sh v2.0.0
```

### 2. Test Locally First

```bash
ddn supergraph build local
ddn run docker-start
# Test thoroughly before building Docker image
```

### 3. Review Generated Models

```bash
# After ddn model add, review the .hml files
# Add appropriate permissions
# Adjust field names if needed
```

### 4. Use Git for Everything

```bash
git add app/
git commit -m "Add users model with permissions"
git tag v1.0.0
```

### 5. Separate Concerns

- **DDN CLI**: Project structure, models, metadata
- **Docker Script**: Packaging for deployment
- **Kubernetes**: Infrastructure and deployment

## Resources

- **Official CLI Docs**: https://hasura.io/docs/3.0/cli/overview/
- **HML Reference**: https://hasura.io/docs/3.0/data-domain-modeling/
- **Connectors**: https://hasura.io/docs/3.0/connectors/
- **Permissions**: https://hasura.io/docs/3.0/auth/permissions/

---

**Next**: Learn about [Docker Build Process](./DOCKER_BUILD.md)
