import { useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { signUp } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { preventSubmitWhileComposing } from './composition';
import { translateAuthError } from './errors';
import { isValidEmail, isValidPassword } from './validation';

type FieldErrors = Partial<Record<'displayName' | 'email' | 'password', string>>;

export function SignupForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!displayName.trim()) {
      next.displayName = '表示名を入力してください。';
    }
    if (!isValidEmail(email)) {
      next.email = 'メールアドレスの形式が正しくありません。';
    }
    if (!isValidPassword(password)) {
      next.password = 'パスワードは8文字以上で、英小文字と数字を含めてください。';
    }
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const nextErrors = validate();
    setErrors(nextErrors);
    if (nextErrors.displayName) {
      displayNameRef.current?.focus();
      return;
    }
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        username: email,
        password,
        options: { userAttributes: { email, name: displayName } },
      });
      onSuccess(email);
    } catch (err) {
      setFormError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      onKeyDown={preventSubmitWhileComposing}
      noValidate
      className="space-y-4"
    >
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="signup-displayName">表示名</Label>
        <Input
          id="signup-displayName"
          ref={displayNameRef}
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setErrors((prev) => ({ ...prev, displayName: undefined }));
          }}
          autoComplete="name"
          aria-invalid={!!errors.displayName}
          aria-describedby={errors.displayName ? 'signup-displayName-error' : undefined}
        />
        {errors.displayName && (
          <p id="signup-displayName-error" role="alert" className="text-sm text-destructive">
            {errors.displayName}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-email">メールアドレス</Label>
        <Input
          id="signup-email"
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'signup-email-error' : undefined}
        />
        {errors.email && (
          <p id="signup-email-error" role="alert" className="text-sm text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-password">パスワード</Label>
        <Input
          id="signup-password"
          ref={passwordRef}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-hint'}
        />
        {errors.password ? (
          <p id="signup-password-error" role="alert" className="text-sm text-destructive">
            {errors.password}
          </p>
        ) : (
          <p id="signup-password-hint" className="text-sm text-muted-foreground">
            8文字以上・英小文字と数字を含めてください。
          </p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        登録する
      </Button>
    </form>
  );
}
