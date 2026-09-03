import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

// Placeholder for Phase 2+ — this screen gets real content (conversation
// list, call history, stories feed, contacts list, settings menu) in the
// messaging/calls/advanced-features phases. Wired here so navigation and
// the tab shell are fully functional today.
export function ContactsScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Contacts</Text>
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Nothing here yet — this screen is built out in a later phase.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: typography.sizes.md, textAlign: "center", paddingHorizontal: spacing.xl },
});
