import { z } from 'zod';

export const userSchema = z
  .object({
    userId: z.string(),
    displayName: z.string().min(1),
    status: z.enum(['active', 'pending_delete']),
    deleteRequestedAt: z.string().optional(),
    createdAt: z.string(),
  })
  .refine((user) => user.status !== 'pending_delete' || user.deleteRequestedAt !== undefined, {
    message: 'deleteRequestedAt is required when status is pending_delete',
    path: ['deleteRequestedAt'],
  });

export type User = z.infer<typeof userSchema>;
