const LAUNCH_PARAM = "launch";

/**
 * What the installed app was opened for: "new" from the manifest's shortcut, "shared" after
 * the service worker received files from the share sheet.
 */
export type LaunchAction = "new" | "shared";

/**
 * The action `?launch=` asks for, if any. The parameter is taken out of the address, so a
 * reload does not create another bank or look for the shared files again.
 */
export function takeLaunchParam(): LaunchAction | undefined {
    const url = new URL(location.href);
    const param = url.searchParams.get(LAUNCH_PARAM);
    if (param === null) {
        return undefined;
    }
    url.searchParams.delete(LAUNCH_PARAM);
    history.replaceState(history.state, "", url);
    return param === "new" || param === "shared" ? param : undefined;
}
