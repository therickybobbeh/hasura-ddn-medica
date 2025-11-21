# Multi-Language Connector Performance Comparison

This document describes the TypeScript, Python, and Go business logic connectors added to the Hasura DDN project for performance comparison.

## Overview

Three custom connectors have been implemented in different languages, each providing **identical insurance claim processing functionality**:

1. **TypeScript Connector** (`ts_business_logic`) - Node.js/TypeScript implementation
2. **Python Connector** (`py_business_logic`) - Python implementation
3. **Go Connector** (`go_business_logic`) - Go implementation

### ⚠️ Algorithmic Equivalence Guarantee

**All three connectors implement the exact same business logic with identical time complexity:**

- **Time Complexity:** O(1) for single claim operations (`calculateClaimRisk`, `generateClaimSummary`, `processClaim`)
- **Time Complexity:** O(n) for batch operations where n = number of claims
- **Algorithm:** Same conditional checks, arithmetic operations, and scoring logic across all implementations
- **Big O Notation:** No algorithmic differences - all connectors perform the same number of operations

**This means performance differences are purely due to:**

- Language runtime characteristics (compiled vs JIT vs interpreted)
- Memory management and garbage collection strategies
- JSON parsing/serialization performance
- HTTP/network layer implementation
- Concurrency model efficiency (goroutines vs event loop vs threads)

**Fair Comparison:** The connectors are algorithmically identical, so benchmarks reflect true language/runtime performance differences, not implementation variations.

## Business Logic

All three connectors implement the following functions:

### Query Functions (Read-Only)

#### `calculateClaimRisk`
Analyzes insurance claim data and returns a risk assessment.

**Input:**
```graphql
{
  claim_id: String!
  member_id: String!
  claim_amount: Float!
  claim_type: String!
  service_date: String!
  provider_id: String
}
```

**Output:**
```graphql
{
  claim_id: String!
  risk_score: Float!
  risk_level: String!  # "LOW", "MEDIUM", or "HIGH"
  factors: [String!]!
  timestamp: String!
}
```

**Risk Factors:**
- HIGH_AMOUNT (>$10,000): +30 points
- MODERATE_AMOUNT ($5,000-$10,000): +15 points
- HIGH_RISK_TYPE (Surgery, Emergency, Specialized): +25 points
- MODERATE_RISK_TYPE (Diagnostic, Therapy, Dental): +10 points
- DELAYED_SUBMISSION (>90 days): +20 points
- TIMELY_SUBMISSION (≤7 days): -5 points
- MISSING_PROVIDER: +15 points

#### `generateClaimSummary`
Generates a formatted summary with tax calculations.

**Output:**
```graphql
{
  claim_id: String!
  member_id: String!
  total_amount: Float!
  tax_amount: Float!    # 8% tax rate
  net_amount: Float!    # total + tax
  status: String!
  summary: String!
}
```

#### `batchCalculateRisk`
Process multiple claims in a single request.

### Mutation Functions (Write/Process)

#### `processClaim`
Validates and processes a claim, returning approval/rejection decision.

**Logic:**
- Auto-approve: Low risk (<30) AND amount <$5,000
- Auto-reject: High risk (≥70)
- Manual review: Medium risk (30-69)

**Output:**
```graphql
{
  claim_id: String!
  status: String!        # "APPROVED", "REJECTED", "PENDING_REVIEW"
  approved: Boolean!
  approved_amount: Float
  rejection_reason: String
  processing_time: Float!
}
```

#### `batchProcessClaims`
Process multiple claims in a single request.

## Directory Structure

```
sample-project-1/app/connector/
├── ts_business_logic/
│   ├── connector.yaml              # Connector configuration
│   ├── functions.ts                # TypeScript business logic
│   ├── package.json                # Node.js dependencies
│   ├── tsconfig.json               # TypeScript config
│   └── .hasura-connector/
│       ├── Dockerfile.ts_business_logic
│       └── connector-metadata.yaml
├── py_business_logic/
│   ├── connector.yaml
│   ├── functions.py                # Python business logic
│   ├── requirements.txt            # Python dependencies
│   └── .hasura-connector/
│       ├── Dockerfile.py_business_logic
│       └── connector-metadata.yaml
└── go_business_logic/
    ├── connector.yaml
    ├── go.mod                      # Go module file
    ├── functions/
    │   └── claims.go               # Go business logic
    └── .hasura-connector/
        ├── Dockerfile.go_business_logic
        └── connector-metadata.yaml
```

