# Hasura DDN v3 Self-Hosted Deployment Template

A lean template for deploying **Hasura DDN v3** on your own Kubernetes infrastructure. This template provides Docker build scripts and Kubernetes deployment helpers while letting you create your DDN project structure using the official CLI.

## What This Template Provides

This is **NOT** a pre-configured Hasura project. Instead, it provides:

- **Docker Build Scripts** - Package your DDN metadata into deployable images
- **Kubernetes Examples** - Reference manifests for deploying to K8s
- **Documentation** - Step-by-step guides following official Hasura workflows
- **No-Auth Default** - Test immediately without authentication setup

**You create the actual project using `ddn` CLI** following the official Hasura workflow at [hasura.io/docs/3.0/how-to-build-with-ddn/with-postgresql](https://hasura.io/docs/3.0/how-to-build-with-ddn/with-postgresql)

## Quick Start (5 Minutes)

### Prerequisites
```bash
# Install DDN CLI
npm install -g @hasura/ddn

# Verify
ddn version
docker --version
kubectl cluster-info
```

### 1. Initialize Your DDN Project

```bash
# Initialize new project
ddn supertraph init my-api && cd my-api
cd my-api
```

### 2. Add Your Database

```bash
# Add PostgreSQL connector (interactive)
ddn connector init my_postgres -i

# Follow prompts:
# - Connector: hasura/postgres
# - Connection string: postgresql://user:pass@host:5432/db
```

### 3. Generate GraphQL Models

```bash
# Auto-generate models from database schema
ddn model add my_postgres "*"

# Models are created in app/subgraphs/default/metadata/
```

### 4. Build Supergraph Locally

```bash
# Compile metadata
ddn supergraph build local

# Compiled metadata appears in app/supergraph/build/
```

### 5. Build Docker Image (This Template's Value!)

```bash
# Clone this template into your project
cd ..
git clone https://github.com/yourusername/onprem-hasura-k8s.git docker-helpers
cd my-api

# Build Docker image with compiled metadata
../docker-helpers/scripts/build-engine.sh v1.0.0

# Push to your registry
docker push your-registry/ddn-engine:v1.0.0
```

### 6. Deploy to Kubernetes

```bash
# Use example manifests from this template
cp ../docker-helpers/k8s/*.yaml ./k8s/

# Update image in deployment
# Then deploy
kubectl apply -f k8s/
```

### 7. Test Your API

```bash
# Port forward
kubectl port-forward svc/ddn-engine 3000:3000

# Query (no auth needed by default!)
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## Philosophy: CLI-First, Docker-Ready

### What You Do (DDN CLI)
- `ddn project init` - Create project structure
- `ddn connector add` - Add data sources
- `ddn model add` - Generate GraphQL schema
- `ddn supergraph build` - Compile metadata

### What This Template Does
- `scripts/build-engine.sh` - Build Docker image with compiled metadata
- `k8s/*.yaml` - Example Kubernetes manifests
- `docs/` - Detailed deployment guides

### What You Get
- **Immutable Deployments** - Metadata baked into Docker images
- **GitOps Ready** - All config in Git, reproducible builds
- **Self-Hosted** - Deploy anywhere (not Hasura Cloud)
- **Quick Testing** - No auth required by default

## Repository Structure

```
onprem-hasura-k8s/
├── README.md                    # You are here
├── .env.example                 # Environment template
├── hasura.yaml                  # Minimal DDN declaration
│
├── globals/                     # Auth & GraphQL config
│   └── metadata/
│       ├── AuthConfig.hml       # noAuth by default
│       └── GraphqlConfig.hml    # Basic settings
│
├── docs/
│   ├── QUICKSTART.md            # 5-minute getting started
│   ├── CLI_WORKFLOW.md          # Complete DDN CLI reference
│   ├── DOCKER_BUILD.md          # Building engine images
│   ├── K8S_DEPLOYMENT.md        # Kubernetes deployment
│   ├── AUTHENTICATION.md        # Enable OAuth/OIDC
│   ├── ENVIRONMENT_SETUP.md     # Env vars explained
│   ├── CONTAINER_REGISTRY.md    # Registry setup
│   ├── SECURITY.md              # Production hardening
│   └── ARCHITECTURE.md          # DDN v3 architecture
│
├── engine/
│   ├── Dockerfile.engine        # Core: Packages metadata
│   └── README.md
│
├── scripts/
│   ├── build-engine.sh          # Core: Build Docker image
│   └── README.md
│
└── k8s/                         # Example manifests
    ├── README.md
    ├── engine-deployment.yaml
    ├── engine-service.yaml
    ├── engine-ingress.yaml
    └── secrets-template.yaml
```

## Key Features

### No Authentication by Default
- **Perfect for testing** - Query immediately without auth setup
- **Easy to enable** - Follow `docs/AUTHENTICATION.md` when ready
- **⚠️ Production Warning** - Enable auth before production!

### Immutable Deployments
- Metadata compiled into Docker images
- Instant rollbacks (deploy previous image)
- Perfect audit trail (Git + image tags)

### Registry Agnostic
- Works with Docker Hub, ECR, GCR, ACR, Harbor, etc.
- Configure via `DOCKER_REGISTRY` environment variable

### No Hasura Cloud Required
- Fully self-hosted on your Kubernetes
- No external dependencies
- Complete control over infrastructure

## Documentation

- **[QUICKSTART.md](./docs/QUICKSTART.md)** - Start here! 5-minute guide
- **[CLI_WORKFLOW.md](./docs/CLI_WORKFLOW.md)** - Complete DDN CLI reference
- **[DOCKER_BUILD.md](./docs/DOCKER_BUILD.md)** - Building Docker images explained
- **[K8S_DEPLOYMENT.md](./docs/K8S_DEPLOYMENT.md)** - Kubernetes deployment patterns
- **[AUTHENTICATION.md](./docs/AUTHENTICATION.md)** - Enable OAuth/OIDC auth
- **[SECURITY.md](./docs/SECURITY.md)** - Production security hardening

## Why This Approach?

### Aligns with Official Hasura Docs
Follows the workflow at [hasura.io/docs/3.0/how-to-build-with-ddn/with-postgresql](https://hasura.io/docs/3.0/how-to-build-with-ddn/with-postgresql) exactly.

### You Learn DDN CLI Properly
No pre-existing cruft to delete. Learn by doing.

### Easier to Maintain
~70% fewer files than a pre-configured template.

### More Flexible
Works with any database, connector, or schema. Not opinionated.

### Clear Value Proposition
"Here's how to dockerize your DDN project and deploy to Kubernetes."

## Common Workflows

### Adding a Second Database

```bash
# In your DDN project
ddn connector add my_second_db -i
ddn model add my_second_db "*"
ddn supergraph build local

# Rebuild Docker image
../docker-helpers/scripts/build-engine.sh v1.1.0
```

### Updating Your Schema

```bash
# Make database schema changes
# Then regenerate models
ddn model add my_postgres "*"

# Rebuild and deploy
ddn supergraph build local
../docker-helpers/scripts/build-engine.sh v1.2.0
docker push your-registry/ddn-engine:v1.2.0
kubectl set image deployment/ddn-engine engine=your-registry/ddn-engine:v1.2.0
```

### Enabling Authentication

See [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) for:
- Auth0 setup
- Keycloak setup
- Azure AD setup
- Custom OAuth providers

## Support & Resources

- **Official DDN Docs**: https://hasura.io/docs/3.0/
- **DDN CLI Reference**: https://hasura.io/docs/3.0/cli/overview/
- **With PostgreSQL Guide**: https://hasura.io/docs/3.0/how-to-build-with-ddn/with-postgresql
- **Hasura Discord**: https://discord.com/invite/hasura

## License

MIT License - See [LICENSE](./LICENSE)

---

**Ready to start?** → [docs/QUICKSTART.md](./docs/QUICKSTART.md)

**Need help with Docker builds?** → [docs/DOCKER_BUILD.md](./docs/DOCKER_BUILD.md)

**Deploying to production?** → [docs/K8S_DEPLOYMENT.md](./docs/K8S_DEPLOYMENT.md) + [docs/SECURITY.md](./docs/SECURITY.md)
