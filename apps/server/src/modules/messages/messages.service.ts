import { prisma } from "../../db/prisma.js";
import { AuthError } from "../auth/auth.service.js";
import { assertMembership } from "../conversations/conversations.service.js";
import { consumeUploadGrant } from "../media/media.service.js";
import type { z } from "zod";
import type { sendMessageSchema } from "./messages.schema.js";

type SendMessageInput = z.infer<typeof sendMessageSchema>;

export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: SendMessageInput
) {
  await assertMembership(conversationId, senderId);

  if (input.replyToMessageId) {
    const replyTarget = await prisma.message.findUnique({ where: { id: input.replyToMessageId }, select: { conversationId: true } });
    if (!replyTarget || replyTarget.conversationId !== conversationId) throw new AuthError("Reply target is not in this conversation", 400);
  }

  if (input.mediaUrl) {
    const ok = await consumeUploadGrant(senderId, input.mediaUrl);
    if (!ok) throw new AuthError("Media upload is invalid, expired, or already used", 400);
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      type: input.type,
      content: input.content,
      mediaUrl: input.mediaUrl,
      mediaThumbnailUrl: input.mediaThumbnailUrl,
      mediaDurationMs: input.mediaDurationMs,
      replyToMessageId: input.replyToMessageId,
    },
    include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}

export async function listMessages(
  conversationId: string,
  userId: string,
  cursor: string | undefined,
  limit: number
) {
  await assertMembership(conversationId, userId);

  const messages = await prisma.message.findMany({
    where: { conversationId, hiddenMessages: { none: { userId } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      sender: { select: { id: true, displayName: true, avatarUrl: true } },
      reactions: true,
      receipts: true,
      replyTo: { select: { id: true, content: true, senderId: true, type: true } },
    },
  });

  // A user's read-receipt setting controls whether their read state is exposed.
  const receiptUserIds = [...new Set(messages.flatMap((m) => m.receipts.map((r) => r.userId)))];
  const receiptUsers = receiptUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: receiptUserIds } }, select: { id: true, privacyReadReceipts: true } })
    : [];
  const receiptPrivacy = new Map(receiptUsers.map((u) => [u.id, u.privacyReadReceipts]));

  return messages.map(({ reactions, receipts, ...message }) => ({
    ...message,
    reactions,
    receipts: receipts.filter((r) => r.status === "delivered" || receiptPrivacy.get(r.userId) !== false),
  }));
}

export async function editMessage(messageId: string, userId: string, content: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AuthError("Message not found", 404);
  await assertMembership(message.conversationId, userId);
  if (message.senderId !== userId) throw new AuthError("You can only edit your own messages", 403);
  if (message.isDeleted) throw new AuthError("Cannot edit a deleted message", 400);

  return prisma.message.update({
    where: { id: messageId },
    data: { content, isEdited: true, editedAt: new Date() },
  });
}

export async function deleteMessage(messageId: string, userId: string, forEveryone: boolean) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AuthError("Message not found", 404);
  await assertMembership(message.conversationId, userId);

  // FIX (security audit follow-up): the "delete for me" branch below
  // previously had NO authorization check at all — any authenticated user
  // could call this on any message ID, even in conversations they were
  // never part of. Membership is required for both branches now.

  if (forEveryone) {
    if (message.senderId !== userId) {
      throw new AuthError("Only the sender can delete a message for everyone", 403);
    }
    return prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedFor: "everyone", content: null, mediaUrl: null },
    });
  }

  // Delete for me is a per-user hide record. The shared Message row must never
  // be mutated because other members should continue seeing the message.
  await prisma.messageHidden.upsert({
    where: { messageId_userId: { messageId, userId } },
    update: {},
    create: { messageId, userId },
  });
  return prisma.message.findUniqueOrThrow({
    where: { id: messageId },
    include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
}

export async function reactToMessage(messageId: string, userId: string, emoji: string) {
  // FIX (security audit follow-up): previously no membership check —
  // any authenticated user could react to any message ID in any
  // conversation, whether or not they belonged to it.
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AuthError("Message not found", 404);
  await assertMembership(message.conversationId, userId);

  return prisma.messageReaction.upsert({
    where: { messageId_userId: { messageId, userId } },
    update: { emoji },
    create: { messageId, userId, emoji },
  });
}

export async function removeReaction(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AuthError("Message not found", 404);
  await assertMembership(message.conversationId, userId);

  await prisma.messageReaction.deleteMany({ where: { messageId, userId } });
}

export async function markReceipt(messageId: string, userId: string, status: "delivered" | "read") {
  // FIX (security audit follow-up): previously no membership check — any
  // authenticated user could mark any message (in any conversation) as
  // delivered/read, polluting other people's conversations and confirming
  // which message IDs exist.
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AuthError("Message not found", 404);
  await assertMembership(message.conversationId, userId);

  if (status === "read") {
    const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { privacyReadReceipts: true } });
    if (viewer && !viewer.privacyReadReceipts) {
      return null;
    }
  }

  return prisma.messageReceipt.upsert({
    where: { messageId_userId: { messageId, userId } },
    update: { status },
    create: { messageId, userId, status },
  });
}

export async function pinMessage(conversationId: string, messageId: string, userId: string) {
  await assertMembership(conversationId, userId);

  // FIX (security audit follow-up): previously didn't verify the message
  // actually belongs to this conversation — a member of conversation A
  // could pin an arbitrary message ID from conversation B into A's pin
  // list, leaking that the message exists (and its content, wherever pins
  // are displayed) to people who were never part of the conversation it
  // came from.
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.conversationId !== conversationId) {
    throw new AuthError("Message not found in this conversation", 404);
  }

  return prisma.pinnedMessage.create({
    data: { conversationId, messageId, pinnedBy: userId },
  });
}

export async function searchMessages(conversationId: string, userId: string, query: string) {
  await assertMembership(conversationId, userId);
  return prisma.message.findMany({
    where: {
      conversationId,
      isDeleted: false,
      content: { contains: query, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
}
