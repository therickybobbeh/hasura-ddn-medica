# Local Development Guide

This guide explains how to work with this DDN project locally and deploy to both local Docker and Hasura DDN cloud.

## Prerequisites

- Docker and Docker Compose installed
- DDN CLI installed (`npm install -g @hasura/ddn-cli`)
- Authenticated with DDN (`ddn auth login`)

## Context Configuration

The project uses DDN context for convenient command execution. The context is defined in `.hasura/context.yaml` and includes:

- **Project**: `hopeful-monkey-8713`
- **Supergraph**: `supergraph.yaml`
- **Local Environment**: `.env`
- **Cloud Environment**: `.env.cloud`

### Setting the Context

The context should already be initialized. To verify:

```bash
ddn context get project
```

If you need to reinitialize:

```bash
ddn context set-current-context default
```

## Available Scripts

The following convenience scripts are available via `ddn run <script-name>`:

### Local Development

#### `docker-start`
Starts all services locally using Docker Compose, including:
- Hasura DDN Engine
- OpenTelemetry Collector
- All connector services (neon_postgres_1, neon_postgres_2, neon_postgres_lean)

```bash
ddn run docker-start
```

This command:
- Automatically sets your DDN PAT for telemetry
- Builds and pulls latest images
- Starts services in detached mode
- Uses `.env` for configuration

**Access points after starting:**
- GraphQL API: http://localhost:3280/graphql
- GraphQL Console: http://localhost:3280/console
- OTEL Collector: http://localhost:4317 (gRPC), http://localhost:4318 (HTTP)

#### `docker-stop`
Stops all local Docker services:

```bash
ddn run docker-stop
```

#### `build-local`
Builds the supergraph locally without deploying to cloud:

```bash
ddn run build-local
```

This validates your metadata and generates the build artifacts locally using `.env` configuration.

### Cloud Deployment

#### `build-supergraph`
Creates a new supergraph build on Hasura DDN cloud:

```bash
ddn run build-supergraph
```

This command:
- Uses `.env.cloud` for connector URLs
- Deploys to project `hopeful-monkey-8713`
- Creates a new build visible at: https://console.hasura.io/project/hopeful-monkey-8713

## Local Development Workflow

### 1. Start Local Environment

```bash
# Start all services
ddn run docker-start

# View logs
docker compose logs -f engine

# Check status
docker compose ps
```

### 2. Make Metadata Changes

Edit your `.hml` files in `app/metadata/` or `globals/metadata/`

### 3. Update Local Connectors (if needed)

If you change database schema:

```bash
# Update connector configuration
cd app/connector/neon_postgres_1
ddn connector introspect

# Rebuild local services
cd ../../..
ddn run docker-stop
ddn run docker-start
```

### 4. Test Changes Locally

Access your GraphQL API at http://localhost:3280/graphql

### 5. Build and Deploy to Cloud

When ready to deploy:

```bash
# Build supergraph on cloud
ddn run build-supergraph
```

## Cloud Deployment Workflow

Your cloud deployment is at:
- Project: `hopeful-monkey-8713`
- Console: https://console.hasura.io/project/hopeful-monkey-8713
- Latest Build: https://console.hasura.io/project/hopeful-monkey-8713/build/6b57d951bf/graphql

### Deploying Updates

```bash
# 1. Build supergraph (creates new build)
ddn run build-supergraph

# 2. The build will be automatically available at the new build URL
# Check the console for the new build ID
```

## Container Image Building and Registry Push

### Building Custom Engine Images

The DDN engine is built using the Dockerfile at `engine/Dockerfile.engine`.

#### Local Build

```bash
# Build engine image locally
docker build -t my-registry/hasura-ddn-engine:v1.0.0 -f engine/Dockerfile.engine engine/

# Test locally
docker run -p 3280:3000 \
  -v $(pwd)/engine/build:/md \
  -e METADATA_PATH=/md/open_dd.json \
  -e AUTHN_CONFIG_PATH=/md/auth_config.json \
  my-registry/hasura-ddn-engine:v1.0.0
```

#### Push to Container Registry

