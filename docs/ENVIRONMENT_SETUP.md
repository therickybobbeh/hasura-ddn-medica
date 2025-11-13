# Environment Variables Setup

Complete guide to configuring environment variables for your Hasura DDN deployment.

## Overview

Hasura DDN uses environment variables for:
- Database connection strings
- Authentication configuration
- Container registry settings
- Kubernetes deployment parameters
- Observability configuration

## Quick Start

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
vim .env.local

# Source for local development
source .env.local
```

**Important:** Never commit `.env.local` to Git! It's already in `.gitignore`.

## Environment Files

### Local Development

```bash
# .env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb
DOCKER_REGISTRY=docker.io/yourusername
K8S_NAMESPACE=hasura-dev
```

### Staging/Production

For Kubernetes deployments, use Secrets instead of `.env` files:

```bash
# Create from file
kubectl create secret generic hasura-env \
  --from-env-file=.env.production \
  -n hasura

# Or create manually
kubectl create secret generic hasura-env \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=OAUTH_ISSUER_URL='https://...' \
  -n hasura
```

## Core Variables

### Database Connection

#### DATABASE_URL

**Required**: Yes
**Format**: PostgreSQL connection string
**Used By**: Connectors

```bash
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb

# PostgreSQL with SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Neon (requires SSL)
DATABASE_URL=postgresql://user:pass@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require

# AWS RDS
DATABASE_URL=postgresql://user:pass@mydb.abc123.us-east-1.rds.amazonaws.com:5432/mydb

# Google Cloud SQL
DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance

# Azure PostgreSQL
DATABASE_URL=postgresql://user@server:pass@server.postgres.database.azure.com:5432/db?sslmode=require
```

**Connection String Components:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?[parameters]

user       - Database username
password   - Database password (URL-encode special characters)
host       - Hostname or IP address
port       - Port (default: 5432)
database   - Database name
parameters - Optional query parameters (sslmode, connect_timeout, etc.)
```

**Special Characters in Passwords:**
```bash
# If password contains special characters, URL-encode them:
# @ → %40
# : → %3A
# / → %2F
# ? → %3F
# # → %23

# Example: password is "p@ss:word"
DATABASE_URL=postgresql://user:p%40ss%3Aword@localhost:5432/db
```

#### Multiple Databases

If you have multiple databases, create separate variables:

```bash
# First database (users)
DATABASE_URL_USERS=postgresql://user:pass@db1.example.com:5432/users

# Second database (orders)
DATABASE_URL_ORDERS=postgresql://user:pass@db2.example.com:5432/orders

# Third database (analytics)
DATABASE_URL_ANALYTICS=postgresql://user:pass@db3.example.com:5432/analytics
```

Then reference in your connector configs:

```yaml
# app/subgraphs/users/connector/users_db/connector.yaml
connectionUri:
  valueFromEnv: DATABASE_URL_USERS
```

## Container Registry

### DOCKER_REGISTRY

**Required**: Yes (for deployment)
**Format**: Registry URL prefix
**Used By**: Build scripts, Kubernetes

```bash
# Docker Hub
DOCKER_REGISTRY=docker.io/yourusername

# AWS ECR
DOCKER_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com

# Google Container Registry (GCR)
DOCKER_REGISTRY=gcr.io/your-project-id

# Google Artifact Registry
DOCKER_REGISTRY=us-docker.pkg.dev/your-project-id/your-repo

# Azure Container Registry (ACR)
DOCKER_REGISTRY=yourregistry.azurecr.io

# Harbor (self-hosted)
DOCKER_REGISTRY=harbor.example.com/project
```

**Full Image Path Example:**
```bash
DOCKER_REGISTRY=docker.io/mycompany
# Results in: docker.io/mycompany/ddn-engine:v1.0.0
```

## Kubernetes

### K8S_NAMESPACE

**Required**: Yes (for deployment)
**Format**: Kubernetes namespace name
**Used By**: Deployment scripts

```bash
# Development
K8S_NAMESPACE=hasura-dev

# Staging
K8S_NAMESPACE=hasura-staging

# Production
K8S_NAMESPACE=hasura-prod

# Multi-tenant (separate namespace per customer)
K8S_NAMESPACE=hasura-customer-123
```

Create namespace before deploying:

```bash
kubectl create namespace $K8S_NAMESPACE
```

## Authentication Variables

### OAuth/OIDC Configuration

**Required**: No (default is noAuth)
**Used By**: AuthConfig.hml
**See**: [AUTHENTICATION.md](./AUTHENTICATION.md)

#### OAUTH_ISSUER_URL

**Format**: HTTPS URL of your identity provider
**Used For**: JWT validation

```bash
# Auth0
OAUTH_ISSUER_URL=https://your-tenant.auth0.com/

# Keycloak
OAUTH_ISSUER_URL=http://keycloak.example.com/realms/hasura-ddn

# Okta
OAUTH_ISSUER_URL=https://your-domain.okta.com/oauth2/default

# Azure AD
OAUTH_ISSUER_URL=https://login.microsoftonline.com/{tenant-id}/v2.0

# Google
OAUTH_ISSUER_URL=https://accounts.google.com
```

