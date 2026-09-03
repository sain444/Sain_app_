import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radii, spacing, typography } from "../theme/tokens";
import type { Message } from "../services/api";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showReadReceipt?: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function MediaContent({ message, isOwn, theme }: { message: Message; isOwn: boolean; theme: any }) {
  switch (message.type) {
    case "image":
      return (
        <Image
          source={{ uri: message.mediaUrl! }}
          style={styles.imageContent}
          accessibilityLabel="Photo message"
        />
      );
    case "video":
      // Full playback is a small follow-up (expo-av <Video>) — shown here as
      // a thumbnail-style tap target so the message type isn't silently dropped.
      return (
        <View style={[styles.videoPlaceholder, { backgroundColor: "rgba(0,0,0,0.2)" }]}>
          <Text style={styles.playIcon}>▶</Text>
          <Text style={[styles.mediaLabel, { color: isOwn ? theme.bubbleOutgoingText : theme.textSecondary }]}>Video</Text>
        </View>
      );
    case "audio":
      return (
        <View style={styles.audioRow}>
          <Text style={styles.playIcon}>▶</Text>
          <View style={[styles.waveformBar, { backgroundColor: isOwn ? "rgba(255,255,255,0.4)" : theme.border }]} />
          <Text style={{ color: isOwn ? theme.bubbleOutgoingText : theme.textSecondary, fontSize: typography.sizes.xs }}>
            {message.mediaDurationMs ? `${Math.round(message.mediaDurationMs / 1000)}s` : "Voice message"}
          </Text>
        </View>
      );
    case "file":
      return (
        <View style={styles.fileRow}>
          <Text style={styles.fileIcon}>📄</Text>
          <Text style={{ color: isOwn ? theme.bubbleOutgoingText : theme.textPrimary, fontSize: typography.sizes.sm }} numberOfLines={1}>
            {message.content ?? "File"}
          </Text>
        </View>
      );
    default:
      return (
        <Text style={{ color: isOwn ? theme.bubbleOutgoingText : theme.bubbleIncomingText, fontSize: typography.sizes.md }}>
          {message.content}
        </Text>
      );
  }
}

export function MessageBubble({ message, isOwn, showReadReceipt }: MessageBubbleProps) {
  const theme = useTheme();
  const isRead = message.receipts?.some((r) => r.status === "read" && r.userId !== message.senderId);

  if (message.isDeleted) {
    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
        <View
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
            { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.deletedText, { color: theme.textTertiary }]}>
            This message was deleted
          </Text>
        </View>
      </View>
    );
  }

  const isMedia = message.type !== "text";

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isOwn
            ? { ...styles.bubbleOwn, backgroundColor: theme.bubbleOutgoing }
            : { ...styles.bubbleOther, backgroundColor: theme.bubbleIncoming },
          isMedia && message.type === "image" ? styles.imageBubble : null,
        ]}
      >
        {message.replyTo ? (
          <View
            style={[
              styles.replyPreview,
              { borderLeftColor: isOwn ? "rgba(255,255,255,0.5)" : theme.accent },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: isOwn ? "rgba(255,255,255,0.8)" : theme.textSecondary,
                fontSize: typography.sizes.xs,
              }}
            >
              {message.replyTo.content ?? "Media"}
            </Text>
          </View>
        ) : null}

        <MediaContent message={message} isOwn={isOwn} theme={theme} />

        <View style={styles.metaRow}>
          {message.isEdited ? (
            <Text
              style={[
                styles.metaText,
                { color: isOwn ? "rgba(255,255,255,0.65)" : theme.textTertiary, marginRight: 4 },
              ]}
            >
              edited
            </Text>
          ) : null}
          <Text
            style={[
              styles.metaText,
              { color: isOwn ? "rgba(255,255,255,0.65)" : theme.textTertiary },
            ]}
          >
            {formatTime(message.createdAt)}
          </Text>
          {isOwn && showReadReceipt ? (
            <Text style={[styles.metaText, { color: isRead ? "#8FD3FF" : "rgba(255,255,255,0.65)" }]}>
              {" "}
              {isRead ? "Read" : "Sent"}
            </Text>
          ) : null}
        </View>

        {message.reactions && message.reactions.length > 0 ? (
          <View style={[styles.reactionPill, { backgroundColor: theme.surfaceElevated }]}>
            <Text style={{ fontSize: typography.sizes.xs }}>
              {message.reactions.map((r) => r.emoji).join(" ")}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: spacing.xs / 2, paddingHorizontal: spacing.md },
  rowOwn: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.lg },
  imageBubble: { padding: 4 },
  bubbleOwn: { borderBottomRightRadius: radii.sm },
  bubbleOther: { borderBottomLeftRadius: radii.sm },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  metaText: { fontSize: 10 },
  deletedText: { fontStyle: "italic", fontSize: typography.sizes.sm },
  replyPreview: { borderLeftWidth: 2, paddingLeft: spacing.sm, marginBottom: spacing.xs / 2 },
  reactionPill: {
    position: "absolute",
    bottom: -10,
    right: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageContent: { width: 220, height: 220, borderRadius: radii.md },
  videoPlaceholder: { width: 220, height: 140, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  playIcon: { fontSize: 18 },
  mediaLabel: { fontSize: typography.sizes.sm, marginTop: 4 },
  audioRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minWidth: 160 },
  waveformBar: { flex: 1, height: 3, borderRadius: 2 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, maxWidth: 220 },
  fileIcon: { fontSize: 20 },
});
