#!/usr/bin/env bash
# codex-launch.sh — レジストリスクリプト: codex exec ワーカー（R2 クロスレビュー）の固定文法起動。
#
# 【存在理由 = 認証情報スクレイピングの恒久排除】
# codex は Azure OpenAI プロバイダ利用時に `AZURE_OPENAI_API_KEY` を要求する。従来の
# worker-contracts.md は「env に無ければ ~/.zshenv/~/.zshrc/~/.zprofile を grep して eval せよ」
# と PM に指示していたが、これは LLM にユーザーのシェル設定ファイルの走査と eval を行わせる
# 手段であり、2026-07-21 T024 で [Credential Exploration] のセキュリティ警告として顕在化した
# （実害＝外部送信は無し。しかし手段として不適切）。
#
# 本スクリプトは worker-launch.sh の `assume-role`（短命 STS を子プロセス env にのみ注入する）と
# 同じ契約で認証情報を扱う:
#   - 鍵は「呼び出し元 env」→「秘密ファイル（既定 ~/.claude/secrets/codex.env・0600 必須）」の
#     順にのみ解決する。**シェル設定ファイル（.zshrc 等）は一切読まない**
#   - 解決した鍵は codex 子プロセスの env にだけ渡す。stdout/stderr・結果 JSON・pane テキスト・
#     コマンドラインのどこにも値を出さない
#   - どこにも無ければ exit 3 で fail-closed。PM は**自力で鍵を探してはならず**、
#     ジャッジパネル縮退（worker-contracts.md）に落ちるかオーケストレータにエスカレーションする
#
# 使い方:
#   scripts/agent/codex-launch.sh <TASK_ID> <LABEL> <PROMPT_FILE> [key=value ...]
#     LABEL: 出力ファイル名に使う識別子（例 r2-round-1）。[A-Za-z0-9._-]+
#     PROMPT_FILE: プロンプト本文ファイル（stdin で渡す＝コマンドラインに本文を載せない）
#   key=value（すべて任意）:
#     cwd=<dir>            作業ディレクトリ（既定 .worktrees/<TASK_ID>）
#     out=<file>           構造化出力の書き出し先（既定 .agent-tasks/<TASK_ID>/evidence/review-<LABEL>.json）
#     schema=<file>        --output-schema に渡すスキーマ（strict mode: 全プロパティ required +
#                          additionalProperties:false でないと invalid_json_schema になる）
#     resume=<thread_id>   継続実行（オプション類は resume より前に置く＝codex の文法制約に対応済み）
#     sandbox=<mode>       read-only（既定）| workspace-write | danger-full-access
#     bypass=yes           --dangerously-bypass-approvals-and-sandbox（MODE=sandbox のコンテナ内専用）
#     timeout-sec=<n>      既定 900。超過は rc=124
#     secrets-file=<file>  鍵の秘密ファイル（既定 ${CODEX_SECRETS_FILE:-~/.claude/secrets/codex.env}）
#
# stdout: 1 行 JSON {task_id, label, rc, out, err, jsonl, thread_id, turn_completed, schema_ok, key_source}
#   key_source は "env" | "secrets-file" のみ（値は絶対に出さない）
# exit: codex の rc。ただし codex はサブプロセス失敗でも 0 を返す既知バグがあるため、
#       **呼び出し元は rc だけで成否判定してはならない**。turn_completed=true かつ
#       schema_ok=true（schema 指定時）を成功条件とする。
set -euo pipefail

die() { printf 'codex-launch.sh: %s\n' "$1" >&2; exit 2; }

TASK_ID="${1:?usage: codex-launch.sh <TASK_ID> <LABEL> <PROMPT_FILE> [key=value ...]}"
LABEL="${2:?usage: codex-launch.sh <TASK_ID> <LABEL> <PROMPT_FILE> [key=value ...]}"
PROMPT_FILE="${3:?usage: codex-launch.sh <TASK_ID> <LABEL> <PROMPT_FILE> [key=value ...]}"
shift 3

case "$TASK_ID" in *[!A-Za-z0-9._-]*|'') die "TASK_ID must be [A-Za-z0-9._-]+" ;; esac
case "$LABEL"   in *[!A-Za-z0-9._-]*|'') die "LABEL must be [A-Za-z0-9._-]+" ;; esac

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

CWD="$PROJ/.worktrees/$TASK_ID"
OUT="$PROJ/.agent-tasks/$TASK_ID/evidence/review-$LABEL.json"
SCHEMA=""; RESUME=""; SANDBOX="read-only"; BYPASS="no"; TIMEOUT_SEC=900
SECRETS_FILE="${CODEX_SECRETS_FILE:-$HOME/.claude/secrets/codex.env}"

