import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ResetPasswordForm } from './ResetPasswordForm';

const { resetPassword, confirmResetPassword } = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
}));
vi.mock('aws-amplify/auth', () => ({ resetPassword, confirmResetPassword }));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    resetPassword.mockReset();
    confirmResetPassword.mockReset();
  });

  it('メール未入力で送信するとエラーを表示しresetPasswordを呼ばない', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '確認コードを送信する' }));

    expect(await screen.findByText('メールアドレスを入力してください。')).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('メール送信に成功すると確認コード・新パスワード入力へ進む', async () => {
    resetPassword.mockResolvedValue({
      nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
    });
    const user = userEvent.setup();
    render(<ResetPasswordForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.click(screen.getByRole('button', { name: '確認コードを送信する' }));

    expect(await screen.findByLabelText('確認コード')).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith({ username: 'hanako@example.com' });
  });

  it('パスワードを持たないアカウント（Google連携のみ）はR1.9の案内を表示する', async () => {
    resetPassword.mockRejectedValue({ name: 'InvalidParameterException' });
    const user = userEvent.setup();
    render(<ResetPasswordForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('メールアドレス'), 'google-only@example.com');
    await user.click(screen.getByRole('button', { name: '確認コードを送信する' }));

    expect(
      await screen.findByText(
        'このアカウントはパスワードが設定されていません。Googleでログインしてください。',
      ),
    ).toBeInTheDocument();
    // 確認コード入力へは進まない
    expect(screen.queryByLabelText('確認コード')).not.toBeInTheDocument();
  });

  it('確認コード・新パスワードを送信するとconfirmResetPasswordが呼ばれ成功時onSuccessを呼ぶ', async () => {
    resetPassword.mockResolvedValue({
      nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
    });
    confirmResetPassword.mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<ResetPasswordForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.click(screen.getByRole('button', { name: '確認コードを送信する' }));
    await screen.findByLabelText('確認コード');

    await user.type(screen.getByLabelText('確認コード'), '123456');
    await user.type(screen.getByLabelText('新しいパスワード'), 'abcd1234');
    await user.click(screen.getByRole('button', { name: 'パスワードを再設定する' }));

    await waitFor(() =>
      expect(confirmResetPassword).toHaveBeenCalledWith({
        username: 'hanako@example.com',
        confirmationCode: '123456',
        newPassword: 'abcd1234',
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it('新パスワードがポリシー違反の場合はインラインエラーを表示しconfirmResetPasswordを呼ばない', async () => {
    resetPassword.mockResolvedValue({
      nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
    });
    const user = userEvent.setup();
    render(<ResetPasswordForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.click(screen.getByRole('button', { name: '確認コードを送信する' }));
    await screen.findByLabelText('確認コード');

    await user.type(screen.getByLabelText('確認コード'), '123456');
    await user.type(screen.getByLabelText('新しいパスワード'), 'short');
    await user.click(screen.getByRole('button', { name: 'パスワードを再設定する' }));

    expect(
      await screen.findByText('パスワードは8文字以上で、英小文字と数字を含めてください。'),
    ).toBeInTheDocument();
    expect(confirmResetPassword).not.toHaveBeenCalled();
  });
});
