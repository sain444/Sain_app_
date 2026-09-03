import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { typography, spacing } from "../theme/tokens";

// Pure presentational animated splash — logo fades/scales in, then "SAINN",
// then the tagline. No navigation logic here; used both by the auth-flow
// Splash screen (first launch / signed-out) and by RootNavigator's
// hydration wait (returning, already-authenticated users), so everyone
// sees the same branded startup rather than a bare spinner.
export function BrandedSplash() {
  const theme = useTheme();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.Image
        source={require("../../assets/splash-logo.png")}
        style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        resizeMode="contain"
      />
      <Animated.Text style={[styles.title, { color: theme.textPrimary, opacity: titleOpacity }]}>
        SAINN
      </Animated.Text>
      <Animated.View style={{ opacity: taglineOpacity, alignItems: "center" }}>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>More Than Messages.</Text>
        <Text style={[styles.tagline, { color: theme.accent }]}>It's Sainn.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 120, height: 120, marginBottom: spacing.lg },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.semibold,
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
});
