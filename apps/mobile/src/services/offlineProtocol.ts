/**
 * Sainn Offline v1 protocol.
 *
 * The protocol is deliberately transport-agnostic: normal Socket.IO/HTTP
 * messaging never imports this module. A future BLE adapter can implement
 * the same frame format without touching online messaging or WebRTC.
 */
export const SAINN_OFFLINE_PROTOCOL = 1;
export const SAINN_BLE_SERVICE_UUID = "9b8f4a10-5a7c-4f0d-8d3d-4c7b6b8e0001";
export const SAINN_BLE_RX_CHARACTERISTIC_UUID = "9b8f4a10-5a7c-4f0d-8d3d-4c7b6b8e0002";
export const SAINN_BLE_TX_CHARACTERISTIC_UUID = "9b8f4a10-5a7c-4f0d-8d3d-4c7b6b8e0003";

export type OfflineFrameType = "hello" | "message" | "ack" | "chunk";
export type OfflineMessageType = "text" | "image" | "voice" | "file";

export interface OfflineFrame {
  protocol: number;
  type: OfflineFrameType;
  id: string;
  senderId: string;
  recipientId?: string;
  messageType?: OfflineMessageType;
  conversationId?: string;
  createdAt: number;
  ttl: number;
  sequence?: number;
  total?: number;
  payload: string;
}

export function createMessageFrame(input: Omit<OfflineFrame, "protocol" | "type" | "createdAt" | "ttl">): OfflineFrame {
  return {
    ...input,
    protocol: SAINN_OFFLINE_PROTOCOL,
    type: "message",
    createdAt: Date.now(),
    ttl: 4,
  };
}

export function encodeFrame(frame: OfflineFrame): string {
  return JSON.stringify(frame);
}

export function decodeFrame(raw: string): OfflineFrame | null {
  try {
    const frame = JSON.parse(raw) as OfflineFrame;
    if (frame.protocol !== SAINN_OFFLINE_PROTOCOL) return null;
    if (!frame.id || !frame.senderId || !frame.type || typeof frame.ttl !== "number") return null;
    if (frame.ttl < 0) return null;
    return frame;
  } catch {
    return null;
  }
}

export function decrementTtl(frame: OfflineFrame): OfflineFrame {
  return { ...frame, ttl: Math.max(0, frame.ttl - 1) };
}
