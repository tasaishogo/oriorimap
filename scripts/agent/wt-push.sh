#!/usr/bin/env bash
# wt-push.sh — レジストリスクリプト（P1-a）: タスクブランチの push。
# 使い方: scripts/agent/wt-push.sh <TASK_ID>
# 内蔵ガード（コードで強制）:
#   - push 対象は .worktrees/<TASK_ID> の HEAD ブランチのみ（refspec の外部指定は受け付けない）
#   - ブランチは task/ 始まりのみ（main/master/BASE への push は構造的に不可能）
#   - force 系フラグは存在しない（引数を git に渡さない）
set -euo pipefail

die() { printf 'wt-push.sh: %s\n' "$1" >&2; exit 1; }

TASK_ID="${1:?usage: wt-push.sh <TASK_ID>}"
[ $# -eq 1 ] || die "extra arguments are not accepted (fixed grammar)"

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
WT="$PROJ/.worktrees/$TASK_ID"
[ -d "$WT" ] || die "worktree not found: $WT"

BRANCH="$(git -C "$WT" rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" != "HEAD" ] || die "worktree is in detached HEAD state"
case "$BRANCH" in
  task/*) ;;
  *) die "refusing to push non-task branch: $BRANCH" ;;
esac

git -C "$WT" push origin "$BRANCH"
jq -n --arg br "$BRANCH" --arg t "$TASK_ID" '{task_id:$t, pushed:$br, remote:"origin", force:false}'
