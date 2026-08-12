import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { GoogleSignInButton } from './GoogleSignInButton';

const { signInWithRedirect } = vi.hoisted(() => ({ signInWithRedirect: vi.fn() }));
vi.mock('aws-amplify/auth', () => ({ signInWithRedirect }));

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    signInWithRedirect.mockReset();
  });

  it('クリックするとsignInWithRedirectがGoogleプロバイダで呼ばれる', async () => {
    signInWithRedirect.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<GoogleSignInButton />);

    await user.click(screen.getByRole('button', { name: 'Googleでログイン' }));

    expect(signInWithRedirect).toHaveBeenCalledWith({ provider: 'Google' });
  });

  it('失敗した場合はエラーメッセージを表示する（B4）', async () => {
    signInWithRedirect.mockRejectedValue({ name: 'NotAuthorizedException' });
    const user = userEvent.setup();
    render(<GoogleSignInButton />);

    await user.click(screen.getByRole('button', { name: 'Googleでログイン' }));

    expect(
      await screen.findByText('メールアドレスまたはパスワードが正しくありません。'),
    ).toBeInTheDocument();
  });
});
