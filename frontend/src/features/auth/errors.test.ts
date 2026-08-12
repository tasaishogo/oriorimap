import { translateAuthError } from './errors';

describe('translateAuthError', () => {
  it('既知のCognitoエラー名を日本語メッセージへ変換する', () => {
    expect(translateAuthError({ name: 'UsernameExistsException' })).toContain('既に登録');
    expect(translateAuthError({ name: 'CodeMismatchException' })).toContain('確認コード');
    expect(translateAuthError({ name: 'NotAuthorizedException' })).toContain(
      'メールアドレスまたはパスワード',
    );
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
