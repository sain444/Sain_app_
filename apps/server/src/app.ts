import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { conversationsRoutes } from "./modules/conversations/conversations.routes.js";
import { messagesRoutes } from "./modules/messages/messages.routes.js";
import { callsRoutes } from "./modules/calls/calls.routes.js";
import { mediaRoutes } from "./modules/media/media.routes.js";
import { devicesRoutes } from "./modules/devices/devices.routes.js";
import { blocksRoutes } from "./modules/blocks/blocks.routes.js";
import { storiesRoutes } from "./modules/stories/stories.routes.js";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import path from "path";

export async function buildApp() {
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(cors, {
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  });

  // Global baseline rate limit; individual routes (like OTP request) can
  // override with stricter per-route limits via route config.
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.setErrorHandler(errorHandler);

  await app.register(fastifyMultipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "uploads"),
    prefix: "/uploads/",
  });

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(conversationsRoutes);
  await app.register(messagesRoutes);
  await app.register(callsRoutes);
  await app.register(mediaRoutes);
  await app.register(devicesRoutes);
  await app.register(blocksRoutes);
  await app.register(storiesRoutes);

  app.addHook("onRequest", async (request) => {
    logger.debug({ method: request.method, url: request.url }, "incoming request");
  });

  return app;
}
