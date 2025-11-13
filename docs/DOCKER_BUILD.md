# Docker Build Process for Hasura DDN

Understanding how to build and deploy Docker images for your self-hosted Hasura DDN deployment.

## Overview

Hasura DDN v3 uses a microservices architecture with two main components:

1. **DDN Engine** - The GraphQL API server with compiled metadata (this is what we build)
2. **Connectors** - Data source connectors (typically use pre-built Hasura images)

## DDN Engine Docker Image

### What Gets Packaged

The engine Docker image contains:
- Hasura DDN v3 engine binary (Rust-based)
- **Your compiled metadata** (`supergraph.json`)
- Configuration files

This creates an **immutable deployment artifact** where the GraphQL schema and permissions are baked into the image.

### Building the Engine Image

#### Prerequisites

```bash
# 1. Build supergraph first
cd my-api
ddn supergraph build local

# Verify build output exists
ls app/supergraph/build/supergraph.json
```

#### Using the Build Script

```bash
# From your project directory
cd ..

# Clone this template (if not already)
git clone https://github.com/yourusername/onprem-hasura-k8s.git docker-helpers

# Run build script
docker-helpers/scripts/build-engine.sh v1.0.0
```

**What the script does:**
1. Validates `supergraph.json` exists
2. Copies compiled metadata to Docker build context
3. Builds multi-stage Docker image
4. Tags with version number
5. Adds build metadata (git SHA, build date)

#### Manual Build (Alternative)

```bash
# Copy metadata to engine directory
cp app/supergraph/build/supergraph.json engine/metadata.json

# Build Docker image
docker build \
  -t your-registry/ddn-engine:v1.0.0 \
  -f docker-helpers/engine/Dockerfile.engine \
  --build-arg VERSION=v1.0.0 \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  docker-helpers/engine/
```

### Understanding the Dockerfile

```dockerfile
# engine/Dockerfile.engine (simplified)

# Stage 1: Base image with Hasura DDN engine
FROM hasura/ddn-engine:latest AS base

# Stage 2: Add compiled metadata
FROM base AS final
COPY metadata.json /md/supergraph.json

# Engine serves on port 3000
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Start engine
CMD ["./engine", "serve", "--metadata-path", "/md/supergraph.json"]
```

**Key points:**
- Uses official Hasura DDN engine base image
- Copies YOUR compiled metadata
- Metadata is immutable (cannot be changed at runtime)
- Port 3000 for GraphQL API

### Image Tagging Strategy

#### Semantic Versioning

```bash
# Major version (breaking changes)
build-engine.sh v2.0.0

# Minor version (new features)
build-engine.sh v1.1.0

# Patch version (bug fixes)
build-engine.sh v1.0.1
```

#### Git-Based Tags

```bash
# Tag with git SHA
VERSION=$(git rev-parse --short HEAD)
build-engine.sh v1.0.0-${VERSION}

# Result: v1.0.0-a1b2c3d
```

#### Environment Tags

```bash
# Tag by environment
build-engine.sh v1.0.0-staging
build-engine.sh v1.0.0-production
```

### Pushing to Registry

#### Docker Hub

```bash
# Login
docker login -u yourusername

# Push
docker push yourusername/ddn-engine:v1.0.0

# Tag as latest (optional)
docker tag yourusername/ddn-engine:v1.0.0 yourusername/ddn-engine:latest
docker push yourusername/ddn-engine:latest
```

#### AWS ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Tag
docker tag yourusername/ddn-engine:v1.0.0 \
  123456789.dkr.ecr.us-east-1.amazonaws.com/ddn-engine:v1.0.0

# Push
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/ddn-engine:v1.0.0
```

#### Google GCR

```bash
# Configure Docker auth
gcloud auth configure-docker

# Tag
docker tag yourusername/ddn-engine:v1.0.0 \
  gcr.io/project-id/ddn-engine:v1.0.0

# Push
docker push gcr.io/project-id/ddn-engine:v1.0.0
```

#### Azure ACR

```bash
# Login
az acr login --name myregistry

# Tag
docker tag yourusername/ddn-engine:v1.0.0 \
  myregistry.azurecr.io/ddn-engine:v1.0.0

# Push
docker push myregistry.azurecr.io/ddn-engine:v1.0.0
```

## Connectors

### Using Pre-Built Connector Images

For standard connectors (PostgreSQL, MongoDB, etc.), Hasura provides pre-built images that you reference in your deployment:

```yaml
# In your Kubernetes deployment or docker-compose
connectors:
  postgres:
    image: hasura/postgres-data-connector:v1.0.0
    env:
      - DATABASE_URL=${DATABASE_URL}
```

**No custom Docker build needed** for standard connectors!

### When to Build Custom Connector Images

You only need custom connector images if you're:

1. **Building custom TypeScript connectors** with business logic
2. **Modifying standard connectors** with custom code
3. **Using private/proprietary data sources**

Example custom connector Dockerfile:

```dockerfile
# For custom TypeScript connector
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/
COPY tsconfig.json ./

RUN npm run build

EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### Connector Deployment in Kubernetes

```yaml
# postgres-connector.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-connector
spec:
  replicas: 2
  selector:
    matchLabels:
      app: postgres-connector
  template:
    metadata:
      labels:
        app: postgres-connector
    spec:
      containers:
        - name: connector
          image: hasura/postgres-data-connector:v1.0.0
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secrets
                  key: DATABASE_URL
          ports:
            - containerPort: 8080
```

