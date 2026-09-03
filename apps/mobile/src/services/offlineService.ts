import { createMessageFrame, type OfflineMessageType } from "./offlineProtocol";
import { offlineBle, type OfflinePeer } from "./offlineBle";

export interface QueueableOfflineMessage {
  id: string;
  senderId: string;
  recipientId: string;
  conversationId: string;
  type: OfflineMessageType;
  payload: string;
}

export const offlineService = {
  async discover(onPeer: (peer: OfflinePeer) => void) {
    return offlineBle.startDiscovery(onPeer);
  },

  async stopDiscovery() {
    return offlineBle.stopDiscovery();
  },

  async sendText(message: QueueableOfflineMessage) {
    const frame = createMessageFrame({
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      conversationId: message.conversationId,
      messageType: message.type,
      payload: message.payload,
    });
    return offlineBle.send(message.recipientId, frame);
  },
};
