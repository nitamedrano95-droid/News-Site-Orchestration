#!/usr/bin/env bash
set -euo pipefail

SESSION_FILE=".a5c/agentsh/.session-id"
mkdir -p .a5c/agentsh

AGENTSH_SESSION=$(.a5c/agentsh/start-session.sh "$(pwd)")
echo "$AGENTSH_SESSION" > "$SESSION_FILE"

echo "[agentsh] Session started: $AGENTSH_SESSION"
