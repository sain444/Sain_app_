import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radii } from "../../theme/tokens";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Avatar } from "../../components/Avatar";
import { api } from "../../services/api";

interface FoundUser {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
}

export function NewGroupScreen({ navigation }: any) {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<FoundUser[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleAddMember = async () => {
    setError(undefined);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    try {
      const { user } = await api.searchUserByEmail(email.trim());
      if (!user) {
        setError("No Sainn user found with that email");
        return;
      }
      if (members.some((m) => m.id === user.id)) {
        setError("Already added");
        return;
      }
      setMembers((prev) => [...prev, user]);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Give your group a name");
      return;
    }
    if (members.length < 1) {
      setError("Add at least one more person");
      return;
    }
    setLoading(true);
    try {
      const { conversation } = await api.createConversation({
        type: "group",
        title: title.trim(),
        memberIds: members.map((m) => m.id),
      });
      navigation.replace("Chat", { conversationId: conversation.id, title: conversation.title });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>New group</Text>

      <Input label="Group name" placeholder="Weekend Trip" value={title} onChangeText={setTitle} />

      <View style={{ marginTop: spacing.md, flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Add member by email"
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={error}
          />
        </View>
        <Pressable onPress={handleAddMember} style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <Text style={{ color: "#fff" }}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        style={{ marginTop: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Avatar uri={item.avatarUrl} name={item.displayName ?? "?"} size={40} />
            <Text style={[styles.memberName, { color: theme.textPrimary }]}>{item.displayName ?? "Unknown"}</Text>
            <Pressable onPress={() => setMembers((prev) => prev.filter((m) => m.id !== item.id))}>
              <Text style={{ color: theme.error }}>Remove</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Button label={`Create group (${members.length + 1} members)`} onPress={handleCreate} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginBottom: spacing.md },
  addButton: { height: 52, paddingHorizontal: spacing.md, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  memberName: { flex: 1 },
  footer: { marginTop: "auto", paddingBottom: spacing.lg },
});
