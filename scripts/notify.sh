#!/bin/bash
# notify.sh — autopilot escalation / run-summary notification fan-out.
# Usage: notify.sh <level: info|warn|escalation> <title> <body>
#
# Channels (all best-effort, never fails the caller — always exits 0):
#   1. Slack incoming webhook   — if $SLACK_WEBHOOK_URL is set
#   2. agmsg (agent messaging)  — if $AGMSG_TEAM / $AGMSG_FROM / $AGMSG_TO are all set
#   3. herdr desktop notification — if `herdr` is on PATH
#   4. macOS notification (osascript) — darwin fallback
# Always appends one JSON line to ${NOTIFY_LOG:-.agent-tasks/notifications.jsonl}
# (relative to cwd) so the run record survives even when no channel is configured.
#
# SECURITY: never echo secrets into title/body. The webhook URL itself is never
# printed. Callers pass facts (task id, stage, reason), not credential material.

LEVEL="${1:-info}"
TITLE="${2:-autopilot}"
BODY="${3:-}"

ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
delivered=()

# --- 1. Slack --------------------------------------------------------------
if [ -n "${SLACK_WEBHOOK_URL:-}" ] && command -v curl >/dev/null 2>&1; then
  icon=":information_source:"
  [ "$LEVEL" = "warn" ] && icon=":warning:"
  [ "$LEVEL" = "escalation" ] && icon=":rotating_light:"
  payload=$(TITLE="$TITLE" BODY="$BODY" ICON="$icon" LEVEL="$LEVEL" \
    node -e 'console.log(JSON.stringify({text: `${process.env.ICON} *[${process.env.LEVEL}] ${process.env.TITLE}*\n${process.env.BODY}`}))' 2>/dev/null)
  if [ -n "$payload" ] && curl -sf -m 10 -X POST -H 'Content-type: application/json' \
      --data "$payload" "$SLACK_WEBHOOK_URL" >/dev/null 2>&1; then
    delivered+=("slack")
  fi
fi

# --- 2. agmsg ---------------------------------------------------------------
AGMSG_SEND="$HOME/.agents/skills/agmsg/scripts/send.sh"
if [ -n "${AGMSG_TEAM:-}" ] && [ -n "${AGMSG_FROM:-}" ] && [ -n "${AGMSG_TO:-}" ] && [ -x "$AGMSG_SEND" ]; then
  if bash "$AGMSG_SEND" "$AGMSG_TEAM" "$AGMSG_FROM" "$AGMSG_TO" "[$LEVEL] $TITLE — $BODY" >/dev/null 2>&1; then
    delivered+=("agmsg")
  fi
fi

# --- 3. herdr desktop notification -------------------------------------------
if command -v herdr >/dev/null 2>&1; then
  sound="none"
  [ "$LEVEL" = "escalation" ] && sound="request"
  if herdr notification show "[$LEVEL] $TITLE" --body "$BODY" --sound "$sound" >/dev/null 2>&1; then
    delivered+=("herdr")
  fi
fi

# --- 4. macOS fallback ---------------------------------------------------------
if [ ${#delivered[@]} -eq 0 ] && [ "$(uname)" = "Darwin" ] && command -v osascript >/dev/null 2>&1; then
  # osascript strings: escape backslash and double-quote for AppleScript literal
  esc_title=$(printf '%s' "[$LEVEL] $TITLE" | sed 's/\\/\\\\/g; s/"/\\"/g')
  esc_body=$(printf '%s' "$BODY" | sed 's/\\/\\\\/g; s/"/\\"/g')
  if osascript -e "display notification \"$esc_body\" with title \"$esc_title\"" >/dev/null 2>&1; then
    delivered+=("osascript")
  fi
fi

# --- always: append to log -------------------------------------------------------
log="${NOTIFY_LOG:-.agent-tasks/notifications.jsonl}"
mkdir -p "$(dirname "$log")" 2>/dev/null
TS="$ts" LEVEL="$LEVEL" TITLE="$TITLE" BODY="$BODY" DELIVERED="${delivered[*]:-none}" \
  node -e 'console.log(JSON.stringify({ts: process.env.TS, level: process.env.LEVEL, title: process.env.TITLE, body: process.env.BODY, delivered: process.env.DELIVERED.split(" ")}))' \
  >> "$log" 2>/dev/null

echo "notify.sh: delivered via: ${delivered[*]:-none (logged only)}"
exit 0
