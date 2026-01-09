#!/usr/bin/env bash
# Script to set Render service env vars via API
# Usage: ./set_env.sh <service_id> KEY1=VALUE1 KEY2=VALUE2 ...
# Requires RENDER_API_KEY env var to be set

set -euo pipefail
if [ -z "${RENDER_API_KEY:-}" ]; then
  echo "Please export RENDER_API_KEY before running this script"
  exit 1
fi
if [ $# -lt 2 ]; then
  echo "Usage: $0 <service_id> KEY=VALUE [KEY=VALUE ...]"
  exit 1
fi

SERVICE_ID="$1"
shift

for kv in "$@"; do
  KEY="${kv%%=*}"
  VALUE="${kv#*=}"
  echo "Setting $KEY on service $SERVICE_ID"
  curl -s -X POST "https://api.render.com/v1/services/$SERVICE_ID/env-vars" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{ \"key\": \"$KEY\", \"value\": \"$VALUE\", \"secured\": true }" \
    | jq .
done

echo "Done."
