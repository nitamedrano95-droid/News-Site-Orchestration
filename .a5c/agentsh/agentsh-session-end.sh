#!/usr/bin/env bash
set -euo pipefail

SESSION_FILE=".a5c/agentsh/.session-id"

if [ -f "$SESSION_FILE" ]; then
  AGENTSH_SESSION=$(cat "$SESSION_FILE")
  agentsh session destroy "$AGENTSH_SESSION" 2>/dev/null || true
  rm -f "$SESSION_FILE"
  echo "[agentsh] Session destroyed: $AGENTSH_SESSION"
fi
