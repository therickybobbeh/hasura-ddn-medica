# Hasura DDN v3 Quick Start Guide

Get your Hasura DDN project running in **15 minutes**.

## Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Hasura DDN CLI** installed
  ```bash
  npm install -g @hasura/ddn-cli
  ddn version  # Should show v3.x.x
  ```

- [ ] **Docker** installed and running
  ```bash
  docker --version
  ```

- [ ] **Kubernetes cluster** ready (microk8s, k3s, or full cluster)
  ```bash
  kubectl cluster-info
  ```

- [ ] **Database** accessible (PostgreSQL, MySQL, etc.)
  ```bash
  # Test connection
  psql "postgresql://user:pass@host/db" -c "SELECT 1"
  ```

- [ ] **OAuth/OIDC provider** configured (Keycloak, Auth0, Azure AD, etc.)
  - Issuer URL
  - JWKS URL
  - Client ID

- [ ] **Docker Hub account** (or other registry)
  ```bash
  docker login
  ```

---

## Step 1: Clone and Configure (3 minutes)

### 1.1 Clone the Template

```bash
git clone <your-repo-url> my-hasura-project
cd my-hasura-project
```

### 1.2 Copy Environment Template

```bash
cp .env.local.template .env.local
```

### 1.3 Edit Environment Variables

```bash
# Edit .env.local with your actual values
nano .env.local  # or use your preferred editor
```

**Required values**:
```bash
# TODO: Get from https://console.hasura.io/settings/tokens
HASURA_DDN_PAT=ddn_pat_xxxxx

# TODO: Your database connection string
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# TODO: Your OAuth provider
OAUTH_ISSUER_URL=https://your-idp.com
OAUTH_JWKS_URL=https://your-idp.com/.well-known/jwks.json
OAUTH_AUDIENCE=your-audience
OAUTH_CLIENT_ID=your-client-id

# TODO: Your Docker Hub username
DOCKER_REGISTRY=docker.io/your-username
```

### 1.4 Customize Project Name

```bash
# Edit supergraph.yaml
nano supergraph.yaml
```

Change `name: my-api` to your project name:
```yaml
definition:
  name: your-project-name  # Change this
```

---

## Step 2: Initialize Database (2 minutes)

### 2.1 Introspect Database Schema

```bash
# This reads your database schema and generates connector configuration
ddn connector introspect postgres --verbose
```

**What it does**: Connects to your database and discovers all tables/views/functions.

### 2.2 Generate Models

```bash
# This creates .hml files for each table
ddn model add postgres '*'
```

**Result**: Creates files in `subgraphs/database/metadata/` for each table.

### 2.3 Verify Models

```bash
ls subgraphs/database/metadata/
# Should see: Table1.hml, Table2.hml, etc.
```

---

## Step 3: Build Supergraph (2 minutes)

### 3.1 Compile Metadata

```bash
# This compiles all .hml files into JSON for the engine
ddn supergraph build local
```

**Result**: Creates `engine/build/` directory with compiled metadata.

### 3.2 Verify Build

```bash
ls engine/build/
# Should see: auth_config.json, metadata.json, open_dd.json
```

### 3.3 Review Output

```bash
# Check the compiled metadata
cat engine/build/metadata.json | head -20
```

---

## Step 4: Build Engine Image (3 minutes)

### 4.1 Build Docker Image

```bash
# This creates a Docker image with your metadata baked in
./scripts/build-engine.sh v0.1.0
```

**What it does**:
- Builds engine Docker image
- Includes compiled metadata from `engine/build/`
- Tags as `your-registry/hasura-ddn-engine:v0.1.0`

### 4.2 Push to Registry

```bash
docker push your-registry/hasura-ddn-engine:v0.1.0
```

**Note**: Replace `your-registry` with your actual Docker Hub username.

---

## Step 5: Deploy to Kubernetes (5 minutes)

### 5.1 Create Namespace

```bash
kubectl create namespace hasura-local
```

### 5.2 Create Secrets

```bash
# Copy from template
cp ../infra-k8s/self-hosted/k8s-manifests/secrets.yaml.template secrets.yaml

# Edit with your actual secrets
nano secrets.yaml

# Apply to cluster
kubectl apply -f secrets.yaml -n hasura-local
```

### 5.3 Deploy Engine

