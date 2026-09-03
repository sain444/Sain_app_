import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_.]+$/i).optional(),
  bio: z.string().max(150).optional(),
  avatarUrl: z.string().url().optional(),
});

export const updatePrivacySchema = z.object({
  privacyLastSeen: z.enum(["everyone", "contacts", "nobody"]).optional(),
  privacyProfilePhoto: z.enum(["everyone", "contacts", "nobody"]).optional(),
  privacyReadReceipts: z.boolean().optional(),
});
