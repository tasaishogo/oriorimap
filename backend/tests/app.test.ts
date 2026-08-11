import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('app', () => {
  it('GET /api/health は200とstatus:okを返す', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/health-auth は200とstatus:okを返す', async () => {
    const res = await app.request('/api/health-auth');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('未定義ルートは404・code:NOT_FOUNDを返す', async () => {
    const res = await app.request('/api/__does-not-exist__');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe('NOT_FOUND');
  });
});
