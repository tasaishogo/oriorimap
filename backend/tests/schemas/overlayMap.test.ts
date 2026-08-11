import { describe, expect, it } from 'vitest';
import { overlayMapSchema } from '@oriorimap/shared';

const validOverlay = {
  overlayId: 'ovl-001',
  title: '桜×紅葉がっちゃんこ',
  mapIds: ['map-001', 'map-002'],
  status: 'public',
  ownerId: 'user-001',
  ownerName: '花子',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

describe('overlayMapSchema', () => {
  it('妥当なOverlayMapを受理する', () => {
    const result = overlayMapSchema.safeParse(validOverlay);
    expect(result.success).toBe(true);
  });

  it('mapIdsが上限10件ちょうどの場合は受理する', () => {
    const result = overlayMapSchema.safeParse({
      ...validOverlay,
      mapIds: Array.from({ length: 10 }, (_, i) => `map-${i}`),
    });
    expect(result.success).toBe(true);
  });

  it('mapIdsが11件の場合は失敗する（R4.6上限超過）', () => {
    const result = overlayMapSchema.safeParse({
      ...validOverlay,
      mapIds: Array.from({ length: 11 }, (_, i) => `map-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('mapIdsが0件の場合は失敗する', () => {
    const result = overlayMapSchema.safeParse({ ...validOverlay, mapIds: [] });
    expect(result.success).toBe(false);
  });
});
