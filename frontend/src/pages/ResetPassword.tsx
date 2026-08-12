import { useNavigate } from 'react-router-dom';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';

export default function ResetPassword() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-md space-y-6 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        パスワードの再設定
      </h1>
      <ResetPasswordForm
        onSuccess={() => {
          void navigate('/login', { state: { passwordReset: true } });
        }}
      />
    </section>
  );
}
