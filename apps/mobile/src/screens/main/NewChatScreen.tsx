import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Avatar } from "../../components/Avatar";
import { api } from "../../services/api";

export function NewChatScreen({ navigation }: any) {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [found, setFound] = useState<{
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: string;
  } | null>(null);

  const handleSearch = async () => {
    setError(undefined);
    setFound(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const { user } = await api.searchUserByEmail(email.trim());
      if (!user) {
        setError("No Sainn user found with that email");
      } else {
        setFound(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!found) return;
    setLoading(true);
    try {
      const { conversation } = await api.createConversation({
        type: "direct",
        memberIds: [found.id],
      });
      navigation.replace("Chat", {
        conversationId: conversation.id,
        title: found.displayName ?? "Unknown",
        avatarUrl: found.avatarUrl,
        isOnline: found.status === "online",
        peerId: found.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>New chat</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Enter an email address to find someone on Sainn.
      </Text>

      <View style={{ marginTop: spacing.lg, flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={error}
            autoFocus
          />
        </View>
        <Pressable onPress={handleSearch} style={[styles.searchButton, { backgroundColor: theme.accent }]}>
          {loading && !found ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Search</Text>}
        </Pressable>
      </View>

      {found ? (
        <View style={[styles.resultCard, { backgroundColor: theme.surface }]}>
          <Avatar uri={found.avatarUrl} name={found.displayName ?? "?"} size={56} online={found.status === "online"} />
          <Text style={[styles.resultName, { color: theme.textPrimary }]}>{found.displayName ?? "Unknown"}</Text>
          <View style={{ marginTop: spacing.md, width: "100%" }}>
            <Button label="Start chat" onPress={handleStartChat} loading={loading} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginTop: spacing.md },
  subtitle: { fontSize: typography.sizes.md, marginTop: spacing.xs },
  searchButton: { height: 52, paddingHorizontal: spacing.md, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  resultCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: 20, alignItems: "center" },
  resultName: { marginTop: spacing.sm, fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
});
