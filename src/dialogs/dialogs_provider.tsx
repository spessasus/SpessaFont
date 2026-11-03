import { type ReactNode, useMemo, useState } from "react";
import {
    type AskNumberOptions,
    type DialogsAPI,
    DialogsContext,
    type PickElementOptions
} from "./dialogs_context.ts";
import { ElementPicker, type PickerOption } from "./element_picker.tsx";
import { NumberDialog } from "./number_dialog.tsx";

interface DialogsProviderProps {
    children?: ReactNode;
}

export function DialogsProvider({ children }: DialogsProviderProps) {
    type DialogRequest =
        | {
              type: "pick";
              title: string;
              options: PickerOption[];
              resolve: (index: number | undefined) => void;
          }
        | {
              type: "number";
              options: AskNumberOptions;
              resolve: (value: number | undefined) => void;
          };

    const [request, setRequest] = useState<DialogRequest | null>(null);
    const api: DialogsAPI = useMemo(() => {
        // A new question cancels the open one
        const replaceRequest = (next: DialogRequest) =>
            setRequest((previous) => {
                previous?.resolve(undefined);
                return next;
            });
        return {
            pickElement: <T,>({
                title,
                items,
                getLabel
            }: PickElementOptions<T>) =>
                new Promise<T | undefined>((resolve) =>
                    replaceRequest({
                        type: "pick",
                        title,
                        // The picker works on labels, the index leads back to the item
                        options: items.map((item, index) => ({
                            label: getLabel(item),
                            index
                        })),
                        resolve: (index) =>
                            resolve(
                                index === undefined ? undefined : items[index]
                            )
                    })
                ),
            askNumber: (options) =>
                new Promise((resolve) =>
                    replaceRequest({ type: "number", options, resolve })
                )
        };
    }, []);

    const answer = (value: number | undefined) => {
        request?.resolve(value);
        setRequest(null);
    };

    return (
        <DialogsContext value={api}>
            {children}
            {request?.type === "pick" ? (
                <ElementPicker
                    title={request.title}
                    options={request.options}
                    onAnswer={answer}
                />
            ) : null}
            {request?.type === "number" ? (
                <NumberDialog options={request.options} onAnswer={answer} />
            ) : null}
        </DialogsContext>
    );
}
