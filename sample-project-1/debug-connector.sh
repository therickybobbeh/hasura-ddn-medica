#!/bin/bash
# Debug Connector Helper Script
# This script helps you debug a connector locally while the engine runs in Docker

echo "🔧 Setting up debug environment..."

# Check if .env.debug exists
if [ ! -f ".env.debug" ]; then
    echo "❌ .env.debug file not found!"
    exit 1
fi

# Swap env files
echo "📝 Backing up .env to .env.backup"
cp .env .env.backup

echo "📝 Using .env.debug"
cp .env.debug .env

# Stop the connector container
echo "🛑 Stopping Go connector container..."
docker compose stop app_go_buisness_logic_1

# Rebuild supergraph with debug URLs
echo "🔨 Rebuilding supergraph with debug URLs..."
ddn supergraph build local

# Restart engine
echo "🔄 Restarting engine..."
docker compose restart engine

echo "✅ Debug environment ready!"
echo ""
echo "Next steps:"
echo "  1. Start your local Go connector in VS Code debugger (port 8080)"
echo "  2. Set breakpoints in your code"
echo "  3. Run queries through Hasura console"
echo ""
echo "To restore normal environment, run:"
echo "  ./restore-normal.sh"
