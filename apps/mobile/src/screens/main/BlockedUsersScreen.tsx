import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Avatar } from "../../components/Avatar";
import { api } from "../../services/api";

export function BlockedUsersScreen() {
  const theme = useTheme();
  const [blocks, setBlocks] = useState<{ id: string; blocked: { id: string; displayName: string | null; avatarUrl: string | null } }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { blocks } = await api.listBlocks();
      setBlocks(blocks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = async (userId: string) => {
    setBlocks((prev) => prev.filter((b) => b.blocked.id !== userId));
    await api.unblockUser(userId).catch(() => load());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Blocked users</Text>
      <FlatList
        data={blocks}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.blocked.avatarUrl} name={item.blocked.displayName ?? "?"} size={44} />
            <Text style={[styles.name, { color: theme.textPrimary }]}>{item.blocked.displayName ?? "Unknown"}</Text>
            <Pressable onPress={() => handleUnblock(item.blocked.id)}>
              <Text style={{ color: theme.accent }}>Unblock</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No blocked users.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  name: { flex: 1, fontSize: typography.sizes.md },
  emptyText: { textAlign: "center", marginTop: spacing.xl },
});
