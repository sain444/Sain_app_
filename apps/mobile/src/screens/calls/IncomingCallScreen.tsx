import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallStore } from "../../store/callStore";
import { callManager } from "../../services/webrtc";
import { Avatar } from "../../components/Avatar";
import { spacing, radii, typography, palette } from "../../theme/tokens";

export function IncomingCallScreen() {
  const { peer, callType } = useCallStore();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <View style={styles.peerInfo}>
          <Avatar name={peer?.displayName ?? "?"} uri={peer?.avatarUrl} size={120} />
          <Text style={styles.peerName}>{peer?.displayName ?? "Unknown"}</Text>
          <Text style={styles.callTypeText}>
            Incoming {callType === "video" ? "video call" : "voice call"}
          </Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionColumn}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: palette.error }]}
              onPress={() => callManager.declineIncomingCall()}
              accessibilityLabel="Decline call"
            >
              <Text style={styles.actionIcon}>✕</Text>
            </Pressable>
            <Text style={styles.actionLabel}>Decline</Text>
          </View>
          <View style={styles.actionColumn}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: palette.success }]}
              onPress={() => callManager.acceptIncomingCall()}
              accessibilityLabel="Accept call"
            >
              <Text style={styles.actionIcon}>{callType === "video" ? "🎥" : "📞"}</Text>
            </Pressable>
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.neutral950 },
  content: { flex: 1, justifyContent: "space-between", paddingVertical: spacing.xxl },
  peerInfo: { flex: 1, alignItems: "center", justifyContent: "center" },
  peerName: { color: "#fff", fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold, marginTop: spacing.lg },
  callTypeText: { color: "rgba(255,255,255,0.7)", fontSize: typography.sizes.md, marginTop: spacing.xs },
  actions: { flexDirection: "row", justifyContent: "space-evenly", paddingBottom: spacing.xl },
  actionColumn: { alignItems: "center" },
  actionButton: { width: 68, height: 68, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  actionIcon: { fontSize: 28, color: "#fff" },
  actionLabel: { color: "rgba(255,255,255,0.8)", marginTop: spacing.sm, fontSize: typography.sizes.sm },
});
