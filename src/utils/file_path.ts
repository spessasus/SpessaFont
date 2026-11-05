/**
 * The `file://` URL of an operating system path. Each part is encoded, so a `#`, `?` or `%`
 * in a file name stays part of the name, and Windows paths (`C:\...`) work too.
 */
export function toFileURL(path: string) {
    const parts = path.replaceAll("\\", "/").split("/");
    const encoded = parts.map((part, i) =>
        // Keep a Windows drive letter as it is
        i === 0 && /^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part)
    );
    const joined = encoded.join("/");
    return joined.startsWith("/") ? `file://${joined}` : `file:///${joined}`;
}

/**
 * The file name at the end of an operating system path, with either kind of slash.
 */
export function getFileName(path: string) {
    return path.split(/[\\/]/).at(-1) ?? path;
}
