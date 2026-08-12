import { useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { preventSubmitWhileComposing } from './composition';
import { translateAuthError } from './errors';

export function ConfirmForm({ email, onSuccess }: { email: string; onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!code.trim()) {
      setError('確認コードを入力してください。');
      codeRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code.trim() });
      onSuccess();
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendSignUpCode({ username: email });
      setInfo('確認コードを再送信しました。');
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      onKeyDown={preventSubmitWhileComposing}
      noValidate
      className="space-y-4"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {info && (
        <Alert>
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        {email} 宛に送信した確認コードを入力してください。
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-code">確認コード</Label>
        <Input
          id="confirm-code"
          ref={codeRef}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-invalid={!!error}
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        確認する
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={resending}
        onClick={() => void handleResend()}
        className="w-full"
      >
        {resending && <Loader2 className="animate-spin" aria-hidden="true" />}
        確認コードを再送信する
      </Button>
    </form>
  );
}
