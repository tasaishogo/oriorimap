import { describe, expect, it } from 'vitest';
import { userSchema } from '@oriorimap/shared';

const validUser = {
  userId: 'user-001',
  displayName: '花子',
  status: 'active',
  createdAt: '2026-08-12T00:00:00.000Z',
};

describe('userSchema', () => {
  it('妥当なUserを受理する', () => {
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('pending_delete状態＋deleteRequestedAt付きのUserを受理する', () => {
    const result = userSchema.safeParse({
      ...validUser,
      status: 'pending_delete',
      deleteRequestedAt: '2026-08-12T01:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('statusが不正な値の場合は失敗する', () => {
    const result = userSchema.safeParse({ ...validUser, status: 'banned' });
    expect(result.success).toBe(false);
  });
});
