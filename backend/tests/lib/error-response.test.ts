import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toErrorResponse } from '../../src/lib/error-response';
import { AppError } from '../../src/lib/errors';

describe('toErrorResponse', () => {
  it('AppErrorはそのままのstatus/codeを返す', () => {
    const error = new AppError(409, 'CONFLICT', 'スポット数が上限に達しています');
    const result = toErrorResponse(error);

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('CONFLICT');
    expect(result.body.message).toBe('スポット数が上限に達しています');
  });

  it('ZodErrorはstatus:400・code:VALIDATION_ERROR・detailsありを返す', () => {
    const schema = z.object({ title: z.string().min(1) });
    const parsed = schema.safeParse({ title: '' });
    if (parsed.success) {
      throw new Error('テスト前提が崩れている: バリデーションは失敗するはず');
    }

    const result = toErrorResponse(parsed.error);

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('VALIDATION_ERROR');
    expect(result.body.details).toBeDefined();
  });

  it('通常のErrorはstatus:500・code:INTERNAL_ERRORを返す', () => {
    const result = toErrorResponse(new Error('unexpected failure'));

    expect(result.status).toBe(500);
    expect(result.body.code).toBe('INTERNAL_ERROR');
  });
});
