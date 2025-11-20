#!/bin/bash
# Performance Benchmarking Script for Multi-Language Connectors
# Tests TypeScript, Python, and Go business logic connectors

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENGINE_URL="${ENGINE_URL:-http://localhost:3280}"
GRAPHQL_ENDPOINT="${ENGINE_URL}/graphql"
NUM_REQUESTS="${1:-100}"
CONCURRENT_REQUESTS="${2:-10}"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🚀 HASURA DDN CONNECTOR PERFORMANCE BENCHMARK           ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${YELLOW}Configuration:${NC}"
echo "  GraphQL Endpoint: ${GRAPHQL_ENDPOINT}"
echo "  Total Requests: ${NUM_REQUESTS}"
echo "  Concurrent Requests: ${CONCURRENT_REQUESTS}"
echo ""

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}═══ $1 ═══${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Check if required tools are installed
print_header "Checking Prerequisites"

command -v curl >/dev/null 2>&1 || { print_error "curl is required but not installed. Aborting."; exit 1; }
print_success "curl is installed"

command -v bc >/dev/null 2>&1 || { print_error "bc is required but not installed. Aborting."; exit 1; }
print_success "bc is installed"

# Check if engine is running
print_header "Checking Engine Status"

if curl -f -s "${ENGINE_URL}/health" > /dev/null; then
    print_success "Engine is healthy at ${ENGINE_URL}"
else
    print_error "Engine is not responding at ${ENGINE_URL}"
    echo "Please start the engine with: docker compose -f compose.test.yaml up -d"
    exit 1
fi

# Sample test data
TEST_CLAIM='{
  "claim_id": "CLM-001",
  "member_id": "MBR-123",
  "claim_amount": 5500.00,
  "claim_type": "SURGERY",
  "service_date": "2025-11-15T00:00:00Z",
  "provider_id": "PROV-456"
}'

# Create results directory
RESULTS_DIR="${SCRIPT_DIR}/benchmark-results"
mkdir -p "${RESULTS_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="${RESULTS_DIR}/benchmark_${TIMESTAMP}.txt"

# Function to run benchmark for a connector
benchmark_connector() {
    local connector_name=$1
    local function_name=$2
    local query_name=$3

    print_header "Benchmarking: ${connector_name}"

    # GraphQL query
    local query=$(cat <<EOF
{
  "query": "query BenchmarkTest { ${query_name}(claim: ${TEST_CLAIM}) { claim_id risk_score risk_level factors timestamp } }"
}
EOF
)

    # Warmup requests
    print_info "Warming up (10 requests)..."
    for i in {1..10}; do
        curl -s -X POST "${GRAPHQL_ENDPOINT}" \
            -H "Content-Type: application/json" \
            -d "${query}" > /dev/null 2>&1
    done

    # Run benchmark
    print_info "Running benchmark (${NUM_REQUESTS} requests, ${CONCURRENT_REQUESTS} concurrent)..."

    local temp_file="${RESULTS_DIR}/temp_${connector_name}_${TIMESTAMP}.txt"
    > "${temp_file}"

    local start_time=$(date +%s.%N)
    local success_count=0
    local error_count=0

    # Sequential requests for accurate timing
    for i in $(seq 1 ${NUM_REQUESTS}); do
        local req_start=$(date +%s.%N)

        local response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X POST "${GRAPHQL_ENDPOINT}" \
            -H "Content-Type: application/json" \
            -d "${query}")

        local http_code=$(echo "$response" | tail -2 | head -1)
        local req_time=$(echo "$response" | tail -1)

        if [ "$http_code" = "200" ]; then
            echo "${req_time}" >> "${temp_file}"
            ((success_count++))
        else
            ((error_count++))
        fi

        # Progress indicator
        if (( i % 10 == 0 )); then
            echo -n "."
        fi
    done
    echo ""

    local end_time=$(date +%s.%N)
    local total_time=$(echo "${end_time} - ${start_time}" | bc)

    # Calculate statistics
    local min_time=$(sort -n "${temp_file}" | head -1)
    local max_time=$(sort -n "${temp_file}" | tail -1)
    local avg_time=$(awk '{ sum += $1; count++ } END { if (count > 0) print sum/count; else print 0 }' "${temp_file}")

    # Calculate median
    local median_time=$(sort -n "${temp_file}" | awk '
        { times[NR] = $1 }
        END {
            if (NR % 2) {
                print times[(NR + 1) / 2];
            } else {
                print (times[NR / 2] + times[NR / 2 + 1]) / 2.0;
            }
        }
    ')

    # Calculate 95th percentile
    local p95_index=$(echo "scale=0; ${success_count} * 0.95 / 1" | bc)
    local p95_time=$(sort -n "${temp_file}" | sed -n "${p95_index}p")

    # Calculate throughput
    local throughput=$(echo "scale=2; ${success_count} / ${total_time}" | bc)

    # Print results
    echo ""
    echo -e "${GREEN}Results for ${connector_name}:${NC}"
    echo "  Total Time:    ${total_time}s"
    echo "  Successful:    ${success_count}/${NUM_REQUESTS}"
    echo "  Failed:        ${error_count}"
    echo "  Throughput:    ${throughput} req/s"
    echo ""
    echo "  Response Times (seconds):"
    echo "    Min:         ${min_time}s"
    echo "    Max:         ${max_time}s"
    echo "    Avg:         ${avg_time}s"
    echo "    Median:      ${median_time}s"
    echo "    95th %:      ${p95_time}s"
    echo ""

    # Save to results file
    cat >> "${RESULTS_FILE}" <<EOF

========================================
${connector_name} Benchmark Results
========================================
Total Time:        ${total_time}s
Successful:        ${success_count}/${NUM_REQUESTS}
Failed:            ${error_count}
Throughput:        ${throughput} req/s

Response Times (seconds):
  Min:             ${min_time}s
  Max:             ${max_time}s
  Avg:             ${avg_time}s
  Median:          ${median_time}s
  95th Percentile: ${p95_time}s

EOF

    # Clean up temp file
    rm -f "${temp_file}"

    # Store results for comparison
    eval "${connector_name}_avg=${avg_time}"
    eval "${connector_name}_median=${median_time}"
    eval "${connector_name}_throughput=${throughput}"
}

