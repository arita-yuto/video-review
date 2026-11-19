import type { PlaybackBehavior, PlaybackContext } from "@/components/review/player/hooks/use-video-playback/behaviors/behavior";

/** Reports the duration and the aspect ratio of each source the video loads. */
export class ReportMetadata implements PlaybackBehavior {
    constructor(private readonly ctx: PlaybackContext) {}

    attach() {
        this.ctx.video.addEventListener("loadedmetadata", this.onLoadedMetadata);
    }

    detach() {
        this.ctx.video.removeEventListener("loadedmetadata", this.onLoadedMetadata);
    }

    private onLoadedMetadata = () => {
        const { video, store } = this.ctx;
        const playback = store.getState();

        playback.setDuration(video.duration);
        playback.setVideoAspect(`${video.videoWidth} / ${video.videoHeight}`);
    };
}
