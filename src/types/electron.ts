export interface ElectronAPI {
    onFileOpened: (callback: (path: string) => void) => void;
    appReady: () => unknown;
}
