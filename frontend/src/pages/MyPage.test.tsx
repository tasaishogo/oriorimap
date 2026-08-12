import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '@/features/auth/AuthContext';
import type { AuthContextValue } from '@/features/auth/types';
import MyPage from './MyPage';

const { fetchMe } = vi.hoisted(() => ({ fetchMe: vi.fn() }));
vi.mock('@/features/auth/api', () => ({ fetchMe }));

function renderWithAuth(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <MyPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('MyPage', () => {
  beforeEach(() => {
    fetchMe.mockReset();
  });

  it('未ログインの場合はログインへの案内を表示し、プロフィールは取得しない（R1.6）', () => {
    renderWithAuth({
      status: 'unauthenticated',
      userId: null,
      refresh: async () => {},
      signOut: vi.fn(),
    });

    expect(screen.getByText(/ログイン/)).toBeInTheDocument();
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it('ログイン済みの場合はプロフィールを取得して表示する', async () => {
    fetchMe.mockResolvedValue({
      userId: 'user-1',
      displayName: '花子',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      email: 'hanako@example.com',
    });
    renderWithAuth({
      status: 'authenticated',
      userId: 'user-1',
      refresh: async () => {},
      signOut: vi.fn(),
    });

    expect(await screen.findByText('花子')).toBeInTheDocument();
    expect(screen.getByText('hanako@example.com')).toBeInTheDocument();
  });

  it('プロフィール取得に失敗した場合はエラーメッセージを表示する（B4・C2）', async () => {
    fetchMe.mockRejectedValue(new Error('network error'));
    renderWithAuth({
      status: 'authenticated',
      userId: 'user-1',
      refresh: async () => {},
      signOut: vi.fn(),
    });

    expect(await screen.findByText('プロフィールの取得に失敗しました。')).toBeInTheDocument();
  });

  it('ログアウトボタンを押すとsignOutが呼ばれる', async () => {
    fetchMe.mockResolvedValue({
      userId: 'user-1',
      displayName: '花子',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      email: null,
    });
    const signOut = vi.fn().mockResolvedValue(undefined);
    renderWithAuth({ status: 'authenticated', userId: 'user-1', refresh: async () => {}, signOut });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'ログアウト' }));

    expect(signOut).toHaveBeenCalled();
  });
});
