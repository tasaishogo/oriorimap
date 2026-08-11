import { z } from 'zod';

const spotIconSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('preset'), value: z.string() }),
  z.object({ type: z.literal('custom'), value: z.string() }),
]);

export const spotSchema = z.object({
  spotId: z.string(),
  mapId: z.string(),
  title: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  description: z.string().optional(),
  photoKey: z.string().optional(),
  linkUrl: z.string().optional(),
  icon: spotIconSchema,
});

export type Spot = z.infer<typeof spotSchema>;