## Build Optimization

### Multi-Stage Builds

The engine Dockerfile uses multi-stage builds to minimize image size:

```dockerfile
# Build stage (includes build tools)
FROM hasura/ddn-engine-builder AS builder
# ... build steps ...

# Runtime stage (minimal)
FROM alpine:latest
COPY --from=builder /app/engine /engine
# Result: Much smaller final image
```

### Layer Caching

```bash
# Optimize build order for caching
# 1. Copy package files first (changes rarely)
# 2. Install dependencies (cached if package files unchanged)
# 3. Copy source code (changes frequently)
# 4. Build application
```

### Image Size Tips

```bash
# Check image size
docker images your-registry/ddn-engine:v1.0.0

# Remove old images
docker image prune -a

# Use .dockerignore
echo "node_modules" >> .dockerignore
echo ".git" >> .dockerignore
echo "*.md" >> .dockerignore
```

## Deployment Workflow

### Complete CI/CD Pipeline

```bash
# 1. Code changes
git add app/subgraphs/default/metadata/Users.hml
git commit -m "Add user permissions"

# 2. Build supergraph
ddn supergraph build local

# 3. Test locally
ddn run docker-start
# Run tests...

# 4. Build Docker image
./scripts/build-engine.sh v1.1.0

# 5. Push to registry
docker push your-registry/ddn-engine:v1.1.0

# 6. Deploy to Kubernetes
kubectl set image deployment/ddn-engine \
  engine=your-registry/ddn-engine:v1.1.0

# 7. Wait for rollout
kubectl rollout status deployment/ddn-engine

# 8. Verify deployment
kubectl exec -it deployment/ddn-engine -- curl localhost:3000/healthz

# 9. Tag in git
git tag v1.1.0
git push origin v1.1.0
```

### Rollback Strategy

```bash
# If deployment fails, rollback is instant
kubectl rollout undo deployment/ddn-engine

# Or deploy previous version
kubectl set image deployment/ddn-engine \
  engine=your-registry/ddn-engine:v1.0.0
```

## Image Verification

### Inspect Image Contents

```bash
# View image layers
docker history your-registry/ddn-engine:v1.0.0

# View image metadata
docker inspect your-registry/ddn-engine:v1.0.0

# Check for metadata file
docker run --rm your-registry/ddn-engine:v1.0.0 ls -la /md/

# Verify version
docker run --rm your-registry/ddn-engine:v1.0.0 ./engine --version
```

### Test Image Locally

```bash
# Run locally with environment variables
docker run -it --rm \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  your-registry/ddn-engine:v1.0.0

# Test health endpoint
curl http://localhost:3000/healthz

# Test GraphQL
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## Security Considerations

### Image Scanning

```bash
# Scan for vulnerabilities (if using Docker Hub Pro)
docker scan your-registry/ddn-engine:v1.0.0

# Or use Trivy
trivy image your-registry/ddn-engine:v1.0.0

# Or Snyk
snyk container test your-registry/ddn-engine:v1.0.0
```

### Secrets in Images

**❌ Never include:**
- Database passwords in images
- API keys in images
- OAuth secrets in images

**✅ Always use:**
- Environment variables
- Kubernetes Secrets
- External secret managers

### Signing Images

```bash
# Sign with Docker Content Trust
export DOCKER_CONTENT_TRUST=1
docker push your-registry/ddn-engine:v1.0.0

# Or use Cosign
cosign sign your-registry/ddn-engine:v1.0.0
```

## Troubleshooting

### Build Failures

```bash
# Check if metadata exists
ls app/supergraph/build/supergraph.json

# Verify metadata is valid JSON
cat app/supergraph/build/supergraph.json | jq .

# Check Docker daemon
docker info

# Build with verbose output
docker build --progress=plain ...
```

### Image Won't Start

```bash
# Check logs
docker logs <container-id>

# Common issues:
# - Missing metadata file
# - Invalid metadata JSON
# - Port already in use
# - Missing environment variables
```

### Registry Issues

```bash
# Verify login
docker login

# Check credentials
cat ~/.docker/config.json

# Test connectivity
docker pull hello-world

# Rate limiting (Docker Hub)
# Solution: Authenticate or use paid tier
```

## Best Practices

### 1. Version Everything

```bash
# Tag images with exact versions
v1.0.0  # ✅ Good
latest  # ❌ Avoid in production
```

### 2. Keep Images Small

```bash
# Use alpine base images
# Remove build dependencies
# Use multi-stage builds
# Current engine image: ~100-150MB
```

### 3. Automate Builds

```bash
# Use CI/CD for consistency
# GitHub Actions, GitLab CI, Jenkins, etc.
```

### 4. Test Before Deploying

```bash
# Always test locally first
ddn run docker-start
# Run integration tests
# Then build production image
```

### 5. Document Your Builds

```bash
# Include build metadata
git rev-parse HEAD > VERSION
docker build --label git.sha=$(cat VERSION) ...
```

## Resources

- **Dockerfile Reference**: https://docs.docker.com/engine/reference/builder/
- **Multi-Stage Builds**: https://docs.docker.com/build/building/multi-stage/
- **Hasura DDN Docs**: https://hasura.io/docs/3.0/
- **Container Best Practices**: https://docs.docker.com/develop/dev-best-practices/

---

**Next**: [Authentication Setup](./AUTHENTICATION.md) | [Environment Setup](./ENVIRONMENT_SETUP.md)
