import type { PlaybackBehavior, PlaybackContext } from "@/components/review/player/hooks/use-video-playback/behaviors/behavior";

/** Reports whether the video is waiting for data while playing. */
export class ShowBuffering implements PlaybackBehavior {
    // loadstart: a new source fires no pause.
    private static readonly endEvents = ["playing", "pause", "loadstart"] as const;

    constructor(private readonly ctx: PlaybackContext) {}

    attach() {
        const { video } = this.ctx;

        video.addEventListener("waiting", this.onWaiting);

        for (const event of ShowBuffering.endEvents) {
            video.addEventListener(event, this.onWaitingEnd);
        }
    }

    detach() {
        const { video, store } = this.ctx;

        video.removeEventListener("waiting", this.onWaiting);

        for (const event of ShowBuffering.endEvents) {
            video.removeEventListener(event, this.onWaitingEnd);
        }

        store.getState().setBuffering(false);
    }

    private onWaiting = () => {
        this.ctx.store.getState().setBuffering(true);
    };

    private onWaitingEnd = () => {
        this.ctx.store.getState().setBuffering(false);
    };
}
