"use client";
import { useEffect } from "react";
import { DEFAULT_VIDEO_ASPECT, usePlaybackStoreApi } from "@/components/review/stores/playback-store";
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";
import type { PlaybackBehavior, PlaybackContext } from "@/components/review/player/hooks/use-video-playback/behaviors/behavior";
import { ReportMetadata } from "@/components/review/player/hooks/use-video-playback/behaviors/report-metadata";
import { ShowBuffering } from "@/components/review/player/hooks/use-video-playback/behaviors/show-buffering";
import { TrackPlaying } from "@/components/review/player/hooks/use-video-playback/behaviors/track-playing";
import { TrackTime } from "@/components/review/player/hooks/use-video-playback/behaviors/track-time";

// Reports the state of the player's video to the playback store.
export function useVideoPlayback() {
    const store = usePlaybackStoreApi();
    const video = useVideoReviewStore((s) => s.videoRefElement);

    useEffect(() => {
        if (!video) {
            return;
        }

        const ctx: PlaybackContext = {
            video,
            store,
        };
        const behaviors: PlaybackBehavior[] = [
            new ReportMetadata(ctx),
            new TrackPlaying(ctx),
            new TrackTime(ctx),
            new ShowBuffering(ctx),
        ];

        for (const behavior of behaviors) {
            behavior.attach();
        }

        return () => {
            for (const behavior of [...behaviors].reverse()) {
                behavior.detach();
            }
        };
    }, [video, store]);

    useEffect(() => {
        // The store outlives the player, so the aspect goes back to the default with it.
        return () => {
            store.getState().setVideoAspect(DEFAULT_VIDEO_ASPECT);
        };
    }, [store]);
}
