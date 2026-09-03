import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radii } from "../../theme/tokens";
import { api } from "../../services/api";

type Visibility = "everyone" | "contacts" | "nobody";
const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "My contacts" },
  { value: "nobody", label: "Nobody" },
];

function VisibilityRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>{label}</Text>
      <View style={styles.pillRow}>
        {OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? theme.accent : theme.surface,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}
            >
              <Text style={{ color: selected ? "#fff" : theme.textSecondary, fontSize: typography.sizes.sm }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PrivacySettingsScreen() {
  const theme = useTheme();
  const [lastSeen, setLastSeen] = useState<Visibility>("everyone");
  const [profilePhoto, setProfilePhoto] = useState<Visibility>("everyone");
  const [readReceipts, setReadReceipts] = useState(true);

  const persist = (patch: Parameters<typeof api.updatePrivacy>[0]) => {
    api.updatePrivacy(patch).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Privacy</Text>

      <VisibilityRow
        label="Last seen"
        value={lastSeen}
        onChange={(v) => {
          setLastSeen(v);
          persist({ privacyLastSeen: v });
        }}
      />
      <VisibilityRow
        label="Profile photo"
        value={profilePhoto}
        onChange={(v) => {
          setProfilePhoto(v);
          persist({ privacyProfilePhoto: v });
        }}
      />

      <View style={[styles.switchRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Read receipts</Text>
        <Switch
          value={readReceipts}
          onValueChange={(v) => {
            setReadReceipts(v);
            persist({ privacyReadReceipts: v });
          }}
        />
      </View>
      <Text style={[styles.hint, { color: theme.textTertiary }]}>
        If you turn off read receipts, you won't see other people's either.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, marginBottom: spacing.sm },
  pillRow: { flexDirection: "row", gap: spacing.sm },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: { fontSize: typography.sizes.xs, marginTop: spacing.xs },
});
