import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Avatar } from "../../components/Avatar";
import { api, type CallHistoryEntry } from "../../services/api";

const STATUS_LABEL: Record<CallHistoryEntry["status"], string> = {
  completed: "",
  missed: "Missed",
  declined: "Declined",
  failed: "Failed",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function CallsScreen() {
  const theme = useTheme();
  const [calls, setCalls] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { calls } = await api.getCallHistory();
      setCalls(calls);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Calls</Text>
      <FlatList
        data={calls}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        renderItem={({ item }) => {
          const isMissed = item.status === "missed" || item.status === "declined";
          return (
            <View style={styles.row}>
              <Avatar uri={item.initiator.avatarUrl} name={item.initiator.displayName ?? "?"} size={48} />
              <View style={styles.rowContent}>
                <Text style={[styles.name, { color: isMissed ? theme.error : theme.textPrimary }]}>
                  {item.initiator.displayName ?? "Unknown"}
                </Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {item.type === "video" ? "🎥" : "📞"} {STATUS_LABEL[item.status]}
                  {STATUS_LABEL[item.status] ? " · " : ""}
                  {formatDuration(item.durationSeconds)}
                </Text>
              </View>
              <Text style={[styles.time, { color: theme.textTertiary }]}>{formatWhen(item.startedAt)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No calls yet</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Your call history will show up here.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md },
  rowContent: { flex: 1 },
  name: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  meta: { fontSize: typography.sizes.sm, marginTop: 2 },
  time: { fontSize: typography.sizes.xs },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: spacing.xxl },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  emptyText: { fontSize: typography.sizes.sm, textAlign: "center" },
});
