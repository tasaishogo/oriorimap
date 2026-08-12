import { useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { signIn } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { preventSubmitWhileComposing } from './composition';
import { translateAuthError } from './errors';
import { useAuth } from './useAuth';

export function LoginForm({
  onSuccess,
  onNeedsConfirmation,
}: {
  onSuccess: () => void;
  onNeedsConfirmation: (email: string) => void;
}) {
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('メールアドレスとパスワードを入力してください。');
      emailRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) {
        await refresh();
        onSuccess();
        return;
      }
      if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        onNeedsConfirmation(email);
        return;
      }
      setFormError('この方法ではログインできません。');
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
        <Label htmlFor="login-email">メールアドレス</Label>
        <Input
          id="login-email"
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="login-password">パスワード</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        ログインする
      </Button>
    </form>
  );
}
