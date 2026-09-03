import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radii, themes, type Theme } from "../../theme/tokens";
import { useThemeStore } from "../../store/themeStore";

const OPTIONS: { key: Theme["key"]; title: string; subtitle: string }[] = [
  { key: "minimal", title: "MINIMAL", subtitle: "Clean • Elegant • Simple" },
  { key: "dark", title: "DARK", subtitle: "Premium • Immersive • Modern" },
  { key: "light", title: "LIGHT", subtitle: "Bright • Clean • Fresh" },
];

function PreviewRow({ previewTheme, selected, onPress, title, subtitle }: any) {
  const activeTheme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: activeTheme.surface, borderColor: selected ? activeTheme.accent : activeTheme.border },
      ]}
    >
      <View style={[styles.swatch, { backgroundColor: previewTheme.background, borderColor: previewTheme.border }]}>
        <View style={[styles.swatchBubble, { backgroundColor: previewTheme.messageSent }]} />
        <View style={[styles.swatchBubble, styles.swatchBubbleSecond, { backgroundColor: previewTheme.messageReceived }]} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[styles.rowTitle, { color: activeTheme.textPrimary }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: activeTheme.textSecondary }]}>{subtitle}</Text>
      </View>
      {selected ? <Text style={{ color: activeTheme.accent, fontSize: 18 }}>✓</Text> : null}
    </Pressable>
  );
}

export function AppearanceScreen() {
  const theme = useTheme();
  const themeKey = useThemeStore((s) => s.themeKey);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Choose your theme</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Applies across the whole app immediately.</Text>

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {OPTIONS.map((opt) => (
          <PreviewRow
            key={opt.key}
            previewTheme={themes[opt.key]}
            selected={themeKey === opt.key}
            onPress={() => setTheme(opt.key)}
            title={opt.title}
            subtitle={opt.subtitle}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold },
  subtitle: { fontSize: typography.sizes.sm, marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5 },
  swatch: { width: 56, height: 44, borderRadius: radii.sm, borderWidth: 1, padding: 6, justifyContent: "center", gap: 4 },
  swatchBubble: { height: 6, borderRadius: 3, width: "70%" },
  swatchBubbleSecond: { alignSelf: "flex-end", width: "50%" },
  rowTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, letterSpacing: 0.5 },
  rowSubtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
});
