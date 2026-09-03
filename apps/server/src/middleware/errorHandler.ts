import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: "Validation failed",
      details: error.flatten().fieldErrors,
    });
  }

  // Never leak internals to the client in production.
  logger.error({ err: error, path: request.url }, "Unhandled request error");

  const statusCode = error.statusCode ?? 500;
  const message = statusCode < 500 ? error.message : "Internal server error";

  return reply.code(statusCode).send({ error: message });
}
