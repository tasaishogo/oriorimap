#!/usr/bin/env bash
# PostToolUse (Edit|Write): TS/TSX/Astroファイルの自動フォーマット（非ブロック）
set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

case "$file" in
  */node_modules/*|*/dist/*|*/build/*|*/.astro/*) exit 0 ;;
esac
case "$file" in
  *.ts|*.tsx|*.jsx|*.astro|*.mjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f package.json ] || exit 0

# --no-install: hooksの度にnpxが未導入パッケージを取得しに行くのを防ぐ
npx --no-install prettier --write "$file" >/dev/null 2>&1 || true
npx --no-install eslint --fix "$file" >/dev/null 2>&1 || true

exit 0
