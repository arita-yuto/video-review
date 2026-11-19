import type { PlaybackBehavior, PlaybackContext } from "@/components/review/player/hooks/use-video-playback/behaviors/behavior";

/** Reports whether the video is waiting for data to play, or to finish a seek while paused. */
export class ShowBuffering implements PlaybackBehavior {
    // loadstart: a new source fires no pause.
    private static readonly endEvents = ["playing", "pause", "error", "loadstart"] as const;

    private reportTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly ctx: PlaybackContext) {}

    attach() {
        const { video } = this.ctx;

        video.addEventListener("waiting", this.onWaitStart);
        video.addEventListener("seeking", this.onSeeking);
        video.addEventListener("seeked", this.onSeeked);

        for (const event of ShowBuffering.endEvents) {
            video.addEventListener(event, this.onWaitEnd);
        }
    }

    detach() {
        const { video } = this.ctx;

        video.removeEventListener("waiting", this.onWaitStart);
        video.removeEventListener("seeking", this.onSeeking);
        video.removeEventListener("seeked", this.onSeeked);

        for (const event of ShowBuffering.endEvents) {
            video.removeEventListener(event, this.onWaitEnd);
        }

        this.onWaitEnd();
    }

    private onWaitStart = () => {
        const { store } = this.ctx;

        if (this.reportTimer !== null || store.getState().buffering) {
            return;
        }

        // Shorter waits, such as a seek inside loaded data, are not reported.
        const toleranceMs = 1000;

        this.reportTimer = setTimeout(() => {
            this.reportTimer = null;
            store.getState().setBuffering(true);
        }, toleranceMs);
    };

    private onWaitEnd = () => {
        this.cancelReport();
        this.ctx.store.getState().setBuffering(false);
    };

    private cancelReport() {
        if (this.reportTimer !== null) {
            clearTimeout(this.reportTimer);
            this.reportTimer = null;
        }
    }

    private onSeeking = () => {
        // A seek during playback is left to waiting and playing.
        if (this.ctx.video.paused) {
            // Each seek restarts the tolerance; a wait already reported stays reported.
            this.cancelReport();
            this.onWaitStart();
        }
    };

    private onSeeked = () => {
        if (this.ctx.video.paused) {
            this.onWaitEnd();
        }
    };
}
