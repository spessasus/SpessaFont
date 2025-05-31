import { MenuBarDropdown } from "./dropdown.tsx";

export function MenuBar() {
    return (
        <div className={"menu_bar_main"}>
            <MenuBarDropdown
                main={"menuBarLocale.file.file"}
                contents={[
                    "new",
                    "open",
                    "close",
                    "saveSF2",
                    "exportDLS",
                    "exportSF3"
                ].map((e) => `menuBarLocale.file.${e}`)}
            ></MenuBarDropdown>
            <MenuBarDropdown
                main={"menuBarLocale.edit.edit"}
                contents={[
                    "undo",
                    "redo",
                    "copy",
                    "paste",
                    "cut",
                    "delete"
                ].map((e) => `menuBarLocale.edit.${e}`)}
            ></MenuBarDropdown>
        </div>
    );
}