## Configuration

### Environment Variables

Each connector requires the following environment variables (defined in `.env`):

**TypeScript:**
```bash
APP_TS_BUSINESS_LOGIC_HASURA_CONNECTOR_PORT=5640
APP_TS_BUSINESS_LOGIC_HASURA_SERVICE_TOKEN_SECRET="ts_business_logic_token_secret"
APP_TS_BUSINESS_LOGIC_OTEL_EXPORTER_OTLP_ENDPOINT="http://local.hasura.dev:4317"
APP_TS_BUSINESS_LOGIC_OTEL_SERVICE_NAME="app_ts_business_logic"
```

**Python:**
```bash
APP_PY_BUSINESS_LOGIC_HASURA_CONNECTOR_PORT=5641
APP_PY_BUSINESS_LOGIC_HASURA_SERVICE_TOKEN_SECRET="py_business_logic_token_secret"
APP_PY_BUSINESS_LOGIC_OTEL_EXPORTER_OTLP_ENDPOINT="http://local.hasura.dev:4317"
APP_PY_BUSINESS_LOGIC_OTEL_SERVICE_NAME="app_py_business_logic"
```

**Go:**
```bash
APP_GO_BUSINESS_LOGIC_HASURA_CONNECTOR_PORT=5642
APP_GO_BUSINESS_LOGIC_HASURA_SERVICE_TOKEN_SECRET="go_business_logic_token_secret"
APP_GO_BUSINESS_LOGIC_OTEL_EXPORTER_OTLP_ENDPOINT="http://local.hasura.dev:4317"
APP_GO_BUSINESS_LOGIC_OTEL_SERVICE_NAME="app_go_business_logic"
```

## Building and Running

### Local Development

1. **Build Connectors Locally:**
   ```bash
   cd sample-project-1/app/connector/ts_business_logic
   docker build -f .hasura-connector/Dockerfile.ts_business_logic -t ts-connector .

   cd ../py_business_logic
   docker build -f .hasura-connector/Dockerfile.py_business_logic -t py-connector .

   cd ../go_business_logic
   docker build -f .hasura-connector/Dockerfile.go_business_logic -t go-connector .
   ```

2. **Start with Docker Compose:**
   ```bash
   cd sample-project-1
   docker compose -f compose.test.yaml up -d
   ```

3. **Check Health:**
   ```bash
   curl http://localhost:5640/health  # TypeScript
   curl http://localhost:5641/health  # Python
   curl http://localhost:5642/health  # Go
   ```

### CI/CD Pipeline

Build and push all connectors to Docker Hub:

```bash
# Via GitHub Actions (manual trigger)
# Go to: Actions > Push to Image Registry
# Set: connectors=all, tag=latest

# Or using workflow dispatch API
gh workflow run push-to-image-registry.yml \
  -f connectors=all \
  -f tag=latest \
  -f push_to_registry=true
```

Build specific connectors only:
```bash
gh workflow run push-to-image-registry.yml \
  -f connectors=ts_business_logic,py_business_logic,go_business_logic \
  -f tag=v1.0.0
```

### Testing

Run the test suite to verify all connectors:
```bash
cd sample-project-1
./test-images.sh latest .env
```

## Performance Benchmarking

### Running Benchmarks

The `benchmark-connectors.sh` script compares performance across all three connectors:

```bash
cd sample-project-1

# Basic benchmark (100 requests, 10 concurrent)
./benchmark-connectors.sh

# Custom benchmark
./benchmark-connectors.sh 1000 50  # 1000 requests, 50 concurrent
```

### Benchmark Metrics

The script measures:
- **Response Time:** Min, Max, Average, Median, 95th percentile
- **Throughput:** Requests per second
- **Success Rate:** Successful vs failed requests
- **Total Time:** End-to-end test duration

### Example Output

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 HASURA DDN CONNECTOR PERFORMANCE BENCHMARK           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Configuration:
  GraphQL Endpoint: http://localhost:3280/graphql
  Total Requests: 100
  Concurrent Requests: 10

═══ Benchmarking: TypeScript ═══
...
Results for TypeScript:
  Total Time:    2.45s
  Successful:    100/100
  Throughput:    40.82 req/s

  Response Times (seconds):
    Min:         0.018s
    Max:         0.052s
    Avg:         0.024s
    Median:      0.023s
    95th %:      0.031s

