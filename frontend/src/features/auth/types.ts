export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  userId: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}
