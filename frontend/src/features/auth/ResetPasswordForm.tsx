import { useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { preventSubmitWhileComposing } from './composition';
import { translateAuthError } from './errors';
import { isValidPassword } from './validation';

// design §7「パスワード無しアカウントの再設定要求」（R1.9）: Cognitoは
// パスワードを持たない（Googleログインのみの）アカウントに対して再設定要求を
// 拒否する（InvalidParameterException）。この場合だけGoogleログインを案内する。
function translateRequestError(err: unknown): string {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : undefined;
  if (name === 'InvalidParameterException') {
    return 'このアカウントはパスワードが設定されていません。Googleでログインしてください。';
  }
  return translateAuthError(err);
}

type Step = 'request' | 'confirm';

export function ResetPasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  async function handleRequestSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) {
      setFormError('メールアドレスを入力してください。');
      emailRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ username: email });
      setStep('confirm');
    } catch (err) {
      setFormError(translateRequestError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const nextErrors: { newPassword?: string } = {};
    if (!code.trim()) {
      setFormError('確認コードを入力してください。');
      return;
    }
    if (!isValidPassword(newPassword)) {
      nextErrors.newPassword = 'パスワードは8文字以上で、英小文字と数字を含めてください。';
    }
    setErrors(nextErrors);
    if (nextErrors.newPassword) {
      newPasswordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await confirmResetPassword({ username: email, confirmationCode: code.trim(), newPassword });
      onSuccess();
    } catch (err) {
      setFormError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'request') {
    return (
      <form
        onSubmit={(e) => void handleRequestSubmit(e)}
        onKeyDown={preventSubmitWhileComposing}
        noValidate
        className="space-y-4"
      >
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          登録済みのメールアドレスに再設定用の確認コードを送信します。
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="reset-email">メールアドレス</Label>
          <Input
            id="reset-email"
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          確認コードを送信する
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleConfirmSubmit(e)}
      onKeyDown={preventSubmitWhileComposing}
      noValidate
      className="space-y-4"
    >
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        {email} 宛に送信した確認コードと、新しいパスワードを入力してください。
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="reset-code">確認コード</Label>
        <Input
          id="reset-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reset-new-password">新しいパスワード</Label>
        <Input
          id="reset-new-password"
          ref={newPasswordRef}
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setErrors((prev) => ({ ...prev, newPassword: undefined }));
          }}
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          aria-describedby={
            errors.newPassword ? 'reset-new-password-error' : 'reset-new-password-hint'
          }
        />
        {errors.newPassword ? (
          <p id="reset-new-password-error" role="alert" className="text-sm text-destructive">
            {errors.newPassword}
          </p>
        ) : (
          <p id="reset-new-password-hint" className="text-sm text-muted-foreground">
            8文字以上・英小文字と数字を含めてください。
          </p>
        )}
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        パスワードを再設定する
      </Button>
    </form>
  );
}
