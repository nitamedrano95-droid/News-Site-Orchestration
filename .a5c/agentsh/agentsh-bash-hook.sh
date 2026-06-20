#!/usr/bin/env bash
set -euo pipefail

HOOK_INPUT=$(cat)
TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // empty')

if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

SESSION_FILE=".a5c/agentsh/.session-id"
if [ -f "$SESSION_FILE" ]; then
  AGENTSH_SESSION=$(cat "$SESSION_FILE")
  if ! agentsh session status "$AGENTSH_SESSION" >/dev/null 2>&1; then
    AGENTSH_SESSION=""
  fi
fi

if [ -z "${AGENTSH_SESSION:-}" ]; then
  AGENTSH_SESSION=$(.a5c/agentsh/start-session.sh "$(pwd)")
  echo "$AGENTSH_SESSION" > "$SESSION_FILE"
fi

export AGENTSH_SESSION_ID="$AGENTSH_SESSION"

COMMAND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

cat <<HOOK_EOF
{
  "tool_input": {
    "command": "agentsh exec $AGENTSH_SESSION -- bash -c $(echo "$COMMAND" | jq -Rs .)"
  }
}
HOOK_EOF
