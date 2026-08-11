#!/usr/bin/env bash
# PreToolUse (Edit|Write): 評価器・ガードレール設定の改竄をブロック
# 対象: .claude/ 配下・CI定義・hooks・機械判定資材（verdict.mjs / schemas）・.mcp.json
# エージェント（特にワーカー）がテスト・品質ゲート自体を書き換える reward hacking を封じる。
# 一時解除: ユーザーが明示的に `touch .claude/allow-config-edits` を実行した場合のみ（作業後に削除）
set -uo pipefail

proj="${CLAUDE_PROJECT_DIR:-.}"
[ -f "$proj/.claude/allow-config-edits" ] && exit 0

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0

block() {
  cat >&2 <<EOF
保護された設定・評価器ファイルへの変更をブロックしました: $file
$1
変更が本当に必要な場合はユーザーに報告し、'touch .claude/allow-config-edits' の実行を依頼してください（作業完了後に削除）。
EOF
  exit 2
}

case "$file" in
  # Claude Code 設定・hooks（ガードレール自体の無効化を防ぐ）
  */.claude/settings.json|.claude/settings.json|*/.claude/settings.local.json|.claude/settings.local.json)
    block "Claude Code の settings はガードレールの正本です。" ;;
  */.claude/automode-flag.json|.claude/automode-flag.json)
    block "automode-flag.json は無人 run の autoMode 正本です（人間が claude --settings で注入する。エージェント自書きは信頼非対称性を壊す）。" ;;
  */.claude/hooks/*|.claude/hooks/*)
    block "hooks スクリプトと agent-gate.manifest.json は品質・安全ゲートの実体です。" ;;
  # CI 定義（正本ゲートの改変を防ぐ）
  */.github/workflows/*|.github/workflows/*)
    block "CI ワークフローは検証の正本です。CI の変更は人間レビュー必須の運用です。" ;;
  # 機械判定資材（verdict / risk 判定 / 通知 / スキーマ）
  */scripts/verdict.mjs|scripts/verdict.mjs)
    block "verdict.mjs は機械判定ゲートの実体です。" ;;
  */scripts/risk-classify.mjs|scripts/risk-classify.mjs)
    block "risk-classify.mjs はクロスレビュー発動の機械判定器です。" ;;
  */scripts/notify.sh|scripts/notify.sh)
    block "notify.sh はエスカレーション通知経路です（無効化＝サイレント失敗の温床）。" ;;
  */scripts/agent/*|scripts/agent/*)
    block "scripts/agent/ は agent-gate のハッシュピン対象レジストリです。変更は人間が内容レビューとマニフェスト更新をセットで行う運用です（不一致のまま実行すると fail-closed で deny されます）。" ;;
  */.agent-tasks/schemas/*|.agent-tasks/schemas/*)
    block "構造化出力スキーマはワーカー契約の正本です。" ;;
  # MCP 設定
  */.mcp.json|.mcp.json)
    block ".mcp.json の変更はユーザー承認が必要な運用です。" ;;
esac

exit 0
