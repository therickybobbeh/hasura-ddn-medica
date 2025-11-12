#!/usr/bin/env bash
#
# deploy-metadata.sh
# Deploys DDN v3 engine with compiled metadata to Kubernetes
#
# DDN v3 deployment workflow:
# 1. Metadata is compiled into engine/build/ (via build-supergraph.sh)
# 2. Engine Docker image is built with metadata baked in (via build-engine.sh)
# 3. New image version is deployed to Kubernetes (this script)
#
# This script updates the engine deployment to use a new image version.

set -euo pipefail

ENVIRONMENT=${1:-"local"}
IMAGE_VERSION=${2:-""}

if [ -z "${IMAGE_VERSION}" ]; then
  echo "❌ Error: Image version required"
  echo ""
  echo "Usage: $0 <environment> <image-version>"
  echo ""
  echo "Examples:"
  echo "  $0 local v1.0.0"
  echo "  $0 staging v1.0.0"
  echo "  $0 production v1.0.0"
  echo ""
  exit 1
fi

echo "🚀 Deploying DDN v3 engine to environment: ${ENVIRONMENT}"
echo "📦 Image version: ${IMAGE_VERSION}"

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Get namespace based on environment
case "${ENVIRONMENT}" in
  local)
    NAMESPACE="hasura-local"
    REGISTRY="docker.io/$(whoami)"  # Default to Docker Hub with username
    ;;
  dev)
    NAMESPACE="hasura-dev"
    REGISTRY="docker.io/your-org"
    ;;
  staging)
    NAMESPACE="hasura-staging"
    REGISTRY="docker.io/your-org"
    ;;
  production)
    NAMESPACE="hasura-prod"
    REGISTRY="docker.io/your-org"
    ;;
  *)
    echo "❌ Unknown environment: ${ENVIRONMENT}"
    exit 1
    ;;
esac

IMAGE_NAME="${REGISTRY}/hasura-ddn-engine:${IMAGE_VERSION}"

echo ""
echo "Deployment details:"
echo "  Namespace: ${NAMESPACE}"
echo "  Image: ${IMAGE_NAME}"
echo ""

# Check if namespace exists
if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
  echo "❌ Namespace '${NAMESPACE}' does not exist"
  exit 1
fi

# Check if deployment exists
if ! kubectl get deployment hasura-ddn-engine -n "${NAMESPACE}" &> /dev/null; then
  echo "⚠️  Deployment 'hasura-ddn-engine' not found in namespace '${NAMESPACE}'"
  echo "Please ensure the engine deployment is created first."
  echo "See: ../infra-k8s/self-hosted/k8s-manifests/engine/deployment.yaml"
  exit 1
fi

# Update the deployment with new image
echo "📝 Updating engine deployment..."
kubectl set image deployment/hasura-ddn-engine \
  engine="${IMAGE_NAME}" \
  -n "${NAMESPACE}"

# Wait for rollout to complete
echo ""
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/hasura-ddn-engine -n "${NAMESPACE}" --timeout=5m

# Get the service endpoint
SERVICE_URL=$(kubectl get ingress hasura-ddn-ingress -n "${NAMESPACE}" -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "hasura.${ENVIRONMENT}.local")

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎉 Engine is now serving metadata from image: ${IMAGE_NAME}"
echo ""
echo "🔍 Verify deployment:"
echo "  kubectl get pods -n ${NAMESPACE} -l app=hasura-ddn"
echo "  kubectl logs -n ${NAMESPACE} -l app=hasura-ddn --tail=50"
echo ""
echo "🌐 Test GraphQL API:"
echo "  curl http://${SERVICE_URL}/graphql \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\": \"{ __schema { queryType { name } } }\"}'"
echo ""
echo "📊 Check health:"
echo "  curl http://${SERVICE_URL}/healthz"
echo ""
