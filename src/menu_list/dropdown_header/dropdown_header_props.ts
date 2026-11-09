export interface DropdownHeaderProps {
    text: string;
    isOpen: boolean;
    onToggle: () => void;
    /**
     * What the add button does, the list's own words ("Import Audio Files…").
     */
    addLabel: string;
    /**
     * Why the add button is disabled, shown on it instead of the label.
     */
    addHint?: string;
    /**
     * The add button is disabled when this is not set. The buttons stay in place, so the header
     * does not change its layout with the selection.
     */
    onAdd?: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    /**
     * The number of elements in the list, shown after the title on phones.
     */
    count?: number;
    /**
     * Enters selection mode from the phone's section menu. The entry does nothing without it.
     */
    onSelect?: () => void;
}
