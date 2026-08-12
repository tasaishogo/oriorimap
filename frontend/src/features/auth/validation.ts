// Cognito UserPool のポリシー（template.yaml PasswordPolicy）に合わせたクライアント側事前検証。
// 実際の検証はCognito側でも行われる（R1.3）。
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && /[a-z]/.test(value) && /[0-9]/.test(value);
}
