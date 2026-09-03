import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, radii, typography } from "../../theme/tokens";
import { Input } from "../../components/Input";
import { MessageBubble } from "../../components/MessageBubble";
import { EmojiPicker } from "../../components/EmojiPicker";
import { api, uploadFile, type Message } from "../../services/api";
import { socketService } from "../../services/socket";
import { callManager } from "../../services/webrtc";
import { useAuthStore } from "../../store/authStore";

// Route params expected: { conversationId: string, title: string, avatarUrl?: string, isOnline?: boolean, peerId?: string }
export function ChatScreen({ route, navigation }: any) {
  const { conversationId, title, avatarUrl, isOnline, peerId } = route.params;
  const theme = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  const startCall = useCallback(
    (callType: "audio" | "video") => {
      if (!peerId) return;
      callManager.startOutgoingCall(peerId, conversationId, callType, { displayName: title, avatarUrl: avatarUrl ?? null });
    },
    [peerId, conversationId, title, avatarUrl]
  );

  const handleMorePress = () => {
    const options = ["Search in chat", peerId ? "Block user" : null, peerId ? "Report user" : null, "Cancel"].filter(
      Boolean
    ) as string[];
    const cancelButtonIndex = options.length - 1;

    const handleChoice = (label: string) => {
      if (label === "Search in chat") navigation.navigate("SearchMessages", { conversationId });
      if (label === "Block user" && peerId) {
        Alert.alert("Block user?", `You won't receive messages or calls from ${title}.`, [
          { text: "Cancel", style: "cancel" },
          { text: "Block", style: "destructive", onPress: () => api.blockUser(peerId).then(() => navigation.goBack()) },
        ]);
      }
      if (label === "Report user" && peerId) {
        Alert.alert("Report user", "Why are you reporting this user?", [
          { text: "Cancel", style: "cancel" },
          { text: "Spam", onPress: () => api.reportUser(peerId, "spam") },
          { text: "Harassment", onPress: () => api.reportUser(peerId, "harassment") },
          { text: "Other", onPress: () => api.reportUser(peerId, "other") },
        ]);
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex: options.indexOf("Block user") },
        (index) => handleChoice(options[index])
      );
    } else {
      Alert.alert(
        "Chat options",
        undefined,
        options.map((label) => ({ text: label, onPress: () => handleChoice(label), style: label === "Cancel" ? "cancel" : undefined }))
      );
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title,
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable accessibilityLabel="Start voice call" onPress={() => startCall("audio")}>
            <Text style={{ color: theme.accent, fontSize: 20 }}>📞</Text>
          </Pressable>
          <Pressable accessibilityLabel="Start video call" onPress={() => startCall("video")}>
            <Text style={{ color: theme.accent, fontSize: 20 }}>🎥</Text>
          </Pressable>
          <Pressable accessibilityLabel="More options" onPress={handleMorePress}>
            <Text style={{ color: theme.accent, fontSize: 20 }}>⋮</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, title, theme.accent, startCall, peerId, conversationId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { messages } = await api.listMessages(conversationId);
        if (mounted) setMessages(messages.reverse());
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    socketService.joinConversation(conversationId);

    const onNew = (message: Message) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, message]);
    };
    const onEdited = (message: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };
    const onDeleted = ({ id }: { id: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isDeleted: true } : m)));
    };
    const onHidden = ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    };
    const onTypingStart = ({ conversationId: cid, userId }: any) => {
      if (cid !== conversationId || userId === currentUserId) return;
      setTypingUsers((prev) => new Set(prev).add(userId));
    };
    const onTypingStop = ({ conversationId: cid, userId }: any) => {
      if (cid !== conversationId) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socketService.on("message:new", onNew);
    socketService.on("message:edited", onEdited);
    socketService.on("message:deleted", onDeleted);
    socketService.on("message:hidden", onHidden);
    socketService.on("typing:start", onTypingStart);
    socketService.on("typing:stop", onTypingStop);

    return () => {
      mounted = false;
      socketService.leaveConversation(conversationId);
      socketService.off("message:new", onNew);
      socketService.off("message:edited", onEdited);
      socketService.off("message:deleted", onDeleted);
      socketService.off("message:hidden", onHidden);
      socketService.off("typing:start", onTypingStart);
      socketService.off("typing:stop", onTypingStop);
    };
  }, [conversationId, currentUserId]);

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    socketService.stopTyping(conversationId);
    try {
      await api.sendMessage(conversationId, { type: "text", content });
      // The new message arrives back via the "message:new" socket event —
      // avoids showing a duplicate optimistic copy that then has to be reconciled.
    } catch {
      setDraft(content); // restore on failure so nothing is lost
    }
  }, [draft, conversationId]);

  const [sendingMedia, setSendingMedia] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleChangeDraft = (text: string) => {
    setDraft(text);
    if (text.length === 1) socketService.startTyping(conversationId);
    if (text.length === 0) socketService.stopTyping(conversationId);
  };

  const sendMediaMessage = useCallback(
    async (
      localUri: string,
      mimeType: string,
      type: "image" | "video" | "file" | "audio",
      fileName?: string,
      durationMs?: number
    ) => {
      setSendingMedia(true);
      try {
        const publicUrl = await uploadFile(localUri, mimeType);
        await api.sendMessage(conversationId, {
          type,
          content: fileName,
          mediaUrl: publicUrl,
          mediaDurationMs: durationMs,
        } as any);
      } catch (err) {
        console.warn("Media send failed", err);
      } finally {
        setSendingMedia(false);
      }
    },
    [conversationId]
  );

  const handleAttach = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const type = asset.type === "video" ? "video" : "image";
    await sendMediaMessage(asset.uri, asset.mimeType ?? (type === "video" ? "video/mp4" : "image/jpeg"), type);
  };

  const handleAttachFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await sendMediaMessage(asset.uri, asset.mimeType ?? "application/octet-stream", "file", asset.name);
  };

  const startRecording = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) return;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(recording);
    setRecordingSeconds(0);
    recordingTimer.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  };

  const cancelRecording = async () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    await recording?.stopAndUnloadAsync();
    setRecording(null);
    setRecordingSeconds(0);
  };

  const sendRecording = async () => {
    if (!recording) return;
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const durationMs = recordingSeconds * 1000;
    setRecording(null);
    if (uri) {
      await sendMediaMessage(uri, "audio/m4a", "audio", undefined, durationMs);
    }
    setRecordingSeconds(0);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.senderId === currentUserId} showReadReceipt />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ paddingVertical: spacing.md }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.textSecondary }}>
                  Say hello 👋 — this is the start of your conversation.
                </Text>
              </View>
            ) : null
          }
        />

        {typingUsers.size > 0 ? (
          <Text style={[styles.typingIndicator, { color: theme.textTertiary }]}>typing…</Text>
        ) : null}

        {recording ? (
          <View style={[styles.recordingBar, { backgroundColor: theme.surfaceElevated, borderTopColor: theme.border }]}>
            <Pressable onPress={cancelRecording} accessibilityLabel="Cancel recording">
              <Text style={{ color: theme.error, fontSize: typography.sizes.md }}>Cancel</Text>
            </Pressable>
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
              <Text style={{ color: theme.textPrimary }}>
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}
              </Text>
            </View>
            <Pressable
              onPress={sendRecording}
              style={[styles.sendButton, { backgroundColor: theme.accent }]}
              accessibilityLabel="Send voice message"
            >
              <Text style={{ color: "#fff", fontSize: 18 }}>➤</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.inputBar, { backgroundColor: theme.surfaceElevated, borderTopColor: theme.border }]}>
            <Pressable accessibilityLabel="Attach photo or video" style={styles.attachButton} onPress={handleAttach}>
              <Text style={{ fontSize: 22 }}>🖼️</Text>
            </Pressable>
            <Pressable accessibilityLabel="Attach file" style={styles.attachButton} onPress={handleAttachFile}>
              <Text style={{ fontSize: 20 }}>📎</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Open emoji picker"
              style={styles.attachButton}
              onPress={() => setEmojiPickerVisible(true)}
            >
              <Text style={{ fontSize: 20 }}>😀</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Message"
                value={draft}
                onChangeText={handleChangeDraft}
                multiline
                style={{ minHeight: 44, maxHeight: 120 }}
              />
            </View>
            {sendingMedia ? (
              <ActivityIndicator color={theme.accent} style={{ width: 40 }} />
            ) : (
              <Pressable
                accessibilityLabel={draft ? "Send message" : "Record voice message"}
                onPress={draft ? handleSend : startRecording}
                style={[styles.sendButton, { backgroundColor: theme.accent }]}
              >
                <Text style={{ color: "#fff", fontSize: 18 }}>{draft ? "➤" : "🎙️"}</Text>
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <EmojiPicker
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelect={(emoji) => {
          setDraft((prev) => prev + emoji);
          if (draft.length === 0) socketService.startTyping(conversationId);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: spacing.xxl },
  typingIndicator: { paddingHorizontal: spacing.md, paddingBottom: 2, fontSize: typography.sizes.xs },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  attachButton: { padding: spacing.sm },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  recordingIndicator: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  recordingDot: { width: 10, height: 10, borderRadius: 5 },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
