import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { CallOverlay } from "./src/screens/calls/CallOverlay";
import { callManager } from "./src/services/webrtc";
import { useAuthStore } from "./src/store/authStore";
import { useThemeStore } from "./src/store/themeStore";
import { useOfflineStore } from "./src/store/offlineStore";

export default function App() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateOffline = useOfflineStore((s) => s.hydrate);

  useEffect(() => {
    callManager.bindSignaling();
    hydrateAuth();
    hydrateTheme();
    hydrateOffline();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <RootNavigator />
        <CallOverlay />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
