import { useEffect } from "react";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useMIDIAccess } from "../settings/midi_context/midi_context.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { KEYBOARD_TARGET_CHANNEL } from "./target_channel.ts";

/**
 * Channel messages go to the keyboard's channel, which plays the shown element. System
 * messages (0xf0 and up) have no channel and pass as they are.
 */
export function routeToKeyboardChannel(data: Uint8Array) {
    const status = data[0];
    if (status < 0x80 || status >= 0xf0) {
        return data;
    }
    const routed = Uint8Array.from(data);
    routed[0] = (status & 0xf0) | KEYBOARD_TARGET_CHANNEL;
    return routed;
}

/**
 * Plays the selected MIDI input like the on-screen keyboard, whatever channel the device
 * sends on.
 */
export function useMIDIInput() {
    const { audioEngine } = useAudioEngine();
    const { selectedDevice } = useMIDIAccess();

    useEventListener(selectedDevice, "midimessage", (e) => {
        if (e.data) {
            audioEngine.processRealTime(routeToKeyboardChannel(e.data));
        }
    });
    // Note offs of keys held on the previous device never arrive, so its notes are released.
    // An unplugged device is no longer selected, so this covers that too
    useEffect(() => {
        if (!selectedDevice) {
            return;
        }
        return () => audioEngine.releaseAllNotes();
    }, [audioEngine, selectedDevice]);
}
