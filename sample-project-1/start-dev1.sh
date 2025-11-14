#!/bin/bash
# Developer 1 - Start Hasura DDN Services

cd ~/hasura-ddn-poc/sample-project-1

echo "Building metadata..."
ddn supergraph build local --supergraph ./supergraph.yaml --env-file .env.dev1 --output-dir ./engine/build

echo "Stopping any existing containers..."
docker compose down

echo "Starting services..."
docker compose --env-file .env.dev1 up -d

echo ""
echo "✅ Hasura DDN services started for Developer 1"
echo ""
echo "GraphQL API:"
echo "  Local:    http://localhost:3280/graphql"
echo "  External: https://graphql-dev1.bob-cole.com/graphql"
echo ""
echo "View logs: docker compose logs -f"
echo "Stop:      docker compose down"
