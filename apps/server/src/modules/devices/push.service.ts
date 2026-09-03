import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../utils/logger.js";

const expo = new Expo();

/**
 * Sends a push notification to every registered device for a user via the
 * Expo Push API — works for both iOS and Android without separate FCM/APNs
 * credential setup, which is the standard approach for Expo-managed apps.
 * Silently skips users with no valid push tokens (e.g. never opened on a
 * real device, or notifications not yet granted).
 */
export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  const devices = await prisma.device.findMany({ where: { userId } });
  const validTokens = devices.map((d) => d.pushToken).filter((t) => Expo.isExpoPushToken(t));

  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      logger.warn({ err }, "Failed to send a push notification chunk");
    }
  }
}
