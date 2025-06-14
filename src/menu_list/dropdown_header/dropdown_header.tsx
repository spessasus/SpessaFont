import "./dropdown_header.css";

export function DropdownHeader({
    text,
    open,
    onAdd,
    onClick
}: {
    text: string;
    open: boolean;
    onClick: () => unknown;
    onAdd: () => unknown;
}) {
    return (
        <div onClick={onClick} className={`item_group_header`}>
            <div
                className={"add_button"}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAdd();
                }}
            >
                +
            </div>
            <h2>{text}</h2>
            <div className={"dropdown_button"}>
                {open ? "\u25B2" : "\u25BC"}
            </div>
        </div>
    );
}
