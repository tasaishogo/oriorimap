#!/usr/bin/env bash
# pr-label.sh — レジストリスクリプト（P2）: eph-env ワークフローの制御ラベル操作。
# 使い方: scripts/agent/pr-label.sh <PR_NUMBER> <add|remove> <LABEL>
# 内蔵ガード（コードで強制）:
#   - ラベルは固定語彙のみ: eph-test（plan 実行要求）/ eph-approved（deploy 承認）
#   - eph-approved の add は「人間承認（AskUserQuestion で plan ダイジェストを提示し承認を得た後）」
#     にのみ呼んでよい（運用契約。plan なしの付与は eph-env 側でも deploy 前 plan 再生成で緩和されるが、
#     承認の意味を壊す行為はエビデンス捏造と同格の逸脱）。
#   - 新しい push で eph-approved は eph-env の dismiss ジョブが自動剥奪する（stale 承認の無効化）。
set -euo pipefail

die() { printf 'pr-label.sh: %s\n' "$1" >&2; exit 1; }

PR="${1:?usage: pr-label.sh <PR_NUMBER> <add|remove> <LABEL>}"
ACTION="${2:?usage: pr-label.sh <PR_NUMBER> <add|remove> <LABEL>}"
LABEL="${3:?usage: pr-label.sh <PR_NUMBER> <add|remove> <LABEL>}"
[ $# -eq 3 ] || die "extra arguments are not accepted (fixed grammar)"

case "$PR" in *[!0-9]*|'') die "PR_NUMBER must be numeric (got: $PR)" ;; esac
case "$ACTION" in add|remove) ;; *) die "action must be add|remove (got: $ACTION)" ;; esac
case "$LABEL" in eph-test|eph-approved) ;; *) die "label must be eph-test|eph-approved (got: $LABEL)" ;; esac

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJ"

if [ "$ACTION" = "add" ]; then
  gh pr edit "$PR" --add-label "$LABEL"
else
  gh pr edit "$PR" --remove-label "$LABEL"
fi
jq -n --arg pr "$PR" --arg a "$ACTION" --arg l "$LABEL" '{pr:($pr|tonumber), action:$a, label:$l}'
