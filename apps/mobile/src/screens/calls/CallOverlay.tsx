import React from "react";
import { Modal } from "react-native";
import { useCallStore } from "../../store/callStore";
import { IncomingCallScreen } from "./IncomingCallScreen";
import { OutgoingCallScreen } from "./OutgoingCallScreen";
import { ActiveCallScreen } from "./ActiveCallScreen";
import { CallEndedScreen } from "./CallEndedScreen";

// Rendered once at the app root. Shows full-screen call UI over whatever
// screen the user is on, driven entirely by callStore state — this is how
// an incoming call can interrupt any part of the app, just like a real phone.
export function CallOverlay() {
  const status = useCallStore((s) => s.status);

  if (status === "idle") return null;

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      {status === "incoming" ? <IncomingCallScreen /> : null}
      {status === "outgoing" ? <OutgoingCallScreen /> : null}
      {(status === "connecting" || status === "active" || status === "reconnecting") ? (
        <ActiveCallScreen />
      ) : null}
      {status === "ended" ? <CallEndedScreen /> : null}
    </Modal>
  );
}
