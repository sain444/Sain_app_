import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { API_BASE_URL } from "./api";

type Listener = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;

  connect() {
    const token = useAuthStore.getState().accessToken;
    if (!token || this.socket?.connected) return;

    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get connected() {
    return !!this.socket?.connected;
  }

  joinConversation(conversationId: string) {
    // Server verifies real membership before allowing the join — see
    // gateway.ts. If it's rejected (shouldn't happen via normal app flow,
    // but is the actual authorization boundary), log it instead of silently
    // pretending the join succeeded.
    this.socket?.emit("conversation:join", conversationId, (ok: boolean) => {
      if (!ok) {
        console.warn(`Server rejected joining conversation ${conversationId} — not a member`);
      }
    });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit("conversation:leave", conversationId);
  }

  startTyping(conversationId: string) {
    this.socket?.emit("typing:start", { conversationId });
  }

  stopTyping(conversationId: string) {
    this.socket?.emit("typing:stop", { conversationId });
  }

  on(event: string, listener: Listener) {
    this.socket?.on(event, listener);
  }

  off(event: string, listener: Listener) {
    this.socket?.off(event, listener);
  }

  // Call-signaling passthrough — consumed by the call screens in Phase 3.
  emit(event: string, payload: unknown) {
    this.socket?.emit(event, payload);
  }
}

export const socketService = new SocketService();