##### For Docker Hub

```bash
# Login
docker login

# Build with your registry path
docker build -t yourusername/hasura-ddn-engine:v1.0.0 -f engine/Dockerfile.engine engine/

# Push
docker push yourusername/hasura-ddn-engine:v1.0.0
```

##### For Google Container Registry (GCR)

```bash
# Authenticate
gcloud auth configure-docker

# Build with GCR path
docker build -t gcr.io/your-project/hasura-ddn-engine:v1.0.0 -f engine/Dockerfile.engine engine/

# Push
docker push gcr.io/your-project/hasura-ddn-engine:v1.0.0
```

##### For Azure Container Registry (ACR)

```bash
# Login
az acr login --name yourregistry

# Build
docker build -t yourregistry.azurecr.io/hasura-ddn-engine:v1.0.0 -f engine/Dockerfile.engine engine/

# Push
docker push yourregistry.azurecr.io/hasura-ddn-engine:v1.0.0
```

##### For AWS ECR

```bash
# Get login credentials
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com

# Build
docker build -t your-account-id.dkr.ecr.us-east-1.amazonaws.com/hasura-ddn-engine:v1.0.0 -f engine/Dockerfile.engine engine/

# Push
docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/hasura-ddn-engine:v1.0.0
```

### Building Connector Images

Each connector has its own Dockerfile:

```bash
# Build connector image
cd app/connector/neon_postgres_1
docker build -t my-registry/neon-postgres-connector:v1.0.0 -f .hasura-connector/Dockerfile.neon_postgres_1 .

# Push to registry
docker push my-registry/neon-postgres-connector:v1.0.0
```

### Using Custom Images in Kubernetes

After pushing images, update your Kubernetes deployment manifests to use the custom registry:

```yaml
# In your k8s deployment YAML
spec:
  containers:
  - name: engine
    image: my-registry/hasura-ddn-engine:v1.0.0
    # ... rest of config
```

## CI/CD Integration

The GitHub Actions workflows continue to use explicit flags for clarity and reliability:

```bash
# In CI/CD, commands use explicit flags instead of context
ddn supergraph build create \
  --project hopeful-monkey-8713 \
  --supergraph supergraph.yaml \
  --env-file .env.cloud \
  --ci
```

The `--ci` flag disables context requirements, making the pipeline more explicit and reproducible.

## Environment Variables

### Local (.env)
- Connector URLs point to `local.hasura.dev` (Docker network)
- Used by `docker-start` and `build-local` scripts
- Example: `APP_NEON_POSTGRES_1_READ_URL=http://local.hasura.dev:5637`

### Cloud (.env.cloud)
- Connector URLs point to Google Cloud Run or other cloud endpoints
- Used by `build-supergraph` script
- Example: `APP_NEON_POSTGRES_1_READ_URL=https://connector-xyz.run.app`

## Troubleshooting

### "Unable to read context: current context not set"

Run:
```bash
ddn context set-current-context default
```

### Port Already in Use

If port 3280 is already in use:
```bash
# Stop existing services
ddn run docker-stop

# Or modify compose.yaml to use different port
# Change "3280:3000" to "3281:3000"
```

### Connector Authentication Errors

Verify your `.env` file has correct tokens:
```bash
# Check if environment variables are set
docker compose config | grep -A5 neon_postgres_1
```

### Build Fails on Cloud

Check that `.env.cloud` has valid cloud connector URLs:
```bash
# Verify cloud connector URLs are accessible
curl -H "Authorization: Bearer $APP_NEON_POSTGRES_1_AUTHORIZATION_HEADER" \
  $APP_NEON_POSTGRES_1_READ_URL/health
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `ddn run docker-start` | Start local development environment |
| `ddn run docker-stop` | Stop local environment |
| `ddn run build-local` | Build supergraph locally |
| `ddn run build-supergraph` | Deploy to Hasura DDN cloud |
| `ddn context get project` | Show current project |
| `ddn auth print-pat` | Show your authentication token |
| `docker compose logs -f` | View service logs |
| `docker compose ps` | Check service status |
