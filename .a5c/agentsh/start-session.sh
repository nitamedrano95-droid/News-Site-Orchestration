#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${1:-$(pwd)}"
POLICY="${2:-.a5c/agentsh/policy.yaml}"

SESSION_ID=$(agentsh session create \
  --workspace "$WORKSPACE" \
  --real-paths \
  ${POLICY:+--policy "$POLICY"} \
  2>/dev/null | jq -r .id)

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo "ERROR: Failed to create agentsh session" >&2
  exit 1
fi

echo "$SESSION_ID"
