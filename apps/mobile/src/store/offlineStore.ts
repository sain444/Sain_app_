import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type OfflineMode = "auto" | "online" | "offline";
export type OfflinePayloadType = "text" | "image" | "voice" | "file";

export interface OfflineQueuedItem {
  id: string;
  conversationId: string;
  type: OfflinePayloadType;
  createdAt: number;
  payload: string;
  fileName?: string;
  mimeType?: string;
  status: "queued" | "sending" | "sent" | "failed";
  attempts: number;
}

interface OfflineState {
  mode: OfflineMode;
  nearbyEnabled: boolean;
  queue: OfflineQueuedItem[];
  hydrated: boolean;
  setMode: (mode: OfflineMode) => Promise<void>;
  setNearbyEnabled: (enabled: boolean) => Promise<void>;
  hydrate: () => Promise<void>;
  enqueue: (item: OfflineQueuedItem) => Promise<void>;
  updateItem: (id: string, patch: Partial<OfflineQueuedItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

const MODE_KEY = "sainn.offline.mode";
const ENABLED_KEY = "sainn.offline.nearby.enabled";
const QUEUE_KEY = "sainn.offline.queue.v1";

async function persist(mode: OfflineMode, nearbyEnabled: boolean, queue: OfflineQueuedItem[]) {
  await AsyncStorage.multiSet([
    [MODE_KEY, mode],
    [ENABLED_KEY, JSON.stringify(nearbyEnabled)],
    [QUEUE_KEY, JSON.stringify(queue)],
  ]);
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  mode: "auto",
  nearbyEnabled: false,
  queue: [],
  hydrated: false,

  setMode: async (mode) => {
    set({ mode });
    await persist(mode, get().nearbyEnabled, get().queue);
  },

  setNearbyEnabled: async (nearbyEnabled) => {
    set({ nearbyEnabled });
    await persist(get().mode, nearbyEnabled, get().queue);
  },

  hydrate: async () => {
    try {
      const values = await AsyncStorage.multiGet([MODE_KEY, ENABLED_KEY, QUEUE_KEY]);
      const map = Object.fromEntries(values);
      const mode = (map[MODE_KEY] as OfflineMode | undefined) ?? "auto";
      const nearbyEnabled = map[ENABLED_KEY] ? JSON.parse(map[ENABLED_KEY]) : false;
      const queue = map[QUEUE_KEY] ? JSON.parse(map[QUEUE_KEY]) : [];
      set({ mode, nearbyEnabled: Boolean(nearbyEnabled), queue, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  enqueue: async (item) => {
    const queue = [...get().queue, item];
    set({ queue });
    await persist(get().mode, get().nearbyEnabled, queue);
  },

  updateItem: async (id, patch) => {
    const queue = get().queue.map((item) => (item.id === id ? { ...item, ...patch } : item));
    set({ queue });
    await persist(get().mode, get().nearbyEnabled, queue);
  },

  removeItem: async (id) => {
    const queue = get().queue.filter((item) => item.id !== id);
    set({ queue });
    await persist(get().mode, get().nearbyEnabled, queue);
  },
}));
