#!/usr/bin/env bash
#
# build-supergraph.sh
# Builds the supergraph and compiles metadata for DDN v3
#
# DDN v3 uses 'ddn supergraph build local' which compiles all .hml files
# into JSON files in the engine/build/ directory.

set -euo pipefail

echo "🏗️  Building DDN v3 supergraph..."

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Build the supergraph locally (compiles .hml → engine/build/*.json)
echo "📦 Compiling metadata..."
ddn supergraph build local

echo ""
echo "✅ Supergraph build complete!"
echo ""
echo "📁 Build output:"
echo "   - engine/build/auth_config.json"
echo "   - engine/build/metadata.json"
echo "   - engine/build/open_dd.json"
echo ""
echo "🔍 Verify the build:"
echo "   - Review changes in engine/build/"
echo "   - Commit to Git for audit trail"
echo ""
echo "Next steps:"
echo "  1. Review and commit metadata: git add engine/build/ && git commit -m 'Update metadata'"
echo "  2. Tag the release: git tag -a v1.0.0 -m 'Release v1.0.0'"
echo "  3. Build Docker image: ./scripts/build-engine.sh v1.0.0"
echo "  4. Deploy to Kubernetes with new image version"
