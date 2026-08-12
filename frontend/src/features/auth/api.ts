import { fetchAuthSession } from 'aws-amplify/auth';

export interface MeResponse {
  userId: string;
  displayName: string;
  status: 'active' | 'pending_delete';
  deleteRequestedAt?: string;
  createdAt: string;
  email: string | null;
}

// design §2: CloudFrontが単一オリジンに集約するため相対パスでAPIを呼べる（CORS不要）
export async function fetchMe(): Promise<MeResponse> {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();
  if (!idToken) {
    throw new Error('認証セッションが見つかりません');
  }

  const res = await fetch('/api/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    throw new Error(`プロフィールの取得に失敗しました (status: ${res.status})`);
  }
  return (await res.json()) as MeResponse;
}
