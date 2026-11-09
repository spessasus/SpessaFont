import { useContext, useId, useState } from "react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
    BasicInstrument,
    type BasicPreset,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import {
    type ContextMenuEntry,
    useContextMenu
} from "../../context_menu/context_menu_context.ts";
import { EditorSheet } from "../../phone_shell/editor_sheet.tsx";
import {
    ChevronDownIcon,
    ChevronRightIcon
} from "../../utils/icons/app_icons.tsx";
import { generatorLocaleMap } from "../../utils/translated_options/generator_to_locale_map.ts";
import { type CellContext, readViewCell } from "../cell/cell_values.ts";
import { isRangeGenerator } from "../cell/range_generator.ts";
import { useCellCommands } from "../cell/use_cell_commands.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import {
    GENERATOR_GROUP_ORDER,
    GROUP_OF_GENERATOR
} from "../generator_groups.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import { GENERATOR_UNITS } from "../generator_unit.ts";
import { getViewZones, type ZoneColumn } from "../zone_columns.ts";
import { CellSheetOptionEditor } from "./cell_sheet_option_editor.tsx";
import { CellSheetRangeEditor } from "./cell_sheet_range_editor.tsx";
import { CellSheetNumberEditor } from "./cell_sheet_number_editor.tsx";
import { fillBetween, selectAllZones } from "./cell_sheet_selection.ts";
import {
    applyCellSheetText,
    getSharedOption,
    getSharedRangeFields
} from "./cell_sheet_text.ts";
import { CellSheetZoneList } from "./cell_sheet_zone_list.tsx";
import "./cell_sheet_phone.css";
import { CellSheetKeySpan } from "./cell_sheet_key_span.tsx";
import { findColumnsInSpan } from "./cell_sheet_keys.ts";
import { getColumnKeyRange } from "../zone_finder.ts";
import { getNoteName } from "../../keyboard/keyboard/piano_keys.ts";
import { PianoCaptureBar } from "../../phone_shell/piano_capture_bar.tsx";
import { openKeysForCapture } from "../../phone_shell/open_keys_for_capture.ts";
import { PhoneShellContext } from "../../phone_shell/phone_shell_context.ts";
import { PianoKeysIcon } from "../../utils/icons/player_icons.tsx";

interface CellSheetProps {
    element: BasicPreset | BasicInstrument;
    /**
     * Every row of the element, which the generator picker offers.
     */
    rows: readonly GeneratorRowType[];
    row: GeneratorRowType;
    /**
     * Every column of the row (the pan row splits stereo pairs), also in One zone mode.
     */
    columns: readonly ZoneColumn[];
    /**
     * The grid's zone columns without the global zone, for the zone colors.
     */
    colorColumns: readonly ZoneColumn[];
    globalZone: ZoneView;
    checkedIds: ReadonlySet<number>;
    onCheckedChange: (ids: ReadonlySet<number>) => void;
    onRowChange: (generator: GeneratorType) => void;
    onEditModulators: (zoneId: number) => void;
    onClose: () => void;
}

/**
 * The phone's cell sheet, docked under the grid while cells are selected. It edits the checked
 * zones of one row and lists every zone with its value.
 */
