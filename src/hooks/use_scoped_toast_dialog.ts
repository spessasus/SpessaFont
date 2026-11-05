import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";

/**
 * Shows toast dialogs that belong to the calling component. They close when it unmounts (its
 * element or its tab is not shown any more), and a new one replaces the one before, so a
 * button never acts on an editor the user has left. The buttons should still check that what
 * they change is in the bank, as it can be removed while the toast is open.
 */
export function useScopedToastDialog() {
    const shown = useRef(new Set<string>());
    useEffect(() => {
        const ids = shown.current;
        return () => {
            for (const id of ids) {
                toast.dismiss(id);
            }
            ids.clear();
        };
    }, []);
    return (options: Parameters<typeof showToastDialog>[0]) => {
        for (const id of shown.current) {
            toast.dismiss(id);
        }
        shown.current.clear();
        shown.current.add(showToastDialog(options));
    };
}
