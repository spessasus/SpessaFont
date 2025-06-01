import { MenuBarDropdown, MenuBarItem } from "./dropdown.tsx";
import type Manager from "../core_backend/manager.ts";

export function MenuBar({
    manager,
    setIsLoading
}: {
    manager: Manager;
    setIsLoading: (v: boolean) => void;
}) {
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
            setIsLoading(true);
            await manager.loadBank(file);
            setIsLoading(false);
        };
    }

    function newFile() {
        setIsLoading(true);
        manager.createNewFile().then(() => {
            setIsLoading(false);
        });
    }

    function sf2() {
        manager.save("sf2");
    }

    function dls() {
        manager.save("dls");
    }

    return (
        <div className={"menu_bar_main"}>
            <MenuBarDropdown main={fLoc + "file"}>
                <MenuBarItem click={newFile} text={fLoc + "new"}></MenuBarItem>
                <MenuBarItem
                    click={openFile}
                    text={fLoc + "open"}
                ></MenuBarItem>
                <MenuBarItem
                    click={() => manager.close()}
                    text={fLoc + "close"}
                ></MenuBarItem>
                <MenuBarItem click={sf2} text={fLoc + "saveSF2"}></MenuBarItem>
                <MenuBarItem click={dls} text={fLoc + "saveDLS"}></MenuBarItem>
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
