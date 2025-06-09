import type { AudioEngine } from "../core_backend/audio_engine.ts";
import "./keyboard_controller.css";
import { Keyboard } from "./keyboard/keyboard.tsx";

export function KeyboardController({ engine }: { engine: AudioEngine }) {
    return (
        <div className={"keyboard_controller"}>
            <Keyboard engine={engine}></Keyboard>
        </div>
    );
}
