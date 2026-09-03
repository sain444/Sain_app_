import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  reactSchema,
  listMessagesQuerySchema,
} from "./messages.schema.js";
import {
  sendMessage,
  listMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
  removeReaction,
  markReceipt,
  pinMessage,
  searchMessages,
} from "./messages.service.js";
import { AuthError } from "../auth/auth.service.js";
import { emitToConversation, emitToUser } from "../../realtime/gateway.js";
import { sendPushToUser } from "../devices/push.service.js";
import { prisma } from "../../db/prisma.js";

export async function messagesRoutes(app: FastifyInstance) {
  app.get(
    "/conversations/:conversationId/messages",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const query = listMessagesQuerySchema.parse(request.query);
      try {
        const messages = await listMessages(conversationId, request.userId!, query.cursor, query.limit);
        return reply.send({ messages });
      } catch (err) {
        if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post(
    "/conversations/:conversationId/messages",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const body = sendMessageSchema.parse(request.body);
      try {
        const message = await sendMessage(conversationId, request.userId!, body);
        emitToConversation(conversationId, "message:new", message);

        // Fire-and-forget push to everyone else in the conversation. Not
        // awaited so it never slows down the message-send response.
        prisma.conversationMember
          .findMany({ where: { conversationId, userId: { not: request.userId! } } })
          .then((members) => {
            const senderName = message.sender?.displayName ?? "Someone";
            const preview = body.type === "text" ? body.content ?? "" : `Sent a ${body.type}`;
            for (const member of members) {
              sendPushToUser(member.userId, senderName, preview, { conversationId }).catch(() => {});
            }
          })
          .catch(() => {});

        return reply.code(201).send({ message });
      } catch (err) {
        if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    }
  );

  app.patch("/messages/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = editMessageSchema.parse(request.body);
    try {
      const message = await editMessage(id, request.userId!, body.content);
      emitToConversation(message.conversationId, "message:edited", message);
      return reply.send({ message });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.delete("/messages/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = deleteMessageSchema.parse(request.body ?? {});
    try {
      const message = await deleteMessage(id, request.userId!, body.forEveryone);
      const deletedForEveryone = body.forEveryone;
      const event = { id: message.id, deletedFor: deletedForEveryone ? "everyone" : "me" };
      if (deletedForEveryone) emitToConversation(message.conversationId, "message:deleted", event);
      else emitToUser(request.userId!, "message:hidden", event);
      return reply.send({ message });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.post("/messages/:id/reactions", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = reactSchema.parse(request.body);
    try {
      const reaction = await reactToMessage(id, request.userId!, body.emoji);
      return reply.send({ reaction });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.delete("/messages/:id/reactions", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await removeReaction(id, request.userId!);
      return reply.send({ ok: true });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.post("/messages/:id/receipt", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: "delivered" | "read" };
    try {
      const receipt = await markReceipt(id, request.userId!, status);
      return reply.send({ receipt });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.get(
    "/conversations/:conversationId/messages/search",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const { q } = request.query as { q?: string };
      if (!q || q.trim().length === 0) return reply.send({ messages: [] });
      try {
        const messages = await searchMessages(conversationId, request.userId!, q.trim());
        return reply.send({ messages });
      } catch (err) {
        if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post(
    "/conversations/:conversationId/pin/:messageId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { conversationId, messageId } = request.params as {
        conversationId: string;
        messageId: string;
      };
      try {
        const pinned = await pinMessage(conversationId, messageId, request.userId!);
        emitToConversation(conversationId, "message:pinned", pinned);
        return reply.send({ pinned });
      } catch (err) {
        if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    }
  );
}
