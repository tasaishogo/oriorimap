import { describe, expect, it } from 'vitest';
import { mapSchema } from '@oriorimap/shared';

const validMap = {
  mapId: 'map-001',
  title: '近所の花見スポット',
  description: '桜が綺麗な場所を集めました',
  tags: ['桜', '花見'],
  status: 'public',
  ownerId: 'user-001',
  ownerName: '花子',
  spotCount: 3,
  updatedAt: '2026-08-12T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
};

describe('mapSchema', () => {
  it('妥当なMapを受理する', () => {
    const result = mapSchema.safeParse(validMap);
    expect(result.success).toBe(true);
  });

  it('status=privateのMapを受理する', () => {
    const result = mapSchema.safeParse({ ...validMap, status: 'private' });
    expect(result.success).toBe(true);
  });

  it('statusがpublic/private以外の場合は失敗する', () => {
    const result = mapSchema.safeParse({ ...validMap, status: 'archived' });
    expect(result.success).toBe(false);
  });
});
