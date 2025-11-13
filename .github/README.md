# GitHub Workflows Documentation

This directory contains GitHub Actions workflows for managing your Hasura DDN project.

## Available Workflows

### 1. Connector Introspection & Metadata Update
**File:** `connector-introspection.yml`
**Trigger:** Manual (workflow_dispatch)
**Status:** OFF by default

Use this workflow when:
- Adding new connectors to your project
- Updating existing connector schemas
- Schema changes in your data sources (databases, APIs, etc.)

**Parameters:**
- `connector_name`: Specific connector to introspect (optional, leave empty for all)
- `subgraph`: Target subgraph (app, globals, or leave empty for all)
- `auto_add_models`: Automatically add models after introspection (default: false)

**Usage:**
Go to Actions → Connector Introspection → Run workflow

---

### 2. Build & Deploy Supergraph
**File:** `build-deploy.yml`
**Trigger:** Manual (workflow_dispatch)
**Status:** OFF by default

Use this workflow when:
- Deploying changes to your Hasura DDN environment
- Rebuilding the supergraph after metadata changes
- Promoting changes across environments

**Parameters:**
- `environment`: Target environment (development/staging/production)
- `build_mode`: Build type (build/release)
- `create_build`: Whether to create a new supergraph build
- `apply_metadata`: Whether to apply metadata to the project

**Usage:**
Go to Actions → Build & Deploy Supergraph → Run workflow

---

### 3. Validate Pull Request
**File:** `validate-pr.yml`
**Trigger:** Automatic on pull requests
**Status:** ON by default

Automatically runs on every PR to:
- Validate supergraph configuration
- Check for breaking changes
- Lint metadata files

No manual intervention required.

---

### 4. Schema Diff
**File:** `schema-diff.yml`
**Trigger:** Manual (workflow_dispatch)
**Status:** OFF by default

Compare schemas between branches to understand changes.

**Parameters:**
- `base_branch`: Branch to compare against (default: main)
- `compare_branch`: Branch to compare (leave empty for current)

**Usage:**
Go to Actions → Schema Diff → Run workflow

---

### 5. Connector Documentation Sync
**File:** `connector-docs-sync.yml`
**Trigger:** Manual or scheduled (weekly)
**Status:** OFF by default for manual, scheduled for weekly

Automatically generates and updates connector documentation.

Runs every Monday at 9 AM UTC, or can be triggered manually.

---

## Required Secrets

Set these secrets in your GitHub repository settings:

- `HASURA_DDN_PAT`: Your Hasura DDN Personal Access Token
  - Go to Hasura DDN Console → Settings → Personal Access Tokens
  - Create a new token with appropriate permissions
  - Add to GitHub: Settings → Secrets and variables → Actions → New repository secret

## Environment Variables

For environment-specific deployments, create `.env.{environment}` files in your `sample-project-1` directory:
- `.env.development`
- `.env.staging`
- `.env.production`

## Workflow Control

All deployment workflows are **OFF by default** to give you full control over when deployments happen. This means:

- ✅ No automatic deployments on push/merge
- ✅ Explicit control via GitHub Actions UI
- ✅ Safe experimentation with introspection
- ✅ Validation still runs automatically on PRs

## Common Workflows

### Adding a New Connector

1. Add connector locally and configure it
2. Commit and push changes
3. Run **Connector Introspection** workflow
   - Select your connector name
   - Enable "auto_add_models" if desired
4. Review the generated metadata
5. Run **Build & Deploy** to deploy changes

### Deploying to Production

1. Ensure all changes are merged to main
2. Run **Build & Deploy** workflow
   - Select "production" environment
   - Select "release" build mode
   - Enable both "create_build" and "apply_metadata"
3. Monitor the deployment in Actions tab

### Reviewing Schema Changes

1. Create a feature branch with your changes
2. Open a PR (triggers automatic validation)
3. Optionally run **Schema Diff** to see detailed changes
4. Review and merge once validated
