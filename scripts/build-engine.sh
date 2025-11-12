#!/usr/bin/env bash
#
# build-engine.sh
# Builds the Hasura DDN v3 engine Docker image with compiled metadata
#
# This script builds a Docker image containing the DDN v3 engine
# with the compiled metadata from engine/build/ baked in.

set -euo pipefail

VERSION=${1:-""}

if [ -z "${VERSION}" ]; then
  echo "❌ Error: Version tag required"
  echo ""
  echo "Usage: $0 <version>"
  echo ""
  echo "Examples:"
  echo "  $0 v1.0.0"
  echo "  $0 v1.2.3-beta"
  echo "  $0 latest"
  echo ""
  echo "💡 Tip: Use semantic versioning and match your Git tags"
  exit 1
fi

echo "🏗️  Building Hasura DDN v3 Engine Docker Image"
echo "📦 Version: ${VERSION}"
echo ""

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Check if engine/build/ exists
if [ ! -d "engine/build" ]; then
  echo "❌ Error: engine/build/ directory not found"
  echo ""
  echo "You must build the supergraph first:"
  echo "  ./scripts/build-supergraph.sh"
  echo ""
  exit 1
fi

# Check if required metadata files exist
REQUIRED_FILES=(
  "engine/build/auth_config.json"
  "engine/build/metadata.json"
  "engine/build/open_dd.json"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Error: Required file not found: $file"
    echo ""
    echo "Run 'ddn supergraph build local' to generate metadata files"
    exit 1
  fi
done

# Get Docker registry from environment or use default
REGISTRY=${DOCKER_REGISTRY:-"docker.io/$(whoami)"}
IMAGE_NAME="${REGISTRY}/hasura-ddn-engine"
FULL_IMAGE="${IMAGE_NAME}:${VERSION}"

echo "🐳 Docker image details:"
echo "  Registry: ${REGISTRY}"
echo "  Image: ${IMAGE_NAME}"
echo "  Tag: ${VERSION}"
echo "  Full: ${FULL_IMAGE}"
echo ""

# Build the Docker image
echo "🔨 Building Docker image..."
docker build \
  -t "${FULL_IMAGE}" \
  -f engine/Dockerfile.engine \
  --build-arg VERSION="${VERSION}" \
  --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
  engine/

# Also tag as 'latest' for local development
if [[ "${VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "🏷️  Tagging as latest..."
  docker tag "${FULL_IMAGE}" "${IMAGE_NAME}:latest"
fi

echo ""
echo "✅ Docker image built successfully!"
echo ""
echo "📋 Image details:"
docker images "${IMAGE_NAME}" | grep -E "REPOSITORY|${VERSION}"

echo ""
echo "🔍 Verify image contents:"
echo "  docker run --rm ${FULL_IMAGE} ls -la /md/"
echo ""
echo "🧪 Test locally:"
echo "  docker run --rm -p 3000:3000 ${FULL_IMAGE}"
echo "  curl http://localhost:3000/healthz"
echo ""
echo "📤 Push to registry:"
echo "  docker push ${FULL_IMAGE}"
if [[ "${VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "  docker push ${IMAGE_NAME}:latest"
fi
echo ""
echo "🚀 Deploy to Kubernetes:"
echo "  ./scripts/deploy-metadata.sh local ${VERSION}"
echo "  ./scripts/deploy-metadata.sh staging ${VERSION}"
echo "  ./scripts/deploy-metadata.sh production ${VERSION}"
echo ""
