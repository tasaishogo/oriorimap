import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SignupForm } from './SignupForm';

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));
vi.mock('aws-amplify/auth', () => ({ signUp }));

describe('SignupForm', () => {
  beforeEach(() => {
    signUp.mockReset();
  });

  it('未入力のまま送信すると各項目にインラインエラーが表示され、最初のエラー欄にフォーカスが移る（A6/A7）', async () => {
    const user = userEvent.setup();
    render(<SignupForm onSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '登録する' }));

    expect(await screen.findByText('表示名を入力してください。')).toBeInTheDocument();
    expect(screen.getByLabelText('表示名')).toHaveFocus();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('正しい入力で送信するとsignUpが呼ばれ、成功時にonSuccessへメールアドレスが渡る', async () => {
    signUp.mockResolvedValue({
      isSignUpComplete: false,
      nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<SignupForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('表示名'), '花子');
    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'abcd1234');
    await user.click(screen.getByRole('button', { name: '登録する' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('hanako@example.com'));
    expect(signUp).toHaveBeenCalledWith({
      username: 'hanako@example.com',
      password: 'abcd1234',
      options: { userAttributes: { email: 'hanako@example.com', name: '花子' } },
    });
  });

  it('登録済みメールアドレスの場合はエラーメッセージを表示する（B4）', async () => {
    signUp.mockRejectedValue({ name: 'UsernameExistsException' });
    const user = userEvent.setup();
    render(<SignupForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('表示名'), '花子');
    await user.type(screen.getByLabelText('メールアドレス'), 'hanako@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'abcd1234');
    await user.click(screen.getByRole('button', { name: '登録する' }));

    expect(await screen.findByText(/既に登録されています/)).toBeInTheDocument();
  });

  it('IME変換確定のEnterでは送信されない（A2/A9）', () => {
    render(<SignupForm onSuccess={vi.fn()} />);
    const form = screen.getByLabelText('表示名').closest('form');
    expect(form).not.toBeNull();

    fireEvent.keyDown(form as HTMLFormElement, { key: 'Enter', isComposing: true });

    expect(signUp).not.toHaveBeenCalled();
  });

  it('メールアドレス欄への貼り付けを妨げない（A3）', async () => {
    const user = userEvent.setup();
    render(<SignupForm onSuccess={vi.fn()} />);
    const input = screen.getByLabelText('メールアドレス');

    await user.click(input);
    await user.paste('pasted@example.com');

    expect(input).toHaveValue('pasted@example.com');
  });
});
