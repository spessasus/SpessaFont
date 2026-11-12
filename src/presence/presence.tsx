import {
    type ReactNode,
    use,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { PresenceContext } from "./presence_context.ts";

interface PresenceProps {
    /**
     * The child while it is shown, null (or false) once it closes.
     */
    children: ReactNode;
}

/**
 * Keeps showing the last child after the parent stops rendering it, until the child's exit
 * animation ends (see usePresence). The child then renders with the props it last had.
 * Showing a child again while the old one closes reuses it.
 */
export function Presence({ children }: PresenceProps) {
    const isOpen =
        children !== null && children !== undefined && children !== false;
    const [shown, setShown] = useState<ReactNode>(isOpen ? children : null);
    if (isOpen && shown !== children) {
        setShown(children);
    }
    // A Presence inside a closing one closes with it, so its child plays its exit too
    const isParentClosing = use(PresenceContext)?.isClosing ?? false;
    const isClosing = (!isOpen && shown !== null) || isParentClosing;

    // Changed in the callbacks only, never read while rendering
    const users = useRef(0);
    const onExited = useCallback(() => setShown(null), []);
    const register = useCallback(() => {
        users.current += 1;
        return () => {
            users.current -= 1;
        };
    }, []);
    const value = useMemo(
        () => ({ isClosing, onExited, register }),
        [isClosing, onExited, register]
    );

    // Nothing in the child animates, so it goes before the next paint, like without Presence
    useLayoutEffect(() => {
        if (isClosing && !isParentClosing && users.current === 0) {
            setShown(null);
        }
    }, [isClosing, isParentClosing]);

    return (
        <PresenceContext value={value}>
            {isOpen ? children : shown}
        </PresenceContext>
    );
}
