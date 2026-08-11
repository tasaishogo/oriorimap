#!/usr/bin/env bash
# PreToolUse (Edit|Write): テスト資産の改変をブロック（reward hacking対策）
#
# WORKER_ROLE 環境変数（project-autopilot のワーカー契約が設定）でロール別に強度を変える:
#   WORKER_ROLE=implement   → テスト資産への書き込みを新規作成含め全面ブロック
#                             （実装ワーカーはテストを一切書けない。テストへの異議は
#                              構造化出力 notes で申し立てる契約）
#   WORKER_ROLE=test-author → テストファイルの作成・編集を許可（テスト専任ワーカー）
#   未設定（対話セッション等） → 既存テストファイルの改変のみブロック（新規作成は許可）
#
# 一時解除: ユーザーが明示的に `touch .claude/allow-test-edits` を実行した場合のみ（作業後に削除）
set -uo pipefail

proj="${CLAUDE_PROJECT_DIR:-.}"
[ -f "$proj/.claude/allow-test-edits" ] && exit 0

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0

is_test=false
case "$file" in
  */tests/*|*/test/*|*/__tests__/*) is_test=true ;;
esac
base=$(basename "$file")
case "$base" in
  test_*.py|*_test.py|*.test.ts|*.test.tsx|*.test.js|*.test.jsx|*.spec.ts|*.spec.tsx|*.spec.js)
    is_test=true ;;
  conftest.py|playwright.config.*|vitest.config.*|jest.config.*|pytest.ini)
    is_test=true ;;
esac
[ "$is_test" = "true" ] || exit 0

role="${WORKER_ROLE:-}"

# テスト専任ワーカーはテスト資産を自由に書ける
[ "$role" = "test-author" ] && exit 0

if [ "$role" = "implement" ]; then
  cat >&2 <<EOF
実装ワーカーによるテスト資産への書き込みをブロックしました: $file
実装ワーカーはテストを作成・変更できない契約です（テストと実装のコンテキスト分離）。
- テスト側が誤っていると判断した場合: 変更せず、結果JSONの notes に根拠を添えて申し立ててください（PMがテストauthorを resume して裁定します）
EOF
  exit 2
fi

# ロール未設定（対話セッション等）: 新規作成は許可、既存ファイルの改変のみブロック
[ -f "$file" ] || exit 0

cat >&2 <<EOF
既存テストファイルの変更をブロックしました: $file
「テストを通すためのテスト改変」防止ガードが有効です。
- テスト側が誤っていると判断した場合: 変更せず、根拠をユーザーに報告して指示を仰いでください
- ユーザーがテスト修正を指示済みの場合: ユーザーに 'touch .claude/allow-test-edits' の実行を依頼してください（作業完了後に削除）
EOF
exit 2
