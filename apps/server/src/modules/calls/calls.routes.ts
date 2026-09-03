import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { startCallSchema, updateCallSchema } from "./calls.schema.js";
import { startCall, endCall, listCallHistory, getIceServers } from "./calls.service.js";
import { AuthError } from "../auth/auth.service.js";

export async function callsRoutes(app: FastifyInstance) {
  app.get("/calls/ice-servers", { preHandler: requireAuth }, async (_request, reply) => {
    return reply.send({ iceServers: getIceServers() });
  });

  app.get("/calls/history", { preHandler: requireAuth }, async (request, reply) => {
    const calls = await listCallHistory(request.userId!);
    return reply.send({ calls });
  });

  app.post("/calls", { preHandler: requireAuth }, async (request, reply) => {
    const body = startCallSchema.parse(request.body);
    try {
      const call = await startCall(body.id, request.userId!, body.conversationId, body.type);
      return reply.code(201).send({ call });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.patch("/calls/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCallSchema.parse(request.body);
    try {
      const call = await endCall(id, body.status, request.userId!);
      if (!call) return reply.code(404).send({ error: "Call not found" });
      return reply.send({ call });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}
