# Hasura DDN v3 Architecture

This document explains the architecture, design decisions, and patterns used in this template.

## Table of Contents

1. [What is Hasura DDN v3?](#what-is-hasura-ddn-v3)
2. [Core Concepts](#core-concepts)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Metadata Flow](#metadata-flow)
6. [Deployment Architecture](#deployment-architecture)
7. [Design Decisions](#design-decisions)
8. [Comparison with v2](#comparison-with-v2)

---

## What is Hasura DDN v3?

**Hasura DDN (Data Delivery Network) v3** is a complete rewrite of Hasura GraphQL Engine in Rust, designed for:

- **Microservices Architecture**: Modular subgraphs instead of monolithic config
- **Immutable Deployments**: Metadata is compiled and versioned, not mutated at runtime
- **Native Data Connectors**: Pluggable data sources with standardized protocol
- **Performance**: Rust-based engine for better performance and memory safety
- **On-Premises First**: Designed for self-hosted deployments

### Key Differences from v2

| Aspect | Hasura v2 | Hasura DDN v3 |
|--------|-----------|---------------|
| **Language** | Haskell | Rust |
| **Metadata** | YAML/JSON, mutable | HML files, compiled to immutable JSON |
| **Deployment** | POST to `/v1/metadata` API | Docker image with baked-in metadata |
| **Architecture** | Monolithic | Microservices (subgraphs) |
| **Data Sources** | Built-in connectors | Native Data Connectors (NDC) protocol |
| **Versioning** | Manual tracking | Git-based with compiled artifacts |

---

## Core Concepts

### 1. Supergraph

**What**: The unified GraphQL API composed of multiple subgraphs

**File**: `supergraph.yaml`

```
Supergraph (my-api)
├── Subgraph: globals (auth, config)
├── Subgraph: database (PostgreSQL)
├── Subgraph: business-logic (custom functions)
└── Subgraph: external-api (REST wrapper)
```

**Think of it as**: The "main" application that ties everything together

### 2. Subgraph

**What**: An independent domain or data source within the supergraph

**Location**: `subgraphs/*/`

**Examples**:
- `globals`: Authentication and GraphQL configuration
- `database`: Primary PostgreSQL database
- `analytics`: Separate analytics database
- `stripe-api`: External Stripe API wrapper

**Think of it as**: A microservice in your GraphQL federation

### 3. Connector

**What**: Adapts a data source (database, API, etc.) to Hasura's NDC protocol

**Types**:
- **Database Connectors**: PostgreSQL, MySQL, MongoDB, etc.
- **Custom Connectors**: TypeScript functions, Python functions
- **HTTP Connectors**: REST API wrappers

**Location**: `subgraphs/*/connector/*/`

**Think of it as**: A driver that translates Hasura queries to your data source

### 4. HML (Hasura Metadata Language)

**What**: The source format for defining models, permissions, and relationships

**Files**: `*.hml` in `subgraphs/*/metadata/`

**Example**:
```yaml
kind: ObjectType
version: v1
definition:
  name: User
  fields:
    - name: id
      type: Uuid!
```

**Think of it as**: TypeScript for your GraphQL schema

### 5. Compiled Metadata

**What**: Immutable JSON files generated from HML source files

**Location**: `engine/build/`

**Files**:
- `open_dd.json` - Complete compiled metadata (OpenDD spec)
- `metadata.json` - Schema for introspection
- `auth_config.json` - Authentication configuration

**Think of it as**: Compiled bytecode from source code

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│                    (Web, Mobile, API)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ GraphQL Query
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HASURA DDN v3 ENGINE                          │
│                   (Rust-based, Kubernetes Pod)                   │
│                                                                   │
│  Reads compiled metadata from:                                   │
│  - /md/open_dd.json (main metadata)                              │
│  - /md/auth_config.json (authentication)                         │
│  - /md/metadata.json (introspection)                             │
│                                                                   │
│  No runtime metadata mutations!                                  │
│  New metadata = new Docker image version                         │
└──────────┬──────────────────┬──────────────────┬─────────────────┘
           │                  │                  │
           │ NDC Protocol     │ NDC Protocol     │ NDC Protocol
           ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │   TypeScript     │  │   REST API       │
│   Connector      │  │   Connector      │  │   Connector      │
│                  │  │                  │  │                  │
│  (Kubernetes Pod)│  │  (Kubernetes Pod)│  │  (Kubernetes Pod)│
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                      │
         ▼                     ▼                      ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL    │  │  Database for    │  │  External API    │
│   Database      │  │  business logic  │  │  (Stripe, etc.)  │
└─────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Project Structure

###  Directory Layout

```
onprem-hasura-k8s/
├── hasura.yaml              # Project version (v3)
├── supergraph.yaml          # Supergraph definition
├── .hasura/
│   └── context.yaml         # Environment contexts
│
├── engine/                  # DDN v3 Engine
│   ├── Dockerfile.engine    # Builds engine with metadata
│   └── build/               # Compiled metadata (committed!)
│       ├── open_dd.json
│       ├── metadata.json
│       └── auth_config.json
│
├── globals/                 # Global configuration subgraph
│   ├── subgraph.yaml
│   └── metadata/
│       ├── AuthConfig.hml   # OAuth/OIDC config
│       └── GraphqlConfig.hml
│
├── subgraphs/
│   └── database/            # Database subgraph
│       ├── subgraph.yaml
│       ├── connector/
│       │   └── postgres/
│       │       ├── connector.yaml
│       │       └── configuration.json
│       └── metadata/        # Generated .hml files
│
└── scripts/                 # Build and deploy scripts
    ├── introspect-db.sh
    ├── build-supergraph.sh
    ├── build-engine.sh
    └── deploy-metadata.sh
```

### Why This Structure?

**Separation of Source and Compiled**:
- `.hml` files = source code (hand-edited)
- `engine/build/` = compiled output (generated, but committed for audit trail)

**Modular Subgraphs**:
- Each domain is independent
- Can be developed/deployed separately
- Can move to separate repos later

**Scripts for Automation**:
- Standardized build/deploy process
- CI/CD-friendly
- Reduces human error

---

## Metadata Flow

### The Complete Workflow

```
1. SOURCE FILES (.hml)
   ↓
   │ Developer edits:
   │ - subgraphs/database/metadata/User.hml
   │ - globals/metadata/AuthConfig.hml
   ↓

2. COMPILATION (ddn supergraph build local)
   ↓
   │ DDN CLI compiles all .hml files
   │ Validates configuration
   │ Resolves relationships
   ↓
   │ Generates:
   ├─ engine/build/open_dd.json
   ├─ engine/build/metadata.json
   └─ engine/build/auth_config.json
   ↓

3. GIT COMMIT (source + compiled)
   ↓
   │ git add subgraphs/database/metadata/
   │ git add engine/build/
   │ git commit -m "Add User model"
   │ git tag -a v1.0.0
   ↓

4. DOCKER IMAGE BUILD (./scripts/build-engine.sh v1.0.0)
   ↓
   │ FROM hasura/v3-engine
   │ COPY engine/build/*.json /md/
   ↓
   │ Docker image: your-registry/hasura-engine:v1.0.0
   │ Contains: engine binary + compiled metadata
   ↓

5. KUBERNETES DEPLOYMENT (./scripts/deploy-metadata.sh prod v1.0.0)
   ↓
   │ kubectl set image deployment/hasura-engine \
   │   engine=your-registry/hasura-engine:v1.0.0
   ↓
   │ Rolling update with zero downtime
   │ New pods start with new metadata
   │ Old pods drain gracefully
   ↓

6. RUNNING ENGINE
   ↓
   │ Engine reads from /md/*.json on startup
   │ Serves GraphQL API with new schema
   │ No runtime metadata mutations!
```

### Why Commit Compiled Metadata?

**For On-Premises Deployments**:
1. **Audit Trail**: Exact record of what was deployed
2. **Disaster Recovery**: Can rebuild without DDN CLI
3. **Compliance**: Required for regulated industries
4. **Reproducibility**: Guarantees exact same build

---

## Deployment Architecture

### Kubernetes Components

```
Namespace: hasura-local (or hasura-prod)

Deployments:
├── hasura-ddn-engine (3 replicas)
│   ├── Image: your-registry/hasura-engine:v1.0.0
│   ├── Port: 3000 (GraphQL API)
│   └── Env:
│       ├── METADATA_PATH=/md/open_dd.json
│       └── AUTHN_CONFIG_PATH=/md/auth_config.json
│
├── postgres-connector (2 replicas)
│   ├── Image: hasura/postgres-connector:latest
│   ├── Port: 8080 (NDC protocol)
│   └── Env:
│       └── DATABASE_URL=postgresql://...
│
└── typescript-connector (2 replicas)
    ├── Image: your-registry/typescript-connector:v1.0.0
    ├── Port: 8080 (NDC protocol)
    └── Env:
        └── DATABASE_URL=postgresql://...

Services:
├── hasura-ddn-engine (ClusterIP)
├── postgres-connector (ClusterIP)
└── typescript-connector (ClusterIP)

Ingress:
└── hasura-ddn-ingress
    ├── Host: hasura.yourdomain.com
    └── Backend: hasura-ddn-engine:3000
```

### High Availability Setup

**For Production**:
- **3+ engine replicas**: Handles traffic spikes, tolerates failures
- **Pod anti-affinity**: Spreads pods across nodes
- **HorizontalPodAutoscaler**: Auto-scales based on CPU/memory
- **PodDisruptionBudget**: Ensures minimum availability during updates

---

## Design Decisions

### 1. Two-Repository Strategy

**Decision**: Separate infrastructure (`infra-k8s`) and application (`onprem-hasura-k8s`)

**Rationale**:
- **Separation of concerns**: Platform team vs application team
- **Different lifecycles**: Infrastructure changes less frequently
- **Security**: Different access controls for infra vs app
- **Reusability**: Same infra can host multiple applications

### 2. Immutable Metadata Builds

**Decision**: Compile metadata into Docker images, not apply via API

**Rationale**:
- **Zero-downtime deployments**: Rolling updates with Kubernetes
- **Versioning**: Each metadata change = new image version
- **Rollback**: Deploy previous image version instantly
- **Reproducibility**: Same image = same behavior everywhere
- **Audit trail**: Git history + Docker registry = complete record

### 3. Committing Compiled Metadata

**Decision**: Commit `engine/build/` to Git

**Rationale** (On-Premises Specific):
- **Compliance**: Required for audit in regulated industries
- **Disaster recovery**: Can rebuild without external dependencies
- **Build reproducibility**: Guarantees exact output
- **Debugging**: Can see exactly what was deployed

### 4. Scripts Over Manual Steps

**Decision**: Provide scripts for all common operations

**Rationale**:
- **Consistency**: Everyone follows same process
- **CI/CD friendly**: Easy to automate
- **Documentation**: Scripts serve as runnable documentation
- **Error reduction**: Less chance of missing steps

### 5. Extensive Documentation

**Decision**: README in every directory + QUICKSTART + ARCHITECTURE

**Rationale**:
- **Onboarding**: New team members get up to speed quickly
- **Self-service**: Answers common questions inline
- **Maintenance**: Future you will thank present you
- **Template use**: Others can adapt for their projects

---

## Comparison with v2

### Metadata Management

**v2 Approach**:
```bash
# Apply metadata via API
curl -X POST http://hasura/v1/metadata \
  -d @metadata.yaml

# Metadata stored in PostgreSQL
# Changes take effect immediately
# Can be modified at runtime
```

**v3 Approach**:
```bash
# Compile metadata
ddn supergraph build local

# Build Docker image
docker build -t engine:v1.0.0 -f engine/Dockerfile.engine engine/

# Deploy new image
kubectl set image deployment/engine engine=engine:v1.0.0

# Metadata is immutable
# Changes require new deployment
# Zero-downtime rolling update
```

### Connector Architecture

**v2 Approach**:
- Built-in connectors only (PostgreSQL, MySQL, MS SQL, BigQuery)
- Hard-coded in engine
- Limited extensibility

**v3 Approach**:
- Native Data Connector (NDC) protocol
- Any data source can implement NDC
- TypeScript, Python, Go connector SDKs
- Community-contributed connectors
- Custom connectors as Kubernetes services

### Deployment Model

**v2 Approach**:
- Single engine binary
- Metadata in database or ConfigMap
- Runtime metadata updates
- Requires engine restart for config changes

**v3 Approach**:
- Engine + separate connector services
- Metadata in Docker image
- Immutable deployments
- Zero-downtime rolling updates
- Microservices architecture

---

## Further Reading

**Official Documentation**:
- [Hasura DDN Overview](https://hasura.io/docs/3.0/)
- [DDN Architecture](https://hasura.io/docs/3.0/getting-started/architecture/)
- [Native Data Connectors](https://hasura.io/docs/3.0/connectors/introduction/)
- [Metadata Reference](https://hasura.io/docs/3.0/reference/metadata-reference/)

**Blog Posts**:
- [Announcing Hasura DDN](https://hasura.io/blog/announcing-hasura-ddn/)
- [Open Source v3 Engine](https://hasura.io/blog/announcing-open-source-hasura-graphql-engine-v3)
- [Local Development](https://hasura.io/blog/announcing-local-development-support-for-hasura-ddn)

**Community**:
- [Discord](https://discord.com/invite/hasura)
- [GitHub Discussions](https://github.com/hasura/graphql-engine/discussions)

---

## Questions?

See the main `README.md` or component-specific READMEs for more details on specific topics.
