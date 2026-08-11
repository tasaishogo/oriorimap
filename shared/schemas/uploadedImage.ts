import { z } from 'zod';

export const uploadedImageSchema = z.object({
  imageId: z.string(),
  ownerId: z.string(),
  kind: z.enum(['icon', 'photo']),
  s3Key: z.string(),
  status: z.enum(['pending', 'validated', 'attached', 'pending_delete']),
  createdAt: z.string(),
});

export type UploadedImage = z.infer<typeof uploadedImageSchema>;
