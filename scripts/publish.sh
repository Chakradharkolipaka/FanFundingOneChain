#!/usr/bin/env bash
# Publish the Move contracts to OneChain
# Requires: sui CLI installed and configured for OneChain

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
CONTRACT_DIR="$PROJECT_DIR/contracts/fan_funding"

echo "📦 Building Move contracts..."
cd "$CONTRACT_DIR"
sui move build

echo ""
echo "🚀 Publishing to OneChain..."
RESULT=$(sui client publish --gas-budget 100000000 --json)

echo "$RESULT" | head -50

PACKAGE_ID=$(echo "$RESULT" | grep -o '"packageId":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "════════════════════════════════════════════"
echo "✅ Package published!"
echo "📦 PACKAGE_ID: $PACKAGE_ID"
echo ""
echo "Now find the Registry object ID from the transaction output above"
echo "and update your .env.local file:"
echo ""
echo "  NEXT_PUBLIC_PACKAGE_ID=$PACKAGE_ID"
echo "  NEXT_PUBLIC_REGISTRY_ID=<registry_object_id>"
echo "════════════════════════════════════════════"
