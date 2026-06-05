#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://matchday-surge-agent-54292544314.us-central1.run.app}"

echo "== Matchday Surge Agent smoke test =="
echo "App URL: $APP_URL"
echo

echo "1) Health check"
curl -s "$APP_URL/api/health" | grep -E '"ok":true|"platform":"Google Cloud Run"|"server":"matchday-surge-mongodb-mcp"|"tool":"load_matchday_context"|"mode":"gemini_live"'
echo

echo "2) Seed MongoDB demo data"
curl -s -X POST "$APP_URL/api/seed" | grep -E '"ok":true|"source":"mongodb"|"message"'
echo

echo "3) Load selected scenario"
curl -s "$APP_URL/api/scenario?businessId=la_market_001" | grep -E '"ok":true|"selectedBusinessId":"la_market_001"|"name":"Pico Market"|"scenarioId":"wc2026_market_stockout"'
echo

echo "4) Generate agent plan through MongoDB MCP + Gemini"
curl -s -X POST "$APP_URL/api/agent/generate-plan" \
  -H "Content-Type: application/json" \
  -d '{"businessId":"la_parking_001"}' \
  | grep -E '"mode":"gemini_live"|"database":"mongodb_mcp"|"enabled":true|"server":"matchday-surge-mongodb-mcp"|"tool":"load_matchday_context"|"name":"Metro Lot Crew"'
echo

echo "5) Approve latest pending brief"
curl -s -X POST "$APP_URL/api/approval/finalize-plan" \
  -H "Content-Type: application/json" \
  -d '{"businessId":"la_parking_001"}' \
  | grep -E '"ok":true|"source":"mongodb"|"approvedBy":"business_owner"|"status":"approved"'
echo

echo "Smoke test passed."
