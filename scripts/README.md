# Deployment Scripts

This directory contains shell scripts for building and deploying your Hasura DDN v3 supergraph.

## Table of Contents

1. [Overview](#overview)
2. [Scripts](#scripts)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Complete Workflow](#complete-workflow)
6. [Customization](#customization)
7. [Troubleshooting](#troubleshooting)
8. [Further Reading](#further-reading)

---

## Overview

### Purpose

These scripts automate the DDN v3 deployment workflow:

```
1. introspect-db.sh      → Discover database schema
2. build-supergraph.sh   → Compile .hml → JSON metadata
3. build-engine.sh       → Build Docker image with metadata
4. deploy-metadata.sh    → Deploy to Kubernetes
```

### Why Scripts?

**Advantages**:
- ✅ **Consistency**: Same process every time
- ✅ **Documentation**: Scripts serve as runnable docs
- ✅ **CI/CD Ready**: Easy to integrate into pipelines
- ✅ **Error Handling**: Built-in validation and checks
- ✅ **Cross-Platform**: Works on Linux, macOS, WSL

**vs Manual Commands**:
- ❌ Manual commands are error-prone
- ❌ Easy to miss steps
- ❌ Hard to debug when something goes wrong

---

## Scripts

### 1. `introspect-db.sh`

**Purpose**: Discover database schema and generate models

**What it does**:
1. Connects to database
2. Introspects schema (tables, columns, relationships)
3. Updates `connector/postgres/configuration.json`
4. Generates `.hml` model files

**When to use**:
- After adding/removing database tables
- After modifying table columns
- To refresh relationship detection
- First-time project setup

**Usage**:
```bash
./scripts/introspect-db.sh
```

**Environment variables** (from `.env.local` or environment):
- `DATABASE_URL` - PostgreSQL connection string

**Output**:
- Updates `subgraphs/database/connector/postgres/configuration.json`
- Creates/updates `.hml` files in `subgraphs/database/metadata/`

**Example**:
```bash
# Set environment
export DATABASE_URL=postgresql://user:pass@host:5432/db

# Run introspection
./scripts/introspect-db.sh

# Verify output
ls subgraphs/database/metadata/
# Should see: User.hml, Order.hml, etc.
```

---

### 2. `build-supergraph.sh`

**Purpose**: Compile `.hml` source files into JSON metadata

**What it does**:
1. Validates `.hml` syntax
2. Resolves cross-subgraph relationships
3. Compiles to `engine/build/*.json`
4. Validates compiled metadata

**When to use**:
- After modifying `.hml` files
- After adding permissions
- After changing `supergraph.yaml`
- Before building engine image

**Usage**:
```bash
./scripts/build-supergraph.sh
```

**Environment variables**:
- `HASURA_DDN_PAT` - Hasura DDN personal access token
- (Optional) Other vars from `supergraph.yaml` → `envMapping`

**Output**:
- `engine/build/auth_config.json` - Authentication config
- `engine/build/metadata.json` - GraphQL schema
- `engine/build/open_dd.json` - Complete metadata (OpenDD spec)

**Example**:
```bash
# Set environment
export HASURA_DDN_PAT=ddn_pat_xxxxx

# Build supergraph
./scripts/build-supergraph.sh

# Verify output
ls -lah engine/build/
# Should see: auth_config.json, metadata.json, open_dd.json

# Check file sizes (should not be empty)
du -h engine/build/*.json
```

---

### 3. `build-engine.sh`

**Purpose**: Build Docker image with compiled metadata

**What it does**:
1. Validates `engine/build/` exists
2. Builds Docker image using `engine/Dockerfile.engine`
3. Tags image with version
4. (Optional) Pushes to Docker registry

**When to use**:
- After building supergraph
- Before deploying to Kubernetes
- To create versioned releases

**Usage**:
```bash
./scripts/build-engine.sh <version>
```

**Arguments**:
- `<version>` - Version tag (e.g., `v1.0.0`, `v1.2.3-beta`, `latest`)

**Environment variables**:
- `DOCKER_REGISTRY` - Docker registry URL (default: `docker.io/your-username`)
- `IMAGE_NAME` - Image name (default: `hasura-ddn-engine`)

**Output**:
- Docker image: `${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}`

**Examples**:
```bash
# Build with version tag
./scripts/build-engine.sh v1.0.0

# Build latest
./scripts/build-engine.sh latest

# Build beta version
./scripts/build-engine.sh v1.2.0-beta

# Push to registry after building
docker push your-registry/hasura-ddn-engine:v1.0.0
```

**Customization**:
```bash
# Use different registry
export DOCKER_REGISTRY=ghcr.io/your-org
./scripts/build-engine.sh v1.0.0

# Use different image name
export IMAGE_NAME=my-hasura-engine
./scripts/build-engine.sh v1.0.0
```

---

### 4. `deploy-metadata.sh`

**Purpose**: Deploy engine image to Kubernetes

**What it does**:
1. Validates Kubernetes connection
2. Sets image in deployment
3. Waits for rollout to complete
4. Runs health checks
5. Shows pod status

**When to use**:
- After building engine image
- To deploy new version
- To rollback to previous version

**Usage**:
```bash
./scripts/deploy-metadata.sh <environment> <version>
```

**Arguments**:
- `<environment>` - Target environment (`local`, `dev`, `staging`, `production`)
- `<version>` - Image version tag (must match built image)

**Environment variables**:
- `DOCKER_REGISTRY` - Docker registry URL
- `IMAGE_NAME` - Image name
- `KUBECONFIG` - Kubernetes config file (optional)

**Output**:
- Updates Kubernetes deployment
- Waits for rollout completion
- Shows pod status

**Examples**:
```bash
# Deploy to local
./scripts/deploy-metadata.sh local v1.0.0

# Deploy to staging
./scripts/deploy-metadata.sh staging v1.0.0

# Deploy to production
./scripts/deploy-metadata.sh production v1.0.0

# Rollback to previous version
./scripts/deploy-metadata.sh production v0.9.5
```

**Customization**:
```bash
# Use different kubeconfig
export KUBECONFIG=~/.kube/config-prod
./scripts/deploy-metadata.sh production v1.0.0

# Use different namespace
# (Edit script or pass as environment variable)
export NAMESPACE_PROD=my-hasura-prod
./scripts/deploy-metadata.sh production v1.0.0
```

---

## Prerequisites

### Required Tools

**DDN CLI**:
```bash
npm install -g @hasura/ddn-cli
ddn version  # Should show v3.x.x
```

**Docker**:
```bash
docker --version  # Should show Docker version 20.x or higher
```

**kubectl**:
```bash
kubectl version --client  # Should show v1.25 or higher
```

**psql** (for database testing):
```bash
psql --version  # Should show PostgreSQL client 12.x or higher
```

### Required Environment Variables

**Create `.env.local`** (copy from template):
```bash
cp .env.local.template .env.local
```

**Edit `.env.local`**:
```bash
# Required
HASURA_DDN_PAT=ddn_pat_xxxxx
DATABASE_URL=postgresql://user:pass@host:5432/db
DOCKER_REGISTRY=docker.io/your-username

# Optional
OAUTH_ISSUER_URL=https://auth.example.com
OAUTH_JWKS_URL=https://auth.example.com/.well-known/jwks.json
OAUTH_AUDIENCE=your-audience
```

**Load environment**:
```bash
# Load variables into shell
source .env.local

# Or use with individual commands
export $(cat .env.local | xargs)
```

### Kubernetes Access

**Local (microk8s/k3s)**:
```bash
kubectl config use-context microk8s
kubectl cluster-info
```

**Remote (GKE, EKS, AKS)**:
```bash
# Get credentials
gcloud container clusters get-credentials my-cluster --region us-central1

# Verify access
kubectl get nodes
```

---

## Quick Start

### First-Time Setup

```bash
# 1. Install tools
npm install -g @hasura/ddn-cli

# 2. Configure environment
cp .env.local.template .env.local
# Edit .env.local with your values

# 3. Load environment
source .env.local

# 4. Introspect database
./scripts/introspect-db.sh

# 5. Add permissions to generated .hml files
# (See examples/sample-models/User.hml)

# 6. Build supergraph
./scripts/build-supergraph.sh

# 7. Build engine image
./scripts/build-engine.sh v0.1.0

# 8. Push to registry
docker push $DOCKER_REGISTRY/hasura-ddn-engine:v0.1.0

# 9. Deploy to Kubernetes
./scripts/deploy-metadata.sh local v0.1.0
```

---

## Complete Workflow

### Development Workflow

**Scenario**: You added a new `products` table to your database.

**Step 1: Introspect new schema**
```bash
./scripts/introspect-db.sh
```

**Step 2: Review generated model**
```bash
cat subgraphs/database/metadata/Product.hml
```

**Step 3: Add permissions**
```yaml
# Edit subgraphs/database/metadata/Product.hml
# Add ModelPermissions section (see examples/sample-models/User.hml)
```

**Step 4: Build supergraph**
```bash
./scripts/build-supergraph.sh
```

**Step 5: Commit changes**
```bash
git add subgraphs/database/metadata/Product.hml
git add engine/build/
git commit -m "Add Product model"
```

**Step 6: Build and deploy**
```bash
# Build image
./scripts/build-engine.sh v1.1.0

# Push to registry
docker push $DOCKER_REGISTRY/hasura-ddn-engine:v1.1.0

# Deploy to dev
./scripts/deploy-metadata.sh dev v1.1.0
```

---

### Production Deployment Workflow

**Scenario**: Deploy tested changes to production.

**Step 1: Verify staging**
```bash
# Test in staging
./scripts/deploy-metadata.sh staging v1.1.0

# Run tests, verify functionality
```

**Step 2: Create release tag**
```bash
git tag -a v1.1.0 -m "Release v1.1.0: Add Product model"
git push origin v1.1.0
```

**Step 3: Build production image**
```bash
git checkout v1.1.0
./scripts/build-engine.sh v1.1.0
docker push $DOCKER_REGISTRY/hasura-ddn-engine:v1.1.0
```

**Step 4: Deploy to production**
```bash
./scripts/deploy-metadata.sh production v1.1.0
```

**Step 5: Verify deployment**
```bash
# Check pods
kubectl get pods -n hasura-production

# Check logs
kubectl logs -n hasura-production -l app=hasura-ddn --tail=50

# Test GraphQL endpoint
curl https://hasura.example.com/healthz
```

**Step 6: Monitor**
- Check metrics in observability platform
- Monitor error rates
- Verify no performance degradation

---

### Rollback Workflow

**Scenario**: New version has issues, need to rollback.

**Step 1: Identify last good version**
```bash
# Check deployment history
kubectl rollout history deployment/hasura-ddn-engine -n hasura-production

# Check Git tags
git tag -l
```

**Step 2: Deploy previous version**
```bash
./scripts/deploy-metadata.sh production v1.0.5
```

**Step 3: Verify rollback**
```bash
kubectl get pods -n hasura-production
kubectl logs -n hasura-production -l app=hasura-ddn --tail=50
```

**Step 4: Investigate issue**
```bash
# Check logs from failed version
kubectl logs -n hasura-production -l app=hasura-ddn,version=v1.1.0 --previous

# Review changes
git diff v1.0.5..v1.1.0
```

---

## Customization

### Script Variables

**Override via environment variables**:

```bash
# Custom Docker registry
export DOCKER_REGISTRY=ghcr.io/my-org
export IMAGE_NAME=my-hasura-engine

# Custom Kubernetes namespaces
export NAMESPACE_DEV=my-hasura-dev
export NAMESPACE_PROD=my-hasura-prod

# Run script
./scripts/build-engine.sh v1.0.0
```

**Edit script directly**:

```bash
# Open script
nano scripts/deploy-metadata.sh

# Find and modify defaults
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/my-org"}
NAMESPACE_DEV=${NAMESPACE_DEV:-"my-hasura-dev"}
```

### Adding New Scripts

**Example: Health check script**

```bash
# Create scripts/health-check.sh
#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=${1:-"local"}
NAMESPACE="hasura-${ENVIRONMENT}"

echo "🏥 Checking Hasura health in ${ENVIRONMENT}..."

# Port forward
kubectl port-forward -n ${NAMESPACE} deployment/hasura-ddn-engine 3000:3000 &
PID=$!
sleep 5

# Health check
RESPONSE=$(curl -s http://localhost:3000/healthz)
echo "Response: ${RESPONSE}"

# Cleanup
kill $PID

if [[ "$RESPONSE" == *"ok"* ]]; then
  echo "✅ Health check passed"
  exit 0
else
  echo "❌ Health check failed"
  exit 1
fi
```

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh production
```

---

## Troubleshooting

### "introspect-db.sh: Cannot connect to database"

**Causes & Fixes**:

1. **Wrong DATABASE_URL**
   ```bash
   # Test connection
   psql "$DATABASE_URL" -c "SELECT 1"
   ```

2. **Missing environment variable**
   ```bash
   # Check if set
   echo $DATABASE_URL

   # Load from file
   source .env.local
   ```

3. **Network/firewall issue**
   ```bash
   # Test network
   telnet your-db-host 5432
   ```

---

### "build-supergraph.sh: Command 'ddn' not found"

**Cause**: DDN CLI not installed

**Fix**:
```bash
npm install -g @hasura/ddn-cli
ddn version
```

---

### "build-engine.sh: engine/build/ directory not found"

**Cause**: Supergraph not built

**Fix**:
```bash
# Build supergraph first
./scripts/build-supergraph.sh

# Verify output
ls engine/build/
```

---

### "deploy-metadata.sh: Unable to connect to the server"

**Causes & Fixes**:

1. **Wrong kubeconfig**
   ```bash
   # Check current context
   kubectl config current-context

   # List contexts
   kubectl config get-contexts

   # Switch context
   kubectl config use-context my-cluster
   ```

2. **Cluster not accessible**
   ```bash
   # Test connection
   kubectl get nodes

   # Check credentials
   kubectl cluster-info
   ```

3. **Namespace doesn't exist**
   ```bash
   # Create namespace
   kubectl create namespace hasura-local

   # Or use existing namespace
   export NAMESPACE_LOCAL=default
   ```

---

### "Docker push: denied: requested access to the resource is denied"

**Causes & Fixes**:

1. **Not logged in**
   ```bash
   # Login to Docker Hub
   docker login

   # Login to GHCR
   echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
   ```

2. **Wrong registry**
   ```bash
   # Check image name
   docker images | grep hasura

   # Retag if needed
   docker tag local-image:v1.0.0 correct-registry/image:v1.0.0
   ```

---

## Further Reading

### Hasura DDN v3 Documentation

**Build and Deploy**:
- [Supergraph Build](https://hasura.io/docs/3.0/project-configuration/build/)
- [Docker Deployment](https://hasura.io/docs/3.0/deployment/docker/)
- [Kubernetes Deployment](https://hasura.io/docs/3.0/deployment/kubernetes/)

**CLI Reference**:
- [DDN CLI Commands](https://hasura.io/docs/3.0/cli/commands/)
- [Introspection](https://hasura.io/docs/3.0/connectors/postgresql/introspection/)
- [Build Configuration](https://hasura.io/docs/3.0/project-configuration/build-configuration/)

### Shell Scripting

**Best Practices**:
- [Bash Best Practices](https://google.github.io/styleguide/shellguide.html)
- [ShellCheck](https://www.shellcheck.net/) - Script linter
- [Defensive Bash](https://github.com/anordal/shellharden)

### Deployment

**Kubernetes**:
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Rolling Updates](https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/)
- [Rollback Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment)

**Docker**:
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Image Tagging](https://docs.docker.com/engine/reference/commandline/tag/)

### Related Documentation

- **Main README**: `../README.md` - Project overview
- **QUICKSTART**: `../QUICKSTART.md` - Manual step-by-step guide
- **ARCHITECTURE**: `../ARCHITECTURE.md` - Understanding deployment model
- **GitHub Actions**: `../.github/README.md` - Automated CI/CD

---

## Questions?

**Common scenarios**:
- First deployment? Follow [Quick Start](#quick-start)
- Script failed? Check [Troubleshooting](#troubleshooting)
- Automating? See `../.github/README.md` for CI/CD
- Manual deployment? These scripts are what you need!

**Need help?**
- [Hasura Discord](https://discord.com/invite/hasura)
- [GitHub Discussions](https://github.com/hasura/graphql-engine/discussions)
