import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConfirmForm } from '@/features/auth/ConfirmForm';

interface ConfirmLocationState {
  email?: string;
}

export default function Confirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as ConfirmLocationState | null)?.email;

  return (
    <section className="mx-auto max-w-md space-y-6 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        確認コードの入力
      </h1>
      {email ? (
        <ConfirmForm
          email={email}
          onSuccess={() => {
            void navigate('/login', { state: { confirmed: true } });
          }}
        />
      ) : (
        <p className="text-muted-foreground">
          確認するメールアドレスが分かりませんでした。
          <Link to="/signup" className="text-primary underline underline-offset-4">
            新規登録
          </Link>
          からやり直してください。
        </p>
      )}
    </section>
  );
}
