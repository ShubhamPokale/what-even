import { z } from 'zod';

export const ClientEventSchema = z.object({
  type: z.enum(['CLICK', 'TICK', 'REFRESH', 'EGG', 'RESET']),
  payload: z
    .object({
      elementId: z.string().max(100).optional(),
      deltaSeconds: z.number().int().min(1).max(60).optional(),
      eggId: z.string().max(100).optional(),
    })
    .optional(),
});

export type ValidatedClientEvent = z.infer<typeof ClientEventSchema>;

export const VisitorStateSchema = z.object({
  id: z.string().uuid(),
  visitCount: z.number().int().nonnegative(),
  sessionCount: z.number().int().nonnegative(),
  refreshCount: z.number().int().nonnegative(),
  timeSpentSeconds: z.number().int().nonnegative(),
  clicks: z.record(z.string(), z.number().int().nonnegative()),
  corruptionLevel: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  eggsFound: z.array(z.string()),
  endingsSeen: z.array(z.string()),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
});
