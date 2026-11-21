"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useConfigStore } from "@/components/stores/config-store";
import { useVideoStore } from "@/components/stores/video-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { useVideoPlayerStore } from "@/components/review/stores/video-player-store";
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";
import { usePlaybackWidth } from "@/components/review/player/hooks/use-playback-width";
import { readMediaSizes } from "@/lib/media-url";

// Module state, so the suggestion is made once per page load.
let suggestionToastId: string | number | null = null;

export type DownscaledFile = { width: number; size: number | null };

function bufferedSeconds(video: HTMLVideoElement | null) {
    if (!video) {
        return 0;
    }

    let seconds = 0;

    for (let rangeIndex = 0; rangeIndex < video.buffered.length; rangeIndex++) {
        seconds += video.buffered.end(rangeIndex) - video.buffered.start(rangeIndex);
    }

    return seconds;
}

// carriedShare is the connection's delivery rate as a share of the playing file's bitrate.
export function chooseWidthBySize(lowerFiles: DownscaledFile[], playingSize: number | null, carriedShare: number): number | null {
    if (playingSize === null) {
        return null;
    }

    const fittingFiles = lowerFiles
        .filter((file) => file.size !== null && file.size / playingSize <= carriedShare)
        .sort((a, b) => (a.size ?? 0) - (b.size ?? 0));

    return fittingFiles.at(-1)?.width ?? null;
}

export function chooseNextLowerWidth(lowerFiles: DownscaledFile[], originalWidth: number | null): number | null {
    // A downscaled file almost as wide as the original would look like no change.
    const nearOriginalShare = 0.9;
    const widths = lowerFiles
        .map((file) => file.width)
        .filter((width) => originalWidth === null || width < originalWidth * nearOriginalShare)
        .sort((a, b) => b - a);

    return widths[0] ?? null;
}

// Suggests a lower resolution when the player waits long for data: the heaviest the connection can carry, or else the next one down.
export function useResolutionSuggestion() {
    const t = useTranslations("video-control-panel");
    const buffering = usePlayback((s) => s.buffering);
    const presets = useConfigStore((s) => s.resolutionPresets);
    const playbackWidth = usePlaybackWidth();
    const filePath = useVideoStore((s) => s.selectedRevision?.filePath);

    useEffect(() => {
        if (!buffering || suggestionToastId !== null || !filePath) {
            return;
        }

        // buffering is reported 1 s into the wait, so this makes 5 s in total.
        const suggestAfterMs = 4000;
        const bufferedAtStart = bufferedSeconds(useVideoReviewStore.getState().videoRefElement);

        const timer = setTimeout(async () => {
            const video = useVideoReviewStore.getState().videoRefElement;
            const carriedShare = (bufferedSeconds(video) - bufferedAtStart) / (suggestAfterMs / 1000);

            // Playing the original, the element knows its width once the metadata is in.
            const playingWidth = playbackWidth ?? (video?.videoWidth || Infinity);
            const lowerPresets = presets.filter((preset) => preset < playingWidth);

            if (lowerPresets.length === 0) {
                return;
            }

            const sizes = await readMediaSizes(filePath);

            // Sizes unknown: every lower preset stays a candidate for chooseNextLowerWidth.
            let lowerFiles: DownscaledFile[] = lowerPresets.map((width) => ({ width, size: null }));
            let playingSize: number | null = null;

            if (sizes) {
                lowerFiles = sizes.downscaled.filter((file) => lowerPresets.includes(file.width));

                // A preset with no file plays the original.
                playingSize = sizes.downscaled.find((file) => file.width === playbackWidth)?.size ?? sizes.original;
            }

            if (lowerFiles.length === 0 || suggestionToastId !== null) {
                return;
            }

            const originalWidth = playbackWidth === null ? video?.videoWidth || null : null;
            const suggestedWidth = chooseWidthBySize(lowerFiles, playingSize, carriedShare) ?? chooseNextLowerWidth(lowerFiles, originalWidth);

            if (suggestedWidth === null) {
                return;
            }

            suggestionToastId = toast.info(t("slowLoading"), {
                duration: 10_000,
                richColors: true,
                closeButton: true,
                action: {
                    label: t("switchResolution", { resolution: `${suggestedWidth}p` }),
                    onClick: () => useVideoPlayerStore.getState().setPlaybackWidth(suggestedWidth),
                },
            });
        }, suggestAfterMs);

        return () => clearTimeout(timer);
    }, [buffering, presets, playbackWidth, filePath]);

    useEffect(() => {
        // The suggested width belongs to the source that was waiting.
        return () => {
            if (suggestionToastId !== null) {
                toast.dismiss(suggestionToastId);
            }
        };
    }, [playbackWidth, filePath]);
}