═══ Benchmarking: Python ═══
...

═══ Benchmarking: Go ═══
...

🏆 Fastest Connector: Go (0.019s avg)
```

Results are saved to `benchmark-results/benchmark_YYYYMMDD_HHMMSS.txt`

## Expected Performance Characteristics

### TypeScript
- **Pros:** Fast startup, good for I/O-heavy operations
- **Cons:** Single-threaded event loop, garbage collection pauses
- **Best For:** Quick iterations, npm ecosystem

### Python
- **Pros:** Extensive libraries, readable code
- **Cons:** GIL limits concurrency, slower than compiled languages
- **Best For:** Data science integration, rapid development

### Go
- **Pros:** Compiled performance, excellent concurrency
- **Cons:** More verbose, smaller ecosystem
- **Best For:** High-throughput services, low latency requirements

## Usage Examples

### GraphQL Query Example

```graphql
query TestClaimRisk {
  # TypeScript connector
  calculateClaimRiskTs(claim: {
    claim_id: "CLM-001"
    member_id: "MBR-123"
    claim_amount: 7500.00
    claim_type: "SURGERY"
    service_date: "2025-11-15T00:00:00Z"
    provider_id: "PROV-456"
  }) {
    claim_id
    risk_score
    risk_level
    factors
    timestamp
  }

  # Python connector
  calculateClaimRiskPy(claim: {
    claim_id: "CLM-001"
    member_id: "MBR-123"
    claim_amount: 7500.00
    claim_type: "SURGERY"
    service_date: "2025-11-15T00:00:00Z"
    provider_id: "PROV-456"
  }) {
    claim_id
    risk_score
    risk_level
  }

  # Go connector
  calculateClaimRiskGo(claim: {
    claim_id: "CLM-001"
    member_id: "MBR-123"
    claim_amount: 7500.00
    claim_type: "SURGERY"
    service_date: "2025-11-15T00:00:00Z"
    provider_id: "PROV-456"
  }) {
    claim_id
    risk_score
    risk_level
  }
}
```

### Mutation Example

```graphql
mutation ProcessClaims {
  # Process claim with TypeScript
  processClaimTs(claim: {
    claim_id: "CLM-002"
    member_id: "MBR-456"
    claim_amount: 3500.00
    claim_type: "DIAGNOSTIC"
    service_date: "2025-11-18T00:00:00Z"
    provider_id: "PROV-789"
  }) {
    claim_id
    status
    approved
    approved_amount
    processing_time
  }
}
```

## Troubleshooting

### Connector Not Starting

1. Check Docker logs:
   ```bash
   docker compose -f compose.test.yaml logs app_ts_business_logic
   ```

2. Verify environment variables:
   ```bash
   docker compose -f compose.test.yaml config
   ```

3. Check port conflicts:
   ```bash
   lsof -i :5640  # TypeScript port
   lsof -i :5641  # Python port
   lsof -i :5642  # Go port
   ```

### Health Check Failures

1. Ensure base images are available:
   ```bash
   docker pull ghcr.io/hasura/ndc-nodejs-lambda:v1.6.0
   docker pull ghcr.io/hasura/ndc-python-lambda:v1.6.0
   docker pull ghcr.io/hasura/ndc-go-lambda:v1.6.0
   ```

2. Rebuild connectors:
   ```bash
   docker compose -f compose.test.yaml build --no-cache
   ```

## Next Steps

1. **Add Metadata:** Run introspection to generate GraphQL schema
   ```bash
   ddn connector introspect ts_business_logic
   ddn connector introspect py_business_logic
   ddn connector introspect go_business_logic
   ```

2. **Build Supergraph:**
   ```bash
   ddn supergraph build local
   ```

3. **Deploy to Cloud:**
   ```bash
   ddn project deploy
   ```

4. **Monitor Performance:** Use OpenTelemetry endpoints to track metrics in production

## References

- [Hasura DDN Documentation](https://hasura.io/docs/3.0/)
- [Custom Business Logic Tutorial](https://hasura.io/docs/3.0/business-logic/tutorials/add-custom-logic)
- [Connector SDK - TypeScript](https://github.com/hasura/ndc-sdk-typescript)
- [Connector SDK - Python](https://github.com/hasura/ndc-sdk-python)
- [Connector SDK - Go](https://github.com/hasura/ndc-sdk-go)
