import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import type { AuthContextValue } from './types';

const baseValue: AuthContextValue = {
  status: 'loading',
  userId: null,
  refresh: async () => {},
  signOut: async () => {},
};

function renderWithAuth(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>secret content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('認証状態解決中はローディング表示のみで、保護対象もログイン画面も表示しない', () => {
    renderWithAuth({ ...baseValue, status: 'loading' });
    expect(screen.getByRole('status')).toHaveTextContent('読み込み中');
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('未ログインの場合は/loginへリダイレクトする（R1.6）', () => {
    renderWithAuth({ ...baseValue, status: 'unauthenticated' });
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('ログイン済みの場合は子要素を表示する', () => {
    renderWithAuth({ ...baseValue, status: 'authenticated', userId: 'user-1' });
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});
