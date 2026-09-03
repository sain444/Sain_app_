import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { verifyAccessToken } from "../utils/jwt.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { prisma } from "../db/prisma.js";

interface AuthedSocket extends Socket {
  userId?: string;
}

let io: SocketIOServer | undefined;

/**
 * Boots the Socket.IO realtime gateway on top of the existing HTTP server.
 * Handles: presence, typing indicators, message fanout, receipts, and
 * WebRTC call signaling (offer/answer/ICE relay).
 */
export async function initRealtimeGateway(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  try {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    logger.warn({ err }, "Redis adapter unavailable — running single-instance realtime only");
  }

  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket: AuthedSocket) => {
    const userId = socket.userId!;
    logger.debug({ userId, socketId: socket.id }, "socket connected");

    socket.join(`user:${userId}`);
    const authorizedConversationRooms = new Set<string>();

    await prisma.user.update({ where: { id: userId }, data: { status: "online" } });
    io!.emit("presence:update", { userId, status: "online" });

    // FIX (security audit): previously this joined the room with no check
    // at all — any authenticated socket could join ANY conversation:<id>
    // room just by knowing or guessing the ID, and receive every message
    // sent there. Now verifies actual membership first via the same
    // conversation_members table the REST API checks.
    socket.on("conversation:join", async (conversationId: string, ack?: (ok: boolean) => void) => {
      if (typeof conversationId !== "string") return ack?.(false);
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (!membership) {
        logger.warn({ userId, conversationId }, "Rejected conversation:join — not a member");
        return ack?.(false);
      }
      socket.join(`conversation:${conversationId}`);
      authorizedConversationRooms.add(conversationId);
      ack?.(true);
    });

    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      authorizedConversationRooms.delete(conversationId);
    });

    // Typing/receipt events don't re-check membership on every single event
    // (that would mean a DB query per keystroke) — the room itself is the
    // authorization boundary, and you can only be in the room if
    // conversation:join above verified you belong there.
    socket.on("typing:start", ({ conversationId }: { conversationId: string }) => {
      if (!authorizedConversationRooms.has(conversationId)) return;
      socket.to(`conversation:${conversationId}`).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", ({ conversationId }: { conversationId: string }) => {
      if (!authorizedConversationRooms.has(conversationId)) return;
      socket.to(`conversation:${conversationId}`).emit("typing:stop", { conversationId, userId });
    });

    // --- WebRTC call signaling ---
    // Every signaling event is authorized against the persisted Call record.
    // Client-supplied target IDs are never sufficient authorization.
    async function getAuthorizedCall(callId: string, targetUserId?: string) {
      const call = await prisma.call.findUnique({ where: { id: callId }, include: { participants: true } });
      if (!call || !call.startedAt || ["completed", "declined", "failed"].includes(call.status)) return null;
      const callerIsMember = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: call.conversationId, userId } } });
      if (!callerIsMember) return null;
      if (targetUserId) {
        const targetIsMember = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: call.conversationId, userId: targetUserId } } });
        if (!targetIsMember) return null;
      }
      const participantIds = new Set([call.initiatorId, ...call.participants.map((p) => p.userId)]);
      if (userId !== call.initiatorId && !participantIds.has(userId)) return null;
      if (targetUserId && !participantIds.has(targetUserId) && targetUserId !== call.initiatorId) return null;
      return call;
    }

    socket.on("call:invite", async (payload: { conversationId: string; calleeId: string; callType: "audio" | "video"; callId: string }) => {
      const call = await prisma.call.findUnique({ where: { id: payload.callId } });
      if (!call || call.conversationId !== payload.conversationId || call.initiatorId !== userId || call.type !== payload.callType) return;
      const [callerMembership, calleeMembership] = await Promise.all([
        prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: payload.conversationId, userId } } }),
        prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: payload.conversationId, userId: payload.calleeId } } }),
      ]);
      if (!callerMembership || !calleeMembership || payload.calleeId === userId) return;
      await prisma.callParticipant.upsert({ where: { callId_userId: { callId: payload.callId, userId } }, update: {}, create: { callId: payload.callId, userId, joinedAt: new Date() } });
      io!.to(`user:${payload.calleeId}`).emit("call:incoming", { ...payload, callerId: userId });
    });

    socket.on("call:accept", async (payload: { targetUserId: string; callId: string }) => {
      const call = await prisma.call.findUnique({ where: { id: payload.callId }, include: { participants: true } });
      if (!call || call.initiatorId !== payload.targetUserId || call.status !== "missed") return;
      const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: call.conversationId, userId } } });
      if (!membership) return;
      await prisma.callParticipant.upsert({ where: { callId_userId: { callId: call.id, userId } }, update: { joinedAt: new Date() }, create: { callId: call.id, userId, joinedAt: new Date() } });
      await prisma.call.update({ where: { id: call.id }, data: { status: "active" } });
      io!.to(`user:${payload.targetUserId}`).emit("call:accepted", { callId: call.id, calleeId: userId });
    });

    socket.on("call:decline", async (payload: { targetUserId: string; callId: string }) => {
      const call = await prisma.call.findUnique({ where: { id: payload.callId } });
      if (!call || call.initiatorId !== payload.targetUserId || call.status !== "missed") return;
      const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: call.conversationId, userId } } });
      if (!membership) return;
      await prisma.call.update({ where: { id: call.id }, data: { status: "declined", endedAt: new Date() } });
      io!.to(`user:${payload.targetUserId}`).emit("call:declined", { callId: call.id, fromUserId: userId });
    });

    for (const event of ["call:offer", "call:answer", "call:ice-candidate"] as const) {
      socket.on(event, async (payload: { targetUserId: string; sdp?: unknown; candidate?: unknown; callId: string }) => {
        const call = await getAuthorizedCall(payload.callId, payload.targetUserId);
        if (!call) return;
        const outgoing: any = { callId: payload.callId, fromUserId: userId };
        if (event === "call:offer" || event === "call:answer") outgoing.sdp = payload.sdp;
        else outgoing.candidate = payload.candidate;
        io!.to(`user:${payload.targetUserId}`).emit(event, outgoing);
      });
    }

    socket.on("call:end", async (payload: { targetUserId: string; callId: string }) => {
      const call = await getAuthorizedCall(payload.callId, payload.targetUserId);
      if (!call) return;
      const now = new Date();
      await prisma.callParticipant.updateMany({ where: { callId: call.id, userId }, data: { leftAt: now } });
      io!.to(`user:${payload.targetUserId}`).emit("call:end", { callId: payload.callId, fromUserId: userId });
    });

    socket.on("disconnect", async () => {
      logger.debug({ userId, socketId: socket.id }, "socket disconnected");
      const remaining = io?.sockets.adapter.rooms.get(`user:${userId}`)?.size ?? 0;
      if (remaining === 0) {
        await prisma.user.update({ where: { id: userId }, data: { status: "offline", lastSeenAt: new Date() } });
        io!.emit("presence:update", { userId, status: "offline" });
      }
    });
  });

  return io;
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  io?.to(`conversation:${conversationId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
