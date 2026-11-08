import { useTranslation } from "react-i18next";

interface PatchNumberProps {
    n: number;
}

function PatchNumber({ n }: PatchNumberProps) {
    return (
        <span className={`monospaced ${n === 0 ? "patch_number_zero" : ""}`}>
            {n.toString().padStart(3, "0")}
        </span>
    );
}

interface PresetPatchProps {
    patch: {
        readonly isGMGSDrum: boolean;
        readonly bankLSB: number;
        readonly bankMSB: number;
        readonly program: number;
    };
}

/**
 * A preset's patch as padded numbers (000:008:000), the same in the list rows and the phone's
 * element bar.
 */
export function PresetPatch({ patch }: PresetPatchProps) {
    const { t } = useTranslation();
    return (
        <span className={"monospaced preset_item_patch"}>
            {patch.isGMGSDrum ? t("presetList.drumsPrefix") : null}
            {/* A drum kit shows its bank numbers only when it sets them */}
            {patch.isGMGSDrum &&
            patch.bankLSB === 0 &&
            patch.bankMSB === 0 ? null : (
                <>
                    <PatchNumber n={patch.bankLSB} />:
                    <PatchNumber n={patch.bankMSB} />:
                </>
            )}
            <PatchNumber n={patch.program} />
        </span>
    );
}
