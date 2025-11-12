# Template Initialization Guide

Step-by-step guide to initialize a new Hasura DDN v3 project from this template.

## Overview

This guide walks you through transforming this template into a production-ready Hasura DDN deployment for your specific use case. Expected time: 30-60 minutes.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Hasura DDN CLI** installed (`npm install -g @hasura/ddn`)
- [ ] **Docker** installed and running
- [ ] **kubectl** installed and configured
- [ ] **Git** installed
- [ ] **Access to Kubernetes cluster** (local or cloud)
- [ ] **Docker Hub account** (username: `rickybobbeh`)
- [ ] **Two PostgreSQL databases** (Neon, RDS, or other)
- [ ] **OAuth provider** (optional, for authentication)

## Step 1: Clone and Initialize

### 1.1 Clone the Template

```bash
# Clone this repository
git clone https://github.com/yourusername/onprem-hasura-k8s.git my-project-name
cd my-project-name
```

### 1.2 Remove Template History

```bash
# Remove existing Git history to start fresh
rm -rf .git

# Initialize new Git repository
git init

# Create initial commit
git add .
git commit -m "Initial commit from Hasura DDN template"
```

### 1.3 Connect to Your Repository

```bash
# Create a new repository on GitHub (or GitLab, Bitbucket, etc.)
# Then connect it:
git remote add origin https://github.com/yourusername/my-project-name.git
git branch -M main
git push -u origin main
```

## Step 2: Project Configuration

### 2.1 Update Project Name

Edit `supergraph.yaml`:

```yaml
kind: Supergraph
version: v2
definition:
  name: my-api  # CHANGE THIS to your project name (e.g., "ecommerce-api")

  subgraphs:
    - globals/subgraph.yaml
    - subgraphs/database-1/subgraph.yaml
    - subgraphs/database-2/subgraph.yaml
```

### 2.2 Update Subgraph Names

Edit `subgraphs/database-1/subgraph.yaml`:

```yaml
kind: Subgraph
version: v2
definition:
  name: primary-db  # CHANGE THIS to describe database 1 (e.g., "users-db")

  generator:
    rootPath: .
```

Edit `subgraphs/database-2/subgraph.yaml`:

```yaml
kind: Subgraph
version: v2
definition:
  name: secondary-db  # CHANGE THIS to describe database 2 (e.g., "orders-db")

  generator:
    rootPath: .
```

### 2.3 Verify DDN CLI

```bash
# Check DDN CLI version
ddn version

# Should output v2.8.0 or higher
```

## Step 3: Database Setup

### 3.1 Create/Access Your Databases

**Option A: Neon (Recommended for Getting Started)**

