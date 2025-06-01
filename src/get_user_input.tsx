import type Manager from "./core_backend/manager.ts";
import { useTranslation } from "react-i18next";
import { useState } from "react";

// gets user input so the audio context can be resumed
export function GetUserInput({ manager }: { manager: Manager }) {
    const [hidden, setHidden] = useState(false);
    const { t } = useTranslation();

    function onClicked() {
        manager.resumeContext().then(() => {
            setHidden(true);
        });
    }

    if (hidden) {
        return null;
    }

    return (
        <div
            onClick={onClicked}
            className={"get_user_input"}
            style={{ fontSize: "2rem" }}
        >
            <h1>{t("getUserInput")}</h1>
        </div>
    );
}
