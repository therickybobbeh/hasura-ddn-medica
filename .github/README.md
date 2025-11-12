# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for automating Hasura DDN v3 deployments.

## Table of Contents

1. [Overview](#overview)
2. [Workflows](#workflows)
3. [Required Secrets](#required-secrets)
4. [Setup Instructions](#setup-instructions)
5. [Manual Triggers](#manual-triggers)
6. [Customization](#customization)
7. [Troubleshooting](#troubleshooting)
8. [Further Reading](#further-reading)

---

## Overview

### CI/CD Strategy

**Goal**: Automate database schema synchronization, supergraph builds, and deployments to Kubernetes.

**Workflow**:
```
Database Schema Change
        ↓
Introspect Database (automated daily or on-demand)
        ↓
Generate Models (.hml files)
        ↓
Build Supergraph (compile to engine/build/*.json)
        ↓
Commit Changes to Git (source + compiled metadata)
        ↓
Build Docker Image (engine with baked-in metadata)
        ↓
Push to Docker Registry
        ↓
Deploy to Kubernetes (rolling update)
        ↓
Verify Deployment
```

### Why GitHub Actions?

**Advantages**:
- ✅ Free for public repos, affordable for private
- ✅ Deep GitHub integration
- ✅ Easy secret management
- ✅ Matrix builds for multiple environments
- ✅ Built-in Docker support

**Alternatives**:
- GitLab CI/CD
- CircleCI
- Jenkins
- Argo CD
- Flux CD

---

## Workflows

### 1. `introspect-and-build.yml`

**Purpose**: Automatically sync database schema changes to GraphQL schema

**Triggers**:
- ⏰ Daily at 2 AM (cron schedule)
- 🖱️ Manual trigger (workflow_dispatch)
- 🔀 Push to `main` branch (when metadata changes)

**What it does**:
1. Connects to database
2. Introspects schema (discovers tables, columns, relationships)
3. Generates/updates `.hml` model files
4. Builds supergraph (compiles to JSON)
5. Commits changes back to Git
6. Creates pull request (if changes detected)

**When to use**:
- After adding/modifying database tables
- To keep GraphQL schema in sync with database
- Daily sync to catch schema drift

**Configuration**:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # TODO: Adjust time for your timezone

  workflow_dispatch:
    inputs:
      environment:
        default: 'dev'  # TODO: Set default environment
```

**Manual trigger**:
```bash
# Via GitHub CLI
gh workflow run "Introspect Database and Build Supergraph" \
  -f environment=dev

# Via GitHub UI
Actions → Introspect Database → Run workflow → Select environment
```

---

### 2. `deploy-metadata.yml`

**Purpose**: Deploy supergraph changes to Kubernetes

**Triggers**:
- 🏷️ Git tag push (e.g., `v1.0.0`)
- 🖱️ Manual trigger with version and environment selection

**What it does**:
1. Checks out code at specified version
2. Builds Docker image with compiled metadata
3. Tags image with version
4. Pushes to Docker registry
5. Updates Kubernetes deployment
6. Waits for rollout to complete
7. Runs health checks

**When to use**:
- After merging metadata changes
- For versioned deployments
- To deploy to specific environments (dev, staging, prod)

**Configuration**:
```yaml
on:
  push:
    tags:
      - 'v*'  # Trigger on version tags

  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy (e.g., v1.0.0)'
        required: true
      environment:
        description: 'Target environment'
        type: choice
        options:
          - dev
          - staging
          - production
```

**Manual trigger**:
```bash
# Via GitHub CLI
gh workflow run "Deploy Metadata to Kubernetes" \
  -f version=v1.0.0 \
  -f environment=production

# Via GitHub UI
Actions → Deploy Metadata → Run workflow → Fill in version and environment
```

---

### 3. `build-custom-connector.yml`

**Purpose**: Build and deploy custom TypeScript connector

**Triggers**:
- 🔀 Push to `main` with connector code changes
- 🖱️ Manual trigger

**What it does**:
1. Builds TypeScript connector Docker image
2. Runs tests
3. Pushes to Docker registry
4. Updates connector deployment in Kubernetes

**When to use**:
- After modifying custom connector code
- To deploy business logic changes
- For connector version updates

**Configuration**:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'connectors/**'  # TODO: Adjust path to your connectors

  workflow_dispatch:
```

**Manual trigger**:
```bash
# Via GitHub CLI
gh workflow run "Build Custom Connector"

# Via GitHub UI
Actions → Build Custom Connector → Run workflow
```

---

## Required Secrets

GitHub Actions workflows need these secrets. Add them in: **Settings → Secrets and variables → Actions → New repository secret**

### Hasura DDN Secrets

**`HASURA_DDN_PAT`** (Personal Access Token)
- **What**: Authentication for Hasura DDN CLI
- **Get it**: https://console.hasura.io/settings/tokens
- **Used in**: All workflows that run `ddn` commands

### Database Secrets

**`DATABASE_URL_DEV`** / **`DATABASE_URL_STAGING`** / **`DATABASE_URL_PROD`**
- **What**: PostgreSQL connection strings for each environment
- **Format**: `postgresql://user:password@host:5432/database`
- **Used in**: `introspect-and-build.yml`

**Example**:
```
DATABASE_URL_DEV=postgresql://user:pass@dev-db.example.com:5432/mydb
DATABASE_URL_STAGING=postgresql://user:pass@staging-db.example.com:5432/mydb
DATABASE_URL_PROD=postgresql://user:pass@prod-db.example.com:5432/mydb
```

### Docker Registry Secrets

**`DOCKER_USERNAME`**
- **What**: Docker Hub username (or registry username)
- **Used in**: `deploy-metadata.yml`, `build-custom-connector.yml`

**`DOCKER_PASSWORD`**
- **What**: Docker Hub password or access token
- **Get it**: https://hub.docker.com/settings/security
- **Used in**: `deploy-metadata.yml`, `build-custom-connector.yml`

**Alternative: GitHub Container Registry**
```yaml
# Use GITHUB_TOKEN instead (no extra secrets needed)
- name: Login to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

### Kubernetes Secrets

**`KUBECONFIG_DEV`** / **`KUBECONFIG_STAGING`** / **`KUBECONFIG_PROD`**
- **What**: Base64-encoded kubeconfig files for each environment
- **Get it**:
  ```bash
  # Encode your kubeconfig
  cat ~/.kube/config | base64 -w 0
  ```
- **Used in**: `deploy-metadata.yml`

**Alternative: Use separate clusters**
```yaml
# For managed Kubernetes (GKE, EKS, AKS)
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v1
  with:
    credentials_json: ${{ secrets.GCP_CREDENTIALS }}

- name: Get GKE credentials
  uses: google-github-actions/get-gke-credentials@v1
  with:
    cluster_name: my-cluster
    location: us-central1
```

### OAuth/OIDC Secrets

**`OAUTH_ISSUER_URL`** / **`OAUTH_JWKS_URL`** / **`OAUTH_AUDIENCE`**
- **What**: Authentication provider configuration
- **Used in**: Supergraph build (compiled into metadata)

### Observability Secrets

**`OTEL_EXPORTER_OTLP_ENDPOINT`** (optional)
- **What**: OpenTelemetry collector endpoint
- **Example**: `https://otel-collector.example.com:4317`
- **Used in**: All workflows (for telemetry)

**`DYNATRACE_ENVIRONMENT_ID`** / **`DYNATRACE_API_TOKEN`** (optional)
- **What**: Dynatrace observability integration
- **Used in**: Deployment workflows (for monitoring)

---

## Setup Instructions

### Step 1: Fork/Clone Repository

```bash
git clone https://github.com/your-org/onprem-hasura-k8s.git
cd onprem-hasura-k8s
```

### Step 2: Add GitHub Secrets

**Via GitHub UI**:
1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret from the list above

**Via GitHub CLI**:
```bash
# Install gh if needed: https://cli.github.com/

# Add secrets
gh secret set HASURA_DDN_PAT
# (paste your token when prompted)

gh secret set DATABASE_URL_DEV
# (paste your connection string when prompted)

gh secret set DOCKER_USERNAME
gh secret set DOCKER_PASSWORD

# For kubeconfig (from file)
gh secret set KUBECONFIG_DEV < ~/.kube/config-dev
gh secret set KUBECONFIG_PROD < ~/.kube/config-prod
```

### Step 3: Customize Workflows

**Edit workflow files** to match your project:

**`introspect-and-build.yml`**:
```yaml
# TODO: Update cron schedule for your timezone
schedule:
  - cron: '0 2 * * *'  # Change time

# TODO: Update environment names
options:
  - dev
  - staging
  - production
```

**`deploy-metadata.yml`**:
```yaml
# TODO: Update Docker registry
env:
  REGISTRY: docker.io/your-username  # Change this
  IMAGE_NAME: hasura-ddn-engine

# TODO: Update Kubernetes namespaces
NAMESPACE_DEV: hasura-dev
NAMESPACE_STAGING: hasura-staging
NAMESPACE_PROD: hasura-prod
```

### Step 4: Test Workflows

**Test introspection** (won't commit):
```bash
# Run locally first
npm install -g @hasura/ddn-cli
ddn connector introspect postgres --subgraph database
```

**Test deployment** (dry run):
```bash
# Build image locally
./scripts/build-engine.sh v0.0.1-test

# Test deploy (dry run)
kubectl set image deployment/hasura-ddn-engine \
  engine=your-registry/hasura-engine:v0.0.1-test \
  --dry-run=client
```

**Test workflow** (manual trigger):
```bash
# Trigger via GitHub UI or CLI
gh workflow run "Introspect Database and Build Supergraph" \
  -f environment=dev
```

### Step 5: Enable Workflows

Workflows are enabled by default. To disable:

```yaml
# Add to workflow file
on:
  workflow_dispatch:  # Manual only
  # schedule:  # Disabled
  #   - cron: '0 2 * * *'
```

---

## Manual Triggers

### Introspect Database

**When**: After database schema changes

**Via GitHub UI**:
1. Go to **Actions** tab
2. Select "Introspect Database and Build Supergraph"
3. Click **Run workflow**
4. Select environment (dev, staging, prod)
5. Click **Run workflow**

**Via GitHub CLI**:
```bash
gh workflow run "Introspect Database and Build Supergraph" \
  -f environment=dev
```

### Deploy to Kubernetes

**When**: Ready to deploy a version

**Via GitHub UI**:
1. Go to **Actions** tab
2. Select "Deploy Metadata to Kubernetes"
3. Click **Run workflow**
4. Enter version (e.g., `v1.0.0`)
5. Select environment
6. Click **Run workflow**

**Via GitHub CLI**:
```bash
gh workflow run "Deploy Metadata to Kubernetes" \
  -f version=v1.0.0 \
  -f environment=production
```

### Build Custom Connector

**When**: After modifying connector code

**Via GitHub UI**:
1. Go to **Actions** tab
2. Select "Build Custom Connector"
3. Click **Run workflow**

**Via GitHub CLI**:
```bash
gh workflow run "Build Custom Connector"
```

---

## Customization

### Multi-Environment Deployments

**Pattern 1: Same workflow, different inputs**

Current approach (recommended):
```yaml
workflow_dispatch:
  inputs:
    environment:
      type: choice
      options:
        - dev
        - staging
        - production
```

**Pattern 2: Separate workflows per environment**

Create `deploy-dev.yml`, `deploy-staging.yml`, `deploy-production.yml`:
```yaml
# deploy-production.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'  # Only tags trigger production

jobs:
  deploy:
    environment: production  # Requires approval
    # ... deployment steps
```

### Approval Gates

**Require approval for production**:

1. Go to **Settings** → **Environments**
2. Create environment: `production`
3. Enable **Required reviewers**
4. Add reviewers

**In workflow**:
```yaml
jobs:
  deploy:
    environment: production  # Requires approval
    steps:
      # ... deployment steps
```

### Matrix Builds

**Deploy to multiple regions**:

```yaml
strategy:
  matrix:
    region: [us-west, us-east, eu-central]
    environment: [staging, production]

steps:
  - name: Deploy to ${{ matrix.region }}
    run: |
      kubectl config use-context ${{ matrix.region }}
      ./scripts/deploy-metadata.sh ${{ matrix.environment }} ${{ github.ref_name }}
```

### Notification Hooks

**Slack notifications**:

```yaml
- name: Notify Slack on success
  if: success()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "✅ Deployed ${{ github.ref_name }} to ${{ inputs.environment }}"
      }

- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "❌ Deployment failed: ${{ github.ref_name }} to ${{ inputs.environment }}"
      }
```

### Rollback Workflow

**Create `rollback.yml`**:

```yaml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true
      environment:
        description: 'Environment'
        type: choice
        options:
          - staging
          - production

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback to ${{ inputs.version }}
        run: |
          kubectl set image deployment/hasura-ddn-engine \
            engine=${{ env.REGISTRY }}/hasura-engine:${{ inputs.version }} \
            -n hasura-${{ inputs.environment }}

          kubectl rollout status deployment/hasura-ddn-engine \
            -n hasura-${{ inputs.environment }}
```

---

## Troubleshooting

### "Workflow failed on introspection"

**Symptoms**:
- Introspect step fails
- "Cannot connect to database" error

**Causes & Fixes**:

1. **Wrong secret name**
   - Check secret names match workflow variables
   - `DATABASE_URL_DEV` not `DATABASE_URL`

2. **Database not accessible**
   - Check firewall allows GitHub Actions IPs
   - Consider using GitHub-hosted runner with fixed IPs
   - Or use self-hosted runner in your VPC

3. **Invalid connection string**
   ```bash
   # Test locally first
   psql "$DATABASE_URL" -c "SELECT 1"
   ```

---

### "Docker push failed"

**Symptoms**:
- Docker build succeeds
- Push to registry fails

**Causes & Fixes**:

1. **Wrong credentials**
   - Verify `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets
   - Re-generate Docker Hub token if expired

2. **Registry URL wrong**
   ```yaml
   # Check registry format
   env:
     REGISTRY: docker.io/username  # Correct
     # NOT: username  # Wrong
   ```

3. **Rate limiting**
   - Docker Hub has pull/push limits
   - Consider GitHub Container Registry (ghcr.io)

---

### "Kubernetes deployment failed"

**Symptoms**:
- Image pushed successfully
- Deployment update fails

**Causes & Fixes**:

1. **Invalid kubeconfig**
   ```bash
   # Test kubeconfig locally
   kubectl --kubeconfig=/path/to/config get nodes

   # Re-encode and update secret
   cat kubeconfig | base64 -w 0 | gh secret set KUBECONFIG_PROD
   ```

2. **Wrong namespace**
   ```yaml
   # Check namespace exists
   - name: Ensure namespace exists
     run: kubectl create namespace hasura-prod --dry-run=client -o yaml | kubectl apply -f -
   ```

3. **Image pull error**
   - Check image name and tag are correct
   - Ensure Kubernetes has image pull secrets (for private registries)

---

### "Workflow waiting for approval"

**Expected behavior** for production deployments with approval gates.

**To approve**:
1. Go to **Actions** → Select workflow run
2. Click **Review deployments**
3. Select environment
4. Click **Approve and deploy**

**To bypass** (not recommended for production):
```yaml
# Remove environment constraint
jobs:
  deploy:
    # environment: production  # Comment this out
```

---

## Further Reading

### GitHub Actions Documentation

**Core Concepts**:
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Manual Triggers](https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow)

**Advanced Features**:
- [Matrix Builds](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [Reusable Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [Composite Actions](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)

### Kubernetes Deployment

**Strategies**:
- [Rolling Updates](https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/)
- [Blue-Green Deployment](https://kubernetes.io/blog/2018/04/30/zero-downtime-deployment-kubernetes-jenkins/)
- [Canary Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#canary-deployment)

### Alternative CI/CD

**GitOps**:
- [Argo CD](https://argo-cd.readthedocs.io/) - GitOps continuous delivery
- [Flux CD](https://fluxcd.io/) - GitOps toolkit

**Other CI/CD**:
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [CircleCI](https://circleci.com/docs/)
- [Jenkins](https://www.jenkins.io/doc/)

### Related Documentation

- **Main README**: `../README.md` - Project overview
- **Scripts**: `../scripts/README.md` - Deployment scripts used by workflows
- **QUICKSTART**: `../QUICKSTART.md` - Manual deployment guide
- **ARCHITECTURE**: `../ARCHITECTURE.md` - Understanding DDN v3 deployment model

---

## Questions?

**Common scenarios**:
- First time setup? Follow [Setup Instructions](#setup-instructions)
- Workflow failed? Check [Troubleshooting](#troubleshooting)
- Custom requirements? See [Customization](#customization)
- Manual deployment? See `../scripts/README.md`

**Need help?**
- [GitHub Actions Community](https://github.community/t/github-actions/29498)
- [Hasura Discord](https://discord.com/invite/hasura) - #ddn-deployments channel
- [Stack Overflow](https://stackoverflow.com/questions/tagged/github-actions)
