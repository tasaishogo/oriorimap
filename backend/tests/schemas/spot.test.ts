import { describe, expect, it } from 'vitest';
import { spotSchema } from '@oriorimap/shared';

const validSpot = {
  spotId: 'spot-001',
  mapId: 'map-001',
  title: '桜並木',
  lat: 35.6812,
  lng: 139.7671,
  description: '満開の時期がおすすめ',
  icon: { type: 'preset', value: 'pin-sakura' },
};

describe('spotSchema', () => {
  it('妥当なpresetアイコンのSpotを受理する', () => {
    const result = spotSchema.safeParse(validSpot);
    expect(result.success).toBe(true);
  });

  it('妥当なcustomアイコンのSpotを受理する', () => {
    const result = spotSchema.safeParse({
      ...validSpot,
      icon: { type: 'custom', value: 'img-001' },
    });
    expect(result.success).toBe(true);
  });

  it('photoKey・linkUrlを含むSpotを受理する', () => {
    const result = spotSchema.safeParse({
      ...validSpot,
      photoKey: 'photos/spot-001.jpg',
      linkUrl: 'https://example.com/spot-001',
    });
    expect(result.success).toBe(true);
  });

  it('titleが空文字列の場合は失敗する（R2.6）', () => {
    const result = spotSchema.safeParse({ ...validSpot, title: '' });
    expect(result.success).toBe(false);
  });

  it('icon.typeがpreset/custom以外の場合は失敗する', () => {
    const result = spotSchema.safeParse({
      ...validSpot,
      icon: { type: 'invalid', value: 'x' },
    });
    expect(result.success).toBe(false);
  });
});
