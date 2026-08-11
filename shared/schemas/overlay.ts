import { z } from 'zod';

export const overlayMapSchema = z.object({
  overlayId: z.string(),
  title: z.string().min(1),
  mapIds: z.array(z.string()).min(1).max(10),
  status: z.enum(['public', 'private']),
  ownerId: z.string(),
  ownerName: z.string(),
  updatedAt: z.string(),
});

export type OverlayMap = z.infer<typeof overlayMapSchema>;
