import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Avatar } from "../../components/Avatar";
import { useAuthStore } from "../../store/authStore";

function SettingsRow({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.row, { borderBottomColor: theme.border }]} onPress={onPress}>
      <Text style={{ color: destructive ? theme.error : theme.textPrimary, fontSize: typography.sizes.md }}>
        {label}
      </Text>
      {!destructive ? <Text style={{ color: theme.textTertiary }}>›</Text> : null}
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: any) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Settings</Text>

        <View style={styles.profileRow}>
          <Avatar uri={user?.avatarUrl} name={user?.displayName ?? "?"} size={64} />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={[styles.name, { color: theme.textPrimary }]}>{user?.displayName ?? "You"}</Text>
            <Text style={{ color: theme.textSecondary }}>{user?.email}</Text>
          </View>
        </View>

        <SettingsRow label="Privacy" onPress={() => navigation.navigate("PrivacySettings")} />
        <SettingsRow label="Appearance" onPress={() => navigation.navigate("Appearance")} />
        <SettingsRow label="Offline Mode" onPress={() => navigation.navigate("OfflineMode")} />
        <SettingsRow label="Blocked users" onPress={() => navigation.navigate("BlockedUsers")} />
        <SettingsRow label="Notifications" onPress={() => {}} />
        <SettingsRow label="Storage and data" onPress={() => {}} />
        <SettingsRow label="Help and about" onPress={() => navigation.navigate("About")} />
        <SettingsRow label="Log out" destructive onPress={clearSession} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold, marginBottom: spacing.lg },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  name: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
