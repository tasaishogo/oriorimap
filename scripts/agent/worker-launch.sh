#!/usr/bin/env bash
# worker-launch.sh — レジストリスクリプト（P1-a / P2-b）: claude -p ワーカーの固定文法起動。
#
# 長大な claude -p コマンドラインを都度 classifier に晒す代わりに、この 1 本の固定エントリ
# ポイントに集約する（agent-gate の SHA-256 ピン照合で決定論的に allow される）。
# 起動ビークルは 2 系統:
#   herdr … herdr pane split → pane run で herdr server の子として起動（2026-07-13 E6/E7 実測経路）。
#           完了検知はセンチネル方式: headless claude -p は herdr の agent 追跡対象外
#           （agent_status=unknown のまま）のため `herdr wait agent-status` は不発。
#           `herdr wait output --match <センチネル>` が決定論的代替（E6 差分①）。
#   exec  … 同期サブプロセス実行（完了検知=プロセス終了）。herdr 不在環境のフォールバック。
#
# 使い方:
#   scripts/agent/worker-launch.sh <TASK_ID> <ROLE> <PROMPT_FILE> [key=value ...]
#     ROLE: test-author | implement | review | test | doc
#     PROMPT_FILE: プロンプト本文ファイル（stdin で渡す。コマンドライン・pane テキストに載せない）
#   key=value（すべて任意。env 前置は agent-gate / 狭い allow の照合を外れるため使わない）:
#     cwd=<dir>              作業ディレクトリ（既定 .worktrees/<TASK_ID>）
#     out=<file>             結果 JSON の書き出し先（既定 .agent-tasks/<TASK_ID>/evidence/<ROLE>-result.json）
#     schema=<file>          --json-schema に渡すスキーマファイル
#     model=<name>           既定 sonnet
#     max-turns=<n>          既定: test-author 15 / implement 30 / review 15 / test 20 / doc 10
#     permission-mode=<m>    acceptEdits | default | dontAsk | bypass（bypass は sandbox モード専用
#                            → --dangerously-skip-permissions）。既定: review=default / 他=acceptEdits
#     allowed-tools=<csv>    カンマ区切り（例 allowed-tools='Read,Grep,Bash(git diff*)'）。
#                            既定: review のみ read-only セット / 他は無し
#     resume=<session_id>    継続実行
#     via=auto|herdr|exec    既定 auto（HERDR_ENV=1 かつ herdr があれば herdr、無ければ exec）
#     timeout-ms=<n>         herdr 経路の完了待ち上限（既定 1800000 = 30分）
#     keep-pane=yes          成功時も pane を残す（既定: 成功時 close・失敗/timeout 時は診断用に残す）
#     assume-role=<arn>      短命 STS を取得しワーカー環境にのみ注入（E7 実測: トランスクリプト・
#                            pane テキスト・ログ・本スクリプト出力のどこにも秘密値を出さない契約）
#     sts-duration=<sec>     既定 900
#
# stdout: 1 行 JSON {via, task_id, role, pane_id?, rc, out, err, subtype, session_id,
#                    permission_denials, cost_usd, sentinel?}
# exit: ワーカー rc（timeout は 124）。permission_denials>0 は exit には反映しない——
#       呼び出し元（PM）が出力 JSON を見て裁定する。
set -euo pipefail

die() { printf 'worker-launch.sh: %s\n' "$1" >&2; exit 2; }

TASK_ID="${1:?usage: worker-launch.sh <TASK_ID> <ROLE> <PROMPT_FILE> [key=value ...]}"
ROLE="${2:?usage: worker-launch.sh <TASK_ID> <ROLE> <PROMPT_FILE> [key=value ...]}"
PROMPT_FILE="${3:?usage: worker-launch.sh <TASK_ID> <ROLE> <PROMPT_FILE> [key=value ...]}"
shift 3

case "$TASK_ID" in *[!A-Za-z0-9._-]*|'') die "TASK_ID must be [A-Za-z0-9._-]+" ;; esac
case "$ROLE" in
  test-author) DEF_TURNS=15; DEF_PMODE=acceptEdits; DEF_TOOLS="" ;;
  implement)   DEF_TURNS=30; DEF_PMODE=acceptEdits; DEF_TOOLS="" ;;
  review)      DEF_TURNS=15; DEF_PMODE=default;     DEF_TOOLS='Read,Grep,Glob,Bash(git diff*),Bash(git log*),Bash(git show*)' ;;
  test)        DEF_TURNS=20; DEF_PMODE=acceptEdits; DEF_TOOLS="" ;;
  doc)         DEF_TURNS=10; DEF_PMODE=acceptEdits; DEF_TOOLS="" ;;
  *) die "unknown role: $ROLE (test-author|implement|review|test|doc)" ;;
esac

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

