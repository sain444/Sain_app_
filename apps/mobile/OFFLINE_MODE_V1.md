# Sainn Offline v1

Sainn Offline is intentionally isolated from the normal Sainn network stack.

## Scope

The roadmap is deliberately staged:

1. Text
2. Images
3. Voice
4. Files

The existing HTTP/REST, Socket.IO messaging and WebRTC calling paths do not import the offline service. Offline state is local to the mobile app.

## Current implementation

- Settings → Offline Mode screen.
- Auto / Online only / Offline mode preference persisted with AsyncStorage.
- Nearby transport toggle.
- Transport-agnostic offline frame protocol with protocol version, message type, TTL, sequence fields and acknowledgements reserved for the next phase.
- BLE service/characteristic UUIDs reserved for Sainn peers.
- BLE central discovery boundary using `react-native-ble-plx`.
- Queue model supports text/image/voice/file payload types without sending them through Socket.IO.

## Important limitation of this phase

A true phone-to-phone mesh requires each phone to be able to advertise a Sainn BLE service as well as scan/connect. The current JavaScript layer defines the central side, but the native peripheral/relay layer still needs to be implemented and tested on physical devices. Therefore this ZIP should **not** be described as a finished offline messenger yet.

Expo Go is not sufficient for BLE native modules. Sainn needs a development/production native build. Android 12+ uses runtime `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, and `BLUETOOTH_CONNECT` permissions; iOS BLE background behavior is subject to Core Bluetooth background rules.

## Safety boundary for online features

Offline Mode must never silently intercept normal messages or calls. The eventual routing rule is:

- `online`: existing network path only.
- `offline`: offline transport only for supported offline payloads.
- `auto`: use online transport when available; only use nearby transport when explicitly enabled and the recipient is a nearby Sainn peer.

The BLE implementation must not modify authentication, Socket.IO rooms, REST authorization, or WebRTC signaling.


## Hardening status

The offline module is intentionally isolated from the online Socket.IO/WebRTC stack.
The current release contains the transport protocol, queue/state layer, BLE central discovery/write foundation, settings UI, and native permission configuration.
A production multi-hop offline messenger still requires the native peripheral/advertising + relay/forwarding layer and two-device testing; this is intentionally not represented as complete functionality.
