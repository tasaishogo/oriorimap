import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from './AuthContext';
import { LoginForm } from './LoginForm';
import type { AuthContextValue } from './types';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock('aws-amplify/auth', () => ({ signIn }));

function renderForm(onSuccess = vi.fn(), onNeedsConfirmation = vi.fn()) {
  const authValue: AuthContextValue = {
    status: 'unauthenticated',
    userId: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn(),
  };
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <LoginForm onSuccess={onSuccess} onNeedsConfirmation={onNeedsConfirmation} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { onSuccess, onNeedsConfirmation };
}

describe('LoginForm', () => {
  beforeEach(() => {
    signIn.mockReset();
  });

  it('ログイン成功時はonSuccessを呼ぶ', async () => {
    signIn.mockResolvedValue({ isSignedIn: true });
    const { onSuccess } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'abcd1234');
    await user.click(screen.getByRole('button', { name: 'ログインする' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('未確認アカウントの場合はonNeedsConfirmationへメールアドレスを渡す', async () => {
    signIn.mockResolvedValue({ isSignedIn: false, nextStep: { signInStep: 'CONFIRM_SIGN_UP' } });
    const { onNeedsConfirmation } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'abcd1234');
    await user.click(screen.getByRole('button', { name: 'ログインする' }));

    await waitFor(() => expect(onNeedsConfirmation).toHaveBeenCalledWith('hanako@example.com'));
  });

  it('認証失敗時はエラーメッセージを表示する', async () => {
    signIn.mockRejectedValue({ name: 'NotAuthorizedException' });
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'ログインする' }));

    expect(
      await screen.findByText('メールアドレスまたはパスワードが正しくありません。'),
    ).toBeInTheDocument();
  });

  it('ロックアウト時はロックアウト専用のメッセージを表示する（R1.7・design §7）', async () => {
    signIn.mockRejectedValue({
      name: 'NotAuthorizedException',
      message: 'Password attempts exceeded',
    });
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'ログインする' }));

    expect(
      await screen.findByText(
        'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください。',
      ),
    ).toBeInTheDocument();
  });

  it('未入力での送信は拒否され、signInは呼ばれない（A6）', async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'ログインする' }));

    expect(
      await screen.findByText('メールアドレスとパスワードを入力してください。'),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
});
