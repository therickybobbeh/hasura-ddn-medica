#!/bin/bash
# Test script for verifying published Docker images from Docker Hub
# This script pulls the latest images and verifies they work correctly

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Docker Image Test Suite ===${NC}\n"

# Configuration
DOCKER_USERNAME="rickybobbeh"
TAG="${1:-latest}"  # Use first argument or default to 'latest'
ENV_FILE="${2:-${SCRIPT_DIR}/.env}"  # Use second argument or default to script dir .env
COMPOSE_FILE="${SCRIPT_DIR}/compose.test.yaml"

echo -e "${YELLOW}Testing images with tag: ${TAG}${NC}"
echo -e "${YELLOW}Using env file: ${ENV_FILE}${NC}\n"

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Pull images
print_header "Step 1: Pulling Images from Docker Hub"

images=(
    "${DOCKER_USERNAME}/ddn-engine:${TAG}"
    "${DOCKER_USERNAME}/ddn-connector-neon_postgres_1:${TAG}"
    "${DOCKER_USERNAME}/ddn-connector-neon_postgres_2:${TAG}"
    "${DOCKER_USERNAME}/ddn-connector-neon_postgres_lean:${TAG}"
)

for image in "${images[@]}"; do
    echo "Pulling ${image}..."
    if docker pull "${image}"; then
        print_success "Pulled ${image}"
    else
        print_error "Failed to pull ${image}"
        exit 1
    fi
done

# Step 2: Verify env file exists
print_header "Step 2: Checking Environment File"

if [ ! -f "${ENV_FILE}" ]; then
    print_error "${ENV_FILE} file not found!"
    echo "Please create a ${ENV_FILE} file with your configuration."
    echo "Usage: $0 [tag] [env-file]"
    echo "  tag:      Docker image tag (default: latest)"
    echo "  env-file: Environment file to use (default: .env)"
    echo ""
    echo "Examples:"
    echo "  $0 latest .env"
    echo "  $0 latest .env.cloud"
    exit 1
fi
print_success "${ENV_FILE} file found"

# Step 3: Stop any existing containers
print_header "Step 3: Cleaning Up Existing Containers"

if docker compose -f "${COMPOSE_FILE}" ps -q 2>/dev/null | grep -q .; then
    echo "Stopping existing containers..."
    docker compose -f "${COMPOSE_FILE}" down
    print_success "Cleaned up existing containers"
else
    print_success "No existing containers to clean up"
fi

# Step 4: Start services
print_header "Step 4: Starting Services"

echo "Starting all services..."
if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d; then
    print_success "Services started successfully"
else
    print_error "Failed to start services"
    exit 1
fi

# Step 5: Wait for services to be healthy
print_header "Step 5: Waiting for Services to be Healthy"

echo "Waiting for services to start (this may take 30-60 seconds)..."
sleep 10

# Function to check service health
check_service_health() {
    local service=$1
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker compose -f "${COMPOSE_FILE}" ps "${service}" | grep -q "healthy"; then
            print_success "${service} is healthy"
            return 0
        fi
        echo "  Waiting for ${service}... (attempt ${attempt}/${max_attempts})"
        sleep 2
        ((attempt++))
    done

    print_error "${service} failed to become healthy"
    return 1
}

# Check each service (skipping otel-collector for now)
services=("engine" "app_neon_postgres_1" "app_neon_postgres_2" "app_neon_postgres_lean")
all_healthy=true

for service in "${services[@]}"; do
    if ! check_service_health "${service}"; then
        all_healthy=false
    fi
done

# Step 6: Test endpoints
print_header "Step 6: Testing Endpoints"

# Test engine health
echo "Testing engine health endpoint..."
if curl -f http://localhost:3280/health -s -o /dev/null; then
    print_success "Engine health endpoint responding"
else
    print_error "Engine health endpoint failed"
    all_healthy=false
fi

# Test GraphQL endpoint
echo "Testing engine GraphQL endpoint..."
if curl -f http://localhost:3280/graphql -s -o /dev/null -w "%{http_code}" | grep -q "200\|400"; then
    print_success "Engine GraphQL endpoint responding"
else
    print_error "Engine GraphQL endpoint failed"
    all_healthy=false
fi

# Step 7: Show service status
print_header "Step 7: Service Status"

docker compose -f "${COMPOSE_FILE}" ps

# Step 8: Display summary
print_header "Test Summary"

if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════╗"
    echo "║                                        ║"
    echo "║   ✓ ALL TESTS PASSED!                  ║"
    echo "║                                        ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Your DDN stack is running successfully!"
    echo ""
    echo "Access points:"
    echo "  - GraphQL API:     http://localhost:3280/graphql"
    echo "  - GraphQL Console: http://localhost:3280/console"
    echo "  - Health Check:    http://localhost:3280/health"
    echo ""
    echo "To view logs:    docker compose -f ${COMPOSE_FILE} logs -f"
    echo "To stop:         docker compose -f ${COMPOSE_FILE} down"
    echo ""
else
    echo -e "${RED}"
    echo "╔════════════════════════════════════════╗"
    echo "║                                        ║"
    echo "║   ✗ SOME TESTS FAILED                  ║"
    echo "║                                        ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Check logs with: docker compose -f ${COMPOSE_FILE} logs"
    echo ""
    exit 1
fi
