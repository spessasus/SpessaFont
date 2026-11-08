import { useId, useState } from "react";
import type { SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import { EditorSheet } from "../../phone_shell/editor_sheet.tsx";
import { VirtualItemList } from "../../menu_list/virtual_item_list.tsx";
import { useNextPlayedKeys } from "../../keyboard/use_next_played_keys.ts";
import { PlusIcon } from "../../utils/icons/app_icons.tsx";
import { pickRange } from "../../utils/zone_splits.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { getZoneColorVariable } from "../zone_color.ts";
import {
    findColumnsForKey,
    formatKeyRange,
    getColumnKeyRange,
    parseKeyText
} from "../zone_finder.ts";
import "./zone_list_sheet_phone.css";

interface ZoneListSheetProps {
    /**
     * The zone columns of the element, without the global zone.
     */
    columns: readonly ZoneColumn[];
    globalZone: ZoneView;
    isInstrument: boolean;
    onJump: (column: ZoneColumn) => void;
    onAddZone: () => void;
    onClose: () => void;
}

/**
 * The phone's Zones sheet: finds a zone by a typed or played key, lists every zone and jumps to
 * one. It stays open after a find, so another key can be tried.
 */
export function ZoneListSheet({
    columns,
    globalZone,
    isInstrument,
    onJump,
    onAddZone,
    onClose
}: ZoneListSheetProps) {
    const { t } = useTranslation();
    const labelId = useId();
    const [text, setText] = useState("");
    const [isInvalid, setIsInvalid] = useState(false);
    // Undefined until a key was looked up, then the ids of the zones that play it. Ids, as an
    // edit makes new columns
    const [foundIds, setFoundIds] = useState<readonly number[]>();
    const found = foundIds
        ? columns.filter((column) => foundIds.includes(column.zone.id))
        : undefined;

    const find = (key: number) => {
        const matches = findColumnsForKey(columns, globalZone, key);
        setFoundIds(matches.map((column) => column.zone.id));
        if (matches.length > 0) {
            onJump(matches[0]);
        }
    };

    useNextPlayedKeys(1, ([key]) => {
        setText(String(key));
        setIsInvalid(false);
        find(key);
    });

    const handleSubmit = (event: SyntheticEvent) => {
        event.preventDefault();
        const key = parseKeyText(text);
        setIsInvalid(key === undefined);
        if (key === undefined) {
            setFoundIds(undefined);
        } else {
            find(key);
        }
    };

    return (
        <EditorSheet
            labelId={labelId}
            onClose={onClose}
            header={
                <>
                    <span id={labelId} className={"zone_list_title"}>
                        {t("phoneLocale.grid.zones", { count: columns.length })}
                    </span>
                    <span className={"zone_list_hint"}>
                        {t("phoneLocale.zoneSheet.hint")}
                    </span>
                </>
            }
        >
            <div className={"zone_list_sheet"}>
                <form className={"zone_list_find"} onSubmit={handleSubmit}>
                    <input
                        type={"text"}
                        className={"pretty_input zone_list_find_input"}
                        inputMode={"text"}
                        enterKeyHint={"go"}
                        autoComplete={"off"}
                        aria-label={t("phoneLocale.zoneSheet.findKey")}
                        aria-invalid={isInvalid}
                        placeholder={t(
                            "phoneLocale.zoneSheet.findKeyPlaceholder"
                        )}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setIsInvalid(false);
                        }}
                    />
                    <button
                        type={"button"}
                        className={"pretty_button zone_list_add"}
                        onClick={onAddZone}
                    >
                        <PlusIcon />
                        {t("phoneLocale.zoneSheet.addZone")}
                    </button>
                </form>
                <p className={"zone_list_note"}>
                    {found?.length === 0
                        ? t("phoneLocale.zoneSheet.noZone")
                        : t("phoneLocale.zoneSheet.findKeyNote")}
                </p>
                <VirtualItemList
                    items={columns}
                    focusedItem={found?.[0]}
                    rowEstimate={48}
                    renderItem={(column) => (
                        <ZoneListRow
                            column={column}
                            colorIndex={columns.indexOf(column)}
                            globalZone={globalZone}
                            isInstrument={isInstrument}
                            isFound={found?.includes(column) ?? false}
                            onSelect={() => {
                                onJump(column);
                                onClose();
                            }}
                        />
                    )}
                />
            </div>
        </EditorSheet>
    );
}

interface ZoneListRowProps {
    column: ZoneColumn;
    colorIndex: number;
    globalZone: ZoneView;
    isInstrument: boolean;
    isFound: boolean;
    onSelect: () => void;
}

function ZoneListRow({
    column,
    colorIndex,
    globalZone,
    isInstrument,
    isFound,
    onSelect
}: ZoneListRowProps) {
    const { t } = useTranslation();
    const velocities = pickRange(
        column.zone.velocityRange,
        globalZone.velocityRange
    );
    const hasVelocities = velocities.min !== 0 || velocities.max !== 127;
    return (
        <button
            type={"button"}
            className={"plain_button zone_list_row"}
            data-found={isFound}
            onClick={onSelect}
        >
            <span
                className={"zone_list_swatch"}
                style={{ background: getZoneColorVariable(colorIndex) }}
            />
            <span className={"zone_list_name"}>{column.name}</span>
            {isInstrument ? (
                <span className={"zone_list_range"}>
                    {formatKeyRange(getColumnKeyRange(column, globalZone))}
                </span>
            ) : null}
            {hasVelocities ? (
                <span
                    className={"zone_list_range"}
                    title={t("generatorLocale.velocityRange")}
                >
                    {formatKeyRange(velocities)}
                </span>
            ) : null}
        </button>
    );
}
