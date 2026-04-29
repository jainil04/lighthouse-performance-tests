#!/usr/bin/env bash
# verify-alerts.sh — sanity checks for the Phase 3 alerts slice.
#
# Covers:
#   1. Vercel function count (must be ≤12 for Hobby plan)
#   2. Auth required on /api/alerts endpoints
#   3. Soft-delete round trip: create → delete → recreate same (target_id, metric)
#
# Does NOT cover (manual): worker path with dev stub, idempotency.
#
# Requires:
#   - vercel dev running on http://localhost:3000
#   - jq installed
#   - A valid signup endpoint at POST /api/auth/signup
#   - A valid target row owned by the test user (script creates one via an audit)
#
# Set BASE_URL to override the default.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0

# ANSI colors — disable if not a tty
if [ -t 1 ]; then
  GREEN=$'\033[0;32m'
  RED=$'\033[0;31m'
  YELLOW=$'\033[0;33m'
  RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; RESET=""
fi

pass() { echo "${GREEN}✓${RESET} $1"; PASS=$((PASS+1)); }
fail() { echo "${RED}✗${RESET} $1"; FAIL=$((FAIL+1)); }
info() { echo "${YELLOW}…${RESET} $1"; }

# ---------------------------------------------------------------------------
# 1. Function count
# ---------------------------------------------------------------------------
echo
echo "── 1. Vercel function count ────────────────────────────────────────"

