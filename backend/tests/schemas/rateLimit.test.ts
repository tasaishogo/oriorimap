import { describe, expect, it } from 'vitest';
import { rateLimitSchema } from '@oriorimap/shared';

const validRateLimit = {
  reporterHash: 'a'.repeat(64),
  hour: '2026081200',
  count: 1,
  ttl: 1786600000,
};

describe('rateLimitSchema', () => {
  it('妥当なRateLimitを受理する', () => {
    const result = rateLimitSchema.safeParse(validRateLimit);
    expect(result.success).toBe(true);
  });

  it('countが負数の場合は失敗する', () => {
    const result = rateLimitSchema.safeParse({ ...validRateLimit, count: -1 });
    expect(result.success).toBe(false);
  });
});
