# Hasura DDN v3 On-Premises Kubernetes Template

A production-ready template for deploying Hasura DDN (Data Delivery Network) v3 on Kubernetes infrastructure with multi-database support, GitOps workflows, and comprehensive security controls.

## What This Template Provides

### Core Infrastructure
- **Hasura DDN v3 Engine**: Modern GraphQL API layer with compiled metadata
- **Multi-Database Support**: Pre-configured for 2+ PostgreSQL databases (Neon, RDS, etc.)
- **Kubernetes Deployment**: Production-grade K8s manifests and deployment automation
- **Docker Hub Integration**: Ready-to-use image building and pushing to `rickybobbeh/*` repositories

### Development Workflow
- **GitOps Pipeline**: Automated CI/CD with GitHub Actions
- **Database Introspection**: Auto-generate GraphQL schema from database changes
- **Hot Reload**: Local development with instant feedback
- **Multi-Environment**: Separate configs for local, dev, staging, and production

### Security & Auth
- **OAuth 2.0 / OIDC**: Pre-configured authentication patterns
- **Role-Based Access Control (RBAC)**: Fine-grained permissions system
- **Secrets Management**: Environment-based secret handling
- **Network Policies**: Kubernetes-level security controls

### Observability
- **OpenTelemetry**: Built-in tracing and metrics
- **Health Checks**: Automated monitoring endpoints
- **Deployment Validation**: Smoke tests and rollback automation

## Quick Start

### Prerequisites
- **Hasura DDN CLI**: `npm install -g @hasura/ddn`
- **Docker**: For building container images
- **Kubernetes**: Access to a K8s cluster (local or cloud)
- **kubectl**: Configured with cluster access
- **Database(s)**: PostgreSQL database URLs (Neon, RDS, etc.)

### 1. Initialize Your Project

```bash
# Clone this template
git clone https://github.com/yourusername/onprem-hasura-k8s.git my-hasura-project
cd my-hasura-project

# Run the initialization script
./scripts/init-template.sh
```

This will guide you through:
- Project naming and configuration
- Database connection setup
- Docker Hub repository configuration
- Environment file creation

### 2. Configure Your Databases

Edit `.env.local.template` and save as `.env.local`:

```bash
# Database 1 (Primary)
DATABASE_1_URL=postgresql://user:password@host1.neon.tech/database1?sslmode=require

# Database 2 (Secondary)
DATABASE_2_URL=postgresql://user:password@host2.neon.tech/database2?sslmode=require
```

### 3. Introspect Your Databases

```bash
# Generate GraphQL schema from database schemas
./scripts/introspect-db.sh database-1
./scripts/introspect-db.sh database-2
```

### 4. Build and Deploy

```bash
# Build the supergraph (compile metadata)
./scripts/build-supergraph.sh

# Build Docker image
./scripts/build-engine.sh

# Push to Docker Hub
docker push rickybobbeh/ddn-engine:latest

# Deploy to Kubernetes
./scripts/deploy-metadata.sh local
```

## Repository Structure

```
.
├── README.md                    # This file
├── SETUP.md                     # Detailed setup instructions
├── BUSINESS_LOGIC.md            # Guide to implementing business logic
├── SECURITY.md                  # Security best practices and patterns
├── DOCKER_HUB_SETUP.md          # Docker Hub configuration guide
├── TEMPLATE_INITIALIZATION.md   # Step-by-step initialization walkthrough
│
├── docs/                        # Technical documentation
│   ├── ARCHITECTURE.md          # DDN v3 architecture deep dive
│   └── QUICKSTART.md            # 15-minute getting started guide
│
├── globals/                     # Global configuration subgraph
│   └── metadata/
│       ├── AuthConfig.hml       # OAuth/OIDC authentication
│       └── GraphqlConfig.hml    # GraphQL API settings
│
├── subgraphs/                   # Data source subgraphs
│   ├── database-1/              # First database connection
│   │   ├── connector/
│   │   └── metadata/            # Auto-generated HML models
│   └── database-2/              # Second database connection
│       ├── connector/
│       └── metadata/
│
├── engine/                      # DDN v3 engine
│   └── Dockerfile.engine        # Engine container build
│
├── scripts/                     # Automation scripts
│   ├── init-template.sh         # Initialize new project
│   ├── introspect-db.sh         # Database schema introspection
│   ├── build-supergraph.sh      # Compile metadata
│   ├── build-engine.sh          # Build Docker image
│   └── deploy-metadata.sh       # Deploy to Kubernetes
│
├── .github/workflows/           # CI/CD automation
│   ├── introspect-and-build.yml # Auto-sync database changes
│   ├── deploy-metadata.yml      # Automated deployments
│   └── build-custom-connector.yml
│
└── examples/                    # Example implementations
    ├── sample-models/           # Example HML models
    └── typescript-connector/    # Custom connector example
```

## Docker Hub Repositories

This template is configured to use the following Docker Hub repositories:

- **`rickybobbeh/ddn-engine`**: Hasura DDN v3 engine with compiled metadata
- **`rickybobbeh/ddn-connector-1`**: PostgreSQL connector for database 1
- **`rickybobbeh/ddn-connector-2`**: PostgreSQL connector for database 2

See [DOCKER_HUB_SETUP.md](./DOCKER_HUB_SETUP.md) for detailed configuration instructions.

## Key Features

### Immutable Deployments
Metadata is compiled into Docker images for consistent, reproducible deployments with instant rollback capability.

### Multi-Database Architecture
Connect to multiple PostgreSQL databases with separate connectors, enabling microservices patterns and data federation.

### GitOps Friendly
All configuration in Git. Changes trigger automated builds, tests, and deployments through GitHub Actions.

### Zero-Downtime Updates
Kubernetes rolling updates ensure continuous availability during deployments.

### Comprehensive Permissions
Fine-grained RBAC with role-based filtering, field-level security, and relationship permissions.

## Documentation

- **[SETUP.md](./SETUP.md)**: Detailed setup instructions
- **[BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)**: Implementing business logic, models, and custom functions
- **[SECURITY.md](./SECURITY.md)**: Security best practices and authentication patterns
- **[DOCKER_HUB_SETUP.md](./DOCKER_HUB_SETUP.md)**: Docker Hub configuration
- **[TEMPLATE_INITIALIZATION.md](./TEMPLATE_INITIALIZATION.md)**: Step-by-step initialization
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: DDN v3 architecture details
- **[docs/QUICKSTART.md](./docs/QUICKSTART.md)**: 15-minute getting started guide

## Support & Resources

- **Hasura DDN Docs**: https://hasura.io/docs/3.0/
- **DDN CLI Reference**: https://hasura.io/docs/3.0/cli/overview/
- **GraphQL Schema Reference**: https://hasura.io/docs/3.0/data-domain-modeling/
- **Issues**: Report issues in your forked repository

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

**Ready to get started?** Follow the [SETUP.md](./SETUP.md) guide to initialize your Hasura DDN project.
