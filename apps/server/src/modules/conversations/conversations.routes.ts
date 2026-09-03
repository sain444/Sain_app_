import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { createConversationSchema, updateConversationSchema } from "./conversations.schema.js";
import {
  createConversation,
  listConversationsForUser,
  getConversationForUser,
  assertMembership,
} from "./conversations.service.js";
import { prisma } from "../../db/prisma.js";
import { AuthError } from "../auth/auth.service.js";

export async function conversationsRoutes(app: FastifyInstance) {
  app.get("/conversations", { preHandler: requireAuth }, async (request, reply) => {
    const conversations = await listConversationsForUser(request.userId!);
    return reply.send({ conversations });
  });

  app.post("/conversations", { preHandler: requireAuth }, async (request, reply) => {
    const body = createConversationSchema.parse(request.body);
    try {
      const conversation = await createConversation(request.userId!, body);
      return reply.code(201).send({ conversation });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.get("/conversations/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const conversation = await getConversationForUser(id, request.userId!);
      return reply.send({ conversation });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.patch("/conversations/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateConversationSchema.parse(request.body);
    await assertMembership(id, request.userId!);
    const conversation = await prisma.conversation.update({ where: { id }, data: body });
    return reply.send({ conversation });
  });

  app.post("/conversations/:id/mute", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await assertMembership(id, request.userId!);
    const updated = await prisma.conversationMember.update({
      where: { id: member.id },
      data: { isMuted: !member.isMuted },
    });
    return reply.send({ isMuted: updated.isMuted });
  });

  app.post("/conversations/:id/archive", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await assertMembership(id, request.userId!);
    const updated = await prisma.conversationMember.update({
      where: { id: member.id },
      data: { isArchived: !member.isArchived },
    });
    return reply.send({ isArchived: updated.isArchived });
  });
}
