import { isValidEmail, isValidPassword } from './validation';

describe('isValidEmail', () => {
  it('通常のメールアドレスを受理する', () => {
    expect(isValidEmail('hanako@example.com')).toBe(true);
  });

  it('@が無い場合は拒否する', () => {
    expect(isValidEmail('hanako.example.com')).toBe(false);
  });

  it('ドメイン部にドットが無い場合は拒否する', () => {
    expect(isValidEmail('hanako@example')).toBe(false);
  });

  it('空白を含む場合は拒否する', () => {
    expect(isValidEmail('hanako @example.com')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('8文字以上・英小文字・数字を含む場合は受理する（Cognito PasswordPolicyに一致）', () => {
    expect(isValidPassword('abcd1234')).toBe(true);
  });

  it('7文字以下は拒否する', () => {
    expect(isValidPassword('abc123')).toBe(false);
  });

  it('数字が無い場合は拒否する', () => {
    expect(isValidPassword('abcdefgh')).toBe(false);
  });

  it('英小文字が無い場合は拒否する', () => {
    expect(isValidPassword('12345678')).toBe(false);
  });
});
