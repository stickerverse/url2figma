#!/bin/bash
# Quick test import script
# Usage: ./test-import.sh

echo "🧪 Testing Figma Plugin Import"
echo "================================"
echo ""
echo "📤 Sending test JSON to handoff server..."

RESPONSE=$(curl -s -X POST http://127.0.0.1:4411/jobs \
  -H "Content-Type: application/json" \
  -d @test-figma-plugin.json)

if echo "$RESPONSE" | grep -q "ok"; then
  JOB_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  QUEUE=$(echo "$RESPONSE" | grep -o '"queueLength":[0-9]*' | cut -d':' -f2)

  echo "✅ Test data sent successfully!"
  echo "   Job ID: $JOB_ID"
  echo "   Queue Length: $QUEUE"
  echo ""
  echo "🎨 Open your Figma plugin and watch for auto-import!"
  echo "   The import should start automatically in ~2.5 seconds"
  echo ""
  echo "📋 What you should see:"
  echo "   - Page: 'Test Page - Basic Components'"
  echo "   - Header with blue background"
  echo "   - Hero section with gradient"
  echo "   - 3 feature cards with Auto Layout"
  echo ""
else
  echo "❌ Failed to send test data"
  echo "Response: $RESPONSE"
  exit 1
fi
