import { z } from 'zod';

export const embedDomainSchema = z.object({
  targetType: z.enum(['map', 'overlay']),
  targetId: z.string(),
  domain: z.string().min(1),
  includeSubdomains: z.boolean(),
  createdAt: z.string(),
});

export type EmbedDomain = z.infer<typeof embedDomainSchema>;
