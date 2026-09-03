import type { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { updateProfileSchema, updatePrivacySchema } from "./users.schema.js";

// Never return passwordHash (or any future sensitive field) to the client.
// Centralized here so every route that returns "me" goes through the same
// allowlist instead of relying on each handler remembering to strip it.
const ME_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  status: true,
  lastSeenAt: true,
  privacyLastSeen: true,
  privacyProfilePhoto: true,
  privacyReadReceipts: true,
  createdAt: true,
} as const;


async function isContact(ownerId: string, viewerId: string) {
  if (ownerId === viewerId) return true;
  const contact = await prisma.contact.findUnique({ where: { ownerId_contactUserId: { ownerId, contactUserId: viewerId } } });
  return !!contact;
}

async function visibleUser(user: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null; bio: string | null; status: string; lastSeenAt: Date | null; privacyLastSeen: string; privacyProfilePhoto: string }, viewerId: string) {
  const contact = await isContact(user.id, viewerId);
  const result = { ...user };
  if (user.id !== viewerId) {
    if (user.avatarUrl && (user.privacyProfilePhoto === "nobody" || (user.privacyProfilePhoto === "contacts" && !contact))) result.avatarUrl = null;
    if (user.privacyLastSeen === "nobody" || (user.privacyLastSeen === "contacts" && !contact)) result.lastSeenAt = null;
  }
  return result;
}

export async function usersRoutes(app: FastifyInstance) {
  app.get("/users/me", { preHandler: requireAuth }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.userId! }, select: ME_SELECT });
    if (!user) return reply.code(404).send({ error: "User not found" });
    return reply.send({ user });
  });

  app.patch("/users/me", { preHandler: requireAuth }, async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);

    if (body.username) {
      const existing = await prisma.user.findUnique({ where: { username: body.username } });
      if (existing && existing.id !== request.userId) {
        return reply.code(409).send({ error: "Username is already taken" });
      }
    }

    const user = await prisma.user.update({
      where: { id: request.userId! },
      data: body,
      select: ME_SELECT,
    });

    return reply.send({ user });
  });

  app.patch("/users/me/privacy", { preHandler: requireAuth }, async (request, reply) => {
    const body = updatePrivacySchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: request.userId! },
      data: body,
      select: ME_SELECT,
    });
    return reply.send({ user });
  });

  // Find a user by exact email, e.g. to start a new chat.
  // Exact-match only (not a fuzzy directory search) to avoid enabling
  // enumeration/harvesting of the user base.
  app.get("/users/search", { preHandler: requireAuth }, async (request, reply) => {
    const { email } = request.query as { email?: string };
    if (!email) return reply.code(400).send({ error: "email query param is required" });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, displayName: true, avatarUrl: true, username: true, status: true, lastSeenAt: true, bio: true, privacyLastSeen: true, privacyProfilePhoto: true },
    });

    if (!user || user.id === request.userId) {
      return reply.send({ user: null });
    }

    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: request.userId!, blockedId: user.id },
          { blockerId: user.id, blockedId: request.userId! },
        ],
      },
    });
    if (blocked) return reply.send({ user: null });

    const safeUser = await visibleUser(user, request.userId!);
    return reply.send({ user: { id: safeUser.id, displayName: safeUser.displayName, avatarUrl: safeUser.avatarUrl, username: safeUser.username, status: safeUser.status, lastSeenAt: safeUser.lastSeenAt } });
  });

  app.get("/users/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true, bio: true, status: true, lastSeenAt: true,
        privacyLastSeen: true, privacyProfilePhoto: true,
      },
    });
    if (!user) return reply.code(404).send({ error: "User not found" });
    const safeUser = await visibleUser(user, request.userId!);
    return reply.send({ user: safeUser });
  });
}
