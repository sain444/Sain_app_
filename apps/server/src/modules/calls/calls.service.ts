import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { assertMembership } from "../conversations/conversations.service.js";
import { AuthError } from "../auth/auth.service.js";

export async function startCall(callId: string, initiatorId: string, conversationId: string, type: "audio" | "video") {
  await assertMembership(conversationId, initiatorId);

  const existing = await prisma.call.findUnique({ where: { id: callId } });
  if (existing) {
    if (existing.initiatorId !== initiatorId || existing.conversationId !== conversationId || existing.type !== type) {
      throw new AuthError("Call ID does not belong to this call", 409);
    }
    return existing;
  }
  return prisma.call.create({
    data: {
      id: callId, conversationId, initiatorId, type, status: "missed", startedAt: new Date(),
      participants: { create: { userId: initiatorId, joinedAt: new Date() } },
    },
  });
}

export async function endCall(
  callId: string,
  status: "missed" | "completed" | "declined" | "failed",
  userId: string
) {
  const call = await prisma.call.findUnique({ where: { id: callId }, include: { participants: true } });
  if (!call) return null;
  const isParticipant = call.initiatorId === userId || call.participants.some((p) => p.userId === userId);
  if (!isParticipant) throw new AuthError("You are not a participant in this call", 403);

  const endedAt = new Date();
  const durationSeconds = call.startedAt
    ? Math.max(0, Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000))
    : 0;

  await prisma.callParticipant.updateMany({ where: { callId, userId, leftAt: null }, data: { leftAt: endedAt } });
  return prisma.call.update({ where: { id: callId }, data: { status, endedAt, durationSeconds } });
}

export async function listCallHistory(userId: string) {
  return prisma.call.findMany({
    where: {
      OR: [{ initiatorId: userId }, { participants: { some: { userId } } }],
    },
    include: {
      initiator: { select: { id: true, displayName: true, avatarUrl: true } },
      conversation: { select: { id: true, type: true, title: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
}

// Returns the ICE server list a client should use for this call — public
// STUN always, plus your TURN relay if configured (required for callers
// behind symmetric NATs/firewalls where direct P2P fails).
export function getIceServers() {
  const servers: { urls: string; username?: string; credential?: string }[] = [
    { urls: "stun:stun.l.google.com:19302" },
  ];

  if (env.TURN_URL) {
    servers.push({
      urls: env.TURN_URL,
      username: env.TURN_USERNAME,
      credential: env.TURN_CREDENTIAL,
    });
  }

  return servers;
}
