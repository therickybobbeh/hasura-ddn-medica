# Quick Start: Self-Hosted Hasura DDN in 10 Minutes

Get a Hasura DDN v3 GraphQL API running on your own infrastructure in 10 minutes.

## Prerequisites

```bash
# Install DDN CLI
npm install -g @hasura/ddn

# Verify installations
ddn version          # Should be v2.8.0+
docker --version     # For building images
kubectl version      # For Kubernetes deployment (optional for local testing)
```

You'll also need:
- A PostgreSQL database (Neon, RDS, local, etc.)
- Access to a container registry (Docker Hub, ECR, GCR, etc.)

## Step 1: Initialize Your Project (2 min)

```bash
# Create new DDN project
ddn project init my-api
cd my-api

# Directory structure created:
# my-api/
# ├── app/
# │   ├── globals/
# │   └── subgraphs/
# └── .hasura/
```

## Step 2: Add Your Database (2 min)

```bash
# Add PostgreSQL connector (interactive mode)
ddn connector add my_postgres -i
```

**Follow the prompts:**
- **Connector type:** `hasura/postgres`
- **Connection string:** `postgresql://user:password@host:5432/database`
- **Subgraph:** Press Enter for default

**Example connection strings:**
```bash
# Neon
postgresql://user:pass@ep-example-123.us-east-2.aws.neon.tech/neondb?sslmode=require

# Local PostgreSQL
postgresql://postgres:password@localhost:5432/mydb

# AWS RDS
postgresql://user:pass@mydb.xxx.us-east-1.rds.amazonaws.com:5432/mydb
```

## Step 3: Generate GraphQL Models (1 min)

```bash
# Auto-generate models from all database tables
ddn model add my_postgres "*"

# Or add specific tables
ddn model add my_postgres users
ddn model add my_postgres posts
ddn model add my_postgres comments
```

**What this does:**
- Introspects your database schema
- Creates `.hml` files in `app/subgraphs/default/metadata/`
- Each table becomes a GraphQL type with queries and mutations

## Step 4: Build Supergraph (1 min)

```bash
# Compile all metadata into deployable format
ddn supergraph build local

# Compiled metadata appears in:
# app/supergraph/build/supergraph.json
```

**What gets compiled:**
- All your `.hml` model files
- Connector configurations
- Auth config (noAuth by default)
- GraphQL config

## Step 5: Test Locally (1 min)

```bash
# Start DDN engine locally in Docker
ddn run docker-start

# Engine runs on http://localhost:3000
```

**Test your API:**
```bash
# Health check
curl http://localhost:3000/healthz

# GraphQL query (no auth needed!)
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Or open GraphiQL in browser
open http://localhost:3000/graphql
```

**Example queries:**
```graphql
# List all users
query {
  users {
    id
    email
    name
  }
}

# Create a user (if you have mutations)
mutation {
  insertUsers(objects: {
    email: "test@example.com"
    name: "Test User"
  }) {
    returning {
      id
      email
    }
  }
}
```

## Step 6: Build Docker Image (2 min)

Now use this template's build script to package your metadata into a deployable Docker image.

```bash
# Clone this template repo (if you haven't already)
cd ..
git clone https://github.com/yourusername/onprem-hasura-k8s.git docker-helpers
cd my-api

# Copy the build artifacts to engine directory
mkdir -p engine
cp app/supergraph/build/supergraph.json engine/metadata.json

# Build Docker image using the template's script
../docker-helpers/scripts/build-engine.sh v1.0.0
```

**The script:**
- Packages compiled metadata into Docker image
- Tags with your version (v1.0.0)
- Creates immutable deployment artifact

## Step 7: Push to Registry (1 min)

```bash
# Login to your registry
docker login

# Push the image
docker push your-registry/ddn-engine:v1.0.0
```

**Registry examples:**
```bash
# Docker Hub
docker push username/ddn-engine:v1.0.0

# AWS ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/ddn-engine:v1.0.0

# Google GCR
docker push gcr.io/project-id/ddn-engine:v1.0.0
```

## Step 8: Deploy to Kubernetes (Optional)

If you have Kubernetes set up:

```bash
# Use your existing K8s manifests or create simple deployment
kubectl create deployment ddn-engine \
  --image=your-registry/ddn-engine:v1.0.0

# Expose as service
kubectl expose deployment ddn-engine \
  --port=3000 \
  --target-port=3000

# Port forward to test
kubectl port-forward svc/ddn-engine 3000:3000

# Test
curl http://localhost:3000/graphql
```

For production Kubernetes setup, see your separate `infra-k8s` repository.

## What You Just Built

✅ **GraphQL API** - Auto-generated from your database schema
✅ **No Authentication** - Test immediately (enable later)
✅ **Immutable Deployment** - Metadata baked into Docker image
✅ **Self-Hosted** - Running on your infrastructure
✅ **Version Controlled** - All config in Git

## Next Steps

### Add More Tables/Models

```bash
# Make database schema changes
# Then regenerate models
ddn model add my_postgres "*"
ddn supergraph build local
```

### Add Permissions

Edit the `.hml` files in `app/subgraphs/default/metadata/`:

```yaml
# app/subgraphs/default/metadata/Users.hml
---
kind: ModelPermissions
version: v1
definition:
  modelName: Users
  permissions:
    - role: user
      select:
        filter:
          fieldComparison:
            field: id
            operator: _eq
            value:
              sessionVariable: x-hasura-user-id
```

See [CLI_WORKFLOW.md](./CLI_WORKFLOW.md) for more on permissions.

### Add a Second Database

```bash
# Add another connector
ddn connector add my_second_db -i

# Generate models
ddn model add my_second_db "*"

# Rebuild
ddn supergraph build local
```

### Enable Authentication

By default, authentication is **disabled** for quick testing.

To enable OAuth/OIDC authentication, see [AUTHENTICATION.md](./AUTHENTICATION.md).

**⚠️ Important:** Enable authentication before deploying to production!

### Deploy Updates

```bash
# After any changes:
ddn supergraph build local

# Build new Docker image with new version
../docker-helpers/scripts/build-engine.sh v1.1.0

# Push and deploy
docker push your-registry/ddn-engine:v1.1.0
kubectl set image deployment/ddn-engine engine=your-registry/ddn-engine:v1.1.0
```

## Common Issues

### "Cannot connect to database"
```bash
# Test connection manually
psql "your-connection-string" -c "SELECT 1"

# Check SSL requirements (Neon requires sslmode=require)
```

### "No tables showing up"
```bash
# Verify models were generated
ls app/subgraphs/default/metadata/

# Check permissions - add ModelPermissions to .hml files
```

### "Docker build failed"
```bash
# Verify supergraph built successfully
ls app/supergraph/build/supergraph.json

# Check for compilation errors
ddn supergraph build local --verbose
```

## Resources

- **Full CLI Reference**: [CLI_WORKFLOW.md](./CLI_WORKFLOW.md)
- **Docker Build Details**: [DOCKER_BUILD.md](./DOCKER_BUILD.md)
- **Enable Authentication**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Production Security**: [SECURITY.md](./SECURITY.md)
- **Official DDN Docs**: https://hasura.io/docs/3.0/

---

**Congratulations!** You now have a working Hasura DDN GraphQL API running on your own infrastructure. 🎉
