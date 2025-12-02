#!/bin/bash
# Restore Normal Environment Script
# This script restores the normal (non-debug) environment

echo "🔧 Restoring normal environment..."

# Check if backup exists
if [ ! -f ".env.backup" ]; then
    echo "❌ .env.backup file not found! Cannot restore."
    exit 1
fi

# Restore env file
echo "📝 Restoring .env from .env.backup"
cp .env.backup .env

# Rebuild supergraph with normal URLs
echo "🔨 Rebuilding supergraph with normal URLs..."
ddn supergraph build local

# Restart all services
echo "🔄 Restarting all services..."
docker compose restart

echo "✅ Normal environment restored!"
echo ""
echo "To debug again, run:"
echo "  ./debug-connector.sh"
