import React from "react";
import { View, Text, StyleSheet, Linking, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

const OWNER_NAME = "Sainn";
const OWNER_EMAIL = "tutiongpt@gmail.com";
const APP_VERSION = "0.1.0";

export function AboutScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.appName, { color: theme.textPrimary }]}>Sainn</Text>
      <Text style={[styles.version, { color: theme.textSecondary }]}>Version {APP_VERSION}</Text>

      <Text style={[styles.copyright, { color: theme.textSecondary }]}>
        © {new Date().getFullYear()} {OWNER_NAME}. All rights reserved.
      </Text>

      <Pressable onPress={() => Linking.openURL(`mailto:${OWNER_EMAIL}`)}>
        <Text style={[styles.contact, { color: theme.accent }]}>{OWNER_EMAIL}</Text>
      </Pressable>

      <Text style={[styles.disclaimer, { color: theme.textTertiary }]}>
        Sainn is developed and owned by {OWNER_NAME}. This app, its source code, and its design
        are proprietary — see the LICENSE file included with the project source for terms.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, alignItems: "center", paddingTop: spacing.xxl },
  appName: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold },
  version: { fontSize: typography.sizes.sm, marginTop: spacing.xs },
  copyright: { fontSize: typography.sizes.sm, marginTop: spacing.xl },
  contact: { fontSize: typography.sizes.sm, marginTop: spacing.xs },
  disclaimer: {
    fontSize: typography.sizes.xs,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
