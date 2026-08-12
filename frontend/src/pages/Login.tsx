import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/features/auth/LoginForm';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoginLocationState {
  from?: { pathname: string; search: string };
  confirmed?: boolean;
  passwordReset?: boolean;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LoginLocationState | null;
  const redirectTo = state?.from ? `${state.from.pathname}${state.from.search}` : '/mypage';

  return (
    <section className="mx-auto max-w-md space-y-6 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        ログイン
      </h1>
      {state?.confirmed && (
        <Alert>
          <AlertDescription>登録が完了しました。ログインしてください。</AlertDescription>
        </Alert>
      )}
      {state?.passwordReset && (
        <Alert>
          <AlertDescription>
            パスワードを再設定しました。新しいパスワードでログインしてください。
          </AlertDescription>
        </Alert>
      )}
      <LoginForm
        onSuccess={() => {
          void navigate(redirectTo, { replace: true });
        }}
        onNeedsConfirmation={(email) => {
          void navigate('/confirm', { state: { email } });
        }}
      />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">または</span>
        </div>
      </div>
      <GoogleSignInButton />
      <p className="text-sm text-muted-foreground">
        <Link to="/reset-password" className="text-primary underline underline-offset-4">
          パスワードをお忘れですか？
        </Link>
      </p>
      <p className="text-sm text-muted-foreground">
        アカウントをお持ちでない方は{' '}
        <Link to="/signup" className="text-primary underline underline-offset-4">
          新規登録
        </Link>
      </p>
    </section>
  );
}
