import type { usePlaybackStoreApi } from "@/components/review/stores/playback-store";

/** Everything the behaviors share for one <video> element. */
export interface PlaybackContext {
    video: HTMLVideoElement;
    store: ReturnType<typeof usePlaybackStoreApi>;
}

export interface PlaybackBehavior {
    attach(): void;
    detach(): void;
}