```bash
# This updates the Kubernetes deployment with your new image
./scripts/deploy-metadata.sh local v0.1.0
```

**What it does**:
- Updates hasura-ddn-engine deployment
- Waits for rollout to complete
- Runs health checks

### 5.4 Verify Deployment

```bash
# Check pods
kubectl get pods -n hasura-local

# Should see:
# hasura-ddn-engine-xxxxx   1/1  Running

# Check logs
kubectl logs -n hasura-local -l app=hasura-ddn,component=engine --tail=20
```

---

## Step 6: Test GraphQL API (2 minutes)

### 6.1 Port Forward (for local testing)

```bash
kubectl port-forward -n hasura-local deployment/hasura-ddn-engine 3000:3000
```

### 6.2 Test Health Endpoint

```bash
curl http://localhost:3000/healthz
# Should return: {"status": "ok"}
```

### 6.3 Test GraphQL Query

```bash
# Get schema
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { name } } }"}'
```

### 6.4 Open GraphQL Console (if enabled)

```bash
# If console is enabled in development
open http://localhost:3000/console
```

Try a query:
```graphql
query {
  # Replace 'users' with your actual table name
  users {
    id
    name
  }
}
```

---

## 🎉 Success!

You now have a running Hasura DDN v3 instance!

## Next Steps

### Add Permissions

Your models currently have no permissions. Add them:

```bash
# Edit a model file
nano subgraphs/database/metadata/YourTable.hml

# Add permissions section (see examples/sample-models/User.hml)
```

See `examples/sample-models/README.md` for permission examples.

### Add Relationships

Connect your tables with relationships:

```bash
ddn relationship add postgres users orders
```

Or manually edit `.hml` files (see examples).

### Add Custom Business Logic

Copy the TypeScript connector example:

```bash
cp -r examples/typescript-connector connectors/my-logic
```

See `examples/typescript-connector/HOW_TO_USE.md` for details.

### Deploy to Other Environments

```bash
# Deploy to staging
./scripts/deploy-metadata.sh staging v0.1.0

# Deploy to production
./scripts/deploy-metadata.sh production v0.1.0
```

### Set Up CI/CD

The GitHub Actions workflows are ready to use:
- `.github/workflows/introspect-and-build.yml` - Daily DB sync
- `.github/workflows/deploy-metadata.yml` - Automated deployments

Just add GitHub secrets (see `.github/README.md`).

---

## Common Issues

### "Cannot connect to database"

**Fix**: Check `DATABASE_URL` in `.env.local`
```bash
psql "$DATABASE_URL" -c "SELECT 1"
```

### "Permission denied" in GraphQL query

**Fix**: Add permissions to your models (see `examples/sample-models/User.hml`)

### "Engine image not found"

**Fix**: Verify image was pushed to registry
```bash
docker pull your-registry/hasura-ddn-engine:v0.1.0
```

### "Pod not starting"

**Fix**: Check pod logs
```bash
kubectl logs -n hasura-local -l app=hasura-ddn,component=engine
```

---

## Cheat Sheet

```bash
# Introspect database
ddn connector introspect postgres

# Generate models
ddn model add postgres '*'

# Build supergraph
ddn supergraph build local

# Build engine image
./scripts/build-engine.sh v0.1.0

# Deploy to Kubernetes
./scripts/deploy-metadata.sh local v0.1.0

# Check status
kubectl get pods -n hasura-local
kubectl logs -n hasura-local -l app=hasura-ddn --tail=50

# Port forward for testing
kubectl port-forward -n hasura-local deployment/hasura-ddn-engine 3000:3000
```

---

## Getting Help

- **Full Documentation**: See `README.md` and `ARCHITECTURE.md`
- **Examples**: Check `examples/` directory
- **Component Docs**: Each directory has a README (globals/, subgraphs/, etc.)
- **Official Docs**: https://hasura.io/docs/3.0/
- **Discord**: https://discord.com/invite/hasura
- **GitHub**: https://github.com/hasura/graphql-engine/discussions

---

## What's Next?

1. Read `ARCHITECTURE.md` to understand the system design
2. Explore `examples/` for patterns and best practices
3. Review component READMEs for detailed documentation
4. Set up monitoring (see `../infra-k8s/self-hosted/monitoring/`)
5. Configure production settings (see deployment YAML files)

**Happy GraphQL hacking! 🚀**