**Important:** Include trailing slash if required by your provider (Auth0 requires it).

#### OAUTH_AUDIENCE

**Format**: API identifier
**Used For**: JWT audience validation

```bash
# Auth0
OAUTH_AUDIENCE=https://hasura.example.com

# Keycloak
OAUTH_AUDIENCE=hasura-api

# Okta
OAUTH_AUDIENCE=api://default

# Azure AD (Application ID URI)
OAUTH_AUDIENCE=api://abc-123-def-456
```

#### OAUTH_JWKS_URL

**Format**: HTTPS URL to JWKS endpoint
**Used For**: JWT signature verification

```bash
# Auth0
OAUTH_JWKS_URL=https://your-tenant.auth0.com/.well-known/jwks.json

# Keycloak
OAUTH_JWKS_URL=http://keycloak.example.com/realms/hasura-ddn/protocol/openid-connect/certs

# Okta
OAUTH_JWKS_URL=https://your-domain.okta.com/oauth2/default/v1/keys

# Azure AD
OAUTH_JWKS_URL=https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys

# Google
OAUTH_JWKS_URL=https://www.googleapis.com/oauth2/v3/certs
```

## Observability (Optional)

### OpenTelemetry

#### OTEL_EXPORTER_OTLP_ENDPOINT

**Required**: No
**Format**: URL of OpenTelemetry collector
**Used For**: Tracing and metrics export

```bash
# Local collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Jaeger
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-collector:4317

# Grafana Cloud
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp

# Honeycomb
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443

# Datadog
OTEL_EXPORTER_OTLP_ENDPOINT=http://datadog-agent:4317
```

#### OTEL_SERVICE_NAME

**Required**: No
**Format**: String identifier
**Default**: `hasura-ddn`

```bash
# Default
OTEL_SERVICE_NAME=hasura-ddn

# With environment
OTEL_SERVICE_NAME=hasura-ddn-production

# With version
OTEL_SERVICE_NAME=hasura-ddn-v1.2.0
```

#### Additional OTEL Variables

```bash
# Sampling rate (0.0 to 1.0)
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% of traces

# Headers for authentication
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=your-key

# Protocol (grpc or http/protobuf)
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

## Connection Pooling

### PostgreSQL Pool Settings

**Required**: No
**Used By**: PostgreSQL connector

```bash
# Maximum connections per connector instance
POSTGRES_POOL_MAX_CONNECTIONS=50

# Connection timeout (seconds)
POSTGRES_POOL_TIMEOUT=30

# Idle connection timeout (seconds)
POSTGRES_POOL_IDLE_TIMEOUT=180

# Minimum pool size
POSTGRES_POOL_MIN_CONNECTIONS=5
```

**Recommendations:**
- **Dev**: `MAX_CONNECTIONS=10`
- **Staging**: `MAX_CONNECTIONS=50`
- **Production**: `MAX_CONNECTIONS=100` (adjust based on load)

**Important:** Total connections = `MAX_CONNECTIONS × number of connector replicas`

## Security Variables

### API Secrets

For webhooks, event triggers, or custom integrations:

```bash
# Webhook secret for validation
WEBHOOK_SECRET=your-random-secret-here

# Admin secret (if using legacy Hasura features)
HASURA_ADMIN_SECRET=your-admin-secret

# API keys for external services
STRIPE_API_KEY=sk_live_...
SENDGRID_API_KEY=SG....
```

**Generate secure secrets:**
```bash
# Generate random secret
openssl rand -hex 32

# Or use uuidgen
uuidgen
```

## Advanced Configuration

### Custom Connector Environment

If you build custom TypeScript connectors:

```bash
# Connector-specific config
CONNECTOR_PORT=8080
CONNECTOR_TIMEOUT=30000
CONNECTOR_LOG_LEVEL=info

# External API keys
EXTERNAL_API_KEY=abc123
EXTERNAL_API_URL=https://api.example.com
```

### Feature Flags

Enable/disable features:

```bash
# Enable experimental features
DDN_ENABLE_EXPERIMENTAL_FEATURES=true

# Enable verbose logging
DDN_LOG_LEVEL=debug

# Enable metrics
DDN_ENABLE_METRICS=true
```

## Environment Variable Precedence

Variables are loaded in this order (later overrides earlier):

1. **System environment variables**
2. **`.env` file** (if using dotenv)
3. **Kubernetes Secrets** (mounted as env vars)
4. **Kubernetes ConfigMaps**
5. **Container runtime arguments**

## Using Variables in Hasura Metadata

### In HML Files

```yaml
# AuthConfig.hml
kind: AuthConfig
version: v2
definition:
  mode:
    jwt:
      audience:
        valueFromEnv: OAUTH_AUDIENCE  # ✅ From environment

      issuer:
        stringValue: "https://hardcoded.com"  # ❌ Avoid hardcoding
```

### In Connector Configuration

```yaml
# connector.yaml
connectionUri:
  valueFromEnv: DATABASE_URL  # ✅ From environment
```

## Kubernetes Secrets Management

### Create Secret from .env File

```bash
# Create secret from file
kubectl create secret generic hasura-env \
  --from-env-file=.env.production \
  -n hasura

