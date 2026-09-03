import { useAuthStore } from "../store/authStore";

// FIX (audit-flagged issue): this was previously hardcoded to
// "http://localhost:4000", which silently breaks on physical devices and in
// any production build. Now reads from EXPO_PUBLIC_API_URL (see
// apps/mobile/.env.example for how to set it per environment — Expo loads
// EXPO_PUBLIC_-prefixed vars automatically, no extra config needed), falling
// back to localhost only for convenience in local simulator development.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string | null; avatarUrl: string | null };
}

export interface CurrentUser {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
  lastSeenAt: string | null;
  privacyLastSeen: "everyone" | "contacts" | "nobody";
  privacyProfilePhoto: "everyone" | "contacts" | "nobody";
  privacyReadReceipts: boolean;
  createdAt: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = options;
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(!skipAuth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`);
  }

  return data as T;
}

export async function uploadFile(localUri: string, mimeType: string): Promise<string> {
  const { uploadUrl, publicUrl, method } = await api.getUploadUrl(mimeType);
  const accessToken = useAuthStore.getState().accessToken;

  if (method === "PUT") {
    // S3 presigned URL — direct upload, no auth header needed (URL itself is the credential).
    const fileData = await fetch(localUri).then((r) => r.blob());
    const res = await fetch(uploadUrl, { method: "PUT", body: fileData, headers: { "Content-Type": mimeType } });
    if (!res.ok) throw new Error("Upload failed");
  } else {
    // Local dev fallback — multipart POST to our own server, needs auth.
    const formData = new FormData();
    formData.append("file", { uri: localUri, type: mimeType, name: "upload" } as any);
    const res = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Upload failed");
  }

  return publicUrl;
}

export const api = {
  signup: (displayName: string, email: string, password: string, confirmPassword: string, deviceId?: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ displayName, email, password, confirmPassword, deviceId }),
      skipAuth: true,
    }),

  login: (email: string, password: string, deviceId?: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, deviceId }),
      skipAuth: true,
    }),

  requestPasswordReset: (email: string) =>
    request<{ message: string }>("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuth: true,
    }),

  confirmPasswordReset: (email: string, token: string, newPassword: string, confirmNewPassword: string) =>
    request<{ message: string }>("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ email, token, newPassword, confirmNewPassword }),
      skipAuth: true,
    }),

  getMe: () => request<{ user: CurrentUser }>("/users/me"),

  updateProfile: (body: { displayName?: string; username?: string; avatarUrl?: string }) =>
    request<{ user: CurrentUser }>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),

  listConversations: () => request<{ conversations: Conversation[] }>("/conversations"),

  searchUserByEmail: (email: string) =>
    request<{ user: { id: string; displayName: string | null; avatarUrl: string | null; status: string } | null }>(
      `/users/search?email=${encodeURIComponent(email)}`
    ),

  createConversation: (body: { type: "direct" | "group"; memberIds: string[]; title?: string }) =>
    request<{ conversation: Conversation }>("/conversations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listMessages: (conversationId: string, cursor?: string) =>
    request<{ messages: Message[] }>(
      `/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ""}`
    ),

  sendMessage: (
    conversationId: string,
    body: { type: string; content?: string; replyToMessageId?: string }
  ) =>
    request<{ message: Message }>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  editMessage: (messageId: string, content: string) =>
    request<{ message: Message }>(`/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),

  searchMessages: (conversationId: string, query: string) =>
    request<{ messages: Message[] }>(`/conversations/${conversationId}/messages/search?q=${encodeURIComponent(query)}`),

  deleteMessage: (messageId: string, forEveryone: boolean) =>
    request<{ message: Message }>(`/messages/${messageId}`, {
      method: "DELETE",
      body: JSON.stringify({ forEveryone }),
    }),

  reactToMessage: (messageId: string, emoji: string) =>
    request<{ reaction: unknown }>(`/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }),

  getIceServers: () => request<{ iceServers: RTCIceServerConfig[] }>("/calls/ice-servers"),

  startCall: (id: string, conversationId: string, type: "audio" | "video") =>
    request<{ call: unknown }>("/calls", {
      method: "POST",
      body: JSON.stringify({ id, conversationId, type }),
    }),

  endCall: (id: string, status: "missed" | "completed" | "declined" | "failed") =>
    request<{ call: unknown }>(`/calls/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getCallHistory: () => request<{ calls: CallHistoryEntry[] }>("/calls/history"),

  getUploadUrl: (mimeType: string) =>
    request<{ uploadUrl: string; publicUrl: string; method: "PUT" | "POST"; mode: "s3" | "local" }>(
      "/media/upload-url",
      { method: "POST", body: JSON.stringify({ mimeType }) }
    ),

  registerDevice: (pushToken: string, platform: "ios" | "android" | "web") =>
    request<{ device: unknown }>("/devices", {
      method: "POST",
      body: JSON.stringify({ pushToken, platform }),
    }),

  blockUser: (userId: string) => request<{ block: unknown }>(`/users/${userId}/block`, { method: "POST" }),
  unblockUser: (userId: string) => request<{ ok: boolean }>(`/users/${userId}/block`, { method: "DELETE" }),
  listBlocks: () =>
    request<{ blocks: { id: string; blocked: { id: string; displayName: string | null; avatarUrl: string | null } }[] }>(
      "/blocks"
    ),
  reportUser: (userId: string, reason: string, messageId?: string) =>
    request<{ report: unknown }>(`/users/${userId}/report`, {
      method: "POST",
      body: JSON.stringify({ reason, messageId }),
    }),

  updatePrivacy: (body: {
    privacyLastSeen?: "everyone" | "contacts" | "nobody";
    privacyProfilePhoto?: "everyone" | "contacts" | "nobody";
    privacyReadReceipts?: boolean;
  }) => request<{ user: unknown }>("/users/me/privacy", { method: "PATCH", body: JSON.stringify(body) }),

  listStories: () => request<{ stories: Story[] }>("/stories"),
  postStory: (mediaUrl: string, caption?: string, audience: StoryAudience = "contacts", audienceUserIds: string[] = []) =>
    request<{ story: Story }>("/stories", { method: "POST", body: JSON.stringify({ mediaUrl, caption, audience, audienceUserIds }) }),
  viewStory: (storyId: string) => request<{ view: unknown }>(`/stories/${storyId}/view`, { method: "POST" }),
};

export type StoryAudience = "everyone" | "contacts" | "contacts_except" | "only_share_with";

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  audience: StoryAudience;
  audienceUserIds: string[];
  user: { id: string; displayName: string | null; avatarUrl: string | null };
  views: { viewerId: string }[];
}

export interface RTCIceServerConfig {
  urls: string;
  username?: string;
  credential?: string;
}

export interface CallHistoryEntry {
  id: string;
  type: "audio" | "video";
  status: "missed" | "completed" | "declined" | "failed";
  startedAt: string;
  durationSeconds: number | null;
  initiator: { id: string; displayName: string | null; avatarUrl: string | null };
  conversation: { id: string; type: string; title: string | null };
}

export interface ConversationMember {
  id: string;
  userId: string;
  role: string;
  user?: { id: string; displayName: string | null; avatarUrl: string | null; status: string };
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  title: string | null;
  avatarUrl: string | null;
  updatedAt: string;
  members: ConversationMember[];
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender?: { id: string; displayName: string | null; avatarUrl: string | null };
  reactions?: { userId: string; emoji: string }[];
  receipts?: { userId: string; status: string }[];
  replyTo?: { id: string; content: string | null; senderId: string; type: string } | null;
}