CWD="$PROJ/.worktrees/$TASK_ID"
OUT="$PROJ/.agent-tasks/$TASK_ID/evidence/$ROLE-result.json"
SCHEMA=""; MODEL="sonnet"; MAX_TURNS="$DEF_TURNS"; PMODE="$DEF_PMODE"; TOOLS_CSV="$DEF_TOOLS"
RESUME=""; VIA="auto"; TIMEOUT_MS=1800000; KEEP_PANE="no"; ROLE_ARN=""; STS_DURATION=900

abspath() { case "$1" in /*) printf '%s' "$1" ;; *) printf '%s' "$PROJ/$1" ;; esac; }

for kv in "$@"; do
  k="${kv%%=*}"; v="${kv#*=}"
  case "$k" in
    cwd)             CWD="$(abspath "$v")" ;;
    out)             OUT="$(abspath "$v")" ;;
    schema)          SCHEMA="$(abspath "$v")" ;;
    model)           MODEL="$v" ;;
    max-turns)       MAX_TURNS="$v" ;;
    permission-mode) PMODE="$v" ;;
    allowed-tools)   TOOLS_CSV="$v" ;;
    resume)          RESUME="$v" ;;
    via)             VIA="$v" ;;
    timeout-ms)      TIMEOUT_MS="$v" ;;
    keep-pane)       KEEP_PANE="$v" ;;
    assume-role)     ROLE_ARN="$v" ;;
    sts-duration)    STS_DURATION="$v" ;;
    *) die "unknown key: $k" ;;
  esac
done

# プロンプト/スキーマは常に絶対パス化する（exec/pane とも実行時 cwd が worktree に変わるため）。
# 相対指定は「呼び出し元 cwd → プロジェクトルート」の順で解決する。
resolve_input() {
  case "$1" in
    /*) printf '%s' "$1" ;;
    *) if [ -f "$(pwd)/$1" ]; then printf '%s' "$(pwd)/$1"; else printf '%s' "$PROJ/$1"; fi ;;
  esac
}
PROMPT_FILE="$(resolve_input "$PROMPT_FILE")"
[ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"
[ -z "$SCHEMA" ] || SCHEMA="$(resolve_input "$SCHEMA")"
[ -z "$SCHEMA" ] || [ -f "$SCHEMA" ] || die "schema file not found: $SCHEMA"
[ -d "$CWD" ] || die "cwd not found: $CWD"
case "$MAX_TURNS$TIMEOUT_MS$STS_DURATION" in *[!0-9]*) die "numeric option expected" ;; esac

ERR="${OUT%.json}-stderr.log"
mkdir -p "$(dirname "$OUT")"

# claude -p の引数列を構築（配列が正本。herdr 用の文字列はここから %q で生成）
ARGV=(claude -p --model "$MODEL" --max-turns "$MAX_TURNS" --output-format json)
case "$PMODE" in
  bypass) ARGV+=(--dangerously-skip-permissions) ;;
  acceptEdits|default|dontAsk) ARGV+=(--permission-mode "$PMODE") ;;
  *) die "unknown permission-mode: $PMODE" ;;
esac
if [ -n "$TOOLS_CSV" ]; then
  ARGV+=(--allowedTools)
  IFS=',' read -r -a _tools <<< "$TOOLS_CSV"
  for t in "${_tools[@]}"; do ARGV+=("$t"); done
fi
[ -n "$RESUME" ] && ARGV+=(--resume "$RESUME")

# 短命 STS（任意）。秘密値はこのプロセスの変数と起動 env にのみ存在させる。
AKID=""; SECRET=""; TOKEN=""
if [ -n "$ROLE_ARN" ]; then
  creds_json="$(aws sts assume-role --role-arn "$ROLE_ARN" \
    --role-session-name "wl-$TASK_ID" --duration-seconds "$STS_DURATION" --output json)" \
    || die "sts assume-role failed"
  AKID="$(printf '%s' "$creds_json" | jq -r '.Credentials.AccessKeyId')"
  SECRET="$(printf '%s' "$creds_json" | jq -r '.Credentials.SecretAccessKey')"
  TOKEN="$(printf '%s' "$creds_json" | jq -r '.Credentials.SessionToken')"
  unset creds_json
fi

if [ "$VIA" = "auto" ]; then
  if [ "${HERDR_ENV:-}" = "1" ] && command -v herdr >/dev/null 2>&1; then VIA=herdr; else VIA=exec; fi
fi

emit() { # $1 via, $2 pane, $3 rc, $4 sentinel
  jq -n --arg via "$1" --arg task "$TASK_ID" --arg role "$ROLE" --arg pane "$2" \
        --argjson rc "$3" --arg out "$OUT" --arg err "$ERR" --arg sent "$4" \
        --slurpfile r <(jq '.' "$OUT" 2>/dev/null || printf 'null') \
    '{via:$via, task_id:$task, role:$role, pane_id:(if $pane=="" then null else $pane end),
      rc:$rc, out:$out, err:$err, sentinel:(if $sent=="" then null else $sent end),
      subtype:($r[0].subtype // null), session_id:($r[0].session_id // null),
      permission_denials:(($r[0].permission_denials // []) | length),
      cost_usd:($r[0].total_cost_usd // null)}'
}

if [ "$VIA" = "exec" ]; then
  rc=0
  (
    export WORKER_ROLE="$ROLE"
    if [ -n "$ROLE_ARN" ]; then
      export AWS_ACCESS_KEY_ID="$AKID" AWS_SECRET_ACCESS_KEY="$SECRET" AWS_SESSION_TOKEN="$TOKEN"
    fi
    cd "$CWD"
    if [ -n "$SCHEMA" ]; then
      "${ARGV[@]}" --json-schema "$(cat "$SCHEMA")" < "$PROMPT_FILE" > "$OUT" 2> "$ERR"
    else
      "${ARGV[@]}" < "$PROMPT_FILE" > "$OUT" 2> "$ERR"
    fi
  ) || rc=$?
  emit exec "" "$rc" ""
  exit "$rc"
fi

[ "$VIA" = "herdr" ] || die "unknown via: $VIA"
[ "${HERDR_ENV:-}" = "1" ] || die "via=herdr requires running inside a herdr-managed pane (HERDR_ENV=1)"
# 呼び出し元 pane の ID は必須。--current では分割先が呼び出し元に固定されないため（下記参照）。
[ -n "${HERDR_PANE_ID:-}" ] || die "via=herdr requires HERDR_PANE_ID (caller pane id) to be set"

# 【重要・2026-07-20 実測】`--current` は「呼び出し元 pane」ではなく **UI でフォーカス中の pane**
#   に解決される。その結果、ワーカー pane がオーケストレータのワークスペースではなく
#   「その瞬間ユーザーが見ていた別プロジェクトのワークスペース」に作られてしまう
#   （simple-cms のワーカーが別プロジェクトのワークスペースに散在する事象として実発生）。
#   環境変数の伝播は正常（サブエージェントのシェルでも HERDR_PANE_ID は設定済み）であることを
#   確認済みで、`--pane "$HERDR_PANE_ID"` と明示指定すれば必ず呼び出し元 pane から分割される。
split_args=(pane split --pane "$HERDR_PANE_ID" --direction down --ratio 0.25 --no-focus --cwd "$CWD"
            --env "WORKER_ROLE=$ROLE")
if [ -n "$ROLE_ARN" ]; then
  split_args+=(--env "AWS_ACCESS_KEY_ID=$AKID"
               --env "AWS_SECRET_ACCESS_KEY=$SECRET"
               --env "AWS_SESSION_TOKEN=$TOKEN")
fi
pane_json="$(herdr "${split_args[@]}")" || die "herdr pane split failed"
PANE_ID="$(printf '%s' "$pane_json" | jq -r '.result.pane.pane_id')"
[ -n "$PANE_ID" ] && [ "$PANE_ID" != "null" ] || die "could not read pane_id from herdr response"

# pane コマンド文字列を生成。プロンプトは stdin リダイレクト（pane テキストに本文を載せない）。
# センチネルはコマンド文字列内で 2 分割して連結する——コマンドのエコー自体が
# `wait output --match` に先行ヒットするのを防ぐ（E7 実測手法）。
SENTINEL="WL_DONE_${TASK_ID}_$$"
S1="WL_DONE_"; S2="${TASK_ID}_$$"
CMDSTR=""
for t in "${ARGV[@]}"; do CMDSTR+=" $(printf '%q' "$t")"; done
if [ -n "$SCHEMA" ]; then
  CMDSTR+=" --json-schema \"\$(cat $(printf '%q' "$SCHEMA"))\""
fi
CMDSTR="${CMDSTR# } < $(printf '%q' "$PROMPT_FILE") > $(printf '%q' "$OUT") 2> $(printf '%q' "$ERR")"
CMDSTR="$CMDSTR; rc=\$?; echo \"$S1\"\"$S2 rc=\$rc\""

herdr pane run "$PANE_ID" "$CMDSTR" >/dev/null || die "herdr pane run failed"

rc=124
if herdr wait output "$PANE_ID" --match "$SENTINEL" --timeout "$TIMEOUT_MS" >/dev/null 2>&1; then
  line="$(herdr pane read "$PANE_ID" --source recent-unwrapped --lines 200 \
          | grep -F "$SENTINEL rc=" | tail -1 || true)"
  rc="${line##* rc=}"
  case "$rc" in ''|*[!0-9]*) rc=1 ;; esac
else
  printf 'worker-launch.sh: timeout after %sms waiting for sentinel (pane %s kept for inspection)\n' \
    "$TIMEOUT_MS" "$PANE_ID" >&2
fi

if [ "$rc" -eq 0 ] && [ "$KEEP_PANE" != "yes" ]; then
  herdr pane close "$PANE_ID" >/dev/null 2>&1 || true
fi

emit herdr "$PANE_ID" "$rc" "$SENTINEL"
exit "$rc"
