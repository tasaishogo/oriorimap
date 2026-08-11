#!/usr/bin/env bash
# Stop: 型エラー・自動修正不可のlint違反が残っていればターン終了をブロックして修正させる
set -uo pipefail

input=$(cat)

# Stopフックからの継続ターンでは再ブロックしない（無限ループ防止）
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f package.json ] || exit 0

errors=""

# typescriptがプロジェクトに導入されている場合のみtscを実行
if [ -f tsconfig.json ] && npx --no-install tsc --version >/dev/null 2>&1; then
  if ! out=$(npx --no-install tsc --noEmit 2>&1); then
    errors="${errors}[tsc --noEmit]
$(printf '%s' "$out" | head -40)

"
  fi
fi

# eslint設定がある場合のみ実行
if ls eslint.config.* >/dev/null 2>&1 && npx --no-install eslint --version >/dev/null 2>&1; then
  if ! out=$(npx --no-install eslint . 2>&1); then
    errors="${errors}[eslint]
$(printf '%s' "$out" | head -40)

"
  fi
fi

if [ -n "$errors" ]; then
  printf '%s' "$errors" >&2
  printf '上記の型/lintエラーを修正してから完了してください。\n' >&2
  exit 2
fi

exit 0
