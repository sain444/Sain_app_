import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, type Theme } from "../theme/tokens";

const STORAGE_KEY = "sainn_theme_preference";

interface ThemeState {
  themeKey: Theme["key"];
  // Distinguishes "no preference saved yet" (first launch, should show the
  // theme-selection screen once) from "user has chosen" (skip it forever
  // after, per the "do not force returning users to re-select" requirement).
  hasChosenTheme: boolean;
  isHydrated: boolean;
  setTheme: (key: Theme["key"]) => void;
  hydrate: () => Promise<void>;
}

// Theme preference is not sensitive data — plain AsyncStorage is the
// appropriate, standard choice here (unlike auth tokens, which use
// expo-secure-store elsewhere in this app).
export const useThemeStore = create<ThemeState>((set) => ({
  themeKey: "dark",
  hasChosenTheme: false,
  isHydrated: false,

  setTheme: (key) => {
    set({ themeKey: key, hasChosenTheme: true });
    AsyncStorage.setItem(STORAGE_KEY, key).catch((err) => {
      console.warn("Failed to persist theme preference", err);
    });
  },

  hydrate: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && saved in themes) {
        set({ themeKey: saved as Theme["key"], hasChosenTheme: true, isHydrated: true });
        return;
      }
    } catch (err) {
      console.warn("Failed to restore theme preference", err);
    }
    set({ isHydrated: true });
  },
}));
