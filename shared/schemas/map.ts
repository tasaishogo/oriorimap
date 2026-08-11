import { z } from 'zod';

export const mapSchema = z.object({
  mapId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()),
  status: z.enum(['public', 'private']),
  ownerId: z.string(),
  ownerName: z.string(),
  spotCount: z.number().int().min(0),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export type Map = z.infer<typeof mapSchema>;
