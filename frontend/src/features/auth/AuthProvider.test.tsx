import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

const { getCurrentUser, signOut } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('aws-amplify/auth', () => ({ getCurrentUser, signOut }));

function Probe() {
  const { status, userId, signOut: doSignOut } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="userId">{userId ?? ''}</span>
      <button onClick={() => void doSignOut()}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    signOut.mockReset();
  });

  it('セッションが有効な場合はauthenticatedになりuserIdを保持する', async () => {
    getCurrentUser.mockResolvedValue({ userId: 'user-123', username: 'hanako@example.com' });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('userId')).toHaveTextContent('user-123');
  });

  it('セッションが無い場合はunauthenticatedになる（白画面・無限ローディングにしない）', async () => {
    getCurrentUser.mockRejectedValue(new Error('not signed in'));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('signOut呼び出し後はunauthenticatedへ遷移する', async () => {
    getCurrentUser.mockResolvedValue({ userId: 'user-123', username: 'hanako@example.com' });
    signOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    await user.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });
});
