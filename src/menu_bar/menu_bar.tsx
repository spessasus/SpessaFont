import { MenuBarDropdown, MenuBarItem } from "./dropdown.tsx";
import type Manager from "../core_backend/manager.ts";

export function MenuBar({ manager }: { manager: Manager }) {
    const fLoc = "menuBarLocale.file.";
    const eLoc = "menuBarLocale.edit.";

    function openFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".sf2,.dls,.sf3,.sfogg";
        input.click();
        input.onchange = async () => {
            const file: File | undefined = input.files?.[0];
            if (!file) {
                return;
            }
            await manager.loadBank(file);
            console.log(manager.bank?.soundFontInfo);
        };
    }

    return (
        <div className={"menu_bar_main"}>
            <MenuBarDropdown main={fLoc + "file"}>
                <MenuBarItem text={fLoc + "new"}></MenuBarItem>
                <MenuBarItem
                    click={openFile}
                    text={fLoc + "open"}
                ></MenuBarItem>
                <MenuBarItem text={fLoc + "close"}></MenuBarItem>
                <MenuBarItem text={fLoc + "saveSF2"}></MenuBarItem>
                <MenuBarItem text={fLoc + "saveDLS"}></MenuBarItem>
                <MenuBarItem text={fLoc + "saveSF3"}></MenuBarItem>
            </MenuBarDropdown>
            <MenuBarDropdown main={eLoc + "edit"}>
                <MenuBarItem text={eLoc + "undo"}></MenuBarItem>
                <MenuBarItem text={eLoc + "redo"}></MenuBarItem>
                <MenuBarItem text={eLoc + "copy"}></MenuBarItem>
                <MenuBarItem text={eLoc + "paste"}></MenuBarItem>
                <MenuBarItem text={eLoc + "cut"}></MenuBarItem>
                <MenuBarItem text={eLoc + "delete"}></MenuBarItem>
            </MenuBarDropdown>
        </div>
    );
}
