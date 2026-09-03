import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { useOfflineStore, type OfflineMode } from "../../store/offlineStore";
import { offlineBle, type OfflinePeer } from "../../services/offlineBle";

const modes: { key: OfflineMode; title: string; description: string }[] = [
  { key: "auto", title: "Auto", description: "Use normal internet messaging when available; use nearby offline delivery when enabled." },
  { key: "online", title: "Online only", description: "Keep Sainn on its normal internet connection. Offline transport stays disabled." },
  { key: "offline", title: "Offline mode", description: "Prefer nearby Sainn devices over the internet. Internet messaging and calls are not changed or deleted." },
];

export function OfflineModeScreen({ navigation }: any) {
  const theme = useTheme();
  const mode = useOfflineStore((s) => s.mode);
  const nearbyEnabled = useOfflineStore((s) => s.nearbyEnabled);
  const setMode = useOfflineStore((s) => s.setMode);
  const setNearbyEnabled = useOfflineStore((s) => s.setNearbyEnabled);
  const hydrate = useOfflineStore((s) => s.hydrate);
  const [scanning, setScanning] = useState(false);
  const [peers, setPeers] = useState<OfflinePeer[]>([]);

  useEffect(() => { hydrate(); }, [hydrate]);

  const statusText = useMemo(() => {
    if (!nearbyEnabled) return "Nearby transport is off";
    if (scanning) return "Looking for nearby Sainn devices…";
    return "Nearby transport is ready";
  }, [nearbyEnabled, scanning]);

  async function toggleNearby() {
    const next = !nearbyEnabled;
    await setNearbyEnabled(next);
    if (!next) {
      await offlineBle.stopDiscovery();
      setScanning(false);
      setPeers([]);
      return;
    }
    setScanning(true);
    try {
      await offlineBle.startDiscovery((peer) => {
        setPeers((current) => current.some((p) => p.id === peer.id) ? current : [...current, peer]);
      });
    } catch (error: any) {
      setScanning(false);
      await setNearbyEnabled(false);
      Alert.alert("Offline Mode", error?.message ?? "Bluetooth is not available in this build yet.");
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Offline Mode</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Nearby Sainn-to-Sainn communication, kept completely separate from normal online messaging and calls.</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {modes.map((item) => {
            const selected = mode === item.key;
            return (
              <Pressable key={item.key} onPress={() => setMode(item.key)} style={[styles.modeRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text style={{ color: theme.textSecondary, marginTop: 3, lineHeight: 19 }}>{item.description}</Text>
                </View>
                <View style={[styles.radio, { borderColor: selected ? theme.accent : theme.border }]}>
                  {selected ? <View style={[styles.radioInner, { backgroundColor: theme.accent }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>Nearby transport</Text>
              <Text style={{ color: theme.textSecondary, marginTop: 3 }}>{statusText}</Text>
            </View>
            <Pressable onPress={toggleNearby} style={[styles.switch, { backgroundColor: nearbyEnabled ? theme.accent : theme.surfaceSecondary }]}>
              <View style={[styles.knob, { backgroundColor: nearbyEnabled ? "#FFFFFF" : theme.textTertiary, alignSelf: nearbyEnabled ? "flex-end" : "flex-start" }]} />
            </Pressable>
          </View>
          {scanning ? <ActivityIndicator style={{ marginTop: spacing.md }} color={theme.accent} /> : null}
          {peers.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <Text style={{ color: theme.textPrimary, fontWeight: "600", marginBottom: spacing.sm }}>Nearby Sainn devices</Text>
              {peers.map((peer) => <Text key={peer.id} style={{ color: theme.textSecondary, paddingVertical: 5 }}>{peer.name}</Text>)}
            </View>
          ) : null}
        </View>

        <View style={[styles.roadmap, { backgroundColor: theme.accentSubtle, borderColor: theme.border }]}>
          <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>Sainn Offline v1</Text>
          <Text style={{ color: theme.textSecondary, marginTop: 5, lineHeight: 20 }}>Text → images → voice → files</Text>
          <Text style={{ color: theme.textTertiary, marginTop: 8, lineHeight: 19 }}>The transport is designed as a separate layer. This prevents Offline Mode from changing the existing Socket.IO messaging, REST API or WebRTC call paths.</Text>
        </View>

        <Pressable onPress={() => navigation.goBack()} style={[styles.button, { backgroundColor: theme.accent }]}>
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold },
  subtitle: { marginTop: 8, lineHeight: 21, marginBottom: spacing.lg },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, overflow: "hidden", marginBottom: spacing.md },
  modeRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  modeTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", marginLeft: spacing.md },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  switch: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: "center" },
  knob: { width: 22, height: 22, borderRadius: 11 },
  roadmap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg },
  button: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
});
