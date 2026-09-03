import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, Modal } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radii, typography } from "../theme/tokens";

// A curated set grouped by category, not a full unicode emoji database —
// keeps this dependency-free (no native emoji-picker package needed) while
// covering what people actually reach for in a chat app. Easy to extend.
const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤔", "😎",
      "😢", "😭", "😡", "😱", "🥳", "😴", "🤗", "🙄", "😇", "🤩",
    ],
  },
  {
    label: "Gestures",
    icon: "👍",
    emojis: [
      "👍", "👎", "👏", "🙌", "🙏", "💪", "👋", "🤝", "✌️", "🤞",
      "👌", "🤙", "☝️", "👊", "🫶", "🤟",
    ],
  },
  {
    label: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💖",
      "💯", "🔥", "✨", "🎉", "🎊", "⭐",
    ],
  },
  {
    label: "Objects",
    icon: "📱",
    emojis: [
      "📱", "💻", "📷", "🎵", "🎮", "☕", "🍕", "🍔", "🎂", "🎁",
      "⚽", "🚗", "✈️", "🏠", "💡", "📌",
    ],
  },
];

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ visible, onClose, onSelect }: EmojiPickerProps) {
  const theme = useTheme();
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <FlatList
            data={CATEGORIES[activeCategory].emojis}
            keyExtractor={(item, i) => `${item}-${i}`}
            numColumns={8}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Pressable
                style={styles.emojiCell}
                onPress={() => onSelect(item)}
                accessibilityLabel={`Insert ${item} emoji`}
              >
                <Text style={styles.emojiText}>{item}</Text>
              </Pressable>
            )}
          />

          <View style={[styles.categoryBar, { borderTopColor: theme.border }]}>
            {CATEGORIES.map((cat, index) => (
              <Pressable
                key={cat.label}
                style={[
                  styles.categoryButton,
                  index === activeCategory && { backgroundColor: theme.accentSubtle, borderRadius: radii.md },
                ]}
                onPress={() => setActiveCategory(index)}
                accessibilityLabel={`${cat.label} emoji category`}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { height: 340, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.sm },
  grid: { paddingHorizontal: spacing.sm },
  emojiCell: { width: `${100 / 8}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 26 },
  categoryBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  categoryButton: { padding: spacing.sm },
  categoryIcon: { fontSize: 20 },
});
