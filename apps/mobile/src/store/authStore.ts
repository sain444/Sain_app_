import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { socketService } from "../services/socket";
import { registerForPushNotifications } from "../services/push";

interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  // FIX (audit-flagged issue): session used to live in memory only, so
  // force-quitting the app logged the user out every time. isHydrated now
  // tracks whether we've finished checking SecureStore for a saved session
  // — screens should wait for this before deciding "logged out" vs "loading".
  isHydrated: boolean;
  setSession: (session: { user: User; accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = "sainn_auth_session";

async function persistSession(session: { user: User; accessToken: string; refreshToken: string } | null) {
  try {
    if (session) {
      // expo-secure-store uses the OS keychain (iOS) / EncryptedSharedPreferences
      // (Android) — appropriate for tokens, unlike plain AsyncStorage.
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch (err) {
    console.warn("Failed to persist auth session to SecureStore", err);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isHydrated: false,

  setSession: ({ user, accessToken, refreshToken }) => {
    set({ user, accessToken, refreshToken });
    persistSession({ user, accessToken, refreshToken });
    socketService.connect();
    registerForPushNotifications().catch(() => {});
  },

  clearSession: () => {
    socketService.disconnect();
    persistSession(null);
    set({ user: null, accessToken: null, refreshToken: null });
  },

  // Call once at app startup (see App.tsx) to restore a saved session before
  // deciding which navigator (auth vs main) to show.
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const session = JSON.parse(raw) as { user: User; accessToken: string; refreshToken: string };
        set({ ...session, isHydrated: true });
        socketService.connect();
        return;
      }
    } catch (err) {
      console.warn("Failed to restore auth session from SecureStore", err);
    }
    set({ isHydrated: true });
  },
}));
