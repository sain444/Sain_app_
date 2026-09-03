import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { createUploadTarget } from "./media.service.js";
import { prisma } from "../../db/prisma.js";

const uploadUrlSchema = z.object({
  mimeType: z.string().min(3),
});

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Cap local-fallback upload size to prevent disk-fill abuse (S3 path has no
// such limit imposed here — configure that at the bucket/CDN level instead).
const MAX_LOCAL_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

export async function mediaRoutes(app: FastifyInstance) {
  app.post("/media/upload-url", { preHandler: requireAuth }, async (request, reply) => {
    const body = uploadUrlSchema.parse(request.body);
    const publicBaseUrl = `${request.protocol}://${request.headers.host}`;

    try {
      const target = await createUploadTarget(body.mimeType, publicBaseUrl, request.userId!);
      return reply.send(target);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Invalid file type" });
    }
  });

  // Local dev fallback receiver — only used when no S3 credentials are
  // configured (see media.service.ts). Requires auth so random clients
  // can't fill the disk.
  app.post(
    "/media/upload/:key",
    { preHandler: requireAuth, bodyLimit: MAX_LOCAL_UPLOAD_BYTES },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      // Reject path traversal in the key.
      if (key.includes("..") || key.includes("/")) {
        return reply.code(400).send({ error: "Invalid upload key" });
      }

      const grant = await prisma.mediaUploadGrant.findUnique({ where: { key } });
      if (!grant || grant.userId !== request.userId || grant.expiresAt <= new Date() || grant.usedAt) {
        return reply.code(403).send({ error: "Invalid or expired upload grant" });
      }

      const data = await request.file();
      if (!data) return reply.code(400).send({ error: "No file provided" });
      if (data.mimetype !== grant.mimeType) return reply.code(400).send({ error: "MIME type does not match upload grant" });

      const destPath = path.join(UPLOADS_DIR, key);
      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(destPath);
        data.file.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      await prisma.mediaUploadGrant.update({ where: { id: grant.id }, data: { usedAt: new Date() } });
      return reply.send({ ok: true, key });
    }
  );
}
