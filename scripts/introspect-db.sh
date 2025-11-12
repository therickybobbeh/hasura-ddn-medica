#!/usr/bin/env bash
#
# introspect-db.sh
# Introspects the PostgreSQL database and generates/updates models

set -euo pipefail

ENVIRONMENT=${1:-"local"}

echo "🔍 Introspecting database for environment: ${ENVIRONMENT}"

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Switch to the correct environment context
ddn context use "${ENVIRONMENT}"

# Introspect the PostgreSQL connector
echo "📊 Running database introspection..."
ddn connector introspect neon_postgres --verbose

# Generate models from introspection
echo "🏗️  Generating models..."
ddn model add neon_postgres '*'

echo "✅ Database introspection complete!"
echo ""
echo "Next steps:"
echo "  1. Review changes in subgraphs/postgres/metadata/"
echo "  2. Update permissions if needed"
echo "  3. Build supergraph: ./scripts/build-supergraph.sh"
echo "  4. Build engine Docker image: ./scripts/build-engine.sh <version>"
echo "  5. Deploy to Kubernetes with the new engine image version"
