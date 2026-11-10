import { useEffect, useRef, useState } from "react";
import { usePhoneGridSettings } from "./use_phone_grid_settings.ts";
import { clampZoneIndex } from "./one_zone_columns.ts";
import { useZoneSwipe } from "./use_zone_swipe.ts";
import { findGridItem, getZoneNameKey } from "./table_navigation.ts";
import type { GeneratorRowType } from "./generator_row_type.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import {
    GENERATOR_GROUP_ORDER,
    GROUP_OF_GENERATOR
} from "./generator_groups.ts";

interface PhoneGridOptions {
    isPhone: boolean;
    rows: readonly GeneratorRowType[];
    /**
     * Every zone column, without the global zone.
     */
    zoneColumns: readonly ZoneColumn[];
    /**
     * The grid key of the first checked cell, which the grid keeps in view.
     */
    revealKey: string | null;
}

/**
 * The phone grid's state and refs: the view settings, One zone mode's shown zone and swipe,
 * the Zones sheet, and keeping the checked cell in view.
 */
export function usePhoneGrid({
    isPhone,
    rows,
    zoneColumns,
    revealKey
}: PhoneGridOptions) {
    const settings = usePhoneGridSettings();
    const zoneCount = zoneColumns.length;
    const isOneZone = isPhone && settings.mode === "oneZone";
    // The shown column of the phone's One zone mode. The table remounts per element, so a new
    // element starts at its first zone
    const [zoneIndex, setZoneIndex] = useState(0);
    const [isZoneSheetOpen, setIsZoneSheetOpen] = useState(false);
    const tableRef = useRef<HTMLTableElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    // The zone of the last phone tap, which a generator added right after it starts on
    const lastTappedZoneIdRef = useRef<number | null>(null);
    const stepZone = (direction: 1 | -1) =>
        setZoneIndex((previous) =>
            clampZoneIndex(
                clampZoneIndex(previous, zoneCount) + direction,
                zoneCount
            )
        );
    const swipeHandlers = useZoneSwipe(stepZone);
    useEffect(() => {
        if (!isPhone || revealKey === null) {
            return;
        }
        const reveal = () =>
            findGridItem(tableRef.current, revealKey)?.scrollIntoView({
                block: "nearest",
                inline: "nearest"
            });
        reveal();
        const wrapper = wrapperRef.current;
        if (!wrapper || typeof ResizeObserver === "undefined") {
            return;
        }
        // The sheet, the drawer and the keyboard change the grid's height, which can push the
        // checked cells out of view
        const observer = new ResizeObserver(reveal);
        observer.observe(wrapper);
        return () => observer.disconnect();
    }, [isPhone, revealKey]);
    const rowGroups = GENERATOR_GROUP_ORDER.filter((group) =>
        rows.some((r) => GROUP_OF_GENERATOR.get(r.generator) === group)
    );
    const areAllCollapsed = rowGroups.every((group) =>
        settings.collapsed.has(group)
    );
    return {
        settings,
        isOneZone,
        areAllCollapsed,
        toggleAllGroups: () =>
            settings.setCollapsed(areAllCollapsed ? [] : rowGroups),
        jumpToZone: (column: ZoneColumn) => {
            if (isOneZone) {
                setZoneIndex(zoneColumns.indexOf(column));
                return;
            }
            findGridItem(
                tableRef.current,
                getZoneNameKey(column.zone.id)
            )?.scrollIntoView({ inline: "start", block: "nearest" });
        },
        zoneIndex,
        setZoneIndex,
        stepZone,
        swipeHandlers,
        isZoneSheetOpen,
        setIsZoneSheetOpen,
        tableRef,
        wrapperRef,
        lastTappedZoneIdRef
    };
}
