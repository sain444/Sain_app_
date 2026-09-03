import { create } from "zustand";

export type CallStatus =
  | "idle"
  | "outgoing" // we called someone, waiting for them to accept
  | "incoming" // someone is calling us
  | "connecting" // accepted, WebRTC negotiating
  | "active" // media flowing
  | "reconnecting"
  | "ended";

export interface CallPeerInfo {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface CallState {
  status: CallStatus;
  callId: string | null;
  conversationId: string | null;
  callType: "audio" | "video" | null;
  peer: CallPeerInfo | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isFrontCamera: boolean;
  startedAt: number | null;
  endedReason: "completed" | "declined" | "missed" | "failed" | null;

  setIncoming: (args: { callId: string; conversationId: string; callType: "audio" | "video"; peer: CallPeerInfo }) => void;
  setOutgoing: (args: { callId: string; conversationId: string; callType: "audio" | "video"; peer: CallPeerInfo }) => void;
  setConnecting: () => void;
  setActive: () => void;
  setReconnecting: () => void;
  setEnded: (reason: CallState["endedReason"]) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  flipCamera: () => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as CallStatus,
  callId: null,
  conversationId: null,
  callType: null,
  peer: null,
  isMuted: false,
  isCameraOff: false,
  isFrontCamera: true,
  startedAt: null,
  endedReason: null,
};

export const useCallStore = create<CallState>((set) => ({
  ...initialState,

  setIncoming: ({ callId, conversationId, callType, peer }) =>
    set({ ...initialState, status: "incoming", callId, conversationId, callType, peer }),

  setOutgoing: ({ callId, conversationId, callType, peer }) =>
    set({ ...initialState, status: "outgoing", callId, conversationId, callType, peer }),

  setConnecting: () => set({ status: "connecting" }),

  setActive: () => set({ status: "active", startedAt: Date.now() }),

  setReconnecting: () => set({ status: "reconnecting" }),

  setEnded: (reason) => set({ status: "ended", endedReason: reason }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleCamera: () => set((s) => ({ isCameraOff: !s.isCameraOff })),
  flipCamera: () => set((s) => ({ isFrontCamera: !s.isFrontCamera })),

  reset: () => set(initialState),
}));
