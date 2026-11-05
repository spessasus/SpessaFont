/**
 * Opens the browser file picker. Resolves to the chosen files, or none when cancelled.
 */
export function pickFiles(accept: string, isMultiple = true) {
    return new Promise<File[]>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.multiple = isMultiple;
        input.addEventListener("change", () =>
            resolve(Array.from(input.files ?? []))
        );
        input.addEventListener("cancel", () => resolve([]));
        input.click();
    });
}

/**
 * Opens the browser file picker for one file. Resolves to it, or undefined when cancelled.
 */
export async function pickFile(accept: string) {
    const [file] = await pickFiles(accept, false);
    return file as File | undefined;
}
