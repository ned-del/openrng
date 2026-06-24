#!/bin/bash
# Live integration test for VEO-1 endpoints
set -e

PORT=3099
export PORT=$PORT

echo "=== Starting OpenRNG server on port $PORT ==="
cd ~/openrng
node dist/index.js &
SERVER_PID=$!
sleep 4

cleanup() {
  echo ""
  echo "=== Stopping server (PID $SERVER_PID) ==="
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

BASE="http://localhost:$PORT"

echo ""
echo "=== TEST 1: GET /v2/entropy (no policy) ==="
VEO=$(curl -sf "$BASE/v2/entropy" || echo "CURL_FAIL")
if [ "$VEO" = "CURL_FAIL" ]; then echo "❌ FAIL: could not reach /v2/entropy"; exit 1; fi
echo "$VEO" | jq .
echo ""

# Check required fields
STANDARD=$(echo "$VEO" | jq -r '.standard')
VERSION=$(echo "$VEO" | jq -r '.version')
OBJ_CLASS=$(echo "$VEO" | jq -r '.object_class')
ENTROPY=$(echo "$VEO" | jq -r '.entropy')
HASH=$(echo "$VEO" | jq -r '.entropy_hash')
SCORE=$(echo "$VEO" | jq -r '.confidence.score')
GRADE=$(echo "$VEO" | jq -r '.confidence.grade')
SOURCES=$(echo "$VEO" | jq '.sources | length')

echo "--- Validation ---"
echo "Standard: $STANDARD (expect VEO-1)"
echo "Version: $VERSION (expect 1.0)"
echo "Object Class: $OBJ_CLASS (expect VEO-1B)"
echo "Entropy: ${ENTROPY:0:20}..."
echo "Hash: ${HASH:0:20}..."
echo "ECS Score: $SCORE"
echo "Grade: $GRADE"
echo "Sources: $SOURCES (expect 3)"

if [ "$STANDARD" != "VEO-1" ]; then echo "❌ FAIL: standard"; exit 1; fi
if [ "$VERSION" != "1.0" ]; then echo "❌ FAIL: version"; exit 1; fi
if [ "$SOURCES" -lt 1 ]; then echo "❌ FAIL: no sources"; exit 1; fi
echo "✅ Basic structure valid"

echo ""
echo "=== TEST 2: POST /v2/entropy/verify (verify the object we just got) ==="
VERIFY=$(curl -sf -X POST "$BASE/v2/entropy/verify" \
  -H "Content-Type: application/json" \
  -d "{\"entropy_object\": $VEO}")
echo "$VERIFY" | jq .

VALID=$(echo "$VERIFY" | jq -r '.valid')
HASH_CHECK=$(echo "$VERIFY" | jq -r '.checks.hash')
SCHEMA_CHECK=$(echo "$VERIFY" | jq -r '.checks.schema')
echo "Valid: $VALID | Hash: $HASH_CHECK | Schema: $SCHEMA_CHECK"

if [ "$VALID" != "true" ]; then echo "❌ FAIL: verification failed"; exit 1; fi
echo "✅ Verification passed"

echo ""
echo "=== TEST 3: GET /v2/entropy?policy=ai-grade ==="
AI_VEO=$(curl -sf "$BASE/v2/entropy?policy=ai-grade")
AI_SCORE=$(echo "$AI_VEO" | jq -r '.confidence.score')
AI_POLICY=$(echo "$AI_VEO" | jq -r '.policy.policy_name')
echo "AI-grade — Score: $AI_SCORE, Policy: $AI_POLICY"
if [ "$AI_POLICY" != "ai-grade" ]; then echo "❌ FAIL: policy not set"; exit 1; fi
echo "✅ Policy preset works"

echo ""
echo "=== TEST 4: GET /v2/entropy?policy=gaming-grade ==="
GAMING_VEO=$(curl -sf "$BASE/v2/entropy?policy=gaming-grade")
GAMING_CLASS=$(echo "$GAMING_VEO" | jq -r '.object_class')
echo "Gaming-grade — Class: $GAMING_CLASS (expect VEO-1C since anchor_required=true)"
if [ "$GAMING_CLASS" != "VEO-1C" ]; then echo "❌ FAIL: expected VEO-1C"; exit 1; fi
echo "✅ Anchor-required sets VEO-1C"

echo ""
echo "=== TEST 5: Verify tampered object (should fail) ==="
TAMPERED=$(echo "$VEO" | jq '.entropy = "0xdeadbeef"')
TAMPER_RESULT=$(curl -s -X POST "$BASE/v2/entropy/verify" \
  -H "Content-Type: application/json" \
  -d "{\"entropy_object\": $TAMPERED}")
TAMPER_VALID=$(echo "$TAMPER_RESULT" | jq -r '.valid')
TAMPER_ERRORS=$(echo "$TAMPER_RESULT" | jq -r '.errors[]')
echo "Tampered valid: $TAMPER_VALID (expect false)"
echo "Errors: $TAMPER_ERRORS"
if [ "$TAMPER_VALID" != "false" ]; then echo "❌ FAIL: tampered should fail"; exit 1; fi
echo "✅ Tamper detection works"

echo ""
echo "=== TEST 6: Check source references (are they real?) ==="
SRC1_ID=$(echo "$VEO" | jq -r '.sources[0].source_id')
SRC1_REF=$(echo "$VEO" | jq -r '.sources[0].source_reference')
SRC2_ID=$(echo "$VEO" | jq -r '.sources[1].source_id')
SRC2_REF=$(echo "$VEO" | jq -r '.sources[1].source_reference')
SRC3_ID=$(echo "$VEO" | jq -r '.sources[2].source_id')
SRC3_REF=$(echo "$VEO" | jq -r '.sources[2].source_reference')

REAL_SOURCES=0
echo "$SRC1_ID: $SRC1_REF"
[[ "$SRC1_REF" == drand-round-* ]] && REAL_SOURCES=$((REAL_SOURCES+1)) && echo "  ✅ LIVE"
[[ "$SRC1_REF" == fallback-* ]] && echo "  ⚠️ fallback"

echo "$SRC2_ID: $SRC2_REF"
[[ "$SRC2_REF" == block-* ]] && REAL_SOURCES=$((REAL_SOURCES+1)) && echo "  ✅ LIVE"
[[ "$SRC2_REF" == fallback-* ]] && echo "  ⚠️ fallback"

echo "$SRC3_ID: $SRC3_REF"
[[ "$SRC3_REF" == block-* ]] && REAL_SOURCES=$((REAL_SOURCES+1)) && echo "  ✅ LIVE"
[[ "$SRC3_REF" == fallback-* ]] && echo "  ⚠️ fallback"
echo "Live sources: $REAL_SOURCES/3"

echo ""
echo "=== TEST 7: v1 API still works ==="
HEALTH=$(curl -sf "$BASE/v1/health")
V1_STATUS=$(echo "$HEALTH" | jq -r '.status')
echo "v1 health: $V1_STATUS"
if [ "$V1_STATUS" != "ok" ] && [ "$V1_STATUS" != "degraded" ]; then echo "❌ FAIL: v1 broken"; exit 1; fi
echo "✅ v1 API intact"

echo ""
echo "=== TEST 8: All 5 policy presets ==="
for POLICY in simulation-grade ai-grade gaming-grade casino-grade enterprise-grade; do
  P_VEO=$(curl -sf "$BASE/v2/entropy?policy=$POLICY")
  P_SCORE=$(echo "$P_VEO" | jq -r '.confidence.score')
  P_GRADE=$(echo "$P_VEO" | jq -r '.confidence.grade')
  P_NAME=$(echo "$P_VEO" | jq -r '.policy.policy_name')
  echo "  $POLICY → ECS=$P_SCORE ($P_GRADE) policy=$P_NAME"
done
echo "✅ All presets return"

echo ""
echo "════════════════════════════════════════"
echo "  ALL TESTS PASSED ✅"
echo "  Live sources: $REAL_SOURCES/3"
echo "════════════════════════════════════════"
