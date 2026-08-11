import { z } from 'zod';

export const rateLimitSchema = z.object({
  reporterHash: z.string(),
  hour: z.string(),
  count: z.number().int().min(0),
  ttl: z.number().int(),
});

export type RateLimit = z.infer<typeof rateLimitSchema>;
