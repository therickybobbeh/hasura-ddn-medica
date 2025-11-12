#!/usr/bin/env bash
#
# introspect-db.sh
# Introspects PostgreSQL databases and generates/updates models
#
# Usage:
#   ./scripts/introspect-db.sh database-1          # Introspect database 1
#   ./scripts/introspect-db.sh database-2          # Introspect database 2
#   ./scripts/introspect-db.sh all                 # Introspect all databases

set -euo pipefail

SUBGRAPH=${1:-"all"}

echo "🔍 Introspecting database(s): ${SUBGRAPH}"

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

introspect_database() {
  local subgraph=$1
  echo ""
  echo "========================================="
  echo "📊 Introspecting ${subgraph}..."
  echo "========================================="

  # Introspect the PostgreSQL connector for this subgraph
  cd "subgraphs/${subgraph}"

  echo "Running connector introspection..."
  ddn connector introspect postgres --verbose

  echo "Generating models..."
  ddn model add postgres '*'

  cd ../..

  echo "✅ ${subgraph} introspection complete!"
}

# Introspect based on argument
if [ "${SUBGRAPH}" = "all" ]; then
  introspect_database "database-1"
  introspect_database "database-2"
elif [ "${SUBGRAPH}" = "database-1" ] || [ "${SUBGRAPH}" = "database-2" ]; then
  introspect_database "${SUBGRAPH}"
else
  echo "❌ Error: Invalid subgraph '${SUBGRAPH}'"
  echo ""
  echo "Usage:"
  echo "  ./scripts/introspect-db.sh database-1    # Introspect database 1"
  echo "  ./scripts/introspect-db.sh database-2    # Introspect database 2"
  echo "  ./scripts/introspect-db.sh all           # Introspect all databases"
  exit 1
fi

echo ""
echo "========================================="
echo "✅ All database introspection complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Review changes in subgraphs/database-*/metadata/"
echo "  2. Add/update permissions in .hml files"
echo "  3. Build supergraph: ./scripts/build-supergraph.sh"
echo "  4. Build engine Docker image: ./scripts/build-engine.sh <version>"
echo "  5. Deploy: ./scripts/deploy-metadata.sh <env> <version>"
