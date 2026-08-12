import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth';
import { AuthContext } from './AuthContext';
import type { AuthStatus } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUserId(current.userId);
      setStatus('authenticated');
    } catch {
      setUserId(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((current) => {
        if (!cancelled) {
          setUserId(current.userId);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUserId(null);
          setStatus('unauthenticated');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUserId(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({ status, userId, refresh, signOut }),
    [status, userId, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
