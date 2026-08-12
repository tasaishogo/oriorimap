import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { fetchMe, type MeResponse } from '@/features/auth/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// 未ログイン訪問者はProtectedRoute（routes.tsx）が/loginへ誘導するため、
// ここに到達する時点で常にauthenticated（R1.6）。
export default function MyPage() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingProfile = !profile && !error;

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) {
          setProfile(me);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('プロフィールの取得に失敗しました。');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        マイページ
      </h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loadingProfile && (
        <p role="status" className="text-muted-foreground">
          読み込み中…
        </p>
      )}
      {profile && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div>
            <p className="font-medium">{profile.displayName}</p>
            {profile.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            ログアウト
          </Button>
        </div>
      )}
      <p className="text-muted-foreground">自分が作成した地図・重ね合わせ地図の一覧です。</p>
    </section>
  );
}
