import { type ReactNode, useMemo, useRef, useState } from "react";
import {
    type AskNumberOptions,
    type DialogRenderer,
    type DialogsAPI,
    DialogsContext,
    type PickElementOptions
} from "./dialogs_context.ts";
import { ElementPicker, type PickerOption } from "./element_picker.tsx";
import { NumberDialog } from "./number_dialog.tsx";
import { ErrorBoundary } from "../error_boundary/error_boundary.tsx";
import { DialogErrorFallback } from "./dialog_error_fallback.tsx";

interface DialogsProviderProps {
    children?: ReactNode;
}

export function DialogsProvider({ children }: DialogsProviderProps) {
    type DialogQuestion =
        | {
              type: "pick";
              title: string;
              kind: PickElementOptions<unknown>["kind"];
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
    // The open request, which a new one settles. A state updater must not do that, as React
    // may run it twice and during a render
    const openRequest = useRef<DialogRequest | null>(null);
    // Counts the dialogs, so one that replaces another starts with fresh state
    const nextId = useRef(0);
    const api: DialogsAPI = useMemo(() => {
        const show = (next: DialogRequest | null) => {
            openRequest.current = next;
            setRequest(next);
        };
        // A new question cancels the open one
        const replaceRequest = (next: DialogQuestion) => {
            const previous = openRequest.current;
            if (previous?.type === "custom") {
                previous.cancel();
            } else {
                previous?.resolve(undefined);
            }
            nextId.current++;
            show({ ...next, id: nextId.current });
        };
        return {
            pickElement: <T,>({
                title,
                items,
                getLabel,
                kind
            }: PickElementOptions<T>) =>
                new Promise<T | undefined>((resolve) =>
                    replaceRequest({
                        type: "pick",
                        title,
                        kind,
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
                        const current = openRequest.current;
                        if (current?.type === "custom" && current.key === key) {
                            show(null);
                        }
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

    const close = () => {
        openRequest.current = null;
        setRequest(null);
    };

    // The picker and the number dialog answer here, a custom dialog answers its caller itself
    const answer = (value: number | undefined) => {
        if (request?.type !== "custom") {
            request?.resolve(value);
        }
        close();
    };

    // A dialog that fails to render is canceled, so its caller goes on
    const renderDialogError = (error: unknown) => (
        <DialogErrorFallback
            error={error}
            onClose={() => {
                if (request?.type === "custom") {
                    request.cancel();
                } else {
                    request?.resolve(undefined);
                }
                close();
            }}
        />
    );

    return (
        <DialogsContext value={api}>
            {children}
            {request ? (
                <ErrorBoundary key={request.id} fallback={renderDialogError}>
                    {request.type === "pick" ? (
                        <ElementPicker
                            title={request.title}
                            kind={request.kind}
                            options={request.options}
                            onAnswer={answer}
                        />
                    ) : null}
                    {request.type === "number" ? (
                        <NumberDialog
                            options={request.options}
                            onAnswer={answer}
                        />
                    ) : null}
                    {request.type === "custom" ? request.node : null}
                </ErrorBoundary>
            ) : null}
        </DialogsContext>
    );
}
