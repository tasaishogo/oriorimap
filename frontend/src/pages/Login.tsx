import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/features/auth/LoginForm';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoginLocationState {
  from?: { pathname: string; search: string };
  confirmed?: boolean;
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
      <LoginForm
        onSuccess={() => {
          void navigate(redirectTo, { replace: true });
        }}
        onNeedsConfirmation={(email) => {
          void navigate('/confirm', { state: { email } });
        }}
      />
      <p className="text-sm text-muted-foreground">
        アカウントをお持ちでない方は{' '}
        <Link to="/signup" className="text-primary underline underline-offset-4">
          新規登録
        </Link>
      </p>
    </section>
  );
}
