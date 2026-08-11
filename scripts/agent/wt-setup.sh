#!/usr/bin/env bash
# wt-setup.sh — レジストリスクリプト（P1-a）: タスク worktree の作成＋参照素材配置＋workspace trust 登録。
# 使い方: scripts/agent/wt-setup.sh <TASK_ID> <BRANCH> [<BASE>] [<material-rel-path> ...]
#   BASE 既定: origin/main。material は プロジェクトルートからの相対パスで、worktree 内の同位置へコピー。
# 内蔵ガード（固定文法・コードで強制）:
#   - worktree は必ず .worktrees/<TASK_ID>（他の場所には作らない）
#   - ブランチは task/ 始まりのみ受理
# workspace trust 登録は必須処理: worktree は親リポジトリの trust を継承せず、未信頼のままだと
# project settings の permissions.allow が全て無視される（2026-07-13 E6 実測）。~/.claude.json の
# .projects[<WT>].hasTrustDialogAccepted を true にする。登録失敗は exit 1（fail-closed）。
# 注: ~/.claude.json は実行中の claude セッションも書き込む（全量書き・last-writer-wins）。
#     本スクリプトは jq → 検証 → mv の原子的置換で行い、書込前に .wt-setup.bak を残す。
set -euo pipefail

die() { printf 'wt-setup.sh: %s\n' "$1" >&2; exit 1; }

TASK_ID="${1:?usage: wt-setup.sh <TASK_ID> <BRANCH> [<BASE>] [materials...]}"
BRANCH="${2:?usage: wt-setup.sh <TASK_ID> <BRANCH> [<BASE>] [materials...]}"
BASE="${3:-origin/main}"
# materials は個別引数でもスペース区切りの単一引数でも受理する。呼び出し側シェルが zsh だと
# 未クォートの $MATERIALS が word-split されず 1 引数に連結される（2026-07-13 Wave 3 実測）ため、
# ここで明示分割する（素材パスは相対パスでスペースを含まない契約）。
MATERIALS=()
for _arg in "${@:4}"; do
  for _m in $_arg; do MATERIALS+=("$_m"); done
done

case "$TASK_ID" in
  *[!A-Za-z0-9._-]*|'') die "TASK_ID must be [A-Za-z0-9._-]+ (got: $TASK_ID)" ;;
esac
case "$BRANCH" in
  task/*) ;;
  *) die "branch must start with task/ (got: $BRANCH)" ;;
esac

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
WT="$PROJ/.worktrees/$TASK_ID"

cd "$PROJ"
git worktree prune
[ -e "$WT" ] && die "worktree already exists: $WT (resume なら既存をそのまま使う。作り直しは人間が git worktree remove してから)"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git worktree add "$WT" "$BRANCH"
else
  git worktree add "$WT" -b "$BRANCH" "$BASE"
fi

# 参照素材の事前配置（未コミット物は worktree に引き継がれないため）
for m in ${MATERIALS[@]+"${MATERIALS[@]}"}; do
  src="$PROJ/$m"
  dst="$WT/$m"
  [ -e "$src" ] || die "material not found: $m"
  mkdir -p "$(dirname "$dst")"
  cp -R "$src" "$dst"
done

# workspace trust 登録（必須・fail-closed）
# 解決順: テスト用オーバーライド → CLAUDE_CONFIG_DIR/.claude.json → ~/.claude.json
CLAUDE_JSON="${WT_SETUP_CLAUDE_JSON:-${CLAUDE_CONFIG_DIR:+$CLAUDE_CONFIG_DIR/.claude.json}}"
CLAUDE_JSON="${CLAUDE_JSON:-$HOME/.claude.json}"
[ -f "$CLAUDE_JSON" ] || printf '{}\n' > "$CLAUDE_JSON"
cp "$CLAUDE_JSON" "$CLAUDE_JSON.wt-setup.bak"
tmp="$(mktemp)"
jq --arg p "$WT" '.projects[$p] = ((.projects[$p] // {}) + {hasTrustDialogAccepted: true})' \
  "$CLAUDE_JSON" > "$tmp" || { rm -f "$tmp"; die "trust registration failed (jq)"; }
jq -e --arg p "$WT" '.projects[$p].hasTrustDialogAccepted == true' "$tmp" >/dev/null \
  || { rm -f "$tmp"; die "trust registration failed (verify)"; }
mv "$tmp" "$CLAUDE_JSON"

jq -n --arg wt "$WT" --arg br "$BRANCH" --arg base "$BASE" --argjson n "${#MATERIALS[@]}" \
  '{worktree:$wt, branch:$br, base:$base, materials_copied:$n, trust:"registered"}'
