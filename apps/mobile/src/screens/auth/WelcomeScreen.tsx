import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Button } from "../../components/Button";
import { useThemeStore } from "../../store/themeStore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const hasChosenTheme = useThemeStore((s) => s.hasChosenTheme);

  // First launch: Welcome -> Theme selection -> Signup/Login.
  // Returning user (theme already chosen, even across logout): skip straight
  // to Signup/Login — never force a re-selection.
  const goTo = (next: "Signup" | "Login") => {
    if (hasChosenTheme) {
      navigation.navigate(next);
    } else {
      navigation.navigate("ThemeSelection", { next });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.hero}>
        <Image source={require("../../../assets/splash-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Sainn</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          More Than Messages. It's Sainn.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Create an account" onPress={() => goTo("Signup")} />
        <View style={{ height: spacing.md }} />
        <Button label="I already have an account" variant="secondary" onPress={() => goTo("Login")} />
        <Text style={[styles.legal, { color: theme.textTertiary }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", padding: spacing.lg },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 88, height: 88, marginBottom: spacing.lg },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold },
  subtitle: {
    fontSize: typography.sizes.md,
    textAlign: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  actions: { paddingBottom: spacing.lg },
  legal: {
    fontSize: typography.sizes.xs,
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