# Write header to results file
cat > "${RESULTS_FILE}" <<EOF
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   HASURA DDN CONNECTOR PERFORMANCE BENCHMARK RESULTS      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Timestamp:         $(date)
Engine URL:        ${ENGINE_URL}
Total Requests:    ${NUM_REQUESTS}
Concurrent:        ${CONCURRENT_REQUESTS}

EOF

# Run benchmarks for each connector
# Note: You'll need to update the query names based on your actual GraphQL schema
# after introspection is complete

print_header "Starting Benchmarks"
echo ""

# Benchmark TypeScript connector
benchmark_connector "TypeScript" "calculateClaimRisk" "calculateClaimRiskTs"

# Benchmark Python connector
benchmark_connector "Python" "calculateClaimRisk" "calculateClaimRiskPy"

# Benchmark Go connector
benchmark_connector "Go" "calculateClaimRisk" "calculateClaimRiskGo"

# Generate comparison summary
print_header "Performance Comparison Summary"

cat >> "${RESULTS_FILE}" <<EOF

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║                 PERFORMANCE COMPARISON                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Metric                TypeScript      Python          Go
─────────────────────────────────────────────────────────────
Avg Response (s)      ${TypeScript_avg:-N/A}     ${Python_avg:-N/A}     ${Go_avg:-N/A}
Median Response (s)   ${TypeScript_median:-N/A}     ${Python_median:-N/A}     ${Go_median:-N/A}
Throughput (req/s)    ${TypeScript_throughput:-N/A}     ${Python_throughput:-N/A}     ${Go_throughput:-N/A}

EOF

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}║              BENCHMARK COMPLETE!                       ║${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Results saved to:${NC} ${RESULTS_FILE}"
echo ""
echo -e "${GREEN}Performance Comparison:${NC}"
cat "${RESULTS_FILE}" | tail -10
echo ""

# Determine winner
fastest=""
fastest_time=999999

for connector in TypeScript Python Go; do
    avg_var="${connector}_avg"
    avg_time=$(eval echo \$${avg_var})
    if [ ! -z "$avg_time" ]; then
        result=$(echo "$avg_time < $fastest_time" | bc -l)
        if [ "$result" -eq 1 ]; then
            fastest="$connector"
            fastest_time="$avg_time"
        fi
    fi
done

if [ ! -z "$fastest" ]; then
    echo -e "${GREEN}🏆 Fastest Connector: ${fastest} (${fastest_time}s avg)${NC}"
fi

echo ""
echo -e "${YELLOW}To view full results:${NC} cat ${RESULTS_FILE}"
echo -e "${YELLOW}To run again:${NC} $0 [num_requests] [concurrent]"
echo ""
