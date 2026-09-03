import { z } from "zod";

export const messageTypeEnum = z.enum([
  "text",
  "image",
  "video",
  "audio",
  "file",
  "contact",
  "location",
]);

export const sendMessageSchema = z.object({
  type: messageTypeEnum,
  content: z.string().max(4000).optional(),
  mediaUrl: z.string().url().optional(),
  mediaThumbnailUrl: z.string().url().optional(),
  mediaDurationMs: z.number().int().positive().optional(),
  replyToMessageId: z.string().uuid().optional(),
}).refine((data) => data.type === "text" ? !!data.content?.trim() : true, {
  message: "Text messages require content",
  path: ["content"],
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const deleteMessageSchema = z.object({
  forEveryone: z.boolean().default(false),
});

export const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export const listMessagesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
