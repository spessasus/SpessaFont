interface LaunchParams {
    files: readonly FileSystemFileHandle[];
}

interface LaunchQueue {
    setConsumer(consumer: (params: LaunchParams) => void): void;
}

/**
 * The File Handling API global. It only exists in browsers that support it,
 * so guard reads with `typeof launchQueue`.
 */
declare const launchQueue: LaunchQueue | undefined;
