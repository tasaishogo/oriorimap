import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthContextValue } from './types';

// AuthProviderの外（route単位のテスト等）で使われても未ログイン扱いで
// 安全に振る舞う（白画面・例外落ちにしない。design §5.3 C2の方針に合わせる）。
const FALLBACK_CONTEXT: AuthContextValue = {
  status: 'unauthenticated',
  userId: null,
  refresh: async () => {},
  signOut: async () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  return ctx ?? FALLBACK_CONTEXT;
}
