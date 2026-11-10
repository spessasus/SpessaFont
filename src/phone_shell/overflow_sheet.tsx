import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { ActionSheet } from "../context_menu/action_sheet.tsx";
import type { ContextMenuEntry } from "../context_menu/context_menu_context.ts";
import { enterFullscreen } from "../menu_bar/enter_fullscreen.ts";
import { showAbout } from "../menu_bar/show_about.tsx";
import { useBankCommands } from "../menu_bar/use_bank_commands.ts";
import { usePlayMIDIFile } from "../menu_bar/use_play_midi_file.ts";
import type { BankTabs } from "../tab_list/use_bank_tabs.ts";
import { useBankDisplayName } from "../hooks/use_bank_display_name.ts";
import { usePhoneShell } from "./phone_shell_context.ts";
import { MoreVerticalIcon } from "../utils/icons/app_icons.tsx";
import { CloseFileIcon, DownloadIcon } from "../utils/icons/file_icons.tsx";

interface OverflowSheetProps {
    /**
     * The active bank, undefined on the welcome screen.
     */
    session: BankSession | undefined;
    bankTabs: Pick<BankTabs, "canGoForward" | "goForward">;
    onOpenFile: () => void;
    onNewFile: () => void;
    onCloseFile: () => void;
    onToggleSettings: () => void;
    /**
     * Installs the app, undefined while the browser has no offer.
     */
    onInstallApp?: () => void;
    /**
     * Selects an element, used for the focus hints of undo and redo.
     */
    onViewChange: (view: BankEditView) => void;
}

interface TitledSheetProps {
    session: BankSession;
    /**
     * Replaces the bank name, for the sub sheets.
     */
    title: string | undefined;
    entries: readonly ContextMenuEntry[];
    onClose: () => void;
}

function SessionTitledSheet({
    session,
    title,
    entries,
    onClose
}: TitledSheetProps) {
    const bankName = useBankDisplayName(session.store);
    return (
        <ActionSheet
            title={title ?? bankName}
            entries={entries}
            onClose={onClose}
        />
    );
}

function TitledSheet({
    session,
    ...props
}: Omit<TitledSheetProps, "session"> & { session: BankSession | undefined }) {
    return session ? (
        <SessionTitledSheet session={session} {...props} />
    ) : (
        <ActionSheet
            title={props.title ?? "SpessaFont"}
            entries={props.entries}
            onClose={props.onClose}
        />
    );
}

/**
 * The app bar's overflow button (spec 4.3) and its action sheets, which run the commands of the
 * desktop's File, Edit and MIDI player menus.
 */
