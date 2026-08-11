import { z } from 'zod';

export const pendingDeleteSchema = z.object({
  deletedAt: z.string(),
  s3Key: z.string().min(1),
});

export type PendingDelete = z.infer<typeof pendingDeleteSchema>;
