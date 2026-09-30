"use client"
import { RefObject, useEffect, useState } from "react";
import { compareTimeFor } from "./use-diff-sync";

// A compare side seeked to its target lands on it exactly; anything further off is still on the
// way there, e.g. right after the primary moved and before the sync has sent it along.
const ALIGNED_SEC = 0.02;

export type FramePair = {
    width: number,
    height: number,
    primary: Uint8ClampedArray,
    compare: Uint8ClampedArray,
};

// The compare frame is scaled to the primary's resolution so the two line up pixel for pixel.
const readFrame = (video: HTMLVideoElement, width: number, height: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
};

// A video paused during playback can keep showing a frame past its currentTime, while the compare
// side is seeked to exactly that time. Assigning currentTime seeks even to the same position, so
// both end up on the frame a seek to that time lands on.
const seekInPlace = (video: HTMLVideoElement) => { video.currentTime = video.currentTime; };

// The two frames at the paused position, or "unreadable" when the media comes from another
// origin and the browser refuses to hand out its pixels. While playing, the last pair is kept.
export function useFramePair(
    primaryRef: RefObject<HTMLVideoElement | null>,
    compareRef: RefObject<HTMLVideoElement | null>,
) {
    const [pair, setPair] = useState<FramePair | "unreadable" | null>(null);

    useEffect(() => {
        const primary = primaryRef.current;
        const compare = compareRef.current;
        if (!primary || !compare) return;

        // Any event may try; only a still, aligned moment is taken.
        const capture = () => {
            if (!primary.paused || !compare.paused || primary.seeking || compare.seeking) return;
            if (primary.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
            if (compare.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
            if (Math.abs(compare.currentTime - compareTimeFor(primary.currentTime, compare.duration)) > ALIGNED_SEC) return;

            const { videoWidth: width, videoHeight: height } = primary;
            if (width === 0 || height === 0) return;

            try {
                const primaryFrame = readFrame(primary, width, height);
                const compareFrame = readFrame(compare, width, height);
                if (primaryFrame && compareFrame) setPair({ width, height, primary: primaryFrame, compare: compareFrame });
            } catch (e) {
                if (!(e instanceof DOMException && e.name === "SecurityError")) throw e;
                setPair("unreadable");
            }
        };

        // A new revision on either side makes the last pair wrong until the next capture.
        const clear = () => setPair(null);

        const listeners: [HTMLVideoElement, string, () => void][] = [
            [primary, "pause", () => seekInPlace(primary)],
            [primary, "seeked", capture],
            [primary, "loadeddata", capture],
            [compare, "pause", capture],
            [compare, "seeked", capture],
            [compare, "loadeddata", capture],
            [primary, "emptied", clear],
            [compare, "emptied", clear],
        ];

        // Turned on while paused: the primary may still hold the frame playback stopped on.
        if (primary.paused) seekInPlace(primary);
        for (const [video, event, handler] of listeners) video.addEventListener(event, handler);
        return () => {
            for (const [video, event, handler] of listeners) video.removeEventListener(event, handler);
        };
    }, []);

    return pair;
}
