#!/usr/bin/env bash
# Smoke tests for CRM2 (basic checks). Configure API_URL and TOKEN env vars before running.

set -euo pipefail
API_URL="${API_URL:-http://localhost:3001}"
TOKEN="${TOKEN:-}"  # if empty, script will skip authenticated endpoints

echo "Running smoke tests against $API_URL"

function run() {
  echo "---- $1 ----"
  shift
  if [ -n "$TOKEN" ]; then
    curl -fsS -H "Authorization: Bearer $TOKEN" "$@"
  else
    curl -fsS "$@" || true
  fi
  echo -e "\n"
}

# 1) Optional health check
echo "1) Health check (optional: /health or /api/ping)"
if curl -fsS "$API_URL/health" >/dev/null 2>&1; then
  echo "health: OK"
elif curl -fsS "$API_URL/api/ping" >/dev/null 2>&1; then
  echo "ping: OK"
else
  echo "No standard health endpoint found (this is OK)."
fi

echo "\n2) Test: list clients (autocomplete)"
# Adjust endpoint as needed (some deployments use /api/clientes or /api/clients)
run "Clients search" "$API_URL/api/clientes?query=juan"

echo "\n3) Test: get client detail (example RUT placeholder)"
# Replace 11111111-1 with a real RUT in staging
run "Client detail productos-6m" "$API_URL/api/client-detail/11111111-1/productos-6m"

echo "\n4) Test: dashboard (basic)"
run "Dashboard" "$API_URL/api/dashboard/summary"

echo "\n5) Test: run import script endpoint (if exists)"
# Example: POST to an import endpoint; adjust payload as needed
if [ -n "$TOKEN" ]; then
  echo "Skipping import run example unless configured."
else
  echo "No auth token set: import test skipped."
fi

echo "\nSmoke tests finished. Review outputs above for errors."

# Exit with success
exit 0
