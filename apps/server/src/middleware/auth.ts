import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../utils/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

/**
 * Fastify preHandler that requires a valid Bearer access token.
 * Attaches `request.userId` on success, or replies 401 on failure.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    request.userId = payload.userId;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired access token" });
  }
}
