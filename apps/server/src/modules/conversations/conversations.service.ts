import { prisma } from "../../db/prisma.js";
import { AuthError } from "../auth/auth.service.js";
import type { CreateConversationInput } from "./conversations.schema.js";

async function visibleMemberUser(user: any, viewerId: string) {
  if (user.id === viewerId) return user;
  const contact = await prisma.contact.findUnique({ where: { ownerId_contactUserId: { ownerId: user.id, contactUserId: viewerId } } });
  const safe = { ...user };
  if (user.privacyProfilePhoto === "nobody" || (user.privacyProfilePhoto === "contacts" && !contact)) safe.avatarUrl = null;
  if (user.privacyLastSeen === "nobody" || (user.privacyLastSeen === "contacts" && !contact)) safe.lastSeenAt = null;
  delete safe.privacyLastSeen; delete safe.privacyProfilePhoto; delete safe.privacyReadReceipts;
  return safe;
}

async function sanitizeConversation(conversation: any, viewerId: string) {
  const members = await Promise.all(conversation.members.map(async (m: any) => ({ ...m, user: m.user ? await visibleMemberUser(m.user, viewerId) : m.user })));
  return { ...conversation, members };
}

export async function createConversation(creatorId: string, input: CreateConversationInput) {
  const memberIds = Array.from(new Set([creatorId, ...input.memberIds]));

  if (input.type === "direct") {
    if (memberIds.length !== 2) {
      throw new AuthError("Direct conversations must have exactly 2 members", 400);
    }

    // Reuse an existing direct conversation between these two users instead of duplicating.
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "direct",
        AND: memberIds.map((id) => ({ members: { some: { userId: id } } })),
      },
      include: { members: true },
    });
    if (existing && existing.members.length === 2) return existing;
  }

  if (input.type === "group" && !input.title) {
    throw new AuthError("Group conversations require a title", 400);
  }

  return prisma.conversation.create({
    data: {
      type: input.type,
      title: input.title,
      createdBy: creatorId,
      members: {
        create: memberIds.map((userId) => ({
          userId,
          role: userId === creatorId ? "owner" : "member",
        })),
      },
    },
    include: { members: true },
  });
}

export async function listConversationsForUser(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true, status: true, lastSeenAt: true, privacyLastSeen: true, privacyProfilePhoto: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Promise.all(conversations.map((c) => sanitizeConversation(c, userId)));
}

export async function getConversationForUser(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, members: { some: { userId } } },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true, status: true, lastSeenAt: true, privacyLastSeen: true, privacyProfilePhoto: true },
          },
        },
      },
    },
  });
  if (!conversation) throw new AuthError("Conversation not found", 404);
  return sanitizeConversation(conversation, userId);
}

export async function assertMembership(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new AuthError("You are not a member of this conversation", 403);
  return member;
}
