# Docker Hub Setup Guide

This template is configured to use Docker Hub for hosting container images. This guide covers setting up and using the three Docker Hub repositories for your Hasura DDN deployment.

## Docker Hub Repositories

This template uses three separate Docker Hub repositories:

1. **`rickybobbeh/ddn-engine`**: Hasura DDN v3 engine with compiled metadata
2. **`rickybobbeh/ddn-connector-1`**: PostgreSQL connector for database 1
3. **`rickybobbeh/ddn-connector-2`**: PostgreSQL connector for database 2
4 

## Repository Setup

### Creating Docker Hub Repositories

1. **Login to Docker Hub**:
   - Go to [hub.docker.com](https://hub.docker.com)
   - Login with username `rickybobbeh`

2. **Create Repositories** (if they don't exist):
   ```bash
   # Via Docker Hub web interface:
   # - Click "Create Repository"
   # - Name: ddn-engine
   # - Visibility: Public or Private
   # - Create

   # Repeat for:
   # - ddn-connector-1
   # - ddn-connector-2
   ```

3. **Generate Access Token**:
   - Go to Account Settings → Security
   - Click "New Access Token"
   - Name: `hasura-ddn-ci`
   - Permissions: Read & Write
   - Copy the token (save it securely!)

### Local Docker Login

```bash
# Login to Docker Hub
docker login -u rickybobbeh

# When prompted, enter your Docker Hub token (not password)

# Verify login
docker info | grep Username
# Should show: Username: rickybobbeh
```

## Building and Pushing Images

### 1. DDN Engine Image

The engine image contains the Hasura DDN v3 engine with your compiled metadata baked in.

**Build the engine**:

```bash
# Ensure supergraph is built first
./scripts/build-supergraph.sh

# Build engine image with version tag
./scripts/build-engine.sh v1.0.0

# This creates: rickybobbeh/ddn-engine:v1.0.0
```

**Push to Docker Hub**:

```bash
# Push the versioned image
docker push rickybobbeh/ddn-engine:v1.0.0

# Tag as latest
docker tag rickybobbeh/ddn-engine:v1.0.0 rickybobbeh/ddn-engine:latest

# Push latest tag
docker push rickybobbeh/ddn-engine:latest
```

**Build script details** (`scripts/build-engine.sh`):

```bash
#!/bin/bash
# The script automatically:
# 1. Validates that metadata is compiled
# 2. Builds Docker image with multi-stage build
# 3. Tags with version and build metadata
# 4. Outputs: rickybobbeh/ddn-engine:<version>

VERSION=${1:-latest}
./scripts/build-engine.sh $VERSION
```

### 2. Database Connector Images

Each database gets its own connector image for independent scaling and versioning.

**Build connector for database 1**:

```bash
# Navigate to connector directory
cd subgraphs/database-1/connector/postgres

# Build the connector image
docker build -t rickybobbeh/ddn-connector-1:v1.0.0 \
  -f Dockerfile \
  --build-arg CONNECTOR_VERSION=v0.6.0 \
  .

# Tag as latest
docker tag rickybobbeh/ddn-connector-1:v1.0.0 rickybobbeh/ddn-connector-1:latest
```

**Push connector 1**:

```bash
docker push rickybobbeh/ddn-connector-1:v1.0.0
docker push rickybobbeh/ddn-connector-1:latest
```

**Build connector for database 2**:

```bash
cd subgraphs/database-2/connector/postgres

docker build -t rickybobbeh/ddn-connector-2:v1.0.0 \
  -f Dockerfile \
  --build-arg CONNECTOR_VERSION=v0.6.0 \
  .

docker tag rickybobbeh/ddn-connector-2:v1.0.0 rickybobbeh/ddn-connector-2:latest

docker push rickybobbeh/ddn-connector-2:v1.0.0
docker push rickybobbeh/ddn-connector-2:latest
```

## Versioning Strategy

### Semantic Versioning

Use semantic versioning for all images:

- **Major version** (v2.0.0): Breaking changes to GraphQL schema
- **Minor version** (v1.1.0): New features, backwards compatible
- **Patch version** (v1.0.1): Bug fixes, no schema changes

### Build Metadata

Add build metadata for traceability:

```bash
# Include git commit hash
BUILD_HASH=$(git rev-parse --short HEAD)
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

docker build -t rickybobbeh/ddn-engine:v1.0.0 \
  --label "git.commit=$BUILD_HASH" \
  --label "build.date=$BUILD_DATE" \
  --label "version=v1.0.0" \
  -f engine/Dockerfile.engine \
  .
```

### Tagging Strategy

Recommended tagging approach:

```bash
# Version-specific tag (immutable)
rickybobbeh/ddn-engine:v1.0.0

# Latest for environment (mutable)
rickybobbeh/ddn-engine:latest
rickybobbeh/ddn-engine:dev
rickybobbeh/ddn-engine:staging
rickybobbeh/ddn-engine:prod

# Git SHA tag (for exact reproducibility)
rickybobbeh/ddn-engine:sha-a1b2c3d
```

## CI/CD Integration

### GitHub Actions Setup

The template includes GitHub Actions workflows for automated builds and pushes.

**Required GitHub Secrets**:

```bash
# In your GitHub repository:
# Settings → Secrets and variables → Actions → New repository secret

DOCKER_HUB_USERNAME=rickybobbeh
DOCKER_HUB_TOKEN=dckr_pat_xxxxxxxxxxxxxxxxxxxxx
```

**Workflow: Build and Push Engine** (`.github/workflows/deploy-metadata.yml`):

```yaml
- name: Login to Docker Hub
  uses: docker/login-action@v2
  with:
    username: ${{ secrets.DOCKER_HUB_USERNAME }}
    password: ${{ secrets.DOCKER_HUB_TOKEN }}

- name: Build and push engine
  run: |
    ./scripts/build-supergraph.sh
    ./scripts/build-engine.sh ${{ github.ref_name }}
    docker push rickybobbeh/ddn-engine:${{ github.ref_name }}
```

**Workflow: Build Connectors** (`.github/workflows/build-custom-connector.yml`):

```yaml
- name: Build and push connector 1
  run: |
    cd subgraphs/database-1/connector/postgres
    docker build -t rickybobbeh/ddn-connector-1:${GITHUB_SHA::7} .
    docker push rickybobbeh/ddn-connector-1:${GITHUB_SHA::7}
```

### Manual CI/CD

If not using GitHub Actions:

```bash
# Build all images
./scripts/build-supergraph.sh
./scripts/build-engine.sh v1.0.0

cd subgraphs/database-1/connector/postgres
docker build -t rickybobbeh/ddn-connector-1:v1.0.0 .

cd ../../../database-2/connector/postgres
docker build -t rickybobbeh/ddn-connector-2:v1.0.0 .

# Push all images
docker push rickybobbeh/ddn-engine:v1.0.0
docker push rickybobbeh/ddn-connector-1:v1.0.0
docker push rickybobbeh/ddn-connector-2:v1.0.0
```

## Kubernetes Deployment Configuration

Update your Kubernetes manifests to use the Docker Hub images.

**Engine Deployment**:

```yaml
# In your Kubernetes deployment manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hasura-ddn-engine
spec:
  template:
    spec:
      containers:
        - name: engine
          image: rickybobbeh/ddn-engine:v1.0.0
          imagePullPolicy: Always
          # ... other config
```

**Connector Deployments**:

```yaml
# Database 1 Connector
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-connector-1
spec:
  template:
    spec:
      containers:
        - name: connector
          image: rickybobbeh/ddn-connector-1:v1.0.0
          # ... config

---
# Database 2 Connector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-connector-2
spec:
  template:
    spec:
      containers:
        - name: connector
          image: rickybobbeh/ddn-connector-2:v1.0.0
          # ... config
```

## Image Pull Secrets (for Private Repositories)

If using private Docker Hub repositories:

**Create Docker Registry Secret**:

```bash
kubectl create secret docker-registry docker-hub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=rickybobbeh \
  --docker-password=<your-docker-hub-token> \
  --docker-email=<your-email> \
  -n hasura-local
```

**Update Deployment**:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
        - name: docker-hub-secret
      containers:
        - name: engine
          image: rickybobbeh/ddn-engine:v1.0.0
```

## Monitoring and Maintenance

### Check Image Status

```bash
# List local images
docker images | grep rickybobbeh

# Check image size
docker images rickybobbeh/ddn-engine --format "{{.Repository}}:{{.Tag}} {{.Size}}"

# Inspect image metadata
docker inspect rickybobbeh/ddn-engine:latest | jq '.[0].Config.Labels'
```

### Clean Up Old Images

```bash
# Remove local images
docker rmi rickybobbeh/ddn-engine:old-version

# Remove all untagged images
docker image prune -f

# Remove dangling images
docker image prune -a -f --filter "until=720h"  # Older than 30 days
```

### Docker Hub Cleanup

Via Docker Hub web interface:
1. Go to repository (e.g., `rickybobbeh/ddn-engine`)
2. Click "Tags"
3. Select old tags
4. Click "Delete"

Best practice: Keep last 10-20 versions, delete older tags.

## Troubleshooting

### Authentication Failed

```bash
# Re-login to Docker Hub
docker logout
docker login -u rickybobbeh

# Use access token, not password
```

### Image Push Failed

```bash
# Check repository exists
docker search rickybobbeh/ddn-engine

# Verify tag format
docker images rickybobbeh/ddn-engine

# Check for rate limiting
docker pull rickybobbeh/ddn-engine:latest
```

### Large Image Size

```bash
# Check image layers
docker history rickybobbeh/ddn-engine:latest

# Use multi-stage builds (already configured in template)
# Optimize by:
# - Removing build dependencies
# - Using alpine base images
# - Combining RUN commands
```

### Pull Rate Limit

Docker Hub has rate limits:
- **Unauthenticated**: 100 pulls per 6 hours
- **Authenticated**: 200 pulls per 6 hours
- **Pro/Team**: Higher limits

**Solution**: Always authenticate:
```bash
docker login -u rickybobbeh
```

## Best Practices

### 1. Always Tag with Versions

```bash
# Good
docker tag rickybobbeh/ddn-engine:v1.0.0 rickybobbeh/ddn-engine:latest

# Avoid
docker tag rickybobbeh/ddn-engine:latest rickybobbeh/ddn-engine:prod
```

### 2. Use Immutable Tags for Production

```bash
# Production should use specific versions
image: rickybobbeh/ddn-engine:v1.0.0

# Not
image: rickybobbeh/ddn-engine:latest
```

### 3. Automate Builds

Use GitHub Actions or CI/CD pipeline for consistent builds.

### 4. Security Scanning

```bash
# Scan images for vulnerabilities
docker scan rickybobbeh/ddn-engine:v1.0.0

# Or use Docker Hub's built-in scanning (Pro tier)
```

### 5. Image Size Optimization

Current image sizes:
- Engine: ~100-150 MB (includes Rust binary + metadata)
- Connector: ~50-100 MB (includes Node.js runtime)

Optimize by:
- Using multi-stage builds (already configured)
- Minimizing layers
- Removing unnecessary files

## Alternative Registries

To use a different container registry (ECR, GCR, ACR):

### Amazon ECR

```bash
# Update repository URLs in scripts
sed -i 's/rickybobbeh/123456789.dkr.ecr.us-east-1.amazonaws.com/' scripts/*.sh

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com
```

### Google Container Registry

```bash
# Update repository URLs
sed -i 's/rickybobbeh/gcr.io\/my-project/' scripts/*.sh

# Login
gcloud auth configure-docker
```

### Azure Container Registry

```bash
# Update repository URLs
sed -i 's/rickybobbeh/myregistry.azurecr.io/' scripts/*.sh

# Login
az acr login --name myregistry
```

---

**Docker Hub setup complete!** Your images are now hosted and ready for deployment.