abspath() { case "$1" in /*) printf '%s' "$1" ;; *) printf '%s' "$PROJ/$1" ;; esac; }

for kv in "$@"; do
  k="${kv%%=*}"; v="${kv#*=}"
  case "$k" in
    cwd)          CWD="$(abspath "$v")" ;;
    out)          OUT="$(abspath "$v")" ;;
    schema)       SCHEMA="$(abspath "$v")" ;;
    resume)       RESUME="$v" ;;
    sandbox)      SANDBOX="$v" ;;
    bypass)       BYPASS="$v" ;;
    timeout-sec)  TIMEOUT_SEC="$v" ;;
    secrets-file) SECRETS_FILE="$v" ;;
    *) die "unknown key: $k" ;;
  esac
done

# プロンプト/スキーマは絶対パス化する（実行時 cwd が worktree に変わるため）。
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
case "$TIMEOUT_SEC" in *[!0-9]*|'') die "timeout-sec must be numeric" ;; esac
case "$SANDBOX" in read-only|workspace-write|danger-full-access) ;; *) die "unknown sandbox: $SANDBOX" ;; esac
case "$RESUME" in *[!A-Za-z0-9._-]*) die "resume thread id must be [A-Za-z0-9._-]+" ;; esac

ERR="${OUT%.json}-stderr.log"
JSONL="${OUT%.json}-stream.jsonl"
mkdir -p "$(dirname "$OUT")"

# ---- 認証情報の解決（値は決して出力しない） ---------------------------------
# 解決順: 1) 呼び出し元 env  2) 秘密ファイル。シェル設定ファイルは読まない。
KEY_SOURCE=""
API_KEY="${AZURE_OPENAI_API_KEY:-}"
[ -n "$API_KEY" ] && KEY_SOURCE="env"

if [ -z "$API_KEY" ] && [ -f "$SECRETS_FILE" ]; then
  # パーミッションを強制する（他ユーザー可読なら使わない = fail-closed）。
  # stat の書式は BSD(macOS) と GNU で異なるため両方試す。
  perm="$(stat -f '%Lp' "$SECRETS_FILE" 2>/dev/null || stat -c '%a' "$SECRETS_FILE" 2>/dev/null || echo '')"
  case "$perm" in
    600|400) ;;
    *) die "secrets file must be mode 600/400 (got '${perm:-unknown}'): $SECRETS_FILE" ;;
  esac
  # `source` はしない（任意コード実行を避ける）。KEY=VALUE 行のみを厳密に切り出す。
  API_KEY="$(sed -n 's/^[[:space:]]*\(export[[:space:]]\{1,\}\)\{0,1\}AZURE_OPENAI_API_KEY=//p' \
             "$SECRETS_FILE" | head -1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
  [ -n "$API_KEY" ] && KEY_SOURCE="secrets-file"
fi

if [ -z "$API_KEY" ]; then
  cat >&2 <<EOF
codex-launch.sh: AZURE_OPENAI_API_KEY が解決できません（env にも $SECRETS_FILE にも無い）。
  自力で鍵を探さないでください（シェル設定ファイルの grep/eval は禁止です）。
  対応: worker-contracts.md の「ジャッジパネル縮退」に落とすか、オーケストレータに
  秘密ファイルの設置を依頼してください。
EOF
  exit 3
fi

# ---- codex 引数列の構築 -----------------------------------------------------
# 【codex の文法制約】オプション類は `resume` サブコマンドより **前** に置く（後ろは exit 2）。
ARGV=(codex exec --json --sandbox "$SANDBOX")
[ "$BYPASS" = "yes" ] && ARGV+=(--dangerously-bypass-approvals-and-sandbox)
[ -n "$SCHEMA" ] && ARGV+=(--output-schema "$SCHEMA")
ARGV+=(-o "$OUT")
if [ -n "$RESUME" ]; then
  ARGV+=(resume "$RESUME" -)   # `-` = プロンプトを stdin から読む
else
  ARGV+=(-)
fi

rc=0
(
  cd "$CWD"
  export AZURE_OPENAI_API_KEY="$API_KEY"   # 子プロセス env にのみ注入
  export WORKER_ROLE="review-r2"
  # timeout(1) は GNU coreutils。macOS では gtimeout か、無ければ無制限にフォールバック。
  if command -v timeout >/dev/null 2>&1; then
    timeout "$TIMEOUT_SEC" "${ARGV[@]}" < "$PROMPT_FILE" > "$JSONL" 2> "$ERR"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$TIMEOUT_SEC" "${ARGV[@]}" < "$PROMPT_FILE" > "$JSONL" 2> "$ERR"
  else
    "${ARGV[@]}" < "$PROMPT_FILE" > "$JSONL" 2> "$ERR"
  fi
) || rc=$?
unset API_KEY

# ---- 成否判定の材料を機械回収 -----------------------------------------------
# codex は stdout に JSONL を吐く。thread.started の id と turn.completed の到達を拾う。
THREAD_ID="$(jq -rs 'map(select(.type=="thread.started")) | (.[0].thread_id // "")' "$JSONL" 2>/dev/null || printf '')"
TURN_DONE="$(jq -rs 'any(.[]; .type=="turn.completed") // false' "$JSONL" 2>/dev/null || printf 'false')"
if [ -n "$SCHEMA" ] && [ -s "$OUT" ] && jq -e '.' "$OUT" >/dev/null 2>&1; then SCHEMA_OK=true; else SCHEMA_OK=false; fi
[ -n "$SCHEMA" ] || SCHEMA_OK=true

jq -n --arg task "$TASK_ID" --arg label "$LABEL" --argjson rc "$rc" \
      --arg out "$OUT" --arg err "$ERR" --arg jsonl "$JSONL" \
      --arg thread "$THREAD_ID" --argjson done "$TURN_DONE" --argjson sok "$SCHEMA_OK" \
      --arg ksrc "$KEY_SOURCE" \
  '{task_id:$task, label:$label, rc:$rc, out:$out, err:$err, jsonl:$jsonl,
    thread_id:(if $thread=="" then null else $thread end),
    turn_completed:$done, schema_ok:$sok, key_source:$ksrc}'
exit "$rc"
