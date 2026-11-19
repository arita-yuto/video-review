import type { PlaybackBehavior, PlaybackContext } from "@/components/review/player/hooks/use-video-playback/behaviors/behavior";

/** Reports the video's position, and ends a requested jump once the video has made it. */
export class TrackTime implements PlaybackBehavior {
    constructor(private readonly ctx: PlaybackContext) {}

    attach() {
        const { video } = this.ctx;

        video.addEventListener("timeupdate", this.onTimeUpdate);
        video.addEventListener("seeked", this.onSeeked);
    }

    detach() {
        const { video } = this.ctx;

        video.removeEventListener("timeupdate", this.onTimeUpdate);
        video.removeEventListener("seeked", this.onSeeked);
    }

    private onTimeUpdate = () => {
        const { video, store } = this.ctx;
        const playback = store.getState();

        if (playback.timelineTime !== null) {
            return;
        }

        playback.setCurrentTime(video.currentTime);
    };

    private onSeeked = () => {
        const playback = this.ctx.store.getState();

        // A requested jump is done once the player has seeked; left set, it would keep timeupdate out of the store.
        // A held seek bar keeps its request, so the thumb stays under the pointer while the video plays on.
        if (!playback.scrubbing) {
            playback.setTimelineTime(null);
        }
    };
}
