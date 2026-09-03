import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { BrandedSplash } from "../components/BrandedSplash";

const Stack = createNativeStackNavigator();

// Splash hold time — long enough for the logo/title/tagline animation to
// play out fully (see BrandedSplash), short enough not to feel slow.
const MIN_SPLASH_MS = 2200;

// One single branded startup for every launch — fresh install, signed-out
// return visit, or already-authenticated return visit — rather than
// showing it once in the auth stack and a bare spinner everywhere else.
// Auth/theme hydration happens underneath it; once both are ready AND the
// minimum hold time has passed, we go straight to Welcome or Main tabs
// with no redundant second splash screen in between.
export function RootNavigator() {
  const user = useAuthStore((s) => s.user);
  const isAuthHydrated = useAuthStore((s) => s.isHydrated);
  const isThemeHydrated = useThemeStore((s) => s.isHydrated);
  const [minHoldElapsed, setMinHoldElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinHoldElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = isAuthHydrated && isThemeHydrated && minHoldElapsed;

  if (!ready) {
    return <BrandedSplash />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