export function CellSheet({
    element,
    rows,
    row,
    columns,
    colorColumns,
    globalZone,
    checkedIds,
    onCheckedChange,
    onRowChange,
    onEditModulators,
    onClose
}: CellSheetProps) {
    const { t } = useTranslation();
    const { openMenu } = useContextMenu();
    const { apply } = useBankEditor();
    const labelId = useId();
    // Lives here so the editor can remount on a changed range and keep its mode
    const [rangeMode, setRangeMode] = useState<"set" | "shift">("set");
    const { generator } = row;
    // Keys… and a piano capture belong to the row they started on, another row drops them
    const [keySpanRow, setKeySpanRow] = useState<GeneratorType | null>(null);
    const [captureRow, setCaptureRow] = useState<GeneratorType | null>(null);
    // Cleared on the render after a row change, so coming back to the row starts fresh
    if (keySpanRow !== null && keySpanRow !== generator) {
        setKeySpanRow(null);
    }
    if (captureRow !== null && captureRow !== generator) {
        setCaptureRow(null);
    }
    const isKeySpanShown = keySpanRow === generator;
    const isCapturing = captureRow === generator;
    // Not usePhoneShell, which throws where the sheet renders without the shell (its tests)
    const shell = useContext(PhoneShellContext);
    const checkedColumns = columns.filter((c) => checkedIds.has(c.zone.id));
    const commands = useCellCommands(element, row, columns, checkedColumns);
    const context: CellContext = {
        element,
        row,
        isInstrument: element instanceof BasicInstrument
    };
    const [first] = checkedColumns;
    const unit = row.unit ? GENERATOR_UNITS[row.unit] : undefined;

    const countModulators = (column: ZoneColumn) =>
        Math.max(
            ...getViewZones(column).map(
                (zone) =>
                    zone.modulators.filter((m) => m.destination === generator)
                        .length
            )
        );
    const modulatedColumn = checkedColumns.find((c) => countModulators(c) > 0);

    const handlePickGenerator = (event: MouseEvent) => {
        const entries = new Array<ContextMenuEntry>();
        for (const group of GENERATOR_GROUP_ORDER) {
            const groupRows = rows.filter(
                (r) => GROUP_OF_GENERATOR.get(r.generator) === group
            );
            if (groupRows.length === 0) {
                continue;
            }
            if (entries.length > 0) {
                entries.push("separator");
            }
            for (const groupRow of groupRows) {
                entries.push({
                    label: t(generatorLocaleMap[groupRow.generator]),
                    isCurrent: groupRow.generator === generator,
                    onSelect: () => onRowChange(groupRow.generator)
                });
            }
        }
        openMenu(event, entries, {
            title: t("phoneLocale.cellSheet.pickGenerator")
        });
    };

    const toggle = (zoneId: number) => {
        const ids = new Set(checkedIds);
        if (ids.has(zoneId)) {
            ids.delete(zoneId);
        } else {
            ids.add(zoneId);
        }
        onCheckedChange(ids);
    };

    const handlePlayedSpan = ([low, high]: readonly number[]) => {
        setCaptureRow(null);
        const found = findColumnsInSpan(columns, globalZone, low, high);
        const lowName = getNoteName(Math.min(low, high));
        const highName = getNoteName(Math.max(low, high));
        // A span with no zones keeps the checks, the toast says so
        if (found.length === 0) {
            toast(
                t("phoneLocale.cellSheet.playedSpan", {
                    count: 0,
                    low: lowName,
                    high: highName
                })
            );
            return;
        }
        // The zone checks are replaced, Global stays as it was
        const ids = new Set(found.map((c) => c.zone.id));
        if (checkedIds.has(globalZone.id)) {
            ids.add(globalZone.id);
        }
        onCheckedChange(ids);
        toast(
            t("phoneLocale.cellSheet.playedSpan", {
                count: found.length,
                low: lowName,
                high: highName
            })
        );
    };

    const firstZoneColumn = checkedColumns.find(
        (c) => c.zone.id !== globalZone.id
    );
    const firstZoneRange = firstZoneColumn
        ? getColumnKeyRange(firstZoneColumn, globalZone)
        : undefined;

    const status = t("phoneLocale.cellSheet.checked", {
        checked: checkedColumns.length,
        total: columns.length
    });
    const options = getGeneratorOptions(generator);
    const sharedRange = getSharedRangeFields(
        checkedColumns.flatMap((c) =>
            getViewZones(c).map((zone) => readViewCell(zone, generator))
        )
    );

    const isTextApplied = (text: string) => {
        const actions = applyCellSheetText(context, checkedColumns, text);
        if (!actions) {
            toast.error(t("toolsLocale.cells.invalidText", { text }));
            return false;
        }
        if (actions.length > 0) {
            apply(actions);
        }
        return true;
    };

    const footerButtons = (
        <>
            <button
                type={"button"}
                className={"pretty_button cell_sheet_button"}
                aria-disabled={!first}
                onClick={() => {
                    if (first) {
                        commands.getInputCommands(first).clear();
                    }
                }}
            >
                {t("phoneLocale.cellSheet.clear")}
            </button>
            <button
                type={"button"}
                className={"pretty_button cell_sheet_button"}
                aria-disabled={!first}
                onClick={() => {
                    if (first) {
                        commands.copyCells(first);
                    }
                }}
            >
                {t("phoneLocale.cellSheet.copy")}
            </button>
            <button
                type={"button"}
                className={"pretty_button cell_sheet_button"}
                aria-disabled={!first}
                onClick={() => {
                    if (first) {
                        commands.pasteCells(first);
                    }
                }}
            >
                {t("phoneLocale.cellSheet.paste")}
            </button>
        </>
    );

    return (
        <EditorSheet
            labelId={labelId}
            onClose={onClose}
            header={
                <>
                    <button
                        type={"button"}
                        className={"plain_button cell_sheet_picker"}
                        aria-haspopup={"menu"}
                        onClick={handlePickGenerator}
                    >
                        <span id={labelId} className={"cell_sheet_title"}>
                            {t(generatorLocaleMap[generator])}
                        </span>
                        <ChevronDownIcon />
                    </button>
                    {unit ? (
                        <span className={"cell_sheet_unit"}>
                            {`${t(unit.suffix)} (${t(unit.full)})`}
                        </span>
                    ) : null}
                </>
            }
        >
            <div className={"cell_sheet"}>
                {isCapturing ? (
                    <PianoCaptureBar
                        count={2}
                        prompt={t("phoneLocale.capture.playTwoKeys")}
                        onDone={handlePlayedSpan}
                        onCancel={() => setCaptureRow(null)}
                    />
                ) : null}
                {modulatedColumn ? (
                    <button
                        type={"button"}
                        className={"plain_button cell_sheet_modulated"}
                        onClick={() =>
                            onEditModulators(modulatedColumn.zone.id)
                        }
                    >
                        <span>
                            {t("phoneLocale.cellSheet.modulatedBy", {
                                count: countModulators(modulatedColumn)
                            })}
                        </span>
                        <ChevronRightIcon />
                    </button>
                ) : null}
                {isKeySpanShown ? (
                    <CellSheetKeySpan
                        columns={columns}
                        colorColumns={colorColumns}
                        globalZone={globalZone}
                        initialSpan={
                            firstZoneRange
                                ? {
                                      low: firstZoneRange.min,
                                      high: firstZoneRange.max
                                  }
                                : undefined
                        }
                        onCheck={(ids, isAdding) => {
                            const next = new Set(isAdding ? checkedIds : []);
                            for (const id of ids) {
                                next.add(id);
                            }
                            onCheckedChange(next);
                            setKeySpanRow(null);
                        }}
                        onBack={() => setKeySpanRow(null)}
                    />
                ) : (
                    <>
                        <CellSheetZoneList
                            context={context}
                            columns={columns}
                            focusedZone={first?.zone}
                            colorColumns={colorColumns}
                            globalZone={globalZone}
                            checkedIds={checkedIds}
                            onToggle={toggle}
                        />
                        <div className={"cell_sheet_bar"}>
                            <button
                                type={"button"}
                                className={
                                    "pretty_button cell_sheet_text_button"
                                }
                                onClick={() =>
                                    onCheckedChange(selectAllZones(columns))
                                }
                            >
                                {t("phoneLocale.cellSheet.all")}
                            </button>
                            <button
                                type={"button"}
                                className={
                                    "pretty_button cell_sheet_text_button"
                                }
                                onClick={() =>
                                    onCheckedChange(new Set<number>())
                                }
                            >
                                {t("phoneLocale.cellSheet.none")}
                            </button>
                            <button
                                type={"button"}
                                className={
                                    "pretty_button cell_sheet_text_button"
                                }
                                onClick={() =>
                                    onCheckedChange(
                                        fillBetween(checkedIds, columns)
                                    )
                                }
                            >
                                {t("phoneLocale.cellSheet.between")}
                            </button>
                            <button
                                type={"button"}
                                className={
                                    "pretty_button cell_sheet_text_button"
                                }
                                onClick={() => setKeySpanRow(generator)}
                            >
                                {t("phoneLocale.cellSheet.keys")}
                            </button>
                            <button
                                type={"button"}
                                className={
                                    "pretty_button cell_sheet_text_button cell_sheet_piano"
                                }
                                aria-label={t("phoneLocale.cellSheet.playKeys")}
                                aria-pressed={isCapturing}
                                onClick={() => {
                                    // Only a start shows the keys, a cancel leaves the drawer
                                    if (shell && !isCapturing) {
                                        openKeysForCapture(
                                            shell.state.drawer,
                                            shell.dispatch
                                        );
                                    }
                                    setCaptureRow(
                                        isCapturing ? null : generator
                                    );
                                }}
                            >
                                <PianoKeysIcon />
                            </button>
                        </div>
                        {isRangeGenerator(generator) ? (
                            <CellSheetRangeEditor
                                // The fields follow the checked cells' shared range, also after an apply
                                // or an undo
                                key={`${generator}-${first?.zone.id}-${sharedRange ? `${sharedRange.low}-${sharedRange.high}` : "mixed"}`}
                                isKeyRange={
                                    generator === GeneratorTypes.keyRange
                                }
                                initialRange={sharedRange}
                                mode={rangeMode}
                                onModeChange={setRangeMode}
                                isPianoBusy={isCapturing}
                                onCaptureStart={() => setCaptureRow(null)}
                                isDisabled={!first}
                                status={status}
                                footer={footerButtons}
                                onApply={isTextApplied}
                            />
                        ) : options ? (
                            <CellSheetOptionEditor
                                options={options}
                                value={getSharedOption(
                                    checkedColumns.flatMap((c) =>
                                        getViewZones(c).map((zone) =>
                                            readViewCell(zone, generator)
                                        )
                                    )
                                )}
                                isDisabled={!first}
                                status={status}
                                footer={footerButtons}
                                onPick={(value) => {
                                    if (first) {
                                        commands.pick(first, value);
                                    }
                                }}
                            />
                        ) : (
                            <CellSheetNumberEditor
                                // Another row starts with an empty field
                                key={generator}
                                unitSuffix={unit ? t(unit.suffix) : undefined}
                                isDisabled={!first}
                                status={status}
                                footer={footerButtons}
                                onApply={isTextApplied}
                                onNudge={(direction, steps) => {
                                    if (first) {
                                        commands
                                            .getInputCommands(first)
                                            .nudge(direction, steps);
                                    }
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        </EditorSheet>
    );
}
