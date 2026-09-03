// Single source of truth for Sainn's visual identity — three complete
// themes (Minimal / Dark / Light), built from the official brand palette:
// Primary Purple #6B5CFF, Primary Blue #00D4FF, Accent Pink #FF4DB8,
// Dark BG #0A0F2C, Card BG #121734.
//
// Every theme exposes the same semantic token set so components never
// hard-code colors — they consume theme.<token> and get the right value
// for whichever theme is active. Legacy field names (bubbleOutgoing, etc.)
// are kept as aliases so existing screens built before this theme system
// keep working unmodified.

export const brand = {
  primaryPurple: "#6B5CFF",
  primaryBlue: "#00D4FF",
  accentPink: "#FF4DB8",
  darkBg: "#0A0F2C",
  cardBg: "#121734",
};

export interface Theme {
  key: "minimal" | "dark" | "light";
  mode: "light" | "dark";
  // Core surfaces
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string; // legacy alias, == surfaceSecondary
  border: string;
  overlay: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  // Brand accents
  accent: string;
  accentSecondary: string;
  accentSubtle: string; // legacy alias — subtle tinted background for accent chips
  // Chat
  messageSent: string;
  messageSentText: string;
  messageReceived: string;
  messageReceivedText: string;
  bubbleOutgoing: string; // legacy alias == messageSent
  bubbleOutgoingText: string;
  bubbleIncoming: string; // legacy alias == messageReceived
  bubbleIncomingText: string;
  // Inputs / navigation
  input: string;
  navigation: string;
  // Semantic states
  success: string;
  warning: string;
  error: string;
}

function buildTheme(base: {
  key: Theme["key"];
  mode: "light" | "dark";
  background: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSecondary: string;
  accentSubtle: string;
  messageReceived: string;
  messageReceivedText: string;
  messageSentText: string;
  input: string;
  navigation: string;
  overlay: string;
}): Theme {
  return {
    key: base.key,
    mode: base.mode,
    background: base.background,
    surface: base.surface,
    surfaceSecondary: base.surfaceSecondary,
    surfaceElevated: base.surfaceSecondary,
    border: base.border,
    overlay: base.overlay,
    textPrimary: base.textPrimary,
    textSecondary: base.textSecondary,
    textTertiary: base.textTertiary,
    accent: base.accent,
    accentSecondary: base.accentSecondary,
    accentSubtle: base.accentSubtle,
    messageSent: base.accent,
    messageSentText: base.messageSentText,
    messageReceived: base.messageReceived,
    messageReceivedText: base.messageReceivedText,
    bubbleOutgoing: base.accent,
    bubbleOutgoingText: base.messageSentText,
    bubbleIncoming: base.messageReceived,
    bubbleIncomingText: base.messageReceivedText,
    input: base.input,
    navigation: base.navigation,
    success: "#2FB673",
    warning: "#E5A63D",
    error: "#E5484D",
  };
}

// --- DARK: the primary Sainn brand direction — deep navy, purple/blue glow ---
export const darkTheme = buildTheme({
  key: "dark",
  mode: "dark",
  background: brand.darkBg,
  surface: brand.cardBg,
  surfaceSecondary: "#1A2144",
  border: "#232B58",
  textPrimary: "#FFFFFF",
  textSecondary: "#A9B0D4",
  textTertiary: "#6B7099",
  accent: brand.primaryPurple,
  accentSecondary: brand.primaryBlue,
  accentSubtle: "#232A55",
  messageReceived: "#1A2144",
  messageReceivedText: "#FFFFFF",
  messageSentText: "#FFFFFF",
  input: "#151C3D",
  navigation: brand.cardBg,
  overlay: "rgba(10,15,44,0.75)",
});

// --- LIGHT: bright, clean, same brand accents on white ---
export const lightTheme = buildTheme({
  key: "light",
  mode: "light",
  background: "#FFFFFF",
  surface: "#F5F6FB",
  surfaceSecondary: "#EDEFFA",
  border: "#E2E4F5",
  textPrimary: brand.cardBg,
  textSecondary: "#5B6089",
  textTertiary: "#9AA0C7",
  accent: brand.primaryPurple,
  accentSecondary: "#0090C7",
  accentSubtle: "#EEF0FF",
  messageReceived: "#EDEFFA",
  messageReceivedText: brand.cardBg,
  messageSentText: "#FFFFFF",
  input: "#F5F6FB",
  navigation: "#FFFFFF",
  overlay: "rgba(18,23,52,0.5)",
});

// --- MINIMAL: restrained, near-monochrome, single subdued accent ---
export const minimalTheme = buildTheme({
  key: "minimal",
  mode: "light",
  background: "#FFFFFF",
  surface: "#FAFAFA",
  surfaceSecondary: "#F0F0F2",
  border: "#E5E5EA",
  textPrimary: "#111114",
  textSecondary: "#6E6E76",
  textTertiary: "#A0A0A8",
  accent: "#4A4FE0",
  accentSecondary: "#4A4FE0", // same as accent — deliberately monotone
  accentSubtle: "#EFEFFB",
  messageReceived: "#F0F0F2",
  messageReceivedText: "#111114",
  messageSentText: "#FFFFFF",
  input: "#FAFAFA",
  navigation: "#FFFFFF",
  overlay: "rgba(17,17,20,0.45)",
});

export const themes: Record<Theme["key"], Theme> = {
  dark: darkTheme,
  light: lightTheme,
  minimal: minimalTheme,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const typography = {
  fontFamily: "System",
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
  },
};

export const motion = {
  fast: 150,
  normal: 220,
  slow: 320,
};

// Kept for any old code referencing the raw palette directly.
export const palette = {
  indigo50: "#EEF0FF",
  indigo500: brand.primaryPurple,
  neutral0: "#FFFFFF",
  neutral950: brand.darkBg,
};
