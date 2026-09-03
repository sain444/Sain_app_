import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";

const registerDeviceSchema = z.object({
  pushToken: z.string().min(10),
  platform: z.enum(["ios", "android", "web"]),
});

export async function devicesRoutes(app: FastifyInstance) {
  // Registers an Expo push token for this device. Called once on login /
  // app start — see mobile src/services/push.ts.
  app.post("/devices", { preHandler: requireAuth }, async (request, reply) => {
    const body = registerDeviceSchema.parse(request.body);

    const existing = await prisma.device.findFirst({
      where: { userId: request.userId!, pushToken: body.pushToken },
    });
    if (existing) return reply.send({ device: existing });

    const device = await prisma.device.create({
      data: { userId: request.userId!, pushToken: body.pushToken, platform: body.platform },
    });
    return reply.code(201).send({ device });
  });

  app.delete("/devices/:pushToken", { preHandler: requireAuth }, async (request, reply) => {
    const { pushToken } = request.params as { pushToken: string };
    await prisma.device.deleteMany({ where: { userId: request.userId!, pushToken } });
    return reply.send({ ok: true });
  });
}
