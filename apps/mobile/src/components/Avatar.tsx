import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radii, typography } from "../theme/tokens";

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
}

export function Avatar({ uri, name, size = 48, online }: AvatarProps) {
  const theme = useTheme();
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radii.pill }}
          accessibilityLabel={name ? `${name}'s avatar` : "Avatar"}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: radii.pill,
              backgroundColor: theme.accentSubtle,
            },
          ]}
        >
          <Text
            style={{
              color: theme.accent,
              fontSize: size * 0.38,
              fontWeight: typography.weights.semibold,
            }}
          >
            {initials}
          </Text>
        </View>
      )}
      {online ? (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: radii.pill,
              backgroundColor: theme.success,
              borderColor: theme.background,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});
