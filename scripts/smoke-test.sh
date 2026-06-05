#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://matchday-surge-agent-54292544314.us-central1.run.app}"

echo "== Matchday Surge Agent smoke test =="
echo "App URL: $APP_URL"
echo

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

assert_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if grep -q "$pattern" "$file"; then
    echo "PASS $label"
  else
    echo "FAIL $label"
    echo "Expected pattern: $pattern"
    echo "Response:"
    cat "$file"
    exit 1
  fi
}

echo "1) Health check"
curl -s "$APP_URL/api/health" > "$tmp_dir/health.json"

assert_contains "$tmp_dir/health.json" '"ok":true' "health ok"
assert_contains "$tmp_dir/health.json" '"platform":"Google Cloud Run"' "Cloud Run deployment"
assert_contains "$tmp_dir/health.json" '"server":"matchday-surge-mongodb-mcp"' "MongoDB MCP server"
assert_contains "$tmp_dir/health.json" '"tool":"load_matchday_context"' "MCP tool"
assert_contains "$tmp_dir/health.json" '"mode":"gemini_live"' "Gemini live mode"
echo

echo "2) Seed MongoDB demo data"
curl -s -X POST "$APP_URL/api/seed" > "$tmp_dir/seed.json"

assert_contains "$tmp_dir/seed.json" '"ok":true' "seed ok"
assert_contains "$tmp_dir/seed.json" '"source":"mongodb"' "MongoDB seed source"
assert_contains "$tmp_dir/seed.json" '"la_restaurant_001"' "restaurant profile seeded"
assert_contains "$tmp_dir/seed.json" '"la_market_001"' "market profile seeded"
assert_contains "$tmp_dir/seed.json" '"la_parking_001"' "parking profile seeded"
echo

echo "3) Load selected scenario"
curl -s "$APP_URL/api/scenario?businessId=la_market_001" > "$tmp_dir/scenario.json"

assert_contains "$tmp_dir/scenario.json" '"ok":true' "scenario ok"
assert_contains "$tmp_dir/scenario.json" '"selectedBusinessId":"la_market_001"' "selected business"
assert_contains "$tmp_dir/scenario.json" '"name":"Pico Market"' "Pico Market loaded"
assert_contains "$tmp_dir/scenario.json" '"scenarioId":"wc2026_market_stockout"' "market scenario loaded"
echo

echo "4) Generate agent plan through MongoDB MCP + Gemini"
curl -s -X POST "$APP_URL/api/agent/generate-plan" \
  -H "Content-Type: application/json" \
  -d '{"businessId":"la_parking_001"}' > "$tmp_dir/generate.json"

assert_contains "$tmp_dir/generate.json" '"ok":true' "generate ok"
assert_contains "$tmp_dir/generate.json" '"mode":"gemini_live"' "Gemini live generation"
assert_contains "$tmp_dir/generate.json" '"database":"mongodb_mcp"' "MongoDB MCP context source"
assert_contains "$tmp_dir/generate.json" '"server":"matchday-surge-mongodb-mcp"' "MCP server proof"
assert_contains "$tmp_dir/generate.json" '"tool":"load_matchday_context"' "MCP context tool proof"
assert_contains "$tmp_dir/generate.json" '"name":"Metro Lot Crew"' "parking profile generated"
assert_contains "$tmp_dir/generate.json" '"tool":"Gemini on Google Cloud"' "Gemini tool proof"
echo

echo "5) Approve latest pending brief"
curl -s -X POST "$APP_URL/api/approval/finalize-plan" \
  -H "Content-Type: application/json" \
  -d '{"businessId":"la_parking_001"}' > "$tmp_dir/approve.json"

assert_contains "$tmp_dir/approve.json" '"ok":true' "approval ok"
assert_contains "$tmp_dir/approve.json" '"source":"mongodb"' "approval saved to MongoDB"
assert_contains "$tmp_dir/approve.json" '"approvedBy":"business_owner"' "owner approval"
assert_contains "$tmp_dir/approve.json" '"status":"approved"' "approved status"
assert_contains "$tmp_dir/approve.json" '"finalBrief"' "final brief returned"
echo

echo "Smoke test passed."
