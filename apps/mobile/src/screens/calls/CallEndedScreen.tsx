import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useCallStore } from "../../store/callStore";
import { Avatar } from "../../components/Avatar";
import { spacing, typography, palette } from "../../theme/tokens";

const REASON_LABEL: Record<string, string> = {
  completed: "Call ended",
  declined: "Call declined",
  missed: "Missed call",
  failed: "Connection failed",
};

export function CallEndedScreen() {
  const { peer, endedReason } = useCallStore();

  return (
    <View style={styles.container}>
      <Avatar name={peer?.displayName ?? "?"} uri={peer?.avatarUrl} size={100} />
      <Text style={styles.peerName}>{peer?.displayName ?? "Unknown"}</Text>
      <Text style={styles.reasonText}>{REASON_LABEL[endedReason ?? "completed"]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.neutral950, alignItems: "center", justifyContent: "center" },
  peerName: { color: "#fff", fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginTop: spacing.lg },
  reasonText: { color: "rgba(255,255,255,0.7)", fontSize: typography.sizes.md, marginTop: spacing.xs },
});
