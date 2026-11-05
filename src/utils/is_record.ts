/**
 * Whether a value is a plain object whose fields can be read, not null or an array.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
