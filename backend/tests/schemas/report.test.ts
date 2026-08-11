import { describe, expect, it } from 'vitest';
import { reportSchema } from '@oriorimap/shared';

const validReport = {
  reportId: 'report-001',
  targetType: 'map',
  targetId: 'map-001',
  reason: '不適切な内容が含まれています',
  status: 'open',
  reporterHash: 'a'.repeat(64),
  createdAt: '2026-08-12T00:00:00.000Z',
};

describe('reportSchema', () => {
  it('妥当なReportを受理する', () => {
    const result = reportSchema.safeParse(validReport);
    expect(result.success).toBe(true);
  });

  it('status=doneのReportを受理する', () => {
    const result = reportSchema.safeParse({ ...validReport, status: 'done' });
    expect(result.success).toBe(true);
  });

  it('statusがopen/done以外の場合は失敗する', () => {
    const result = reportSchema.safeParse({ ...validReport, status: 'closed' });
    expect(result.success).toBe(false);
  });
});
