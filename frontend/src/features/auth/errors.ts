// Cognito/Amplifyの例外名を日本語の案内文へ翻訳する。
const MESSAGES: Record<string, string> = {
  UsernameExistsException: 'このメールアドレスは既に登録されています。ログインをお試しください。',
  InvalidPasswordException: 'パスワードは8文字以上で、英小文字と数字を含めてください。',
  InvalidParameterException: '入力内容を確認してください。',
  CodeMismatchException: '確認コードが正しくありません。',
  ExpiredCodeException: '確認コードの有効期限が切れています。再送信してください。',
  LimitExceededException: '試行回数が上限に達しました。しばらくしてからお試しください。',
  TooManyRequestsException: 'リクエストが多すぎます。しばらくしてからお試しください。',
  TooManyFailedAttemptsException: '試行回数が上限に達しました。しばらくしてからお試しください。',
  NotAuthorizedException: 'メールアドレスまたはパスワードが正しくありません。',
  UserNotFoundException: 'メールアドレスまたはパスワードが正しくありません。',
  UserNotConfirmedException:
    'メールアドレスの確認が完了していません。確認コードを入力してください。',
  AliasExistsException: 'このメールアドレスは既に登録されています。ログインをお試しください。',
};

function errorName(err: unknown): string | undefined {
  return err && typeof err === 'object' && 'name' in err ? String(err.name) : undefined;
}

function errorMessage(err: unknown): string {
  return err && typeof err === 'object' && 'message' in err ? String(err.message) : '';
}

// Cognito標準ロックアウト（design §7・R1.7）はNotAuthorizedExceptionのまま
// message差分でしか区別できない（"Password attempts exceeded"）。
// Hosted UIを使わないため表示は自前実装で分岐する。
export function isLockoutError(err: unknown): boolean {
  return (
    errorName(err) === 'NotAuthorizedException' && /attempts exceeded/i.test(errorMessage(err))
  );
}

export function translateAuthError(err: unknown): string {
  if (isLockoutError(err)) {
    return 'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください。';
  }
  const name = errorName(err);
  if (name && name in MESSAGES) {
    return MESSAGES[name];
  }
  return '処理に失敗しました。しばらくしてからもう一度お試しください。';
}
