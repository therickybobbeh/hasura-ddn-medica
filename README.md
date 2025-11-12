# Hasura DDN v3 On-Premises Template

A **production-ready template** for deploying [Hasura DDN v3](https://hasura.io/docs/3.0/) (Data Delivery Network) to on-premises Kubernetes clusters.

This template provides a complete reference implementation with:
- ✅ DDN v3 architecture (Rust-based engine, immutable deployments)
- ✅ PostgreSQL database integration with auto-generated GraphQL API
- ✅ OAuth/OIDC authentication (Keycloak, Auth0, Azure AD, Okta)
- ✅ Kubernetes deployment manifests and Helm charts
- ✅ GitHub Actions CI/CD pipelines
- ✅ OpenTelemetry observability
- ✅ Comprehensive documentation and examples

---

## 🚀 Quick Start

**Get running in 15 minutes**:

1. **Prerequisites**:
   ```bash
   # Install DDN CLI
   npm install -g @hasura/ddn-cli

   # Verify installation
   ddn version
   docker --version
   kubectl version
   ```

2. **Clone and configure**:
   ```bash
   git clone https://github.com/your-org/onprem-hasura-k8s.git
   cd onprem-hasura-k8s

   # Copy environment template
   cp .env.local.template .env.local

   # Edit with your database URL, OAuth provider, etc.
   nano .env.local
   ```

3. **Follow the guide**:

   See **[QUICKSTART.md](QUICKSTART.md)** for step-by-step instructions.

---

## 📚 Documentation

### Getting Started

- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 15 minutes
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Understand DDN v3 architecture and design decisions
- **[.env.local.template](.env.local.template)** - Environment variable configuration guide

### Core Components

- **[globals/](globals/README.md)** - Authentication and GraphQL API configuration
- **[subgraphs/](subgraphs/README.md)** - Understanding subgraphs and when to create them
- **[subgraphs/database/](subgraphs/database/README.md)** - PostgreSQL connector setup and tuning
- **[scripts/](scripts/README.md)** - Deployment scripts documentation
- **[.github/](.github/README.md)** - CI/CD workflows and GitHub Actions setup

### Examples and Guides

- **[examples/](examples/README.md)** - Overview of all example implementations
- **[examples/sample-models/](examples/sample-models/README.md)** - HML file format and permission patterns
- **[examples/typescript-connector/](examples/typescript-connector/README.md)** - Custom business logic connector

---

## 📂 Repository Structure

```
onprem-hasura-k8s/
├── README.md                           # You are here
├── QUICKSTART.md                       # 15-minute getting started guide
├── ARCHITECTURE.md                     # Deep dive into DDN v3 architecture
├── hasura.yaml                         # DDN v3 project declaration
├── supergraph.yaml                     # Supergraph composition (main config)
│
├── .env.local.template                 # Environment variable template
│
├── engine/                             # DDN v3 Engine
│   ├── Dockerfile.engine               # Builds engine with baked-in metadata
│   └── build/                          # Compiled metadata (committed for audit)
│       ├── auth_config.json
│       ├── metadata.json
│       └── open_dd.json
│
├── globals/                            # Global configuration subgraph
│   ├── README.md                       # Authentication & GraphQL config docs
│   └── metadata/
│       ├── AuthConfig.hml              # OAuth/OIDC setup
│       └── GraphqlConfig.hml           # API settings (CORS, rate limiting, etc.)
│
├── subgraphs/                          # Data source subgraphs
│   ├── README.md                       # Subgraph concepts and patterns
│   └── database/                       # PostgreSQL subgraph
│       ├── README.md                   # Database connector documentation
│       ├── subgraph.yaml
│       ├── connector/postgres/         # PostgreSQL connector config
│       └── metadata/                   # Generated .hml model files
│
├── examples/                           # Example implementations
│   ├── README.md                       # Overview of examples
│   ├── sample-models/                  # Example .hml files with permissions
│   │   ├── README.md                   # Complete HML guide
│   │   └── User.hml                    # Fully commented example
│   └── typescript-connector/           # Custom connector example
│       ├── README.md                   # Connector overview
│       └── HOW_TO_USE.md               # Step-by-step integration guide
│
├── scripts/                            # Deployment automation
│   ├── README.md                       # Scripts documentation
│   ├── introspect-db.sh                # Database schema discovery
│   ├── build-supergraph.sh             # Compile .hml to JSON
│   ├── build-engine.sh                 # Build Docker image
│   └── deploy-metadata.sh              # Deploy to Kubernetes
│
└── .github/workflows/                  # CI/CD automation
    ├── README.md                       # GitHub Actions setup guide
    ├── introspect-and-build.yml        # Auto-sync database schema
    ├── build-custom-connector.yml      # Build custom connectors
    └── deploy-metadata.yml             # Automated deployments
```

---

## 🎯 What is Hasura DDN v3?

Hasura DDN (Data Delivery Network) v3 is a complete rewrite of Hasura in Rust, designed for:

### Key Features

**Immutable Deployments**
- Metadata is compiled and baked into Docker images
- No runtime mutations (unlike v2)
- Zero-downtime rolling updates
- Easy rollbacks (just deploy previous version)

**Microservices Architecture**
- Supergraph = unified GraphQL API
- Subgraphs = independent domains (database, business logic, APIs)
- Cross-subgraph relationships
- Independent scaling per subgraph

**Native Data Connectors (NDC)**
- Pluggable data sources
- PostgreSQL, MongoDB, MySQL, REST APIs, custom functions
- Standardized protocol
- Community-contributed connectors

**On-Premises First**
- Designed for self-hosted deployments
- No external dependencies required
- Complete audit trail (source + compiled metadata in Git)
- Compliance-friendly (HIPAA, SOC 2, etc.)

### vs Hasura v2

| Aspect | Hasura v2 | DDN v3 (This Template) |
|--------|-----------|------------------------|
| **Language** | Haskell | Rust |
| **Metadata** | Runtime mutations via API | Immutable, compiled into images |
| **Deployment** | POST to /v1/metadata | Docker image rollout |
| **Architecture** | Monolithic | Microservices (supergraph + subgraphs) |
| **Data Sources** | Built-in only | Native Data Connectors (extensible) |
| **Versioning** | Manual | Git-based with compiled artifacts |

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed comparison.

---

## 🛠 How to Use This Template

### 1. Customize for Your Project

**Replace generic names with your project name**:

```yaml
# supergraph.yaml
definition:
  name: my-api  # TODO: Change to your project name
```

**Update database configuration**:

```bash
# .env.local
DATABASE_URL=postgresql://...  # TODO: Your database URL
```

**Configure authentication**:

See [globals/README.md](globals/README.md) for provider-specific setup guides.

### 2. Add Your Database Schema

```bash
# Introspect database and generate models
./scripts/introspect-db.sh

# Add permissions to generated .hml files
# See examples/sample-models/User.hml for patterns

# Build and deploy
./scripts/build-supergraph.sh
./scripts/build-engine.sh v1.0.0
./scripts/deploy-metadata.sh local v1.0.0
```

### 3. Add Custom Business Logic (Optional)

```bash
# Copy TypeScript connector example
cp -r examples/typescript-connector subgraphs/my-logic/connector/typescript

# Follow examples/typescript-connector/HOW_TO_USE.md
```

### 4. Set Up CI/CD

See [.github/README.md](.github/README.md) for GitHub Actions setup.

---

## 🏗 Deployment Workflow

The complete DDN v3 deployment workflow:

```
1. Database Schema
   ↓
2. Introspect (ddn connector introspect postgres)
   ↓
3. Generate Models (ddn model add postgres '*')
   ↓
4. Add Permissions (.hml files)
   ↓
5. Build Supergraph (ddn supergraph build local)
   ↓
6. Compile Metadata (.hml → engine/build/*.json)
   ↓
7. Build Docker Image (./scripts/build-engine.sh v1.0.0)
   ↓
8. Push to Registry (docker push ...)
   ↓
9. Deploy to Kubernetes (./scripts/deploy-metadata.sh prod v1.0.0)
   ↓
10. Rolling Update (zero downtime)
```

See [QUICKSTART.md](QUICKSTART.md) for hands-on walkthrough.

---

## 🔐 Security Features

**Authentication & Authorization**:
- OAuth/OIDC integration (JWT validation)
- Row-level permissions
- Column-level permissions
- Role-based access control

**API Security**:
- CORS configuration
- Rate limiting (global + per-user)
- Query depth limits
- Query complexity limits
- HSTS, CSP headers

**Infrastructure Security**:
- Secrets management (Kubernetes Secrets)
- TLS/SSL termination
- Network policies
- Pod security policies

See [globals/README.md](globals/README.md) for security configuration.

---

## 📊 Observability

**Built-in support for**:
- OpenTelemetry (distributed tracing)
- Structured logging
- Metrics export
- Dynatrace integration (optional)

**Monitoring DDN v3**:
- Request duration
- Query complexity
- Database query performance
- Error rates
- Custom metrics from connectors

See [ARCHITECTURE.md](ARCHITECTURE.md) for observability setup.

---

## 🧪 Testing

**Run locally**:

```bash
# Start local Kubernetes (microk8s, k3s, or Docker Desktop)
kubectl cluster-info

# Deploy to local cluster
source .env.local
./scripts/build-supergraph.sh
./scripts/build-engine.sh v0.0.1-local
./scripts/deploy-metadata.sh local v0.0.1-local

# Test GraphQL API
kubectl port-forward -n hasura-local deployment/hasura-ddn-engine 3000:3000
curl http://localhost:3000/healthz
```

---

## 🤝 Two-Repository Architecture

This template is designed to work with a separate infrastructure repository:

1. **`infra-k8s`** (infrastructure): Kubernetes cluster setup, monitoring, ingress
2. **`onprem-hasura-k8s`** (this template): Hasura application configuration

**Rationale**:
- Separation of concerns (platform team vs application team)
- Different lifecycles (infrastructure changes less frequently)
- Different access controls (infra is more restricted)
- Reusability (same infra can host multiple applications)

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed explanation.

---

## 🆘 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Check `DATABASE_URL` in `.env.local`
- Test: `psql "$DATABASE_URL" -c "SELECT 1"`
- See: [subgraphs/database/README.md](subgraphs/database/README.md)

**"Table not showing in GraphQL"**
- Run: `./scripts/introspect-db.sh`
- Add permissions to `.hml` file
- See: [examples/sample-models/README.md](examples/sample-models/README.md)

**"Permission denied" in GraphQL query**
- Add `ModelPermissions` to `.hml` file
- See: [examples/sample-models/User.hml](examples/sample-models/User.hml)

**More troubleshooting**:
- [QUICKSTART.md](QUICKSTART.md) - Common setup issues
- [subgraphs/database/README.md](subgraphs/database/README.md) - Database issues
- [.github/README.md](.github/README.md) - CI/CD issues

---

## 📖 Further Reading

### Official Hasura Documentation

- [Hasura DDN v3 Overview](https://hasura.io/docs/3.0/)
- [DDN Architecture](https://hasura.io/docs/3.0/getting-started/architecture/)
- [Native Data Connectors](https://hasura.io/docs/3.0/connectors/introduction/)
- [Authentication Guide](https://hasura.io/docs/3.0/auth/overview/)

### Community

- [Hasura Discord](https://discord.com/invite/hasura)
- [GitHub Discussions](https://github.com/hasura/graphql-engine/discussions)
- [Blog](https://hasura.io/blog/)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

This template is provided as-is, without warranty. Feel free to adapt it for your use case.

---

## 🎉 Getting Help

**Where to get help**:
1. Check the documentation in this repository (start with [QUICKSTART.md](QUICKSTART.md))
2. Review the [examples/](examples/) directory for patterns and best practices
3. Join [Hasura Discord](https://discord.com/invite/hasura) (#ddn channel)
4. Open an issue on GitHub

**Contributing**:
- Contributions welcome! Please open issues for bugs or feature requests
- PRs should include documentation updates
- Follow existing code style and patterns

---

## 🚀 What's Next?

1. **First time?** Start with [QUICKSTART.md](QUICKSTART.md)
2. **Want to understand DDN v3?** Read [ARCHITECTURE.md](ARCHITECTURE.md)
3. **Setting up authentication?** See [globals/README.md](globals/README.md)
4. **Working with database?** Check [subgraphs/database/README.md](subgraphs/database/README.md)
5. **Adding custom logic?** Explore [examples/typescript-connector/](examples/typescript-connector/)
6. **Deploying to production?** Review [.github/README.md](.github/README.md) and [scripts/README.md](scripts/README.md)

**Happy building! 🎯**
