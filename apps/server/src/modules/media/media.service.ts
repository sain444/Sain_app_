import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";

const s3Configured = !!(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);

const s3Client = s3Configured
  ? new S3Client({
      region: env.S3_REGION || "auto",
      endpoint: env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/", "application/pdf"];

export function isAllowedMimeType(mimeType: string) {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

/**
 * Returns instructions for the client to upload a file directly.
 *
 * - If S3 credentials are configured, returns a presigned PUT URL — the
 *   client uploads straight to object storage, and our server never touches
 *   the file bytes (production path).
 * - If not configured, returns a URL pointing at this server's own
 *   `/media/upload/:key` endpoint (dev/local fallback — see media.routes.ts)
 *   so the whole app is runnable without any cloud account.
 */
export async function createUploadTarget(mimeType: string, publicBaseUrl: string, userId: string) {
  if (!isAllowedMimeType(mimeType)) {
    throw new Error(`File type ${mimeType} is not allowed`);
  }

  const key = `${uuid()}-${Date.now()}`;

  if (s3Client) {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = env.S3_PUBLIC_BASE_URL
      ? `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`
      : env.S3_ENDPOINT
        ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`
        : `https://${env.S3_BUCKET}.s3.amazonaws.com/${key}`;

    await prisma.mediaUploadGrant.create({
      data: { userId, key, mimeType, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    return { uploadUrl, publicUrl, method: "PUT" as const, mode: "s3" as const, key };
  }

  // Local dev fallback
  await prisma.mediaUploadGrant.create({
    data: { userId, key, mimeType, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });

  return {
    uploadUrl: `${publicBaseUrl}/media/upload/${key}`,
    publicUrl: `${publicBaseUrl}/uploads/${key}`,
    method: "POST" as const,
    mode: "local" as const,
    key,
  };
}

export const isS3Configured = s3Configured;

export async function consumeUploadGrant(userId: string, mediaUrl: string) {
  let key: string;
  try {
    const parsed = new URL(mediaUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    key = segments[segments.length - 1] ?? "";
  } catch {
    return false;
  }
  if (!key) return false;

  const grant = await prisma.mediaUploadGrant.findUnique({ where: { key } });
  if (!grant || grant.userId !== userId || grant.expiresAt <= new Date() || grant.usedAt) return false;

  await prisma.mediaUploadGrant.update({ where: { id: grant.id }, data: { usedAt: new Date() } });
  return true;
}
