#!/usr/bin/env bash
# PreToolUse (Bash): スクリプト・レジストリの決定論的裁定（ベース層5本目・P1-a）
# パイプラインが使う固定エントリポイント（scripts/agent/*.sh）を、SHA-256 ピン照合の上で
# classifier に到達させず許可する。判定は3値:
#   allow  … コマンドが scripts/agent/ の単独呼び出しで、manifest のピン値とハッシュ一致
#   deny   … manifest に登録済みのスクリプトだがハッシュ不一致（改竄・未更新）= fail-closed
#   無判定 … それ以外（複合コマンド・未登録スクリプト・非レジストリ）→ 通常フロー（rules / classifier）へ
# manifest: .claude/hooks/agent-gate.manifest.json（protect-config の .claude/hooks/ 保護対象）。
# manifest の更新は人間のみ（エージェントが自分に権限を与えられない非対称性の要）。
# manifest が無いプロジェクトでは常に無判定（no-op）なので、ベース層として全プロジェクトに
# 設置してよい。実測根拠: 2026-07-13 E1（hook allow は classifier 非呼出・31ms、改竄 deny は
# classifier 許可相当の内容にも優先、deny 理由は permission_denials で機械回収可能）。
set -euo pipefail

INPUT="$(cat)"
TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')"
[ "$TOOL_NAME" = "Bash" ] || exit 0
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"
[ -n "$CMD" ] || exit 0

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MANIFEST="$PROJ/.claude/hooks/agent-gate.manifest.json"
[ -f "$MANIFEST" ] || exit 0

# 単一のレジストリ呼び出しのみ受理。複合コマンド・リダイレクト・コマンド置換・改行は無判定で通常フローへ
case "$CMD" in
  *';'*|*'|'*|*'&'*|*'`'*|*'$('*|*'<'*|*'>'*|*$'\n'*) exit 0 ;;
esac

# 先頭トークンが scripts/agent/<name>.sh か（./ 前置・プロジェクト絶対パスも許容）
first="${CMD%% *}"
rel="${first#./}"
rel="${rel#"$PROJ"/}"
case "$rel" in
  scripts/agent/*.sh) ;;
  *) exit 0 ;;
esac

pinned="$(jq -r --arg k "$rel" '.scripts[$k] // empty' "$MANIFEST")"
[ -n "$pinned" ] || exit 0  # レジストリ未登録 → 無判定（rules / classifier の通常フローへ）

script_path="$PROJ/$rel"
if [ -f "$script_path" ]; then
  if command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$script_path" | awk '{print $1}')"
  else
    actual="$(sha256sum "$script_path" | awk '{print $1}')"
  fi
else
  actual="(missing)"
fi

if [ "$actual" = "$pinned" ]; then
  printf '%s\n' "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"allow\",\"permissionDecisionReason\":\"agent-gate: registry script $rel matches pinned SHA-256\"}}"
  exit 0
fi

printf '%s\n' "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"agent-gate fail-closed: $rel is registered but SHA-256 mismatch (expected $pinned, got $actual). Updating the manifest is a human-only operation (protect-config).\"}}"
exit 0
