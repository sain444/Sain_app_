import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radii, themes, type Theme } from "../../theme/tokens";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "../../components/Button";

interface ThemeOption {
  key: Theme["key"];
  title: string;
  subtitle: string;
}

const OPTIONS: ThemeOption[] = [
  { key: "minimal", title: "MINIMAL", subtitle: "Clean • Elegant • Simple" },
  { key: "dark", title: "DARK", subtitle: "Premium • Immersive • Modern" },
  { key: "light", title: "LIGHT", subtitle: "Bright • Clean • Fresh" },
];

// A tiny static mockup of a chat screen, rendered using each candidate
// theme's own tokens — so the preview is a real (if miniature) sample of
// that theme's surfaces/text/bubbles, not a screenshot or a separate
// hardcoded design.
function ThemePreview({ previewTheme, selected, onPress }: { previewTheme: Theme; selected: boolean; onPress: () => void }) {
  const activeTheme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: previewTheme.background,
          borderColor: selected ? activeTheme.accent : previewTheme.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View style={[styles.previewNav, { backgroundColor: previewTheme.navigation, borderBottomColor: previewTheme.border }]}>
        <View style={[styles.previewDot, { backgroundColor: previewTheme.accent }]} />
        <View style={[styles.previewBar, { backgroundColor: previewTheme.textTertiary, width: 40 }]} />
      </View>
      <View style={styles.previewBody}>
        <View style={[styles.previewBubble, styles.previewBubbleLeft, { backgroundColor: previewTheme.messageReceived }]} />
        <View style={[styles.previewBubble, styles.previewBubbleRight, { backgroundColor: previewTheme.messageSent }]} />
        <View style={[styles.previewBubble, styles.previewBubbleLeft, { backgroundColor: previewTheme.messageReceived, width: 50 }]} />
      </View>
    </Pressable>
  );
}

export function ThemeSelectionScreen({ navigation, route }: any) {
  const theme = useTheme();
  const setTheme = useThemeStore((s) => s.setTheme);
  const [selected, setSelected] = useState<Theme["key"]>("dark");

  const handleContinue = () => {
    setTheme(selected);
    const next = route?.params?.next ?? "Login";
    navigation.replace(next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Choose your theme</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        You can always change this later in Settings → Appearance.
      </Text>

      <View style={styles.grid}>
        {OPTIONS.map((opt) => (
          <View key={opt.key} style={styles.optionColumn}>
            <ThemePreview previewTheme={themes[opt.key]} selected={selected === opt.key} onPress={() => setSelected(opt.key)} />
            <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>{opt.title}</Text>
            <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>{opt.subtitle}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginTop: spacing.xl, textAlign: "center" },
  subtitle: { fontSize: typography.sizes.sm, marginTop: spacing.xs, textAlign: "center", marginBottom: spacing.lg },
  grid: { flex: 1, justifyContent: "center", gap: spacing.lg },
  optionColumn: { alignItems: "center" },
  card: { width: "100%", height: 90, borderRadius: radii.lg, overflow: "hidden" },
  previewNav: { height: 22, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 6, borderBottomWidth: 1 },
  previewDot: { width: 10, height: 10, borderRadius: 5 },
  previewBar: { height: 6, borderRadius: 3 },
  previewBody: { flex: 1, padding: 8, gap: 6, justifyContent: "center" },
  previewBubble: { height: 12, borderRadius: 6 },
  previewBubbleLeft: { alignSelf: "flex-start", width: 70 },
  previewBubbleRight: { alignSelf: "flex-end", width: 60 },
  optionTitle: { marginTop: spacing.sm, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, letterSpacing: 1 },
  optionSubtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
  footer: { paddingBottom: spacing.lg, paddingTop: spacing.md },
});
