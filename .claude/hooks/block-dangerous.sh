#!/usr/bin/env bash
# PreToolUse (Bash): 危険コマンドを deny / ask にする
set -uo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

decide() { # $1: allow|deny|ask, $2: reason
  jq -n --arg d "$1" --arg r "$2" \
    '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":$d,"permissionDecisionReason":$r}}'
  exit 0
}

# ルート/ホーム直下への再帰削除 → deny
if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*[rf][a-zA-Z]*([[:space:]]+-[a-zA-Z]+)*[[:space:]]+("?(/|~|\$HOME)"?)([[:space:]]|$)'; then
  decide deny "ルート/ホームディレクトリへの再帰削除は禁止です。"
fi

# main/masterへのforce push → ask
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push[[:space:]]+.*(--force|[[:space:]]-f)([[:space:]]|$)' \
  && printf '%s' "$cmd" | grep -Eq '(main|master)'; then
  decide ask "main/masterへのforce pushです。本当に実行しますか。"
fi

# curl/wget のパイプ実行 → ask
if printf '%s' "$cmd" | grep -Eq '(curl|wget)[^|;]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z)?sh'; then
  decide ask "ダウンロードしたスクリプトの直接実行です。内容を確認しましたか。"
fi

# 全開放パーミッション → ask
if printf '%s' "$cmd" | grep -Eq 'chmod[[:space:]]+(-R[[:space:]]+)?777'; then
  decide ask "chmod 777 は原則禁止です。より狭い権限を検討してください。"
fi

# ガードレール設定へのシェル経由の書込 → deny（protect-config の Bash 迂回防止）
# protect-config は Edit|Write ツールしか照合しないため、リダイレクト・cp・tee 等の
# Bash 書込で .claude/hooks/（agent-gate.manifest.json 含む）・settings・automode-flag・
# .github/workflows/ を書き換える経路をここで塞ぐ。一時解除は protect-config と同じ
# .claude/allow-config-edits（人間のみ作成可）。
# 注: 書込動詞と保護パスが同一の単純コマンド区間に現れる場合のみ照合する（heredoc の
# 本文が保護パスに言及しただけでは原則発火しない）。誤検知時は人間に解除を依頼する。
proj="${CLAUDE_PROJECT_DIR:-.}"
if [ ! -f "$proj/.claude/allow-config-edits" ]; then
  guard_paths='\.claude/(hooks/|settings[^/]*\.json|automode-flag\.json)|\.github/workflows/'
  if printf '%s' "$cmd" | grep -Eq '>>?[[:space:]]*"?(\./)?[^ ]*('"$guard_paths"')' \
    || printf '%s' "$cmd" | grep -Eq '\b(cp|mv|rm|tee|ln|truncate|dd|chmod|sed[[:space:]][^|;&]*-i)\b[^|;&]*('"$guard_paths"')'; then
    decide deny "ガードレール設定（.claude/hooks|settings|automode-flag / .github/workflows）へのシェル経由の書込は禁止です。必要な変更はユーザーに報告し、'touch .claude/allow-config-edits' の実行を依頼してください（作業後に削除）。"
  fi
fi

exit 0
