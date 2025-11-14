# Testing Published Docker Images

This guide explains how to test the Docker images published to Docker Hub.

## Quick Test

The easiest way to test the published images:

```bash
cd sample-project-1
./test-images.sh
```

This script will:
1. ✅ Pull all images from Docker Hub
2. ✅ Start all services
3. ✅ Wait for health checks to pass
4. ✅ Test endpoints
5. ✅ Display service status

## Manual Testing

### Option 1: Using the Test Compose File

```bash
cd sample-project-1

# Pull and start services
docker compose -f compose.test.yaml --env-file .env up -d

# View logs
docker compose -f compose.test.yaml logs -f

# Check status
docker compose -f compose.test.yaml ps

# Stop services
docker compose -f compose.test.yaml down
```

### Option 2: Test Individual Images

#### Test Engine Image
```bash
docker pull rickybobbeh/ddn-engine:latest

docker run -p 3280:3000 \
  -e METADATA_PATH=/md/open_dd.json \
  -e AUTHN_CONFIG_PATH=/md/auth_config.json \
  rickybobbeh/ddn-engine:latest

# In another terminal:
curl http://localhost:3280/health
```

#### Test Connector Image
```bash
docker pull rickybobbeh/ddn-connector-1:latest

docker run -p 5637:8080 \
  -e CONNECTION_URI="your-postgres-connection-string" \
  -e HASURA_SERVICE_TOKEN_SECRET="your-token" \
  rickybobbeh/ddn-connector-1:latest

# In another terminal:
curl http://localhost:5637/health
```

## What Gets Tested

The test script verifies:

### Image Pull
- ✅ `rickybobbeh/ddn-engine:latest`
- ✅ `rickybobbeh/ddn-connector-1:latest`
- ✅ `rickybobbeh/ddn-connector-2:latest`
- ✅ `rickybobbeh/ddn-connector-3:latest`

### Service Health
All services must pass Docker health checks:
- Engine (port 3280)
- Connector 1 (port 5637)
- Connector 2 (port 5638)
- Connector 3 (port 5639)
- OTEL Collector (ports 4317, 4318)

### Endpoint Tests
- `/health` endpoint responds
- `/graphql` endpoint is accessible

## Test Different Versions

Test a specific version tag:

```bash
# Test version v1.0.0
./test-images.sh v1.0.0

# Or with docker compose
TAG=v1.0.0 docker compose -f compose.test.yaml up -d
```

## Troubleshooting

### Images Won't Pull
```bash
# Verify you can reach Docker Hub
docker pull hello-world

# Check if images exist
docker search rickybobbeh/ddn-engine

# Login if needed (for private images)
docker login
```

### Services Fail Health Checks

**Check logs:**
```bash
docker compose -f compose.test.yaml logs engine
docker compose -f compose.test.yaml logs app_neon_postgres_1
```

**Common issues:**
- Missing `.env` file → Copy from `.env.example`
- Wrong environment variables → Check `.env` values
- Database connection fails → Verify `CONNECTION_URI`
- Port conflicts → Check if ports 3280, 5637-5639 are available

### Port Already in Use

If ports are in use:
```bash
# Stop regular development stack first
docker compose down

# Or change ports in .env
export ENGINE_PORT=3281
docker compose -f compose.test.yaml up -d
```

## Continuous Testing

### In CI/CD

Add this to your GitHub Actions workflow:

```yaml
- name: Test published images
  run: |
    cd sample-project-1
    ./test-images.sh
```

### Automated Testing Script

Create a cron job to test daily:

```bash
# Add to crontab (crontab -e)
0 2 * * * cd /path/to/sample-project-1 && ./test-images.sh >> test.log 2>&1
```

## Comparison: Build vs Pull

### Development (Build from Source)
```bash
# Uses local source code and builds images
docker compose up --build
```

### Testing/Production (Pull from Docker Hub)
```bash
# Uses pre-built images from registry
docker compose -f compose.test.yaml up
```

## Integration Testing

After services are running, test your GraphQL API:

```bash
# Test a simple query
curl -X POST http://localhost:3280/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { __typename }"
  }'

# Or use the GraphQL Console
open http://localhost:3280/console
```

## Production Deployment Testing

Before deploying to production:

1. **Test latest tag locally:**
   ```bash
   ./test-images.sh latest
   ```

2. **Test specific version:**
   ```bash
   ./test-images.sh v1.0.0
   ```

3. **Run for 24 hours:**
   ```bash
   docker compose -f compose.test.yaml up -d
   # Monitor for 24 hours
   docker compose -f compose.test.yaml logs --tail=100 -f
   ```

4. **Check resource usage:**
   ```bash
   docker stats
   ```

5. **Verify all endpoints work:**
   - GraphQL queries
   - Mutations
   - Subscriptions (if applicable)

## Cleanup

```bash
# Stop and remove containers
docker compose -f compose.test.yaml down

# Remove volumes (if any)
docker compose -f compose.test.yaml down -v

# Remove downloaded images
docker rmi rickybobbeh/ddn-engine:latest
docker rmi rickybobbeh/ddn-connector-1:latest
docker rmi rickybobbeh/ddn-connector-2:latest
docker rmi rickybobbeh/ddn-connector-3:latest
```

## Success Criteria

All tests pass when:
- ✅ All images pull successfully from Docker Hub
- ✅ All containers start without errors
- ✅ All health checks pass within 60 seconds
- ✅ Engine `/health` endpoint returns 200
- ✅ Engine `/graphql` endpoint is accessible
- ✅ Services can communicate with each other
- ✅ No error messages in logs

## Next Steps

After successful testing:
- Deploy to staging environment
- Run integration tests
- Deploy to production
- Set up monitoring and alerts
