// helper conversion functions
export const tc2s = (c: number) => Math.pow(2, c / 1200);
export const s2tc = (s: number) => (1200 * Math.log(s)) / Math.log(2);
export const cb2db = (c: number) => c / 10;
export const db2cb = (d: number) => d * 10;
export const ac2hz = (c: number) => 440 * Math.pow(2, (c - 6900) / 1200);
export const hz2ac = (h: number) =>
    6900 + (1200 * Math.log(h / 440)) / Math.log(2);
