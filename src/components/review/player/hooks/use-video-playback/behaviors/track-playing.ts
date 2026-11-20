import type { PlaybackBehavior, PlaybackContext } from "@/components/review/player/hooks/use-video-playback/behaviors/behavior";

/** Reports whether the video is playing, however it was started or stopped. */
export class TrackPlaying implements PlaybackBehavior {
    constructor(private readonly ctx: PlaybackContext) {}

    attach() {
        const { video } = this.ctx;

        video.addEventListener("play", this.onPlay);
        video.addEventListener("pause", this.onPause);
    }

    detach() {
        const { video } = this.ctx;

        video.removeEventListener("play", this.onPlay);
        video.removeEventListener("pause", this.onPause);

        // A removed element fires no pause.
        this.ctx.store.getState().setIsPlaying(false);
    }

    private onPlay = () => {
        this.ctx.store.getState().setIsPlaying(true);
    };

    private onPause = () => {
        this.ctx.store.getState().setIsPlaying(false);
    };
}
