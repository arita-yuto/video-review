import { useVideoPlayerStore } from "@/components/review/stores/video-player-store";
import {
    othersState, watchSession,
    type SyncBehavior, type SyncContext,
} from "@/components/review/player/hooks/use-synced-playback/behaviors/behavior";

/** Plays at the session's speed, which stays after leaving like any speed the viewer picks. */
export class AdjustRate implements SyncBehavior {
    private stopWatching: (() => void) | null = null;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        this.stopWatching = watchSession(this.ctx, this.onSessionState);
    }

    detach() {
        this.stopWatching?.();
    }

    private onSessionState = () => {
        const state = othersState(this.ctx);
        if (!state || useVideoPlayerStore.getState().playbackRate === state.rate) {
            return;
        }

        useVideoPlayerStore.getState().setPlaybackRate(state.rate);
    };
}
