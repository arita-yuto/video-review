import { useSyncExternalStore } from "react";

// Whether the user is on a Mac, for shortcuts that follow the conventions of the user's OS.
export function isMac(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }

    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
        ?? navigator.platform;

    return /mac/i.test(platform);
}

// The OS never changes while the page is open, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

// The server snapshot is false, so the first client render matches the server HTML.
export function useIsMac(): boolean {
    return useSyncExternalStore(subscribeNever, isMac, () => false);
}