# Verify
kubectl get secret hasura-env -n hasura -o yaml
```

### Create Secret from Literals

```bash
kubectl create secret generic hasura-env \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=OAUTH_ISSUER_URL='https://...' \
  --from-literal=OAUTH_AUDIENCE='https://...' \
  --from-literal=OAUTH_JWKS_URL='https://...' \
  -n hasura
```

### Use Secret in Deployment

```yaml
# k8s/engine-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ddn-engine
spec:
  template:
    spec:
      containers:
        - name: engine
          image: your-registry/ddn-engine:v1.0.0
          envFrom:
            - secretRef:
                name: hasura-env  # Load all variables from secret
```

### Update Secret

```bash
# Delete old secret
kubectl delete secret hasura-env -n hasura

# Create new secret
kubectl create secret generic hasura-env \
  --from-env-file=.env.production \
  -n hasura

# Restart deployment to pick up changes
kubectl rollout restart deployment/ddn-engine -n hasura
```

## External Secrets (Advanced)

For production, use external secret managers:

### AWS Secrets Manager

```yaml
# Using External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: hasura-env
spec:
  secretStoreRef:
    name: aws-secrets
  target:
    name: hasura-env
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: hasura/database-url
```

### Google Secret Manager

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcp-secrets
spec:
  provider:
    gcpsm:
      projectID: your-project-id

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: hasura-env
spec:
  secretStoreRef:
    name: gcp-secrets
  target:
    name: hasura-env
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: hasura-database-url
```

### Azure Key Vault

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-secrets
spec:
  provider:
    azurekv:
      vaultUrl: https://your-vault.vault.azure.net

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: hasura-env
spec:
  secretStoreRef:
    name: azure-secrets
  target:
    name: hasura-env
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: hasura-database-url
```

## Environment Validation

### Check Variable Resolution

```bash
# Test locally
source .env.local
echo $DATABASE_URL

# Test in Kubernetes pod
kubectl exec -it deployment/ddn-engine -n hasura -- env | grep DATABASE_URL

# Test connector can reach database
kubectl exec -it deployment/postgres-connector -n hasura -- \
  psql $DATABASE_URL -c "SELECT 1"
```

### Common Issues

**Variable Not Found:**
```bash
# Check secret exists
kubectl get secret hasura-env -n hasura

# Check pod has envFrom
kubectl get deployment ddn-engine -n hasura -o yaml | grep -A5 envFrom

# Check secret is mounted
kubectl exec -it deployment/ddn-engine -n hasura -- env
```

**Wrong Value:**
```bash
# Decode secret to verify
kubectl get secret hasura-env -n hasura -o json | \
  jq -r '.data.DATABASE_URL' | base64 -d
```

## Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
echo "*.secret" >> .gitignore
```

### 2. Use Different Values Per Environment

```bash
# Development: localhost
DATABASE_URL=postgresql://postgres:password@localhost:5432/dev

# Staging: cloud database
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/staging

# Production: managed database with read replicas
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/prod
```

### 3. Document Required Variables

Create a `.env.example` with placeholders:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication (optional)
#OAUTH_ISSUER_URL=
#OAUTH_AUDIENCE=
#OAUTH_JWKS_URL=
```

### 4. Validate on Startup

Add health checks that verify connectivity:

```bash
# In your deployment
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - curl -f http://localhost:3000/healthz || exit 1
```

### 5. Rotate Secrets Regularly

```bash
# Update database password
# Update OAuth client secrets
# Update API keys
# Recreate Kubernetes secrets
kubectl delete secret hasura-env -n hasura
kubectl create secret generic hasura-env --from-env-file=.env.production -n hasura
kubectl rollout restart deployment/ddn-engine -n hasura
```

## Troubleshooting

### "Connection refused" Error

```bash
# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test connection manually
psql "$DATABASE_URL" -c "SELECT 1"

# Check network connectivity from pod
kubectl exec -it deployment/ddn-engine -n hasura -- \
  curl -v telnet://your-db-host:5432
```

### "Environment variable not set" Error

```bash
# Check variable exists in pod
kubectl exec -it deployment/ddn-engine -n hasura -- env | grep VAR_NAME

# Check secret was created
kubectl describe secret hasura-env -n hasura

# Check deployment references secret
kubectl get deployment ddn-engine -n hasura -o yaml | grep -A10 envFrom
```

### "Invalid JWT configuration" Error

```bash
# Verify OAUTH_* variables are set
kubectl exec -it deployment/ddn-engine -n hasura -- env | grep OAUTH

# Test JWKS URL is accessible
curl $OAUTH_JWKS_URL

# Check issuer URL format (trailing slash matters!)
```

## Resources

- **DDN Environment Docs**: https://hasura.io/docs/3.0/configuration/
- **Kubernetes Secrets**: https://kubernetes.io/docs/concepts/configuration/secret/
- **External Secrets Operator**: https://external-secrets.io/
- **12-Factor App Config**: https://12factor.net/config

---

**Next**: [Security Best Practices](./SECURITY.md) | [Authentication Setup](./AUTHENTICATION.md)
