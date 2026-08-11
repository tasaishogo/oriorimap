import { z } from 'zod';

export const reportSchema = z.object({
  reportId: z.string(),
  targetType: z.enum(['map', 'overlay']),
  targetId: z.string(),
  reason: z.string().min(1),
  status: z.enum(['open', 'done']),
  reporterHash: z.string(),
  createdAt: z.string(),
});

export type Report = z.infer<typeof reportSchema>;
