#!/bin/bash
# T012 verify — 認証スライス①（自前ログインUI・保護ルート・プロフィール）
#
# 1. auth/me系を含む単体テスト（backend/frontend）を実行する
# 2. dev環境（spoke: oriorimap）へ curl し、
#    - JWTなしの GET /api/me が 401
#    - テストユーザーのJWT付き（admin-initiate-auth で取得）で GET /api/me が 200
#    を確認する
#
# e2e前提のテストユーザー: このスクリプトが admin-create-user で idempotent に作成する
# （T036のPlaywright E2Eも同じユーザー・パスワードを使い回せる）。
set -euo pipefail

STACK_NAME="oriorimap-dev"
REGION="ap-northeast-1"
TEST_EMAIL="t012-verify@oriorimap.invalid"
TEST_PASSWORD="verify1234"

echo "==> [1/3] 単体テスト（backend/frontend の auth・me 系を含む）"
npm test -w backend
npm test -w frontend

echo "==> [2/3] spoke（oriorimap）の一時クレデンシャルを取得"
eval "$(mvm-target-env oriorimap)"

echo "==> スタックOutputsを取得"
outputs_json="$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].Outputs' --output json)"

app_url="$(echo "$outputs_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(o['OutputValue'] for o in d if o['OutputKey']=='AppUrl'))")"
user_pool_id="$(echo "$outputs_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(o['OutputValue'] for o in d if o['OutputKey']=='UserPoolId'))")"
client_id="$(echo "$outputs_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(o['OutputValue'] for o in d if o['OutputKey']=='UserPoolClientId'))")"

echo "AppUrl=$app_url"

echo "==> テストユーザーを用意（既存ならスキップ。べき等）"
if ! aws cognito-idp admin-get-user \
  --user-pool-id "$user_pool_id" --username "$TEST_EMAIL" --region "$REGION" >/dev/null 2>&1; then
  aws cognito-idp admin-create-user \
    --user-pool-id "$user_pool_id" --username "$TEST_EMAIL" \
    --user-attributes Name=email,Value="$TEST_EMAIL" Name=email_verified,Value=true Name=name,Value="T012検証ユーザー" \
    --message-action SUPPRESS --region "$REGION" >/dev/null
fi
aws cognito-idp admin-set-user-password \
  --user-pool-id "$user_pool_id" --username "$TEST_EMAIL" \
  --password "$TEST_PASSWORD" --permanent --region "$REGION" >/dev/null

echo "==> テストユーザーのJWTを取得（ADMIN_USER_PASSWORD_AUTH。design §4.3のT003/T036向けフロー）"
auth_result="$(aws cognito-idp admin-initiate-auth \
  --user-pool-id "$user_pool_id" --client-id "$client_id" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME="$TEST_EMAIL",PASSWORD="$TEST_PASSWORD" \
  --region "$REGION")"
id_token="$(echo "$auth_result" | python3 -c "import json,sys; print(json.load(sys.stdin)['AuthenticationResult']['IdToken'])")"

echo "==> [3/3] /api/me を検証"

unauth_status="$(curl -s -o /dev/null -w '%{http_code}' "$app_url/api/me")"
if [ "$unauth_status" != "401" ]; then
  echo "FAIL: JWTなしの GET /api/me が 401 ではなく $unauth_status" >&2
  exit 1
fi
echo "OK: JWTなしの GET /api/me -> 401"

auth_response="$(curl -s -w '\n%{http_code}' -H "Authorization: Bearer $id_token" "$app_url/api/me")"
auth_status="$(echo "$auth_response" | tail -n1)"
auth_body="$(echo "$auth_response" | sed '$d')"
if [ "$auth_status" != "200" ]; then
  echo "FAIL: JWT付き GET /api/me が 200 ではなく $auth_status（body: $auth_body）" >&2
  exit 1
fi
echo "OK: JWT付き GET /api/me -> 200 (body: $auth_body)"

echo "==> T012 verify PASSED"
