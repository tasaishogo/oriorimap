#!/usr/bin/env bash
# verdict.sh — レジストリスクリプト（P1-a）: 機械判定 verdict.mjs のラッパ。
# 使い方: scripts/agent/verdict.sh <RUN_DIR> <verdict.mjs の引数...>
#   RUN_DIR: verdict.mjs を実行するディレクトリ（通常 .worktrees/<TASK_ID>。
#            worktree 側の scripts/verdict.mjs とスキーマを使う——マージ対象と同一版で判定するため）
# 例: scripts/agent/verdict.sh .worktrees/T008 --task-id T008 --commit-sha abc123 \
#       --ctrf ctrf/ctrf-report.json --out ../../.agent-tasks/T008/test-result.json --gate
set -euo pipefail

die() { printf 'verdict.sh: %s\n' "$1" >&2; exit 2; }

RUN_DIR="${1:?usage: verdict.sh <RUN_DIR> <verdict.mjs args...>}"
shift

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
case "$RUN_DIR" in
  /*) dir="$RUN_DIR" ;;
  *)  dir="$PROJ/$RUN_DIR" ;;
esac
[ -d "$dir" ] || die "run dir not found: $dir"
[ -f "$dir/scripts/verdict.mjs" ] || die "scripts/verdict.mjs not found in $dir"

cd "$dir"
exec node scripts/verdict.mjs "$@"
