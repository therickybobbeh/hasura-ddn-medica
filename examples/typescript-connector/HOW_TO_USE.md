# How to Use This TypeScript Connector Example

This guide shows you how to copy this example connector into your Hasura DDN v3 project and customize it for your needs.

## Prerequisites

- Hasura DDN CLI installed: `npm install -g @hasura/ddn-cli`
- Docker installed
- Your Hasura project set up (see main README.md)

## Step-by-Step Guide

### Step 1: Copy the Connector to Your Project

```bash
# From the root of your onprem-hasura-k8s project
cp -r examples/typescript-connector connectors/my-custom-logic

# Navigate to the new connector
cd connectors/my-custom-logic
```

### Step 2: Customize for Your Project

#### A. Update package.json

```bash
# Edit connectors/my-custom-logic/package.json
```

Change:
```json
{
  "name": "@company/typescript-connector",  # ← Change "company" to your org
  "description": "Custom business logic connector",  # ← Update description
  "author": "Your Name"  # ← Update author
}
```

#### B. Add Your Functions

Replace the example functions with your own:

```bash
# Remove examples (or keep for reference)
rm src/functions/hello.ts
rm src/functions/calculator.ts

# Create your functions
touch src/functions/my-business-logic.ts
```

**Example function**:
```typescript
// src/functions/my-business-logic.ts
export interface ProcessOrderInput {
  orderId: string;
  action: 'approve' | 'reject';
}

export interface ProcessOrderOutput {
  success: boolean;
  message: string;
  order: {
    id: string;
    status: string;
  };
}

export async function processOrder(
  input: ProcessOrderInput
): Promise<ProcessOrderOutput> {
  // TODO: Add your business logic here
  return {
    success: true,
    message: `Order ${input.orderId} ${input.action}ed`,
    order: {
      id: input.orderId,
      status: input.action === 'approve' ? 'approved' : 'rejected'
    }
  };
}
```

#### C. Register Functions in index.ts

```bash
# Edit connectors/my-custom-logic/src/index.ts
```

```typescript
// Import your functions
import { processOrder } from './functions/my-business-logic';

// Add to function registry
const functions = {
  processOrder,  // ← Add your function here
  // Add more functions as needed
};
```

### Step 3: Test Locally

```bash
# Install dependencies
cd connectors/my-custom-logic
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, etc.

# Run in development mode
npm run dev

# In another terminal, test your function
curl -X POST http://localhost:8080/functions/processOrder \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123", "action": "approve"}'
```

### Step 4: Build Docker Image

```bash
# Build the Docker image
docker build -t your-registry/my-custom-logic:v1.0.0 .

# Test the Docker image locally
docker run -p 8080:8080 \
  -e DATABASE_URL=postgresql://... \
  your-registry/my-custom-logic:v1.0.0

# Push to your registry
docker push your-registry/my-custom-logic:v1.0.0
```

### Step 5: Create a Subgraph for Your Connector

```bash
# From project root
ddn subgraph init my-logic
```

This creates:
```
subgraphs/
└── my-logic/
    ├── subgraph.yaml
    └── connector/
```

### Step 6: Add Connector Configuration

```bash
# Create connector directory
mkdir -p subgraphs/my-logic/connector/my-connector

# Create connector.yaml
cat > subgraphs/my-logic/connector/my-connector/connector.yaml <<EOF
---
# TODO: Update with your actual connector name and image
kind: Connector
version: v2
definition:
  name: my_custom_connector

  # Use the Hasura Node.js connector runtime
  source:
    hasuraHubConnector:
      connectorId: hasura/nodejs
      version: v1.0.0

  # Point to your custom connector code
  context: ../../../../connectors/my-custom-logic

  # Environment variable mapping
  envMapping:
    PORT:
      fromEnv: MY_CONNECTOR_PORT

    DATABASE_URL:
      fromEnv: DATABASE_URL

    OTEL_EXPORTER_OTLP_ENDPOINT:
      fromEnv: OTEL_EXPORTER_OTLP_ENDPOINT

    OTEL_SERVICE_NAME:
      fromEnv: OTEL_SERVICE_NAME_MY_CONNECTOR
EOF
```

### Step 7: Update Environment Variables

