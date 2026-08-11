#!/usr/bin/env bash
# PreToolUse (Edit|Write): 保護ファイルへの書込をブロック
set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0

block() {
  printf '保護ファイルへの変更をブロックしました: %s\n%s\n変更が本当に必要な場合はユーザーに確認してください。\n' "$file" "$1" >&2
  exit 2
}

base=$(basename "$file")

# 秘密情報（.env.example / .env.sample は許可）
case "$base" in
  .env.example|.env.sample|.env.template) ;;
  .env|.env.*) block "秘密情報ファイルはエージェントが直接編集しない運用です。" ;;
esac

# gitの内部ファイル
case "$file" in
  */.git/*|.git/*) block ".git内部はgitコマンド経由でのみ操作してください。" ;;
esac

# lockファイル（パッケージマネージャ経由でのみ更新）
case "$base" in
  package-lock.json|pnpm-lock.yaml|yarn.lock|bun.lockb|uv.lock|poetry.lock)
    block "lockファイルはパッケージマネージャ（uv add / npm install 等）経由で更新してください。" ;;
esac

exit 0
