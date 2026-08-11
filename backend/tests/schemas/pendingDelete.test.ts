import { describe, expect, it } from 'vitest';
import { pendingDeleteSchema } from '@oriorimap/shared';

const validPendingDelete = {
  s3Key: 'uploads/img-001.png',
  deletedAt: '2026-08-12T00:00:00.000Z',
};

describe('pendingDeleteSchema', () => {
  it('妥当なPendingDeleteを受理する', () => {
    const result = pendingDeleteSchema.safeParse(validPendingDelete);
    expect(result.success).toBe(true);
  });

  it('s3Keyが空文字列の場合は失敗する', () => {
    const result = pendingDeleteSchema.safeParse({ ...validPendingDelete, s3Key: '' });
    expect(result.success).toBe(false);
  });
});
