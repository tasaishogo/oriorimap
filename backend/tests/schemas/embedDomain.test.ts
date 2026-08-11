import { describe, expect, it } from 'vitest';
import { embedDomainSchema } from '@oriorimap/shared';

const validEmbedDomain = {
  targetType: 'map',
  targetId: 'map-001',
  domain: 'example.com',
  includeSubdomains: false,
  createdAt: '2026-08-12T00:00:00.000Z',
};

describe('embedDomainSchema', () => {
  it('妥当なEmbedDomainを受理する', () => {
    const result = embedDomainSchema.safeParse(validEmbedDomain);
    expect(result.success).toBe(true);
  });

  it('includeSubdomains=trueのEmbedDomainを受理する', () => {
    const result = embedDomainSchema.safeParse({ ...validEmbedDomain, includeSubdomains: true });
    expect(result.success).toBe(true);
  });

  it('targetTypeがmap/overlay以外の場合は失敗する', () => {
    const result = embedDomainSchema.safeParse({ ...validEmbedDomain, targetType: 'spot' });
    expect(result.success).toBe(false);
  });
});
