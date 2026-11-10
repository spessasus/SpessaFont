/**
 * Whether the phone is held sideways. The screen's orientation decides, and the viewport must
 * agree: opening the soft keyboard in portrait shrinks the viewport below its width, which
 * alone would dock the navigator under the user's finger. Without `screen.orientation` the
 * viewport decides.
 */
export function isLandscapeScreen(
    orientationType: string | undefined,
    width: number,
    height: number
) {
    return (
        width > height &&
        (orientationType === undefined ||
            orientationType.startsWith("landscape"))
    );
}

/**
 * Puts the phone's orientation on `<html>` for the landscape CSS. Undefined removes it, so
 * desktop never has the attribute.
 */
export function applyOrientation(isLandscape: boolean | undefined) {
    const { dataset } = document.documentElement;
    if (isLandscape === undefined) {
        delete dataset.orientation;
        return;
    }
    dataset.orientation = isLandscape ? "landscape" : "portrait";
}