1. Go to [neon.tech](https://neon.tech)
2. Create account/login
3. Create two projects:
   - Database 1: `my-project-primary`
   - Database 2: `my-project-secondary`
4. Copy connection strings for each

**Option B: Other PostgreSQL**

Use any PostgreSQL provider:
- Amazon RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- Self-hosted PostgreSQL

### 3.2 Configure Environment Variables

Create `.env.local` from template:

```bash
cp .env.local.template .env.local
```

Edit `.env.local` with your database URLs:

```bash
# === DATABASE CONFIGURATION ===

# Database 1 Connection String
# TODO: Replace with your actual database 1 URL
DATABASE_1_URL="postgresql://user:password@ep-example-1.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Database 2 Connection String
# TODO: Replace with your actual database 2 URL
DATABASE_2_URL="postgresql://user:password@ep-example-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Connection Pool Settings
POSTGRES_POOL_MAX_CONNECTIONS="50"
POSTGRES_POOL_TIMEOUT="30"
POSTGRES_POOL_IDLE_TIMEOUT="180"

# === OBSERVABILITY ===
OTEL_SERVICE_NAME="my-project-name"  # CHANGE THIS
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"

# === DEPLOYMENT ===
DEPLOYMENT_ENV="local"
```

### 3.3 Test Database Connections

```bash
# Source environment variables
source .env.local

# Test database 1
psql "$DATABASE_1_URL" -c "SELECT version();"

# Test database 2
psql "$DATABASE_2_URL" -c "SELECT version();"

# Both should output PostgreSQL version info
```

### 3.4 Initialize Database Schemas

If starting with empty databases, create initial schema:

```bash
# Connect to database 1
psql "$DATABASE_1_URL"
```

```sql
-- Example schema for users database
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  organization_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);

-- Add more tables as needed
\q
```

```bash
# Connect to database 2
psql "$DATABASE_2_URL"
```

```sql
-- Example schema for orders database
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  organization_id INT REFERENCES organizations(id),
  amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

\q
```

## Step 4: Introspect Databases

### 4.1 Configure Connector for Database 1

Edit `subgraphs/database-1/connector/postgres/connector.yaml`:

```yaml
kind: ConnectorManifest
version: v1
definition:
  name: postgres_db1  # CHANGE if desired

  type: local

connector:
  type: hub
  name: hasura/postgres
  version: v0.6.0

env:
  CONNECTION_URI:
    valueFrom Env: DATABASE_1_URL  # Maps to your .env.local
```

### 4.2 Configure Connector for Database 2

Edit `subgraphs/database-2/connector/postgres/connector.yaml`:

```yaml
kind: ConnectorManifest
version: v1
definition:
  name: postgres_db2  # CHANGE if desired

  type: local

connector:
  type: hub
  name: hasura/postgres
  version: v0.6.0

env:
  CONNECTION_URI:
    valueFromEnv: DATABASE_2_URL
```

### 4.3 Run Introspection

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Introspect database 1
./scripts/introspect-db.sh database-1

# Introspect database 2
./scripts/introspect-db.sh database-2
```

This will:
- Discover all tables in each database
- Generate `.hml` model files in `subgraphs/database-*/metadata/`
- Create GraphQL types automatically

### 4.4 Verify Generated Models

```bash
# Check generated models
ls -la subgraphs/database-1/metadata/
# Should see: Users.hml, Organizations.hml, etc.

ls -la subgraphs/database-2/metadata/
# Should see: Orders.hml, etc.
```

## Step 5: Configure Permissions

### 5.1 Add Basic Permissions

Edit each generated `.hml` file to add permissions. Example:

```bash
# Edit Users.hml
nano subgraphs/database-1/metadata/Users.hml
```

Add permissions at the end of the file:

```yaml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    # Admin can see all users
    - role: admin
      select:
        filter: null

    # Users can only see themselves
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
```

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) for more permission patterns.

## Step 6: Authentication Setup

### 6.1 Choose Authentication Provider

**Option A: Skip Auth (Development Only)**

Edit `globals/metadata/AuthConfig.hml`:

```yaml
kind: AuthConfig
version: v2
definition:
  allowRoleEmulationBy: admin  # Allows bypassing auth for testing

  mode:
    noAuth:
      role: admin
```

**Option B: Configure OAuth/OIDC**

See [SECURITY.md](./SECURITY.md) for detailed setup with:
- Auth0
- Keycloak
- Azure AD
- Okta

Example for Auth0:

```yaml
kind: AuthConfig
version: v2
definition:
  allowRoleEmulationBy: null  # Disable in production!

  mode:
    jwt:
      issuer: https://your-tenant.auth0.com/
      audience: https://your-api.example.com

      claimsConfig:
        namespace:
          claimsFormat: Json
          location: $.https://hasura\.io/jwt/claims

        mapping:
          x-hasura-user-id:
            literal: $.sub
          x-hasura-default-role:
            literal: $.https://hasura\.io/jwt/claims.x-hasura-default-role

      key:
        jwksUrl: https://your-tenant.auth0.com/.well-known/jwks.json
```

## Step 7: Build and Test Locally

### 7.1 Build Supergraph

```bash
# Compile all .hml files into metadata
./scripts/build-supergraph.sh
```

This creates:
- `engine/build/metadata.json`
- `engine/build/auth_config.json`
- `engine/build/open_dd.json`

### 7.2 Test Locally with DDN CLI

```bash
# Run DDN engine locally
ddn run docker-start

# Should output:
# ✅ Engine running on http://localhost:3000
```

### 7.3 Test GraphQL API

In another terminal:

```bash
# Test health endpoint
curl http://localhost:3000/healthz

# Test GraphQL
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Open GraphiQL in browser
open http://localhost:3000/graphql
```

Try a query:

```graphql
query {
  users {
    id
    email
    name
  }
}
```

## Step 8: Docker Hub Setup

### 8.1 Login to Docker Hub

```bash
# Login with your credentials
docker login -u rickybobbeh

# When prompted, enter your Docker Hub token (not password)
```

### 8.2 Verify Repositories

Check that these repositories exist on [hub.docker.com](https://hub.docker.com):
- `rickybobbeh/ddn-engine`
- `rickybobbeh/ddn-connector-1`
- `rickybobbeh/ddn-connector-2`

If not, create them via Docker Hub web interface.

See [DOCKER_HUB_SETUP.md](./DOCKER_HUB_SETUP.md) for detailed Docker Hub configuration.

## Step 9: Build Docker Images

### 9.1 Build Engine Image

```bash
# Build engine with compiled metadata
./scripts/build-engine.sh v1.0.0

# This creates: rickybobbeh/ddn-engine:v1.0.0
```

### 9.2 Push to Docker Hub

```bash
# Push versioned image
docker push rickybobbeh/ddn-engine:v1.0.0

# Tag and push as latest
docker tag rickybobbeh/ddn-engine:v1.0.0 rickybobbeh/ddn-engine:latest
docker push rickybobbeh/ddn-engine:latest
```

## Step 10: Deploy to Kubernetes

### 10.1 Configure Kubernetes Context

```bash
# Verify kubectl is configured
kubectl cluster-info

# Create namespace
kubectl create namespace hasura-local

# Verify namespace
kubectl get namespaces | grep hasura
```

### 10.2 Create Kubernetes Secrets

```bash
# Create database secrets
kubectl create secret generic hasura-db-secrets \
  --from-literal=DATABASE_1_URL="$DATABASE_1_URL" \
  --from-literal=DATABASE_2_URL="$DATABASE_2_URL" \
  -n hasura-local

# Verify secret
kubectl get secrets -n hasura-local
```

### 10.3 Deploy to Cluster

```bash
# Deploy using the script
./scripts/deploy-metadata.sh local v1.0.0
```

The script will:
- Update Kubernetes deployment
- Wait for rollout to complete
- Run health checks
- Display deployment status

### 10.4 Verify Deployment

```bash
# Check pods are running
kubectl get pods -n hasura-local

# Check deployment
kubectl get deployment hasura-ddn-engine -n hasura-local

# View logs
kubectl logs -f deployment/hasura-ddn-engine -n hasura-local
```

## Step 11: Test Deployed API

### 11.1 Port Forward

```bash
# Forward port to access locally
kubectl port-forward -n hasura-local deployment/hasura-ddn-engine 3000:3000
```

### 11.2 Test Endpoints

In another terminal:

```bash
# Health check
curl http://localhost:3000/healthz

# GraphQL query
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { users { id email } }"}'

# Open GraphiQL
open http://localhost:3000/graphql
```

## Step 12: Set Up CI/CD

### 12.1 Add GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

```
DOCKER_HUB_USERNAME=rickybobbeh
DOCKER_HUB_TOKEN=dckr_pat_xxxxxxxxxxxxx
KUBECONFIG=<base64-encoded-kubeconfig>
DATABASE_1_URL=postgresql://...
DATABASE_2_URL=postgresql://...
```

### 12.2 Enable Workflows

```bash
# Workflows are already in .github/workflows/
# They will run automatically on:
# - Push to main (introspect and build)
# - Git tags (deploy)
# - Manual trigger

# Test by creating a tag
git tag v1.0.0
git push origin v1.0.0
```

See [.github/README.md](.github/README.md) for detailed CI/CD documentation.

## Step 13: Production Hardening

Before going to production:

### Security Checklist

- [ ] Disable role emulation in `AuthConfig.hml`
- [ ] Configure proper OAuth/OIDC
- [ ] Enable HTTPS/TLS
- [ ] Disable GraphiQL
- [ ] Disable introspection
- [ ] Configure CORS restrictively
- [ ] Enable rate limiting
- [ ] Set up monitoring

See [SECURITY.md](./SECURITY.md) for complete security guide.

### Performance Checklist

- [ ] Configure database connection pools
- [ ] Set up database read replicas (if needed)
- [ ] Configure Kubernetes HPA (Horizontal Pod Autoscaler)
- [ ] Set resource limits in deployments
- [ ] Enable OpenTelemetry
- [ ] Set up metrics and alerting

## Troubleshooting

### "Cannot connect to database"

```bash
# Verify environment variables
source .env.local
echo $DATABASE_1_URL

# Test connection manually
psql "$DATABASE_1_URL" -c "SELECT 1"
```

### "Introspection failed"

```bash
# Check connector configuration
cat subgraphs/database-1/connector/postgres/configuration.json

# Try verbose introspection
ddn connector introspect postgres --verbose
```

### "Docker build failed"

```bash
# Verify supergraph is built
ls -la engine/build/

# Should see:
# - metadata.json
# - auth_config.json
# - open_dd.json

# Rebuild if missing
./scripts/build-supergraph.sh
```

### "Deployment failed"

```bash
# Check Kubernetes logs
kubectl logs -f deployment/hasura-ddn-engine -n hasura-local

# Check events
kubectl get events -n hasura-local --sort-by='.lastTimestamp'

# Describe deployment
kubectl describe deployment hasura-ddn-engine -n hasura-local
```

## Next Steps

### Implement Business Logic

- Add computed fields
- Create custom functions
- Implement data validations

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)

### Add More Subgraphs

- Custom TypeScript connectors
- REST API connectors
- Additional databases

### Set Up Monitoring

- Configure OpenTelemetry
- Set up Grafana dashboards
- Create alerts

### Documentation

- Document your GraphQL schema
- Create API documentation
- Write usage guides

## Getting Help

- **Documentation**: Start with [SETUP.md](./SETUP.md)
- **Examples**: Check [examples/](./examples/) folder
- **Hasura Docs**: https://hasura.io/docs/3.0/
- **Discord**: https://discord.com/invite/hasura

---

**Congratulations!** Your Hasura DDN project is now initialized and running.
