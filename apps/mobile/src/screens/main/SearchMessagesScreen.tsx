import React, { useState } from "react";
import { View, FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Input } from "../../components/Input";
import { api, type Message } from "../../services/api";

export function SearchMessagesScreen({ route }: any) {
  const { conversationId } = route.params;
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const { messages } = await api.searchMessages(conversationId, text.trim());
    setResults(messages);
    setSearched(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Input placeholder="Search in this chat" value={query} onChangeText={handleSearch} autoFocus />
      <FlatList
        data={results}
        keyExtractor={(m) => m.id}
        style={{ marginTop: spacing.md }}
        renderItem={({ item }) => (
          <View style={[styles.resultRow, { borderBottomColor: theme.border }]}>
            <Text style={{ color: theme.textSecondary, fontSize: typography.sizes.xs }}>
              {item.sender?.displayName ?? "Unknown"} · {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={{ color: theme.textPrimary, marginTop: 2 }} numberOfLines={2}>
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          searched ? (
            <Text style={{ color: theme.textSecondary, textAlign: "center", marginTop: spacing.xl }}>
              No messages found.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  resultRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
