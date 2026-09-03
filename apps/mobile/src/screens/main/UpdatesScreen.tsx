import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, Image, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radii } from "../../theme/tokens";
import { Avatar } from "../../components/Avatar";
import { api, uploadFile, type Story } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

export function UpdatesScreen() {
  const theme = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  const load = useCallback(async () => {
    try {
      const { stories } = await api.listStories();
      setStories(stories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePostStory = async () => {
    const audience = await new Promise<"everyone" | "contacts" | null>((resolve) => {
      Alert.alert("Who can see this update?", "Choose your audience.", [
        { text: "Contacts", onPress: () => resolve("contacts") },
        { text: "Everyone", onPress: () => resolve("everyone") },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
    });
    if (!audience) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setPosting(true);
    try {
      const publicUrl = await uploadFile(result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
      await api.postStory(publicUrl, undefined, audience, []);
      load();
    } finally {
      setPosting(false);
    }
  };

  const openStory = (story: Story) => {
    setViewingStory(story);
    api.viewStory(story.id).catch(() => {});
  };

  // Group stories by author for the "who posted" row (a simplified version of
  // per-contact story rings — full multi-story-per-user carousel is a
  // reasonable follow-up).
  const myStory = stories.find((s) => s.userId === currentUserId);
  const othersStories = stories.filter((s) => s.userId !== currentUserId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Updates</Text>

      <FlatList
        data={othersStories}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <Pressable style={styles.myStoryRow} onPress={myStory ? () => openStory(myStory) : handlePostStory}>
            <View>
              <Avatar name="You" size={56} online={false} />
              <View style={[styles.addBadge, { backgroundColor: theme.accent, borderColor: theme.background }]}>
                <Text style={{ color: "#fff", fontSize: 14 }}>+</Text>
              </View>
            </View>
            <Text style={[styles.storyLabel, { color: theme.textPrimary }]}>
              {posting ? "Posting…" : myStory ? "Your update" : "Add to your update"}
            </Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.storyRow} onPress={() => openStory(item)}>
            <View style={[styles.ring, { borderColor: theme.accent }]}>
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName ?? "?"} size={52} />
            </View>
            <Text style={[styles.storyLabel, { color: theme.textPrimary }]}>{item.user.displayName ?? "Unknown"}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No updates from your contacts yet.
            </Text>
          ) : null
        }
      />

      <Modal visible={!!viewingStory} animationType="fade">
        {viewingStory ? (
          <Pressable style={styles.viewerContainer} onPress={() => setViewingStory(null)}>
            <Image source={{ uri: viewingStory.mediaUrl }} style={styles.viewerImage} resizeMode="contain" />
            <SafeAreaView style={styles.viewerHeader}>
              <Avatar uri={viewingStory.user.avatarUrl} name={viewingStory.user.displayName ?? "?"} size={36} />
              <Text style={styles.viewerName}>{viewingStory.user.displayName ?? "Unknown"}</Text>
            </SafeAreaView>
          </Pressable>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.semibold, marginBottom: spacing.md },
  myStoryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  storyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  storyLabel: { fontSize: typography.sizes.md },
  ring: { borderWidth: 2, borderRadius: radii.pill, padding: 2 },
  addBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  emptyText: { textAlign: "center", marginTop: spacing.xl },
  viewerContainer: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  viewerImage: { width: "100%", height: "100%" },
  viewerHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  viewerName: { color: "#fff", fontWeight: typography.weights.medium },
});
