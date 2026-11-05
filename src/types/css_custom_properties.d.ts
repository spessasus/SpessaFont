import "react";

declare module "react" {
    /**
     * Lets `style` set CSS custom properties, which drive dynamic positions and sizes.
     * Module augmentation has to add a member to the interface, a Record type cannot merge.
     */
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
    interface CSSProperties {
        [key: `--${string}`]: string | number | undefined;
    }
}
