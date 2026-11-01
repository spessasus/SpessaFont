/**
 * Opens the browser file picker. Resolves to the chosen file, or undefined when cancelled.
 */
export function pickFile(accept: string) {
    return new Promise<File | undefined>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.addEventListener("change", () => resolve(input.files?.[0]));
        input.addEventListener("cancel", () => resolve(undefined));
        input.click();
    });
}