# Count files matching the vercel.json glob: api/{*.js,auth/*.js}
COUNT=$( { ls api/*.js 2>/dev/null; ls api/auth/*.js 2>/dev/null; } | wc -l | tr -d ' ')

info "Found $COUNT function files matching api/{*.js,auth/*.js}"

if [ "$COUNT" -le 12 ]; then
  pass "Function count is $COUNT (Hobby plan limit: 12)"
else
  fail "Function count is $COUNT — exceeds Hobby plan limit of 12"
  echo "    Files:"
  { ls api/*.js 2>/dev/null; ls api/auth/*.js 2>/dev/null; } | sed 's/^/      /'
fi

# ---------------------------------------------------------------------------
# Preflight: server reachable?
# ---------------------------------------------------------------------------
echo
echo "── Preflight ───────────────────────────────────────────────────────"

if ! curl -fsS -o /dev/null --max-time 5 "$BASE_URL" 2>/dev/null; then
  # Some deploys 404 the root — try /api/history with no auth, expect 401
  if ! curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "$BASE_URL/api/history" 2>/dev/null | grep -qE '^(401|404)$'; then
    fail "Cannot reach $BASE_URL — is \`vercel dev\` running?"
    echo
    echo "Summary: $PASS passed, $FAIL failed"
    exit 1
  fi
fi
pass "Server reachable at $BASE_URL"

# ---------------------------------------------------------------------------
# 2. Auth required on /api/alerts
# ---------------------------------------------------------------------------
echo
echo "── 2. Auth required on /api/alerts ─────────────────────────────────"

# GET without token → expect 401
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/alerts")
if [ "$CODE" = "401" ]; then
  pass "GET /api/alerts (no token) → 401"
else
  fail "GET /api/alerts (no token) → $CODE (expected 401)"
fi

# POST without token → expect 401
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  -H "Content-Type: application/json" \
  -d '{"target_id":"00000000-0000-0000-0000-000000000000","metric":"performance","threshold":70,"comparison":"below"}' \
  "$BASE_URL/api/alerts")
if [ "$CODE" = "401" ]; then
  pass "POST /api/alerts (no token) → 401"
else
  fail "POST /api/alerts (no token) → $CODE (expected 401)"
fi

# PATCH without token → expect 401
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}' \
  "$BASE_URL/api/alerts/00000000-0000-0000-0000-000000000000")
if [ "$CODE" = "401" ]; then
  pass "PATCH /api/alerts/:id (no token) → 401"
else
  fail "PATCH /api/alerts/:id (no token) → $CODE (expected 401)"
fi

# DELETE without token → expect 401
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE \
  "$BASE_URL/api/alerts/00000000-0000-0000-0000-000000000000")
if [ "$CODE" = "401" ]; then
  pass "DELETE /api/alerts/:id (no token) → 401"
else
  fail "DELETE /api/alerts/:id (no token) → $CODE (expected 401)"
fi

# Bogus token → expect 401
CODE=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer not-a-real-token" \
  "$BASE_URL/api/alerts")
if [ "$CODE" = "401" ]; then
  pass "GET /api/alerts (invalid token) → 401"
else
  fail "GET /api/alerts (invalid token) → $CODE (expected 401)"
fi

# ---------------------------------------------------------------------------
# 3. Soft-delete round trip
# ---------------------------------------------------------------------------
echo
echo "── 3. Soft-delete round trip ───────────────────────────────────────"

if [ -z "${TEST_TOKEN:-}" ] || [ -z "${TEST_TARGET_ID:-}" ]; then
  info "Skipping round-trip test — set TEST_TOKEN and TEST_TARGET_ID to run it."
  info "  TEST_TOKEN: a valid JWT for an existing user"
  info "  TEST_TARGET_ID: a target row id owned by that user"
  info "  Get these by signing up + running one audit, then querying:"
  info "    SELECT id FROM targets WHERE user_id = '<your-user-id>' LIMIT 1;"
else
  AUTH_HEADER="Authorization: Bearer $TEST_TOKEN"

  # Step 3a: Clean up any pre-existing config for this (target, metric)
  info "Cleaning up any stale alert config for performance/this-target…"
  EXISTING=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/alerts?target_id=$TEST_TARGET_ID" \
    | jq -r '.[]? | select(.metric=="performance") | .id' 2>/dev/null || echo "")
  for id in $EXISTING; do
    curl -s -o /dev/null -X DELETE -H "$AUTH_HEADER" "$BASE_URL/api/alerts/$id"
  done

  # Step 3b: Create the first config
  RESP=$(curl -s -w '\n%{http_code}' -X POST \
    -H "Content-Type: application/json" -H "$AUTH_HEADER" \
    -d "{\"target_id\":\"$TEST_TARGET_ID\",\"metric\":\"performance\",\"threshold\":70,\"comparison\":\"below\"}" \
    "$BASE_URL/api/alerts")
  CODE=$(echo "$RESP" | tail -n 1)
  BODY=$(echo "$RESP" | sed '$d')

  if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
    FIRST_ID=$(echo "$BODY" | jq -r '.id // .alert.id // empty')
    if [ -n "$FIRST_ID" ]; then
      pass "POST /api/alerts (create #1) → $CODE, id=$FIRST_ID"
    else
      fail "POST /api/alerts (create #1) → $CODE but no id in response: $BODY"
      echo
      echo "Summary: $PASS passed, $FAIL failed"
      exit 1
    fi
  else
    fail "POST /api/alerts (create #1) → $CODE: $BODY"
    echo
    echo "Summary: $PASS passed, $FAIL failed"
    exit 1
  fi

  # Step 3c: Try creating the same config again — must 409 (UNIQUE active)
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    -H "Content-Type: application/json" -H "$AUTH_HEADER" \
    -d "{\"target_id\":\"$TEST_TARGET_ID\",\"metric\":\"performance\",\"threshold\":80,\"comparison\":\"below\"}" \
    "$BASE_URL/api/alerts")
  if [ "$CODE" = "409" ]; then
    pass "POST duplicate (target_id, metric) while active → 409"
  else
    fail "POST duplicate (target_id, metric) while active → $CODE (expected 409)"
  fi

  # Step 3d: Soft-delete the first config
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE \
    -H "$AUTH_HEADER" "$BASE_URL/api/alerts/$FIRST_ID")
  if [ "$CODE" = "200" ] || [ "$CODE" = "204" ]; then
    pass "DELETE /api/alerts/$FIRST_ID → $CODE"
  else
    fail "DELETE /api/alerts/$FIRST_ID → $CODE (expected 200 or 204)"
  fi

  # Step 3e: GET should not return the soft-deleted config
  COUNT=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/alerts?target_id=$TEST_TARGET_ID" \
    | jq "[.[]? | select(.id==\"$FIRST_ID\")] | length")
  if [ "$COUNT" = "0" ]; then
    pass "GET /api/alerts excludes the soft-deleted row"
  else
    fail "GET /api/alerts still returns the soft-deleted row (count=$COUNT)"
  fi

  # Step 3f: Recreate the same (target_id, metric) — must succeed
  RESP=$(curl -s -w '\n%{http_code}' -X POST \
    -H "Content-Type: application/json" -H "$AUTH_HEADER" \
    -d "{\"target_id\":\"$TEST_TARGET_ID\",\"metric\":\"performance\",\"threshold\":75,\"comparison\":\"below\"}" \
    "$BASE_URL/api/alerts")
  CODE=$(echo "$RESP" | tail -n 1)
  BODY=$(echo "$RESP" | sed '$d')

  if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
    SECOND_ID=$(echo "$BODY" | jq -r '.id // .alert.id // empty')
    pass "POST /api/alerts (recreate after soft-delete) → $CODE, id=$SECOND_ID"
    if [ -n "$SECOND_ID" ] && [ "$SECOND_ID" != "$FIRST_ID" ]; then
      pass "Recreated config has a new id ($SECOND_ID ≠ $FIRST_ID)"
    fi

    # Cleanup: soft-delete the test config so reruns are idempotent
    curl -s -o /dev/null -X DELETE -H "$AUTH_HEADER" "$BASE_URL/api/alerts/$SECOND_ID"
    info "Cleaned up test config $SECOND_ID"
  else
    fail "POST /api/alerts (recreate after soft-delete) → $CODE: $BODY"
    info "If this is 409, the partial unique index isn't filtering soft-deleted rows correctly,"
    info "or the API isn't honoring deleted_at. Check api/alerts.js POST handler."
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
echo "────────────────────────────────────────────────────────────────────"
if [ "$FAIL" -eq 0 ]; then
  echo "${GREEN}All $PASS checks passed.${RESET}"
  exit 0
else
  echo "${RED}$FAIL failed, $PASS passed.${RESET}"
  exit 1
fi