export function OverflowSheet({
    session,
    bankTabs,
    onOpenFile,
    onNewFile,
    onCloseFile,
    onToggleSettings,
    onInstallApp,
    onViewChange
}: OverflowSheetProps) {
    const { t } = useTranslation();
    const { dispatch } = usePhoneShell();
    const [sheet, setSheet] = useState<"main" | "saveAs" | "edit" | null>(null);
    const {
        save,
        removeUnusedElements,
        autoLinkSamples,
        mergeDuplicateSamples
    } = useBankCommands(session, onViewChange);
    const playMIDIFile = usePlayMIDIFile();

    const close = () => setSheet(null);
    const sharedTail: ContextMenuEntry[] = [
        {
            label: t("phoneLocale.overflow.settings"),
            icon: "settings",
            onSelect: onToggleSettings
        }
    ];
    const installEntries: ContextMenuEntry[] = onInstallApp
        ? [
              {
                  label: t("phoneLocale.overflow.installApp"),
                  description: t("phoneLocale.overflow.installAppDescription"),
                  iconNode: <DownloadIcon />,
                  onSelect: onInstallApp
              }
          ]
        : [];
    const about: ContextMenuEntry = {
        label: t("phoneLocale.overflow.about"),
        icon: "info",
        onSelect: () => showAbout(t)
    };

    let entries: ContextMenuEntry[] = [];
    switch (sheet) {
        case "saveAs": {
            entries = [
                {
                    label: t("menuBarLocale.file.saveSF2"),
                    icon: "save",
                    onSelect: () => save("sf2")
                },
                {
                    label: t("menuBarLocale.file.saveSF3"),
                    icon: "save",
                    onSelect: () => save("sf3")
                },
                {
                    label: t("menuBarLocale.file.saveDLS"),
                    icon: "save",
                    onSelect: () => save("dls")
                },
                {
                    label: t("menuBarLocale.file.saveSFE"),
                    icon: "save",
                    onSelect: () => save("sf4")
                }
            ];
            break;
        }
        case "edit": {
            entries = [
                {
                    label: t("menuBarLocale.edit.removeUnusedElements"),
                    icon: "delete",
                    onSelect: removeUnusedElements
                },
                {
                    label: t("menuBarLocale.edit.mergeDuplicateSamples"),
                    icon: "link",
                    onSelect: mergeDuplicateSamples
                },
                {
                    label: t("menuBarLocale.edit.autoLinkSamples"),
                    icon: "link",
                    onSelect: autoLinkSamples
                }
            ];
            break;
        }
        case "main": {
            const openEntry: ContextMenuEntry = {
                label: t("phoneLocale.overflow.open"),
                icon: "open",
                onSelect: onOpenFile
            };
            const newEntry: ContextMenuEntry = {
                label: t("phoneLocale.overflow.new"),
                icon: "new",
                onSelect: onNewFile
            };
            entries = session
                ? [
                      {
                          label: t("phoneLocale.overflow.save"),
                          icon: "save",
                          onSelect: () => save("auto")
                      },
                      {
                          label: t("phoneLocale.overflow.saveAs"),
                          icon: "save",
                          hasSubmenu: true,
                          // The item closes the sheet first, so the later state wins
                          onSelect: () => setSheet("saveAs")
                      },
                      "separator",
                      newEntry,
                      openEntry,
                      {
                          label: t("phoneLocale.overflow.closeBank"),
                          iconNode: <CloseFileIcon />,
                          onSelect: onCloseFile
                      },
                      "separator",
                      {
                          label: t("phoneLocale.overflow.edit"),
                          icon: "edit",
                          hasSubmenu: true,
                          onSelect: () => setSheet("edit")
                      },
                      {
                          label: t("phoneLocale.overflow.forward"),
                          icon: "redo",
                          isDisabled: !bankTabs.canGoForward,
                          disabledReason: t("phoneLocale.overflow.noForward"),
                          onSelect: () => {
                              bankTabs.goForward();
                              // Forward steps into an element again, which back must undo
                              dispatch({
                                  type: "editorChange",
                                  tabId: session.id
                              });
                          }
                      },
                      {
                          label: t("phoneLocale.overflow.playMIDI"),
                          icon: "play",
                          onSelect: () => void playMIDIFile()
                      },
                      ...sharedTail,
                      ...installEntries,
                      {
                          label: t("phoneLocale.overflow.fullscreen"),
                          icon: "fullscreen",
                          onSelect: () => void enterFullscreen()
                      },
                      about
                  ]
                : [
                      openEntry,
                      newEntry,
                      ...sharedTail,
                      ...installEntries,
                      about
                  ];
            break;
        }
        case null: {
            break;
        }
    }

    const titles = {
        main: undefined,
        saveAs: t("phoneLocale.overflow.saveAs"),
        edit: t("phoneLocale.overflow.edit")
    };

    return (
        <>
            <button
                type={"button"}
                className={"phone_app_bar_button"}
                aria-haspopup={"dialog"}
                aria-label={t("phoneLocale.appBar.more")}
                onClick={() => setSheet("main")}
            >
                <MoreVerticalIcon />
            </button>
            {sheet === null ? null : (
                <TitledSheet
                    session={session}
                    title={titles[sheet]}
                    entries={entries}
                    onClose={close}
                />
            )}
        </>
    );
}
