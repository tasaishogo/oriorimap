import { z, ZodError } from 'zod';
import { AppError } from './errors.js';

export function toErrorResponse(err: unknown): {
  status: number;
  body: { code: string; message: string; details?: unknown };
} {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { code: err.code, message: err.message, details: err.details },
    };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'リクエストの検証に失敗しました',
        details: z.treeifyError(err),
      },
    };
  }

  return {
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: '予期しないエラーが発生しました' },
  };
}
