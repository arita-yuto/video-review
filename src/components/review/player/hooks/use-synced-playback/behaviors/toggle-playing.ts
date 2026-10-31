import {
    expectedPosition, FAR_DRIFT_SEC, isOwn, othersState, watchSession,
    type SyncBehavior, type SyncContext,
} from "@/components/review/player/hooks/use-synced-playback/behaviors/behavior";

/** Plays or pauses with the session; a screen slightly behind a pause plays on to the paused frame. */
export class TogglePlaying implements SyncBehavior {
    private stopWatching: (() => void) | null = null;
    // The paused frame this screen is still playing towards.
    private stopAt: number | null = null;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        this.stopWatching = watchSession(this.ctx, this.onSessionState);
        this.ctx.video.addEventListener("timeupdate", this.onTimeUpdate);
    }

    detach() {
        this.stopWatching?.();
        this.ctx.video.removeEventListener("timeupdate", this.onTimeUpdate);
    }

    private onSessionState = () => {
        // Sending drops the stop this screen was playing on towards, and it takes on what it sent.
        const session = this.ctx.store.getState().syncState;
        if (session && isOwn(this.ctx, session) && this.stopAt !== null) {
            this.stopAt = null;
            if (!session.playing) {
                this.ctx.store.getState().setIsPlaying(false);
            }
            return;
        }

        const state = othersState(this.ctx);
        if (!state) {
            return;
        }

        const { video, store } = this.ctx;
        const playback = store.getState();
        const expected = expectedPosition(state, video.duration);
        this.stopAt = null;
        if (expected.playing) {
            if (!playback.isPlaying) {
                playback.setIsPlaying(true);
            }
            return;
        }

        const behind = expected.time - video.currentTime;
        if (playback.isPlaying && behind > 0 && behind <= FAR_DRIFT_SEC) {
            this.stopAt = expected.time;
            return;
        }

        if (playback.isPlaying) {
            playback.setIsPlaying(false);
        }
    };

    private onTimeUpdate = () => {
        if (this.stopAt === null || this.ctx.video.currentTime < this.stopAt) {
            return;
        }

        this.stopAt = null;
        this.ctx.store.getState().setIsPlaying(false);
    };
}
