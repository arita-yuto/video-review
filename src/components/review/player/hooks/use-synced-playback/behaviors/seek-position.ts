import {
    expectedPosition, FAR_DRIFT_SEC, othersState, PAUSED_DRIFT_SEC, PLAYING_DRIFT_SEC, watchSession,
    type SyncBehavior, type SyncContext,
} from "@/components/review/player/hooks/use-synced-playback/behaviors/behavior";

/** Every seek the sync makes: to a received position, and back to the session when far off. */
export class SeekPosition implements SyncBehavior {
    private stopWatching: (() => void) | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        const FAR_CHECK_MS = 1000;
        const { video } = this.ctx;
        this.stopWatching = watchSession(this.ctx, this.onSessionState);
        video.addEventListener("play", this.onSessionState);
        video.addEventListener("pause", this.onSessionState);
        this.timer = setInterval(this.onFarCheck, FAR_CHECK_MS);
    }

    detach() {
        const { video } = this.ctx;
        this.stopWatching?.();
        video.removeEventListener("play", this.onSessionState);
        video.removeEventListener("pause", this.onSessionState);

        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    // Also on play and pause, so the element lands on the session's position once it has started or stopped.
    private onSessionState = () => {
        const { video, store } = this.ctx;
        const state = othersState(this.ctx);
        if (!state) {
            return;
        }

        const expected = expectedPosition(state, video.duration);
        const drift = Math.abs(video.currentTime - expected.time);
        if (expected.playing && drift > PLAYING_DRIFT_SEC) {
            video.currentTime = expected.time;
        }

        // A screen still playing on towards the paused frame is matched once it stops.
        if (!expected.playing && video.paused && drift > PAUSED_DRIFT_SEC) {
            // The timeline path keeps the shown time and the seek bar in step while paused.
            store.getState().setTimelineTime(expected.time);
        }
    };

    // A playing screen far off the session, such as after loading, jumps to the session.
    private onFarCheck = () => {
        const { video } = this.ctx;
        const state = othersState(this.ctx);
        if (!state || video.paused || video.seeking) {
            return;
        }

        const expected = expectedPosition(state, video.duration);
        if (expected.playing && Math.abs(expected.time - video.currentTime) > FAR_DRIFT_SEC) {
            video.currentTime = expected.time;
        }
    };
}
