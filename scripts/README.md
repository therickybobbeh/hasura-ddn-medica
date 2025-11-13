# Build Scripts

This directory contains the Docker build script for packaging your Hasura DDN v3 engine with compiled metadata.

## Philosophy: CLI-First Workflow

This template follows the **official Hasura DDN CLI workflow**. You use `ddn` CLI commands for project setup, and this script handles Docker packaging.

### What You Do (DDN CLI)

```bash
# Create project structure
ddn project init my-api

# Add data sources
ddn connector add my_postgres -i

# Generate GraphQL models
ddn model add my_postgres "*"

# Compile metadata
ddn supergraph build local
```

### What This Script Does

```bash
# Package compiled metadata into Docker image
./scripts/build-engine.sh v1.0.0
```

**That's it!** One script for Docker builds.

---

## build-engine.sh

### Purpose

Packages your **compiled metadata** (`supergraph.json`) into a deployable Docker image.

### What It Does

1. Validates that `supergraph.json` exists
2. Copies compiled metadata to Docker build context
3. Builds multi-stage Docker image with Hasura DDN engine
4. Tags image with your version number
5. Adds build metadata (git SHA, build date)

### Prerequisites

You must build the supergraph first using DDN CLI:

```bash
# In your DDN project (my-api/)
ddn supergraph build local

# Verify output exists
ls app/supergraph/build/supergraph.json
```

### Usage

```bash
# From your project directory
../docker-helpers/scripts/build-engine.sh <version>
```

**Arguments:**
- `<version>` - Version tag (e.g., `v1.0.0`, `v1.2.3-beta`)

**Environment Variables:**
- `DOCKER_REGISTRY` - Your registry (default: `docker.io/yourusername`)

### Examples

```bash
# Build version 1.0.0
../docker-helpers/scripts/build-engine.sh v1.0.0

# Build with custom registry
export DOCKER_REGISTRY=ghcr.io/mycompany
../docker-helpers/scripts/build-engine.sh v1.0.0

# Build beta version
../docker-helpers/scripts/build-engine.sh v1.2.0-beta
```

### Output

Creates Docker image:
```
${DOCKER_REGISTRY}/ddn-engine:${VERSION}

Example: docker.io/mycompany/ddn-engine:v1.0.0
```

### What Gets Packaged

The Docker image contains:
- **Hasura DDN v3 engine binary** (from official base image)
- **Your compiled metadata** (`supergraph.json`)
- **Configuration files**

This creates an **immutable deployment artifact**—the GraphQL schema and permissions are baked into the image.

### After Building

Push to your container registry:

```bash
# Docker Hub
docker push your-username/ddn-engine:v1.0.0

# AWS ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/ddn-engine:v1.0.0

# Google GCR
docker push gcr.io/project-id/ddn-engine:v1.0.0

# Azure ACR
docker push myregistry.azurecr.io/ddn-engine:v1.0.0
```

Then deploy to Kubernetes (see your `infra-k8s` repository).

---

## Complete Workflow

### Development Cycle

```bash
# 1. In your DDN project directory (my-api/)
cd my-api

# 2. Make metadata changes (edit .hml files, add models, etc.)

# 3. Build supergraph
ddn supergraph build local

# 4. Test locally (optional)
ddn run docker-start

# 5. Build Docker image
cd ..
./docker-helpers/scripts/build-engine.sh v1.1.0

# 6. Push to registry
docker push your-registry/ddn-engine:v1.1.0

# 7. Deploy to Kubernetes (in your infra-k8s repo)
kubectl set image deployment/ddn-engine \
  engine=your-registry/ddn-engine:v1.1.0
```

### First-Time Setup

```bash
# 1. Create DDN project (outside this template)
ddn project init my-api
cd my-api

# 2. Add database
ddn connector add my_postgres -i

# 3. Generate models
ddn model add my_postgres "*"

# 4. Build supergraph
ddn supergraph build local

# 5. Clone this template
cd ..
git clone https://github.com/yourusername/onprem-hasura-k8s.git docker-helpers

# 6. Build Docker image
docker-helpers/scripts/build-engine.sh v1.0.0

# 7. Push and deploy
docker push your-registry/ddn-engine:v1.0.0
# (Then deploy to K8s in your infra-k8s repo)
```

---

## Requirements

### Tools

```bash
# Docker (required)
docker --version  # Should be 20.x or higher

# DDN CLI (for building supergraph)
npm install -g @hasura/ddn
ddn version  # Should be v2.8.0+
```

### Environment Variables

```bash
# Optional: Set your Docker registry
export DOCKER_REGISTRY=docker.io/yourusername

# Or use AWS ECR, GCR, ACR, etc.
export DOCKER_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com
```

---

## Customization

### Custom Registry

```bash
# Docker Hub (default)
export DOCKER_REGISTRY=docker.io/mycompany

# GitHub Container Registry
export DOCKER_REGISTRY=ghcr.io/mycompany

# AWS ECR
export DOCKER_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com

# Google Artifact Registry
export DOCKER_REGISTRY=us-docker.pkg.dev/project-id/repo-name

# Azure ACR
export DOCKER_REGISTRY=myregistry.azurecr.io

# Then build
./scripts/build-engine.sh v1.0.0
```

### Custom Image Name

Edit `scripts/build-engine.sh` and change:

```bash
IMAGE_NAME=${IMAGE_NAME:-"ddn-engine"}
```

---

## Troubleshooting

### "supergraph.json not found"

**Cause:** You haven't built the supergraph yet.

**Fix:**
```bash
# In your DDN project directory
cd my-api
ddn supergraph build local

# Verify output
ls app/supergraph/build/supergraph.json
```

### "Docker build failed"

**Common causes:**

1. **Docker daemon not running**
   ```bash
   docker info
   ```

2. **Insufficient disk space**
   ```bash
   docker system df
   docker system prune
   ```

3. **Invalid supergraph.json**
   ```bash
   # Validate JSON
   cat app/supergraph/build/supergraph.json | jq .
   ```

### "Permission denied" when pushing

**Cause:** Not logged into registry.

**Fix:**
```bash
# Docker Hub
docker login

# AWS ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Google GCR
gcloud auth configure-docker

# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

## Resources

- **DDN CLI Docs**: https://hasura.io/docs/3.0/cli/overview/
- **Docker Build Guide**: [../docs/DOCKER_BUILD.md](../docs/DOCKER_BUILD.md)
- **CLI Workflow**: [../docs/CLI_WORKFLOW.md](../docs/CLI_WORKFLOW.md)
- **Quick Start**: [../docs/QUICKSTART.md](../docs/QUICKSTART.md)
- **Official DDN Docs**: https://hasura.io/docs/3.0/

---

**Questions?** See the main [README.md](../README.md) or check [docs/](../docs/)
