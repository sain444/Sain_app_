import { z } from "zod";

export const createConversationSchema = z.object({
  type: z.enum(["direct", "group"]),
  memberIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(80).optional(), // required for groups, validated in service
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
