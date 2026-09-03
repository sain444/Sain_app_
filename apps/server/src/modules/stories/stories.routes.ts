import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";
import { consumeUploadGrant } from "../media/media.service.js";

const createStorySchema = z.object({
  mediaUrl: z.string().url(),
  caption: z.string().max(200).optional(),
  audience: z.enum(["everyone", "contacts", "contacts_except", "only_share_with"]).default("contacts"),
  audienceUserIds: z.array(z.string().uuid()).max(500).default([]),
}).superRefine((data, ctx) => {
  if ((data.audience === "contacts_except" || data.audience === "only_share_with") && data.audienceUserIds.length === 0) {
    ctx.addIssue({ code: "custom", path: ["audienceUserIds"], message: "Select at least one user" });
  }
});

const STORY_LIFETIME_HOURS = 24;

async function contactIds(userId: string) {
  const [contacts, directMembers] = await Promise.all([
    prisma.contact.findMany({ where: { ownerId: userId }, select: { contactUserId: true } }),
    prisma.conversationMember.findMany({
      where: { userId, conversation: { type: "direct" } },
      select: { conversationId: true },
    }),
  ]);
  const directIds = directMembers.length
    ? await prisma.conversationMember.findMany({
        where: { conversationId: { in: directMembers.map((m) => m.conversationId) }, userId: { not: userId } },
        select: { userId: true },
      })
    : [];
  return [...new Set([...contacts.map((r) => r.contactUserId), ...directIds.map((r) => r.userId)])];
}

async function canViewStory(story: { userId: string; audience: string; audienceUserIds: unknown }, viewerId: string) {
  if (story.userId === viewerId) return true;
  if (story.audience === "everyone") return true;
  const selected = Array.isArray(story.audienceUserIds) ? story.audienceUserIds.filter((v): v is string => typeof v === "string") : [];
  if (story.audience === "only_share_with") return selected.includes(viewerId);
  const contacts = await contactIds(story.userId);
  if (story.audience === "contacts") return contacts.includes(viewerId);
  return contacts.includes(viewerId) && !selected.includes(viewerId);
}

export async function storiesRoutes(app: FastifyInstance) {
  app.post("/stories", { preHandler: requireAuth }, async (request, reply) => {
    const body = createStorySchema.parse(request.body);
    const allowed = await consumeUploadGrant(request.userId!, body.mediaUrl);
    if (!allowed) return reply.code(400).send({ error: "Media upload is invalid, expired, or already used" });

    const story = await prisma.story.create({
      data: {
        userId: request.userId!,
        mediaUrl: body.mediaUrl,
        caption: body.caption,
        audience: body.audience,
        audienceUserIds: body.audienceUserIds,
        expiresAt: new Date(Date.now() + STORY_LIFETIME_HOURS * 60 * 60 * 1000),
      },
    });
    return reply.code(201).send({ story });
  });

  app.get("/stories", { preHandler: requireAuth }, async (request, reply) => {
    const stories = await prisma.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        views: { where: { viewerId: request.userId! }, select: { viewerId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const visible = [];
    for (const story of stories) {
      if (await canViewStory(story, request.userId!)) visible.push(story);
    }
    return reply.send({ stories: visible });
  });

  app.post("/stories/:id/view", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const story = await prisma.story.findUnique({ where: { id } });
    if (!story || story.expiresAt <= new Date()) return reply.code(404).send({ error: "Story not found" });
    if (!(await canViewStory(story, request.userId!))) return reply.code(403).send({ error: "You cannot view this story" });
    const view = await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId: id, viewerId: request.userId! } },
      update: { viewedAt: new Date() },
      create: { storyId: id, viewerId: request.userId! },
    });
    return reply.send({ view });
  });

  app.delete("/stories/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const story = await prisma.story.findUnique({ where: { id } });
    if (!story || story.userId !== request.userId) return reply.code(403).send({ error: "You can only delete your own stories" });
    await prisma.story.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
