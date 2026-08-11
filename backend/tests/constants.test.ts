import { describe, expect, it } from 'vitest';
import { LIMITS, KASANE_COLORS } from '@oriorimap/shared';

describe('LIMITS', () => {
  it('確定値どおりのアイコン最大バイト数を持つ', () => {
    expect(LIMITS.iconMaxBytes).toBe(1048576);
  });

  it('確定値どおりの写真最大バイト数を持つ', () => {
    expect(LIMITS.photoMaxBytes).toBe(5242880);
  });

  it('確定値どおりの地図あたりスポット上限を持つ', () => {
    expect(LIMITS.spotsPerMap).toBe(1000);
  });

  it('確定値どおりの重ね合わせ地図数上限を持つ', () => {
    expect(LIMITS.overlayMapsMax).toBe(10);
  });

  it('確定値どおりの通報者あたり時間レート上限を持つ', () => {
    expect(LIMITS.reportsPerHourPerReporter).toBe(10);
  });
});

describe('KASANE_COLORS', () => {
  it('10色定義されている', () => {
    expect(KASANE_COLORS.length).toBe(10);
  });

  it('重複する色を含まない', () => {
    expect(new Set(KASANE_COLORS).size).toBe(10);
  });

  it('先頭5色はdesign §5.2で明記された確定値と完全一致する', () => {
    expect(KASANE_COLORS.slice(0, 5)).toEqual([
      '#D0576B',
      '#DFA820',
      '#7FA85B',
      '#3A8FA3',
      '#8A76B5',
    ]);
  });

  it('残り5色は#RRGGBB形式である（具体色値はアサーション対象外）', () => {
    for (const color of KASANE_COLORS.slice(5)) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
