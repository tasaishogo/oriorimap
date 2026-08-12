import { vi } from 'vitest';
import { fetchMe } from './api';

const { fetchAuthSession } = vi.hoisted(() => ({ fetchAuthSession: vi.fn() }));
vi.mock('aws-amplify/auth', () => ({ fetchAuthSession }));

describe('fetchMe', () => {
  beforeEach(() => {
    fetchAuthSession.mockReset();
    vi.restoreAllMocks();
  });

  it('IDトークンをAuthorizationヘッダーに付けて/api/meを呼ぶ', async () => {
    fetchAuthSession.mockResolvedValue({ tokens: { idToken: { toString: () => 'token-abc' } } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          userId: 'u1',
          displayName: '花子',
          status: 'active',
          createdAt: 'x',
          email: 'a@example.com',
        }),
        { status: 200 },
      ),
    );

    const result = await fetchMe();

    expect(fetchMock).toHaveBeenCalledWith('/api/me', {
      headers: { Authorization: 'Bearer token-abc' },
    });
    expect(result.displayName).toBe('花子');
  });

  it('IDトークンが無い場合はエラーを投げる', async () => {
    fetchAuthSession.mockResolvedValue({ tokens: undefined });
    await expect(fetchMe()).rejects.toThrow('認証セッションが見つかりません');
  });

  it('APIが失敗ステータスを返した場合はエラーを投げる', async () => {
    fetchAuthSession.mockResolvedValue({ tokens: { idToken: { toString: () => 'token-abc' } } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    await expect(fetchMe()).rejects.toThrow('プロフィールの取得に失敗しました');
  });
});
