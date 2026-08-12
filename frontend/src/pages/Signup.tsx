import { Link, useNavigate } from 'react-router-dom';
import { SignupForm } from '@/features/auth/SignupForm';

export default function Signup() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-md space-y-6 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        新規登録
      </h1>
      <SignupForm
        onSuccess={(email) => {
          void navigate('/confirm', { state: { email } });
        }}
      />
      <p className="text-sm text-muted-foreground">
        すでにアカウントをお持ちの方は{' '}
        <Link to="/login" className="text-primary underline underline-offset-4">
          ログイン
        </Link>
      </p>
    </section>
  );
}
