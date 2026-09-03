import { z } from "zod";

export const startCallSchema = z.object({
  id: z.string().uuid(), // client-generated call id, shared across signaling + this record
  conversationId: z.string().uuid(),
  type: z.enum(["audio", "video"]),
});

export const updateCallSchema = z.object({
  status: z.enum(["missed", "completed", "declined", "failed"]),
  endedAt: z.string().datetime().optional(),
});
