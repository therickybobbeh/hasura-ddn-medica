# TypeScript Custom Connector Example

This is a complete, working example of a custom TypeScript connector for Hasura DDN v3.

## What is a Custom Connector?

A custom connector lets you expose **custom business logic** as GraphQL operations. Use this when you need:
- Complex calculations or data transformations
- Integration with third-party APIs
- Business rules that go beyond database queries
- Custom authentication or authorization logic
- Data aggregation from multiple sources

## What's Included

```
typescript-connector/
├── README.md          # This file
├── HOW_TO_USE.md      # Step-by-step guide to add to your project
├── Dockerfile         # Production-ready Docker image
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── src/
│   ├── index.ts       # Main server (HTTP endpoint for NDC)
│   ├── telemetry.ts   # OpenTelemetry setup
│   └── functions/
│       ├── hello.ts   # Simple example: Hello World
│       ├── calculator.ts  # Math operations example
│       └── database-query.ts  # Database interaction example
└── tests/
    └── functions.test.ts  # Unit tests
```

## Example Functions

### 1. `hello` - Simple Function
**What it does**: Takes a name and returns a greeting
**Use case**: Understanding basic function structure
**Code**: See `src/functions/hello.ts`

```typescript
// Input
{ name: "Alice" }

// Output
{ message: "Hello, Alice!" }
```

### 2. `calculator` - Pure Logic
**What it does**: Performs arithmetic operations
**Use case**: Business calculations without database
**Code**: See `src/functions/calculator.ts`

```typescript
// Input
{ operation: "add", a: 5, b: 3 }

// Output
{ result: 8 }
```

### 3. `enrichUserData` - Database Integration
**What it does**: Fetches user data and enriches it
**Use case**: Combining database data with external APIs
**Code**: See `src/functions/database-query.ts`

```typescript
// Input
{ userId: "uuid-here" }

// Output
{
  user: { id, name, email },
  enrichedData: { ... }
}
```

## Quick Start

### 1. Install Dependencies

```bash
cd examples/typescript-connector
npm install
```

### 2. Set Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
DATABASE_URL=postgresql://...
PORT=8080
```

### 3. Run Locally

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

### 4. Test the Functions

```bash
# Run unit tests
npm test

# Manual test via curl
curl -X POST http://localhost:8080/functions/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

## How It Works

### Architecture

```
GraphQL Query → Hasura Engine → TypeScript Connector → Your Function → Response
```

1. User makes GraphQL query
2. Hasura engine routes to TypeScript connector
3. Connector executes your TypeScript function
4. Function returns typed result
5. Hasura returns GraphQL response

### NDC Protocol

This connector implements the [Native Data Connector (NDC)](https://hasura.io/docs/3.0/connectors/introduction/) protocol:
- HTTP server on port 8080
- `/schema` endpoint for introspection
- `/query` endpoint for execution
- `/health` endpoint for health checks

### OpenTelemetry Integration

All functions are automatically traced:
- Request duration
- Function name
- Input parameters (sanitized)
- Error tracking

See telemetry data in:
- Hasura DDN Console
- Your OTEL collector
- Dynatrace (if enabled)

## Customization Guide

### Adding Your Own Function

1. **Create function file**:
   ```bash
   touch src/functions/my-function.ts
   ```

2. **Define types and function**:
   ```typescript
   // src/functions/my-function.ts
   export interface MyFunctionInput {
     userId: string;
     action: string;
   }

   export interface MyFunctionOutput {
     success: boolean;
     message: string;
   }

   export async function myFunction(
     input: MyFunctionInput
   ): Promise<MyFunctionOutput> {
     // Your logic here
     return {
       success: true,
       message: `Processed ${input.action} for ${input.userId}`
     };
   }
   ```

3. **Register in index.ts**:
   ```typescript
   // src/index.ts
   import { myFunction } from './functions/my-function';

   // Add to function map
   const functions = {
     hello,
     calculator,
     myFunction,  // ← Add here
   };
   ```

4. **Build and deploy**:
   ```bash
   docker build -t your-registry/typescript-connector:v1.0.0 .
   docker push your-registry/typescript-connector:v1.0.0
   ```

### Connecting to Databases

See `src/functions/database-query.ts` for examples using:
- PostgreSQL (pg)
- Prisma ORM
- TypeORM

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function queryDatabase(input: any) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [input.userId]);
  return result.rows[0];
}
```

### Calling External APIs

```typescript
export async function callExternalAPI(input: { endpoint: string }) {
  const response = await fetch(`https://api.example.com/${input.endpoint}`);
  const data = await response.json();
  return data;
}
```

### Error Handling

```typescript
export async function robustFunction(input: any) {
  try {
    // Your logic
    return { success: true };
  } catch (error) {
    console.error('Function error:', error);
    throw new Error(`Failed to process: ${error.message}`);
  }
}
```

## Deployment

### Build Docker Image

```bash
# From this directory
docker build -t your-registry/typescript-connector:v1.0.0 .
```

### Push to Registry

```bash
docker push your-registry/typescript-connector:v1.0.0
```

### Deploy to Kubernetes

Update your connector configuration:
```yaml
# subgraphs/my-logic/connector/my-connector/connector.yaml
kind: Connector
version: v2
definition:
  name: my_connector
  source:
    hasuraHubConnector:
      connectorId: hasura/nodejs
      version: v1.0.0
  # Point to your custom image
  deploy:
    image: your-registry/typescript-connector:v1.0.0
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start connector
npm run dev

# Run integration tests
npm run test:integration
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8080/functions/calculator
```

## Performance Tips

1. **Use Connection Pooling**: For databases, use connection pools (pg.Pool, not pg.Client)
2. **Cache Results**: Use Redis or in-memory cache for frequently accessed data
3. **Async/Await**: Keep functions async for better performance
4. **Limit External Calls**: Batch API requests when possible
5. **Monitor**: Use OpenTelemetry to find bottlenecks

## Troubleshooting

### "Cannot find module"
**Fix**: Run `npm install`

### "Port already in use"
**Fix**: Change PORT in .env or kill the process on port 8080

### "Database connection failed"
**Fix**: Check DATABASE_URL in .env is correct and database is accessible

### "Function not found in GraphQL"
**Fix**:
1. Rebuild connector Docker image
2. Update connector.yaml in your subgraph
3. Run `ddn supergraph build local`
4. Redeploy engine

## Further Reading

**Official Docs**:
- [TypeScript Connector](https://hasura.io/docs/3.0/connectors/typescript/)
- [Business Logic](https://hasura.io/docs/3.0/business-logic/typescript/)
- [NDC Specification](https://hasura.io/docs/3.0/connectors/ndc-spec/)

**Examples**:
- [TypeScript Learn Course](https://github.com/hasura/ndc-typescript-learn-course)
- [DDN Sample App](https://github.com/hasura/ddn-sample-app)

## Questions?

- How do I add authentication? See `src/index.ts` middleware section
- How do I call another GraphQL API? Use `fetch` or `graphql-request`
- Can I use external npm packages? Yes! Add to package.json
- How do I debug? Use `console.log` or attach VS Code debugger

Need more help? Ask in [Hasura Discord](https://discord.com/invite/hasura)