```bash
# Edit .env.local (or .env.dev, etc.)
```

Add:
```bash
# My Custom Connector Configuration
MY_CONNECTOR_PORT=8080
OTEL_SERVICE_NAME_MY_CONNECTOR=my-custom-logic
```

### Step 8: Update Supergraph

```bash
# Edit supergraph.yaml
```

Add your new subgraph:
```yaml
definition:
  name: my-api
  subgraphs:
    - globals
    - database
    - my-logic  # ← Add your new subgraph here
```

### Step 9: Build and Deploy

```bash
# 1. Build the supergraph
ddn supergraph build local

# 2. Verify the build
ls engine/build/
# Should see: auth_config.json, metadata.json, open_dd.json

# 3. Build engine Docker image
./scripts/build-engine.sh v1.0.0

# 4. Deploy to Kubernetes
./scripts/deploy-metadata.sh local v1.0.0
```

### Step 10: Test in GraphQL

```graphql
# Your function is now available as a GraphQL mutation or query
mutation {
  processOrder(orderId: "123", action: "approve") {
    success
    message
    order {
      id
      status
    }
  }
}
```

## Common Customizations

### Adding Database Queries

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getUserData(input: { userId: string }) {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [input.userId]
  );
  return result.rows[0];
}
```

### Adding External API Calls

```typescript
export async function fetchExternalData(input: { endpoint: string }) {
  const response = await fetch(`https://api.example.com/${input.endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return await response.json();
}
```

### Adding Authentication

```typescript
// src/index.ts
app.use((req, res, next) => {
  const authHeader = req.headers['x-hasura-admin-secret'];

  if (authHeader !== process.env.HASURA_ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});
```

### Adding Caching

```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
});

export async function getCachedData(input: { key: string }) {
  // Try cache first
  const cached = await redis.get(input.key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from source
  const data = await fetchFromSource(input.key);

  // Cache for 5 minutes
  await redis.setEx(input.key, 300, JSON.stringify(data));

  return data;
}
```

## Deployment Strategies

### Development

```bash
# Use local development mode
npm run dev
# OR
docker-compose up connector
```

### Staging/Production

1. **Build and push Docker image**:
   ```bash
   docker build -t your-registry/my-connector:v1.0.0 .
   docker push your-registry/my-connector:v1.0.0
   ```

2. **Deploy via CI/CD** (GitHub Actions workflow handles this)

3. **Update Kubernetes deployment**:
   ```yaml
   # kubernetes/connectors/my-connector-deployment.yaml
   spec:
     containers:
       - name: connector
         image: your-registry/my-connector:v1.0.0
   ```

## Troubleshooting

### Issue: "Function not showing in GraphQL"

**Causes**:
1. Function not registered in `src/index.ts`
2. Supergraph not rebuilt
3. Engine not redeployed

**Fix**:
```bash
# Check function is exported and registered
cat src/index.ts | grep myFunction

# Rebuild supergraph
ddn supergraph build local

# Rebuild and redeploy engine
./scripts/build-engine.sh v1.0.1
./scripts/deploy-metadata.sh local v1.0.1
```

### Issue: "Database connection error"

**Fix**:
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify environment variable is passed to connector
kubectl describe pod -l app=my-connector | grep -A10 Env
```

### Issue: "Connector not starting"

**Check logs**:
```bash
# Local
npm run dev

# Kubernetes
kubectl logs -l app=my-connector
```

## Next Steps

1. **Add More Functions**: Create more business logic functions
2. **Add Tests**: Write unit and integration tests
3. **Add Monitoring**: Set up alerts for errors
4. **Optimize Performance**: Add caching, connection pooling
5. **Document**: Add JSDoc comments to your functions

## Resources

- [TypeScript Connector Docs](https://hasura.io/docs/3.0/connectors/typescript/)
- [Business Logic Guide](https://hasura.io/docs/3.0/business-logic/typescript/)
- [Example TypeScript Connector](https://github.com/hasura/ndc-typescript-deno-learn-course)

## Questions?

Need help? Check:
- Main README.md
- Hasura Discord: https://discord.com/invite/hasura
- Hasura Discussions: https://github.com/hasura/graphql-engine/discussions
