import "./controller_switch.css";

export function ControllerSwitch({
    value,
    onChange
}: {
    value: boolean;
    onChange: (c: boolean) => unknown;
}) {
    return (
        <div className={"controller_switch_wrapper"}>
            <div
                className={"controller_switch" + (value ? " active" : "")}
                onClick={() => onChange(!value)}
            >
                <span className="switch_slider"></span>
            </div>
        </div>
    );
}
