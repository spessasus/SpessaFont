import type { MenuIconName } from "./menu_icon_name.ts";
import {
    CopyIcon,
    DeleteIcon,
    EditIcon,
    LinkIcon,
    PasteIcon,
    RedoIcon,
    ScissorsIcon,
    UndoIcon
} from "../utils/icons/edit_icons.tsx";
import {
    DownloadIcon,
    FullscreenIcon,
    InfoIcon,
    NewFileIcon,
    OpenFileIcon,
    SaveFileIcon
} from "../utils/icons/file_icons.tsx";
import { PlayIcon } from "../utils/icons/player_icons.tsx";
import { Gear } from "../utils/icons/app_icons.tsx";

interface MenuIconProps {
    name: MenuIconName;
}

export function MenuIcon({ name }: MenuIconProps) {
    switch (name) {
        case "copy":
        case "duplicate": {
            return <CopyIcon />;
        }
        case "cut": {
            return <ScissorsIcon />;
        }
        case "paste": {
            return <PasteIcon />;
        }
        case "delete": {
            return <DeleteIcon />;
        }
        case "link": {
            return <LinkIcon />;
        }
        case "edit": {
            return <EditIcon />;
        }
        case "open": {
            return <OpenFileIcon />;
        }
        case "new": {
            return <NewFileIcon />;
        }
        case "save": {
            return <SaveFileIcon />;
        }
        case "undo": {
            return <UndoIcon />;
        }
        case "redo": {
            return <RedoIcon />;
        }
        case "play": {
            return <PlayIcon />;
        }
        case "settings": {
            return <Gear />;
        }
        case "fullscreen": {
            return <FullscreenIcon />;
        }
        case "info": {
            return <InfoIcon />;
        }
        case "download": {
            return <DownloadIcon />;
        }
    }
}
