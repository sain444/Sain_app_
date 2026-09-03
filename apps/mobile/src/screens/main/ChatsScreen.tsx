import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, ActionSheetIOS, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Avatar } from "../../components/Avatar";
import { api, type Conversation } from "../../services/api";
import { socketService } from "../../services/socket";
import { useAuthStore } from "../../store/authStore";

function conversationDisplay(conversation: Conversation, currentUserId?: string) {
  if (conversation.type === "group") {
    return { title: conversation.title ?? "Group", avatarUrl: conversation.avatarUrl, isOnline: false };
  }
  const otherMember = conversation.members.find((m) => m.userId !== currentUserId);
  return {
    title: otherMember?.user?.displayName ?? "Unknown",
    avatarUrl: otherMember?.user?.avatarUrl,
    isOnline: otherMember?.user?.status === "online",
    peerId: otherMember?.userId,
  };
}

export function ChatsScreen({ navigation }: any) {
  const theme = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { conversations } = await api.listConversations();
      setConversations(conversations);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    socketService.connect();
    load();

    const onNewMessage = () => load(); // simplest correct approach for Phase 2; optimize with in-place updates later
    socketService.on("message:new", onNewMessage);
    return () => socketService.off("message:new", onNewMessage);
  }, [load]);

  const handleNewPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "New chat", "New group"], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) navigation.navigate("NewChat");
          if (index === 2) navigation.navigate("NewGroup");
        }
      );
    } else {
      Alert.alert("New", undefined, [
        { text: "New chat", onPress: () => navigation.navigate("NewChat") },
        { text: "New group", onPress: () => navigation.navigate("NewGroup") },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const { title, avatarUrl, isOnline, peerId } = conversationDisplay(item, currentUserId);
    const lastMessage = item.messages?.[0];

    return (
      <Pressable
        style={styles.row}
        onPress={() =>
          navigation.navigate("Chat", { conversationId: item.id, title, avatarUrl, isOnline, peerId })
        }
      >
        <Avatar uri={avatarUrl} name={title} size={52} online={isOnline} />
        <View style={styles.rowContent}>
          <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={1}>
            {lastMessage?.isDeleted
              ? "Message deleted"
              : lastMessage?.content ?? "No messages yet"}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Chats</Text>
        <Pressable accessibilityLabel="New chat or group" onPress={handleNewPress}>
          <Text style={{ fontSize: 24, color: theme.accent }}>✎</Text>
        </Pressable>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No conversations yet</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Start a new chat to say hello.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  rowContent: { flex: 1 },
  name: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  preview: { fontSize: typography.sizes.sm, marginTop: 2 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginBottom: spacing.xs },
  emptyText: { fontSize: typography.sizes.sm, textAlign: "center" },
});
