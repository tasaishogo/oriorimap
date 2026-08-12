#!/bin/bash
# T013 verify — 認証スライス②（Google IdP・パスワード再設定・ロックアウト確認）
#
# 1. auth系を含む単体テスト（backend/frontend）を実行する
# 2. dev環境（spoke: oriorimap）へAWS CLIで、
#    - User PoolにGoogle IdPが登録されていること
#    - アプリクライアントのSupportedIdentityProvidersにGoogleが含まれること
#    - 専用テストユーザーへの誤パスワード連続入力で一時ロック応答
#      （NotAuthorizedException: Password attempts exceeded）になること
#    を確認する
#
# Googleログイン成功・パスワード再設定メール受信と再設定成功・ロック時の
# 日本語エラー表示は実ブラウザ操作を要するため人手確認とし、完了報告に手順と
# 結果を記録する（このスクリプトの範囲外）。
set -euo pipefail

STACK_NAME="oriorimap-dev"
REGION="ap-northeast-1"
LOCKOUT_TEST_EMAIL="t013-lockout-verify@oriorimap.invalid"
LOCKOUT_TEST_PASSWORD="verify1234"

echo "==> [1/3] 単体テスト（backend/frontend の auth 系を含む）"
npm test -w backend
npm test -w frontend

echo "==> [2/3] spoke（oriorimap）の一時クレデンシャルを取得"
eval "$(mvm-target-env oriorimap)"

echo "==> スタックOutputsを取得"
outputs_json="$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].Outputs' --output json)"
user_pool_id="$(echo "$outputs_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(o['OutputValue'] for o in d if o['OutputKey']=='UserPoolId'))")"
client_id="$(echo "$outputs_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(o['OutputValue'] for o in d if o['OutputKey']=='UserPoolClientId'))")"

echo "==> Google IdPがUser Poolに登録されていることを確認"
providers="$(aws cognito-idp list-identity-providers --user-pool-id "$user_pool_id" --region "$REGION" \
  --query 'Providers[].ProviderName' --output text)"
if ! echo "$providers" | grep -qw 'Google'; then
  echo "FAIL: User PoolにGoogle IdPが登録されていません（Providers: $providers）" >&2
  exit 1
fi
echo "OK: Google IdPが登録済み（Providers: $providers）"

echo "==> アプリクライアントのSupportedIdentityProvidersにGoogleが含まれることを確認"
supported="$(aws cognito-idp describe-user-pool-client --user-pool-id "$user_pool_id" --client-id "$client_id" \
  --region "$REGION" --query 'UserPoolClient.SupportedIdentityProviders' --output text)"
if ! echo "$supported" | grep -qw 'Google'; then
  echo "FAIL: アプリクライアントの対応IdPにGoogleが含まれません（SupportedIdentityProviders: $supported）" >&2
  exit 1
fi
echo "OK: アプリクライアントの対応IdPにGoogleを含む（SupportedIdentityProviders: $supported）"

echo "==> [3/3] ロックアウト確認用テストユーザーを用意（既存ならスキップ。べき等）"
if ! aws cognito-idp admin-get-user \
  --user-pool-id "$user_pool_id" --username "$LOCKOUT_TEST_EMAIL" --region "$REGION" >/dev/null 2>&1; then
  aws cognito-idp admin-create-user \
    --user-pool-id "$user_pool_id" --username "$LOCKOUT_TEST_EMAIL" \
    --user-attributes Name=email,Value="$LOCKOUT_TEST_EMAIL" Name=email_verified,Value=true Name=name,Value="T013ロックアウト検証ユーザー" \
    --message-action SUPPRESS --region "$REGION" >/dev/null
fi
aws cognito-idp admin-set-user-password \
  --user-pool-id "$user_pool_id" --username "$LOCKOUT_TEST_EMAIL" \
  --password "$LOCKOUT_TEST_PASSWORD" --permanent --region "$REGION" >/dev/null

echo "==> 誤パスワードを連続送信し、一時ロック応答（Password attempts exceeded相当）になることを確認"
locked=false
for attempt in $(seq 1 8); do
  set +e
  error_output="$(aws cognito-idp admin-initiate-auth \
    --user-pool-id "$user_pool_id" --client-id "$client_id" \
    --auth-flow ADMIN_USER_PASSWORD_AUTH \
    --auth-parameters USERNAME="$LOCKOUT_TEST_EMAIL",PASSWORD="wrong-password-$attempt" \
    --region "$REGION" 2>&1)"
  set -e
  if echo "$error_output" | grep -qi 'attempts exceeded'; then
    echo "OK: ${attempt}回目の誤パスワード送信で一時ロック応答を確認（$error_output）"
    locked=true
    break
  fi
done

if [ "$locked" != "true" ]; then
  echo "FAIL: 8回誤パスワードを送信してもPassword attempts exceeded相当の応答が得られませんでした" >&2
  exit 1
fi

echo "==> T013 verify PASSED"
echo ""
echo "以下は実ブラウザ操作が必要なため人手確認（結果は完了報告に記録）:"
echo "  - Googleでログインボタンから実際にGoogleアカウントでログインできること"
echo "  - パスワード再設定: メール受信・確認コード入力・再設定成功・新パスワードでログイン"
echo "  - パスワード無しアカウント（Google連携のみ）が再設定要求した際の案内表示"
echo "  - ロックアウト時に日本語エラーメッセージがログイン画面に表示されること"
