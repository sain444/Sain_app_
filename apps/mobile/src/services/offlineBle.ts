import { Platform } from "react-native";
import { encode as base64Encode } from "base-64";
import {
  SAINN_BLE_SERVICE_UUID,
  SAINN_BLE_RX_CHARACTERISTIC_UUID,
  SAINN_BLE_TX_CHARACTERISTIC_UUID,
  encodeFrame,
  type OfflineFrame,
} from "./offlineProtocol";

export interface OfflinePeer {
  id: string;
  name: string;
  rssi?: number;
}

/**
 * BLE boundary for Sainn Offline.
 *
 * This file intentionally keeps BLE isolated from Socket.IO, REST and WebRTC.
 * The transport is activated only in a native development/production build.
 * The advertising/peripheral side is a separate native layer because a
 * phone-to-phone mesh needs both scanning and advertising capabilities.
 */
export interface OfflineBleTransport {
  isAvailable(): boolean;
  startDiscovery(onPeer: (peer: OfflinePeer) => void): Promise<void>;
  stopDiscovery(): Promise<void>;
  send(peerId: string, frame: OfflineFrame): Promise<void>;
}

class NativeBleTransport implements OfflineBleTransport {
  private manager: any = null;
  private scanSubscription: any = null;

  isAvailable() {
    return Platform.OS === "android" || Platform.OS === "ios";
  }

  private async loadManager() {
    if (this.manager) return this.manager;
    try {
      // Kept as a dynamic import so the JavaScript app remains bootable when
      // dependencies have not yet been installed in a developer environment.
      const module = await import("react-native-ble-plx");
      this.manager = new module.BleManager();
      return this.manager;
    } catch {
      throw new Error("BLE native module is not installed. Build Sainn with the Offline BLE dependency first.");
    }
  }

  async startDiscovery(onPeer: (peer: OfflinePeer) => void) {
    const manager = await this.loadManager();
    await manager.state();
    this.scanSubscription?.remove?.();
    this.scanSubscription = manager.startDeviceScan([SAINN_BLE_SERVICE_UUID], null, (error: any, device: any) => {
      if (error || !device) return;
      onPeer({ id: device.id, name: device.name || device.localName || "Nearby Sainn", rssi: device.rssi });
    });
  }

  async stopDiscovery() {
    this.scanSubscription?.remove?.();
    this.scanSubscription = null;
    this.manager?.stopDeviceScan?.();
  }

  async send(peerId: string, frame: OfflineFrame) {
    const manager = await this.loadManager();
    const device = await manager.connectToDevice(peerId);
    await device.discoverAllServicesAndCharacteristics();
    const encoded = encodeFrame(frame);
    await device.writeCharacteristicWithResponseForService(
      SAINN_BLE_SERVICE_UUID,
      SAINN_BLE_RX_CHARACTERISTIC_UUID,
      base64Encode(encoded),
    );
    await device.cancelConnection();
  }

  // Kept as constants here so the future peripheral implementation cannot
  // accidentally drift from the protocol used by the central side.
  readonly txCharacteristic = SAINN_BLE_TX_CHARACTERISTIC_UUID;
}

export const offlineBle = new NativeBleTransport();
