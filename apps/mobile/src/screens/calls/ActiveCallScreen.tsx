import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RTCView, type MediaStream } from "react-native-webrtc";
import { useCallStore } from "../../store/callStore";
import { callManager } from "../../services/webrtc";
import { Avatar } from "../../components/Avatar";
import { spacing, radii, typography, palette } from "../../theme/tokens";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const PIP_WIDTH = 100;
const PIP_HEIGHT = 140;

function formatDuration(startedAt: number | null) {
  if (!startedAt) return "00:00";
  const totalSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ActiveCallScreen() {
  const { peer, callType, status, isMuted, isCameraOff, startedAt } = useCallStore();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState("00:00");

  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - PIP_WIDTH - 16, y: 80 })).current;

  useEffect(() => {
    const unsubLocal = callManager.onLocalStream(setLocalStream);
    const unsubRemote = callManager.onRemoteStream(setRemoteStream);
    return () => {
      unsubLocal();
      unsubRemote();
    };
  }, []);

  useEffect(() => {
    if (status !== "active") return;
    const timer = setInterval(() => setElapsed(formatDuration(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [status, startedAt]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    })
  ).current;

  const isVideo = callType === "video";

  return (
    <View style={styles.container}>
      {isVideo && remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.audioBackground]}>
          <Avatar name={peer?.displayName ?? "?"} uri={peer?.avatarUrl} size={140} />
        </View>
      )}

      <SafeAreaView style={styles.topBar}>
        <Text style={styles.peerName}>{peer?.displayName ?? "Unknown"}</Text>
        <Text style={styles.statusText}>
          {status === "connecting" ? "Connecting…" : status === "reconnecting" ? "Reconnecting…" : elapsed}
        </Text>
        {status === "reconnecting" ? <View style={styles.connectionBanner}><Text style={styles.connectionBannerText}>Poor connection — reconnecting</Text></View> : null}
      </SafeAreaView>

      {isVideo && localStream && !isCameraOff ? (
        <Animated.View
          style={[styles.pip, { transform: pan.getTranslateTransform() }]}
          {...panResponder.panHandlers}
        >
          <RTCView streamURL={localStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror />
        </Animated.View>
      ) : null}

      <SafeAreaView style={styles.controlsBar}>
        <CallControlButton
          icon={isMuted ? "🔇" : "🎙️"}
          label={isMuted ? "Unmute" : "Mute"}
          onPress={() => callManager.toggleMute()}
        />
        {isVideo ? (
          <CallControlButton
            icon={isCameraOff ? "📷" : "📹"}
            label={isCameraOff ? "Start video" : "Stop video"}
            onPress={() => callManager.toggleCamera()}
          />
        ) : null}
        {isVideo ? (
          <CallControlButton icon="🔄" label="Flip" onPress={() => callManager.switchCamera()} />
        ) : null}
        <CallControlButton icon="🔊" label="Speaker" onPress={() => {}} />
        <Pressable style={styles.endCallButton} onPress={() => callManager.endCall("completed")} accessibilityLabel="End call">
          <Text style={styles.endCallIcon}>⏹</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function CallControlButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.controlButton} onPress={onPress} accessibilityLabel={label}>
      <Text style={styles.controlIcon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.neutral950 },
  audioBackground: { alignItems: "center", justifyContent: "center", backgroundColor: palette.neutral900 },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", paddingTop: spacing.md },
  peerName: { color: "#fff", fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold },
  statusText: { color: "rgba(255,255,255,0.7)", fontSize: typography.sizes.md, marginTop: 4 },
  connectionBanner: { marginTop: spacing.sm, backgroundColor: palette.warning, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill },
  connectionBannerText: { color: "#1a1a1a", fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  pip: {
    position: "absolute",
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  controlsBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlIcon: { fontSize: 24 },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: palette.error,
    alignItems: "center",
    justifyContent: "center",
  },
  endCallIcon: { fontSize: 26, color: "#fff" },
});
