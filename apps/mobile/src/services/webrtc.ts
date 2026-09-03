// WebRTC call manager — real peer-to-peer audio/video, signaled over the
// existing Socket.IO connection (see server/src/realtime/gateway.ts).
// Media itself never touches the app server; only SDP/ICE metadata does.
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import { socketService } from "./socket";
import { api } from "./api";
import { useCallStore } from "../store/callStore";

type StreamListener = (stream: MediaStream | null) => void;

class CallManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidate[] = [];
  private localListeners = new Set<StreamListener>();
  private remoteListeners = new Set<StreamListener>();
  private currentPeerUserId: string | null = null;
  private signalingBound = false;

  onLocalStream(listener: StreamListener) {
    this.localListeners.add(listener);
    listener(this.localStream);
    return () => this.localListeners.delete(listener);
  }

  onRemoteStream(listener: StreamListener) {
    this.remoteListeners.add(listener);
    listener(this.remoteStream);
    return () => this.remoteListeners.delete(listener);
  }

  private setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    this.localListeners.forEach((l) => l(stream));
  }

  private setRemoteStream(stream: MediaStream | null) {
    this.remoteStream = stream;
    this.remoteListeners.forEach((l) => l(stream));
  }

  /** Call once at app startup — registers global signaling listeners. */
  bindSignaling() {
    if (this.signalingBound) return;
    this.signalingBound = true;

    socketService.on("call:incoming", (payload: any) => {
      // Only one call at a time — a real product would offer "busy" handling here.
      if (useCallStore.getState().status !== "idle") {
        socketService.emit("call:decline", { targetUserId: payload.callerId, callId: payload.callId });
        return;
      }
      this.currentPeerUserId = payload.callerId;
      useCallStore.getState().setIncoming({
        callId: payload.callId,
        conversationId: payload.conversationId,
        callType: payload.callType,
        peer: { userId: payload.callerId, displayName: payload.callerName ?? null, avatarUrl: payload.callerAvatarUrl ?? null },
      });
    });

    socketService.on("call:accepted", async (payload: any) => {
      // FIX (audit-flagged bug): the server now sends an explicit
      // "calleeId" field rather than echoing back an ambiguous
      // "targetUserId" (which, from the caller's perspective, was
      // incorrectly equal to the caller's OWN id, not the callee's).
      // We're the caller; the callee accepted — send the offer to them.
      const remoteUserId = payload.calleeId ?? this.currentPeerUserId!;
      await this.createAndSendOffer(remoteUserId, payload.callId);
      useCallStore.getState().setConnecting();
    });

    socketService.on("call:declined", () => {
      useCallStore.getState().setEnded("declined");
      this.cleanup();
    });

    // FIX (security audit follow-up): every handler below now checks that
    // the event's callId matches a call this device actually knows about
    // (i.e. one that went through call:incoming -> the user tapped Accept,
    // or one this device itself initiated). Previously these handlers
    // processed ANY inbound call:offer/answer/ice-candidate/end unconditionally
    // — a malicious authenticated client could push a raw call:offer straight
    // at someone's socket, skipping the invite/accept UI entirely and
    // silently creating a peer connection and SDP answer on the victim's
    // device. Local media is only ever captured via explicit user action
    // (acceptIncomingCall/startOutgoingCall), so mic/camera couldn't be
    // silently activated by this — but an unsolicited peer connection could
    // still be established, which is unacceptable regardless.

    socketService.on("call:offer", async (payload: any) => {
      const store = useCallStore.getState();
      if (store.callId !== payload.callId || store.status !== "connecting") {
        console.warn("Ignoring call:offer for a call that was not accepted", payload.callId);
        return;
      }
      if (!this.pc) await this.createPeerConnection(payload.fromUserId);
      await this.pc!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await this.flushPendingCandidates();
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      socketService.emit("call:answer", {
        targetUserId: payload.fromUserId,
        sdp: answer,
        callId: payload.callId,
      });
    });

    socketService.on("call:answer", async (payload: any) => {
      const store = useCallStore.getState();
      if (store.callId !== payload.callId) {
        console.warn("Ignoring call:answer for an unrecognized call", payload.callId);
        return;
      }
      await this.pc?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await this.flushPendingCandidates();
    });

    socketService.on("call:ice-candidate", async (payload: any) => {
      const store = useCallStore.getState();
      if (store.callId !== payload.callId) {
        // Don't even queue it — an unrecognized callId means this candidate
        // doesn't belong to any call this device is party to.
        return;
      }
      const candidate = new RTCIceCandidate(payload.candidate);
      if (this.pc?.remoteDescription) {
        await this.pc.addIceCandidate(candidate);
      } else {
        this.pendingCandidates.push(candidate);
      }
    });

    socketService.on("call:end", (payload: any) => {
      const store = useCallStore.getState();
      if (store.callId !== payload.callId) return;
      useCallStore.getState().setEnded("completed");
      this.cleanup();
    });
  }

  private async flushPendingCandidates() {
    for (const c of this.pendingCandidates) {
      await this.pc?.addIceCandidate(c);
    }
    this.pendingCandidates = [];
  }

  private async createPeerConnection(remoteUserId: string) {
    const { iceServers } = await api.getIceServers().catch(() => ({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }));
    this.currentPeerUserId = remoteUserId;

    this.pc = new RTCPeerConnection({ iceServers });

    this.pc.addEventListener("icecandidate", (event: any) => {
      if (event.candidate) {
        socketService.emit("call:ice-candidate", {
          targetUserId: this.currentPeerUserId,
          candidate: event.candidate,
          callId: useCallStore.getState().callId,
        });
      }
    });

    this.pc.addEventListener("track", (event: any) => {
      this.setRemoteStream(event.streams[0]);
    });

    this.pc.addEventListener("connectionstatechange", () => {
      const state = this.pc?.connectionState;
      const store = useCallStore.getState();
      if (state === "connected") store.setActive();
      if (state === "disconnected") store.setReconnecting();
      if (state === "failed") {
        store.setEnded("failed");
        this.cleanup();
      }
    });

    this.localStream?.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream!));
  }

  private async createAndSendOffer(remoteUserId: string, callId: string) {
    await this.createPeerConnection(remoteUserId);
    const offer = await this.pc!.createOffer({});
    await this.pc!.setLocalDescription(offer);
    socketService.emit("call:offer", { targetUserId: remoteUserId, sdp: offer, callId });
  }

  private async getLocalMedia(video: boolean) {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: video ? { facingMode: "user" } : false,
    });
    this.setLocalStream(stream);
    return stream;
  }

  /** Caller flow: invite, then wait for call:accepted before sending the offer. */
  async startOutgoingCall(
    calleeId: string,
    conversationId: string,
    callType: "audio" | "video",
    peer: { displayName: string | null; avatarUrl: string | null }
  ) {
    const callId = cryptoRandomId();
    this.currentPeerUserId = calleeId;

    await this.getLocalMedia(callType === "video");
    await api.startCall(callId, conversationId, callType).catch(() => {});

    useCallStore.getState().setOutgoing({
      callId,
      conversationId,
      callType,
      peer: { userId: calleeId, ...peer },
    });

    socketService.emit("call:invite", { conversationId, calleeId, callType, callId });
  }

  /** Callee flow: accept, get media, tell caller so they send the offer. */
  async acceptIncomingCall() {
    const { callId, callType, peer } = useCallStore.getState();
    if (!callId || !peer) return;

    await this.getLocalMedia(callType === "video");
    useCallStore.getState().setConnecting();
    socketService.emit("call:accept", { targetUserId: peer.userId, callId });
  }

  declineIncomingCall() {
    const { callId, peer } = useCallStore.getState();
    if (callId && peer) {
      socketService.emit("call:decline", { targetUserId: peer.userId, callId });
      api.endCall(callId, "declined").catch(() => {});
    }
    useCallStore.getState().reset();
  }

  endCall(reason: "completed" | "failed" = "completed") {
    const { callId, peer } = useCallStore.getState();
    if (callId && peer) {
      socketService.emit("call:end", { targetUserId: peer.userId, callId });
      api.endCall(callId, reason).catch(() => {});
    }
    useCallStore.getState().setEnded(reason);
    this.cleanup();
  }

  toggleMute() {
    const enabled = this.localStream?.getAudioTracks().every((t) => !t.enabled);
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !!enabled));
    useCallStore.getState().toggleMute();
  }

  toggleCamera() {
    const enabled = this.localStream?.getVideoTracks().every((t) => !t.enabled);
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = !!enabled));
    useCallStore.getState().toggleCamera();
  }

  switchCamera() {
    // react-native-webrtc exposes _switchCamera on the video track.
    const videoTrack = this.localStream?.getVideoTracks()[0] as any;
    videoTrack?._switchCamera?.();
    useCallStore.getState().flipCamera();
  }

  private cleanup() {
    this.pc?.close();
    this.pc = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.setLocalStream(null);
    this.setRemoteStream(null);
    this.pendingCandidates = [];
    this.currentPeerUserId = null;
    setTimeout(() => useCallStore.getState().reset(), 1500); // brief "Call ended" screen, then reset
  }
}

function cryptoRandomId() {
  // RFC4122-ish v4 UUID without pulling in a crypto polyfill dependency.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const callManager = new CallManager();
