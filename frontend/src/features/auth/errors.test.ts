import { isLockoutError, translateAuthError } from './errors';

describe('translateAuthError', () => {
  it('既知のCognitoエラー名を日本語メッセージへ変換する', () => {
    expect(translateAuthError({ name: 'UsernameExistsException' })).toContain('既に登録');
    expect(translateAuthError({ name: 'CodeMismatchException' })).toContain('確認コード');
    expect(translateAuthError({ name: 'NotAuthorizedException' })).toContain(
      'メールアドレスまたはパスワード',
    );
  });

  it('ロックアウト（Password attempts exceeded）は専用の日本語メッセージにする（R1.7）', () => {
    const message = translateAuthError({
      name: 'NotAuthorizedException',
      message: 'Password attempts exceeded',
    });
    expect(message).toContain('試行回数が上限');
    expect(message).not.toContain('メールアドレスまたはパスワードが正しくありません');
  });

  it('同じNotAuthorizedExceptionでもロックアウト文言を含まない場合は通常の認証失敗メッセージにする', () => {
    const message = translateAuthError({
      name: 'NotAuthorizedException',
      message: 'Incorrect username or password.',
    });
    expect(message).toContain('メールアドレスまたはパスワードが正しくありません');
  });

  it('未知のエラーは汎用メッセージにフォールバックする', () => {
    expect(translateAuthError({ name: 'SomeUnknownException' })).toBe(
      '処理に失敗しました。しばらくしてからもう一度お試しください。',
    );
  });

  it('name プロパティを持たない値でも例外を投げない', () => {
    expect(translateAuthError('plain string')).toBe(
      '処理に失敗しました。しばらくしてからもう一度お試しください。',
    );
    expect(translateAuthError(null)).toBe(
      '処理に失敗しました。しばらくしてからもう一度お試しください。',
    );
  });
});

describe('isLockoutError', () => {
  it('NotAuthorizedException + attempts exceeded を検知する', () => {
    expect(
      isLockoutError({ name: 'NotAuthorizedException', message: 'Password attempts exceeded' }),
    ).toBe(true);
  });

  it('大文字小文字を区別しない', () => {
    expect(isLockoutError({ name: 'NotAuthorizedException', message: 'ATTEMPTS EXCEEDED' })).toBe(
      true,
    );
  });

  it('通常の認証失敗（メッセージが異なる）は検知しない', () => {
    expect(
      isLockoutError({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password.',
      }),
    ).toBe(false);
  });

  it('別のexception名では検知しない', () => {
    expect(isLockoutError({ name: 'TooManyRequestsException', message: 'attempts exceeded' })).toBe(
      false,
    );
  });
});
