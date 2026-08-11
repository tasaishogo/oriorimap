#!/usr/bin/env bash
# pr-create.sh — レジストリスクリプト（P1-a）: タスクブランチから PR を作成。
# 使い方: scripts/agent/pr-create.sh <TASK_ID> <TITLE> <BODY_FILE> [<BASE>] [<LABEL>]
#   BASE 既定: main（main/master 以外は受理しない = --base 固定）
#   LABEL: 任意。eph-test（IaC タスクで eph-env の plan を要求）のみ受理。
#          eph-approved を作成時に付けることは構造的に不可能（承認はレビュー後の pr-label.sh add のみ）。
# 内蔵ガード（コードで強制）:
#   - head は .worktrees/<TASK_ID> の HEAD ブランチのみ・task/ 始まり必須
#   - draft/merge 系のオプションは存在しない（PR 作成のみ。マージは常に人間）
set -euo pipefail

die() { printf 'pr-create.sh: %s\n' "$1" >&2; exit 1; }

TASK_ID="${1:?usage: pr-create.sh <TASK_ID> <TITLE> <BODY_FILE> [<BASE>] [<LABEL>]}"
TITLE="${2:?usage: pr-create.sh <TASK_ID> <TITLE> <BODY_FILE> [<BASE>] [<LABEL>]}"
BODY_FILE="${3:?usage: pr-create.sh <TASK_ID> <TITLE> <BODY_FILE> [<BASE>] [<LABEL>]}"
BASE="${4:-main}"
LABEL="${5:-}"

case "$BASE" in
  main|master) ;;
  *) die "base is fixed to main/master (got: $BASE)" ;;
esac
case "$LABEL" in
  ''|eph-test) ;;
  *) die "label at creation is restricted to eph-test (got: $LABEL)" ;;
esac
[ -s "$BODY_FILE" ] || die "body file is missing or empty: $BODY_FILE"

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
WT="$PROJ/.worktrees/$TASK_ID"
[ -d "$WT" ] || die "worktree not found: $WT"

BRANCH="$(git -C "$WT" rev-parse --abbrev-ref HEAD)"
case "$BRANCH" in
  task/*) ;;
  *) die "refusing to create PR from non-task branch: $BRANCH" ;;
esac

# BODY_FILE は呼び出し元 cwd 基準の相対パスも受ける
case "$BODY_FILE" in
  /*) body="$BODY_FILE" ;;
  *)  body="$(pwd)/$BODY_FILE" ;;
esac

cd "$WT"
if [ -n "$LABEL" ]; then
  exec gh pr create --base "$BASE" --head "$BRANCH" --title "$TITLE" --body-file "$body" --label "$LABEL"
fi
exec gh pr create --base "$BASE" --head "$BRANCH" --title "$TITLE" --body-file "$body"
