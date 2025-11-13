# Hasura DDN Medical Application - Setup Guide

This repository contains a Hasura DDN (Data Delivery Network) project for medical/healthcare applications with controlled GitHub Actions workflows for deployment management.

## Repository Information

**URL:** https://github.com/therickybobbeh/hasura-ddn-medica
**Branch:** sample-implementaion

## Project Structure

```
.
├── .github/
│   ├── workflows/          # GitHub Actions workflows
│   │   ├── build-deploy.yml              # Manual deployment workflow
│   │   ├── connector-introspection.yml   # Manual connector introspection
│   │   ├── validate-pr.yml               # Automatic PR validation
│   │   ├── schema-diff.yml               # Manual schema comparison
│   │   └── connector-docs-sync.yml       # Auto-generate connector docs
│   └── README.md          # Workflow documentation
├── sample-project-1/      # Main Hasura DDN project
│   ├── app/              # App subgraph
│   │   ├── connector/   # Data connectors
│   │   │   ├── neon_postgres_1/
│   │   │   ├── neon_postgres_2/
│   │   │   └── neon_postgres_lean/
│   │   └── metadata/    # GraphQL metadata (HML files)
│   ├── globals/         # Global subgraph
│   ├── supergraph.yaml  # Supergraph configuration
│   └── compose.yaml     # Docker Compose for local dev
└── .gitignore

```

## Key Features

### 🎛️ Workflow Control
- **All deployment workflows are OFF by default** - you have full control
- Manual triggers for introspection and deployments
- Automatic validation on pull requests
- Environment-based deployments (dev/staging/production)

### 📊 Current Subgraphs

1. **app** - Main application subgraph
   - 3 PostgreSQL connectors (neon_postgres_1, neon_postgres_2, neon_postgres_lean)
   - Medical data models: Members, Claims, ProviderRecords, EligibilityChecks, Notes, etc.

2. **globals** - Global configuration subgraph
   - Authentication config
   - GraphQL config
   - Compatibility settings

## Quick Start

### Prerequisites

1. Install Hasura DDN CLI:
   ```bash
   curl -L https://graphql-engine-cdn.hasura.io/ddn/cli/v4/get.sh | bash
   ```

2. Set up GitHub Secrets (for workflows):
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add secret: `HASURA_DDN_PAT` (Personal Access Token from Hasura DDN Console)

### Local Development

```bash
# Navigate to project
cd sample-project-1

# Start local connectors
ddn run docker-start

# In another terminal, build and serve the supergraph
ddn supergraph build local --output build.json
ddn run engine --watch build.json
```

### Using GitHub Workflows

#### Adding a New Connector

1. Add connector locally and configure it
2. Commit and push changes
3. Go to GitHub Actions → "Connector Introspection & Metadata Update" → Run workflow
4. Review generated metadata
5. Run "Build & Deploy Supergraph" workflow

#### Deploying Changes

1. Go to GitHub Actions → "Build & Deploy Supergraph" → Run workflow
2. Select environment (development/staging/production)
3. Choose build mode (build/release)
4. Enable "create_build" and "apply_metadata"
5. Monitor deployment progress

## Workflow Documentation

See [.github/README.md](.github/README.md) for detailed workflow documentation.

## Available Workflows

| Workflow | Trigger | Status | Purpose |
|----------|---------|--------|---------|
| Connector Introspection | Manual | OFF | Update connector schemas and add models |
| Build & Deploy | Manual | OFF | Deploy supergraph to DDN environments |
| Validate PR | Automatic | ON | Validate changes in pull requests |
| Schema Diff | Manual | OFF | Compare schemas between branches |
| Connector Docs Sync | Manual/Weekly | OFF/Scheduled | Auto-generate connector documentation |

## Environment Setup

Create environment-specific configuration files:

```bash
cd sample-project-1
cp .env.example .env.development
cp .env.example .env.staging
cp .env.example .env.production
```

Edit each file with appropriate values for:
- Database connection strings
- API keys
- Environment-specific settings

## Medical Data Models

The project includes healthcare-specific models:

- **Members** - Health plan members/patients
- **Claims** - Medical claims for services
- **ProviderRecords** - Healthcare providers
- **EligibilityChecks** - Member eligibility verification
- **Notes** - Case management notes
- **Appointments** - Medical appointments
- **BillingRecords** - Billing information
- **Prescriptions** - Medication prescriptions

## Security Notes

- Workflows require manual triggers for sensitive operations
- Environment variables and secrets managed through GitHub
- All deployment workflows are opt-in, preventing accidental deployments
- PR validation runs automatically to catch issues early

## Next Steps

1. Configure your Hasura DDN project settings
2. Set up environment variables in GitHub Secrets
3. Add custom business logic with lambda connectors (TypeScript/Python/Go)
4. Configure deployment environments
5. Run your first deployment using the workflows

## Support

For issues or questions:
- Check [.github/README.md](.github/README.md) for workflow help
- Review Hasura DDN documentation: https://hasura.io/docs/3.0/
- Create an issue in this repository

---

**Repository:** https://github.com/therickybobbeh/hasura-ddn-medica
