# Hasura DDN Template Setup Guide

This guide walks you through setting up a new Hasura DDN v3 project using this template.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Configuration](#database-configuration)
4. [Authentication Setup](#authentication-setup)
5. [Local Development](#local-development)
6. [First Deployment](#first-deployment)
7. [Verification](#verification)
8. [Next Steps](#next-steps)

## Prerequisites

### Required Software

```bash
# Install Hasura DDN CLI
npm install -g @hasura/ddn

# Verify installation
ddn version  # Should be v2.8.0 or higher

# Docker for building images
docker --version  # Should be 20.10.0 or higher

# Kubernetes CLI
kubectl version  # Must have access to a cluster

# Git for version control
git --version
```

### Access Requirements

- **Kubernetes Cluster**: Local (microk8s, k3s, Docker Desktop) or cloud (AKS, EKS, GKE)
- **Docker Hub Account**: Access to push to `rickybobbeh/ddn-engine` and connector repositories
- **Database Access**: Connection URLs for your PostgreSQL databases
- **OAuth Provider** (optional): For authentication (Keycloak, Auth0, Azure AD, etc.)

## Initial Setup

### 1. Clone the Template

```bash
# Clone this repository
git clone https://github.com/yourusername/onprem-hasura-k8s.git my-hasura-project
cd my-hasura-project

# Remove the existing git history to start fresh
rm -rf .git
git init
git add .
git commit -m "Initial commit from template"
```

### 2. Configure Project Name

Edit `supergraph.yaml` and update the project name:

```yaml
# supergraph.yaml
kind: Supergraph
version: v2
definition:
  name: my-api  # CHANGE THIS to your project name
  subgraphs:
    - globals/subgraph.yaml
    - subgraphs/database-1/subgraph.yaml
    - subgraphs/database-2/subgraph.yaml
```

### 3. Set Up Environment Files

```bash
# Create your local environment file from the template
cp .env.local.template .env.local

# Edit the file with your configuration
nano .env.local
```

## Database Configuration

### Option 1: Neon PostgreSQL (Recommended for Getting Started)

1. **Create Neon Projects**:
   - Go to [neon.tech](https://neon.tech)
   - Create two new projects (database-1 and database-2)
   - Copy the connection strings

2. **Update `.env.local`**:

```bash
# Database 1 - Primary database
DATABASE_1_URL="postgresql://user:password@ep-example-1.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Database 2 - Secondary database
DATABASE_2_URL="postgresql://user:password@ep-example-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Connection pool settings
POSTGRES_POOL_MAX_CONNECTIONS="50"
POSTGRES_POOL_TIMEOUT="30"
POSTGRES_POOL_IDLE_TIMEOUT="180"
```

### Option 2: Other PostgreSQL Providers

The template works with any PostgreSQL-compatible database:

- **Amazon RDS**: Use the RDS endpoint URL
- **Google Cloud SQL**: Use the connection string with SSL
- **Azure Database for PostgreSQL**: Use the Azure connection string
- **Self-hosted**: Use your PostgreSQL server URL

**Connection string format**:
```
postgresql://username:password@hostname:port/database?sslmode=require
```

### 3. Test Database Connections

```bash
# Test database 1
psql "$DATABASE_1_URL" -c "SELECT version();"

# Test database 2
psql "$DATABASE_2_URL" -c "SELECT version();"
```

## Authentication Setup

### Skip Authentication (For Development)

If you want to skip authentication initially, edit `globals/metadata/AuthConfig.hml`:

```yaml
kind: AuthConfig
version: v2
definition:
  # Set to true to allow anonymous access (development only!)
  allowRoleEmulationBy: admin
```

### OAuth/OIDC Setup (Production)

See [SECURITY.md](./SECURITY.md) for detailed authentication setup with:
- Keycloak
- Auth0
- Azure AD
- Okta
- Custom OAuth providers

## Local Development

### 1. Load Environment Variables

```bash
# Source your environment file
source .env.local

# Verify variables are loaded
echo $DATABASE_1_URL
```

### 2. Initialize Database Schema

If you're starting with empty databases, create some tables:

```sql
-- Connect to database 1
psql "$DATABASE_1_URL"

-- Create example tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Introspect Databases

```bash
# Make introspection script executable
chmod +x scripts/introspect-db.sh

# Introspect database 1
./scripts/introspect-db.sh database-1

# Introspect database 2
./scripts/introspect-db.sh database-2
```

This will:
- Discover all tables in your databases
- Generate `.hml` model files in `subgraphs/database-1/metadata/` and `subgraphs/database-2/metadata/`
- Create GraphQL types for each table

### 4. Add Permissions

Edit the generated `.hml` files to add permissions. Example:

```yaml
# subgraphs/database-1/metadata/Users.hml
kind: Model
version: v1
definition:
  name: Users
  objectType: Users
  # ... other config ...

---
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    - role: admin
      select:
        filter: null  # Admin can see all users
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id  # Users can only see themselves
```

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) for more permission patterns.

### 5. Build Supergraph

```bash
# Compile all .hml files into metadata
./scripts/build-supergraph.sh
```

This creates:
- `engine/build/metadata.json`
- `engine/build/auth_config.json`
- `engine/build/open_dd.json`

### 6. Run Locally (Optional)

```bash
# Install and run DDN engine locally for development
ddn run docker-start

# In another terminal, test the GraphQL API
curl http://localhost:3000/healthz

# Open GraphiQL in browser
open http://localhost:3000/graphql
```

## First Deployment

### 1. Docker Hub Setup

See [DOCKER_HUB_SETUP.md](./DOCKER_HUB_SETUP.md) for detailed Docker Hub configuration.

Quick setup:

```bash
# Login to Docker Hub
docker login -u rickybobbeh

# Verify access to repositories
docker pull rickybobbeh/ddn-engine:latest || echo "Creating new image"
```

### 2. Build Docker Image

```bash
# Make build script executable
chmod +x scripts/build-engine.sh

# Build the engine image with compiled metadata
./scripts/build-engine.sh v1.0.0

# This creates: rickybobbeh/ddn-engine:v1.0.0
```

### 3. Push to Docker Hub

```bash
# Push the versioned image
docker push rickybobbeh/ddn-engine:v1.0.0

# Tag as latest
docker tag rickybobbeh/ddn-engine:v1.0.0 rickybobbeh/ddn-engine:latest
docker push rickybobbeh/ddn-engine:latest
```

### 4. Deploy to Kubernetes

```bash
# Make deployment script executable
chmod +x scripts/deploy-metadata.sh

# Deploy to local environment
./scripts/deploy-metadata.sh local v1.0.0
```

The script will:
- Update the Kubernetes deployment with the new image
- Wait for rollout to complete
- Run health checks
- Display deployment status

## Verification

### 1. Check Deployment Status

```bash
# Check pods are running
kubectl get pods -n hasura-local

# Check deployment status
kubectl get deployment hasura-ddn-engine -n hasura-local

# View logs
kubectl logs -f deployment/hasura-ddn-engine -n hasura-local
```

### 2. Test GraphQL API

```bash
# Port-forward to access locally
kubectl port-forward -n hasura-local deployment/hasura-ddn-engine 3000:3000

# In another terminal, test health endpoint
curl http://localhost:3000/healthz

# Test GraphQL endpoint
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { __typename }"}'
```

### 3. Access GraphiQL

```bash
# Keep port-forward running
kubectl port-forward -n hasura-local deployment/hasura-ddn-engine 3000:3000

# Open in browser
open http://localhost:3000/graphql
```

Try a query:
```graphql
query {
  users {
    id
    email
    name
    created_at
  }
}
```

## Next Steps

### Configure CI/CD

Set up automated deployments with GitHub Actions:

1. **Add Repository Secrets**:
   - `DOCKER_HUB_USERNAME`: Your Docker Hub username
   - `DOCKER_HUB_TOKEN`: Docker Hub access token
   - `KUBECONFIG`: Base64-encoded kubeconfig file
   - `DATABASE_1_URL`: Database 1 connection string
   - `DATABASE_2_URL`: Database 2 connection string

2. **Enable Workflows**:
   ```bash
   # Workflows are in .github/workflows/
   git add .github/workflows/
   git commit -m "Enable CI/CD workflows"
   git push
   ```

See [.github/README.md](.github/README.md) for detailed CI/CD setup.

### Implement Business Logic

- Add custom TypeScript functions
- Create computed fields
- Implement data validations
- Add complex permissions

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) for patterns and examples.

### Production Deployment

- Set up production environment configs
- Configure TLS/SSL certificates
- Implement rate limiting
- Set up monitoring and observability

See [SECURITY.md](./SECURITY.md) for production hardening.

### Multi-Database Relationships

Create relationships across your two databases:

```yaml
# In subgraphs/database-1/metadata/Users.hml
relationships:
  - name: organization
    target:
      subgraph: database-2
      model: Organizations
    mapping:
      - source:
          fieldPath:
            - fieldName: organization_id
        target:
          fieldPath:
            - fieldName: id
```

## Troubleshooting

### "Cannot connect to database"

```bash
# Test connection manually
psql "$DATABASE_1_URL" -c "SELECT 1"

# Check SSL requirements
# Neon requires sslmode=require
```

### "Permission denied on table"

Your database user needs proper permissions:

```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### "Introspection failed"

```bash
# Check connector configuration
cat subgraphs/database-1/connector/postgres/configuration.json

# Verify environment variables
echo $DATABASE_1_URL

# Try manual introspection with verbose logging
ddn connector introspect postgres --verbose
```

### "Docker build failed"

```bash
# Check supergraph built successfully
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
# Check Kubernetes cluster access
kubectl cluster-info

# Check namespace exists
kubectl get namespace hasura-local

# View deployment events
kubectl describe deployment hasura-ddn-engine -n hasura-local

# Check pod logs
kubectl logs -f deployment/hasura-ddn-engine -n hasura-local
```

## Getting Help

- **Documentation**: Check [docs/QUICKSTART.md](./docs/QUICKSTART.md) for a hands-on walkthrough
- **Examples**: Review [examples/](./examples/) for patterns and best practices
- **Hasura Docs**: https://hasura.io/docs/3.0/
- **Discord**: https://discord.com/invite/hasura (#ddn channel)

---

**Setup complete!** You now have a running Hasura DDN v3 instance connected to your databases.
