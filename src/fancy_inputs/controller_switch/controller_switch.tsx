import "./controller_switch.css";

interface ControllerSwitchProps {
    value: boolean;
    onChange: (isOn: boolean) => unknown;
    label: string;
}

export function ControllerSwitch({
    value,
    onChange,
    label
}: ControllerSwitchProps) {
    return (
        <div className={"controller_switch_wrapper"}>
            <button
                type={"button"}
                role={"switch"}
                aria-checked={value}
                aria-label={label}
                className={
                    "plain_button controller_switch" + (value ? " active" : "")
                }
                onClick={() => onChange(!value)}
            >
                <span className="controller_switch_slider"></span>
            </button>
        </div>
    );
}
