import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ConfirmForm } from './ConfirmForm';

const { confirmSignUp, resendSignUpCode } = vi.hoisted(() => ({
  confirmSignUp: vi.fn(),
  resendSignUpCode: vi.fn(),
}));
vi.mock('aws-amplify/auth', () => ({ confirmSignUp, resendSignUpCode }));

describe('ConfirmForm', () => {
  beforeEach(() => {
    confirmSignUp.mockReset();
    resendSignUpCode.mockReset();
  });

  it('コードを入力して送信するとconfirmSignUpが呼ばれ成功時にonSuccessを呼ぶ', async () => {
    confirmSignUp.mockResolvedValue({ isSignUpComplete: true });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmForm email="hanako@example.com" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('確認コード'), '123456');
    await user.click(screen.getByRole('button', { name: '確認する' }));

    await waitFor(() =>
      expect(confirmSignUp).toHaveBeenCalledWith({
        username: 'hanako@example.com',
        confirmationCode: '123456',
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it('コード未入力で送信するとエラーを表示しconfirmSignUpを呼ばない', async () => {
    const user = userEvent.setup();
    render(<ConfirmForm email="hanako@example.com" onSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '確認する' }));

    expect(await screen.findByText('確認コードを入力してください。')).toBeInTheDocument();
    expect(confirmSignUp).not.toHaveBeenCalled();
  });

  it('コード不一致の場合はエラーメッセージを表示する', async () => {
    confirmSignUp.mockRejectedValue({ name: 'CodeMismatchException' });
    const user = userEvent.setup();
    render(<ConfirmForm email="hanako@example.com" onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('確認コード'), '000000');
    await user.click(screen.getByRole('button', { name: '確認する' }));

    expect(await screen.findByText('確認コードが正しくありません。')).toBeInTheDocument();
  });

  it('再送信ボタンでresendSignUpCodeが呼ばれ完了メッセージが表示される', async () => {
    resendSignUpCode.mockResolvedValue({ destination: 'h***@example.com' });
    const user = userEvent.setup();
    render(<ConfirmForm email="hanako@example.com" onSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '確認コードを再送信する' }));

    expect(await screen.findByText('確認コードを再送信しました。')).toBeInTheDocument();
    expect(resendSignUpCode).toHaveBeenCalledWith({ username: 'hanako@example.com' });
  });
});
