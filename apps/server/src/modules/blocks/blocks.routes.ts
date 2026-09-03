import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";

const reportSchema = z.object({
  reason: z.string().min(1).max(500),
  messageId: z.string().uuid().optional(),
});

export async function blocksRoutes(app: FastifyInstance) {
  app.get("/blocks", { preHandler: requireAuth }, async (request, reply) => {
    const blocks = await prisma.block.findMany({
      where: { blockerId: request.userId! },
      include: { blocked: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    return reply.send({ blocks });
  });

  app.post("/users/:id/block", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id === request.userId) return reply.code(400).send({ error: "You can't block yourself" });
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return reply.code(404).send({ error: "User not found" });

    const block = await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: request.userId!, blockedId: id } },
      update: {},
      create: { blockerId: request.userId!, blockedId: id },
    });
    return reply.code(201).send({ block });
  });

  app.delete("/users/:id/block", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.block.deleteMany({ where: { blockerId: request.userId!, blockedId: id } });
    return reply.send({ ok: true });
  });

  app.post("/users/:id/report", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id === request.userId) return reply.code(400).send({ error: "You can't report yourself" });
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return reply.code(404).send({ error: "User not found" });
    const body = reportSchema.parse(request.body);
    if (body.messageId) {
      const message = await prisma.message.findUnique({ where: { id: body.messageId }, select: { conversationId: true, senderId: true } });
      if (!message || message.senderId !== id) return reply.code(400).send({ error: "Message does not belong to the reported user" });
      const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: message.conversationId, userId: request.userId! } } });
      if (!member) return reply.code(403).send({ error: "You are not a member of that conversation" });
    }
    const report = await prisma.report.create({
      data: { reporterId: request.userId!, reportedId: id, reason: body.reason, messageId: body.messageId },
    });
    return reply.code(201).send({ report });
  });
}
