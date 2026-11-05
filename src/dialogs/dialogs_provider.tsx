import { Fragment, type ReactNode, useMemo, useRef, useState } from "react";
import {
    type AskNumberOptions,
    type DialogRenderer,
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
    type DialogQuestion =
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
          }
        | {
              type: "custom";
              /**
               * The dialog, made with its answer callback when it was opened.
               */
              node: ReactNode;
              /**
               * Counts the dialogs, so one that replaces another starts with fresh state.
               */
              key: number;
              cancel: () => void;
          };
    // Each question gets a fresh dialog, one asked right after another must not keep its search
    type DialogRequest = DialogQuestion & { id: number };

    const [request, setRequest] = useState<DialogRequest | null>(null);
    // Counts the dialogs, so one that replaces another starts with fresh state
    const nextId = useRef(0);
    const api: DialogsAPI = useMemo(() => {
        // A new question cancels the open one
        const replaceRequest = (next: DialogQuestion) =>
            setRequest((previous) => {
                if (previous?.type === "custom") {
                    previous.cancel();
                } else {
                    previous?.resolve(undefined);
                }
                nextId.current++;
                return { ...next, id: nextId.current };
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
                ),
            openDialog: <T,>(render: DialogRenderer<T>) =>
                new Promise<T | undefined>((resolve) => {
                    nextId.current++;
                    const key = nextId.current;
                    const node = render((value) => {
                        resolve(value);
                        // Only closes itself, not a dialog that replaced it
                        setRequest((current) =>
                            current?.type === "custom" && current.key === key
                                ? null
                                : current
                        );
                    });
                    replaceRequest({
                        type: "custom",
                        node,
                        key,
                        cancel: () => resolve(undefined)
                    });
                })
        };
    }, []);

    // The picker and the number dialog answer here, a custom dialog answers its caller itself
    const answer = (value: number | undefined) => {
        if (request?.type !== "custom") {
            request?.resolve(value);
        }
        setRequest(null);
    };

    return (
        <DialogsContext value={api}>
            {children}
            {request?.type === "pick" ? (
                <ElementPicker
                    key={request.id}
                    title={request.title}
                    options={request.options}
                    onAnswer={answer}
                />
            ) : null}
            {request?.type === "number" ? (
                <NumberDialog
                    key={request.id}
                    options={request.options}
                    onAnswer={answer}
                />
            ) : null}
            {request?.type === "custom" ? (
                <Fragment key={request.key}>{request.node}</Fragment>
            ) : null}
        </DialogsContext>
    );
}
