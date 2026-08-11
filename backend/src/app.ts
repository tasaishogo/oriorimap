import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { logger } from './lib/logger.js';
import { toErrorResponse } from './lib/error-response.js';

type Bindings = {
  requestContext?: { requestId?: string };
};

export const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) => c.json({ status: 'ok' }));

// JWT Authorizerの検証自体はAPI Gateway側の責務のため、Lambda内のハンドラはhealthと同一（design §4.2）。
app.get('/api/health-auth', (c) => c.json({ status: 'ok' }));

app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Not Found' }, 404));

app.onError((err, c) => {
  const requestId = c.env?.requestContext?.requestId;
  logger.error('unhandled error', { err, requestId });

  const { status, body } = toErrorResponse(err);
  return c.json(body, status as ContentfulStatusCode);
});
