"use client"
import { RefObject, useEffect, useReducer, useRef } from "react";
import { Rgb } from "@/lib/frame-diff";
import { compareTimeFor } from "./use-diff-sync";
import type { FrameDiffRequest, FrameDiffResponse } from "./frame-diff.worker";
import { diffImageReducer, initialDiffImageState } from "./diff-image-state";

// A compare side seeked to its target lands on it exactly; anything further off is still on the
// way there, e.g. right after the primary moved and before the sync has sent it along.
const ALIGNED_SEC = 0.02;

// A colour no other part of the diff-view uses, so it reads only as "changed here".
const HIGHLIGHT_TOKEN = "--chart-2";

// A 1px fill turns any CSS colour, oklch included, into RGB.
const tokenRgb = (name: string): Rgb => {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) return { r: 255, g: 0, b: 0 };

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
};

// A video paused during playback can keep showing a frame past its currentTime, while the compare
// side is seeked to exactly that time. Assigning currentTime seeks even to the same position, so
// both end up on the frame a seek to that time lands on.
const seekInPlace = (video: HTMLVideoElement) => { video.currentTime = video.currentTime; };

const isSecurityError = (e: unknown) => e instanceof DOMException && e.name === "SecurityError";

// A VideoFrame only references the decoded frame, where createImageBitmap copies it on the page's
// thread; the copy is the fallback for browsers without WebCodecs.
const grabFrame = async (video: HTMLVideoElement): Promise<VideoFrame | ImageBitmap> =>
    typeof VideoFrame === "undefined" ? createImageBitmap(video) : new VideoFrame(video);

// Works out the diff of the two frames at the paused position in a worker: decides when both
// frames are ready to take, and keeps only the newest request's result.
export function useDiffImage(
    primaryRef: RefObject<HTMLVideoElement | null>,
    compareRef: RefObject<HTMLVideoElement | null>,
    settings: { threshold: number, baseOpacity: number },
) {
    const [state, dispatch] = useReducer(diffImageReducer, initialDiffImageState);
    const settingsRef = useRef(settings);
    settingsRef.current = settings;
    const recapture = useRef(() => {});

    useEffect(() => {
        const primary = primaryRef.current;
        const compare = compareRef.current;
        if (!primary || !compare) return;

        const worker = new Worker(new URL("./frame-diff.worker.ts", import.meta.url), { type: "module" });
        const highlight = tokenRgb(HIGHLIGHT_TOKEN);
        // Only the response to this request is shown. Bumping it without sending one drops
        // every request still in flight, e.g. after the position or a revision changed.
        let requestId = 0;

        // Bitmaps hold GPU memory until closed, so each one is released once replaced.
        let shown: ImageBitmap | null = null;
        const show = (image: ImageBitmap | null) => {
            shown?.close();
            shown = image;
        };

        worker.addEventListener("message", (e: MessageEvent<FrameDiffResponse>) => {
            const res = e.data;
            if (res.id !== requestId) {
                if ("image" in res) res.image.close();
                return;
            }
            if ("unreadable" in res) {
                show(null);
                dispatch({ type: "refused" });
            } else {
                show(res.image);
                dispatch({ type: "received", image: res.image });
            }
        });
        worker.addEventListener("error", () => dispatch({ type: "cancelled" }));

        // Any event may try; only a still, aligned moment is taken.
        const capture = async () => {
            if (!primary.paused || !compare.paused || primary.seeking || compare.seeking) return;
            if (primary.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
            if (compare.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
            if (Math.abs(compare.currentTime - compareTimeFor(primary.currentTime, compare.duration)) > ALIGNED_SEC) return;

            const { videoWidth: width, videoHeight: height } = primary;
            if (width === 0 || height === 0) return;

            const id = ++requestId;
            dispatch({ type: "started" });

            // Frames pin decoder memory until closed, so every path that doesn't hand them over closes them.
            const grabbed = await Promise.allSettled([grabFrame(primary), grabFrame(compare)]);
            const frames = grabbed.flatMap((r) => r.status === "fulfilled" ? [r.value] : []);
            const failure = grabbed.find((r) => r.status === "rejected");
            const discard = () => { for (const frame of frames) frame.close(); };

            if (id !== requestId) return discard();
            if (failure) {
                discard();
                if (isSecurityError(failure.reason)) {
                    show(null);
                    return dispatch({ type: "refused" });
                }
                dispatch({ type: "cancelled" });
                throw failure.reason;
            }

            const [primaryFrame, compareFrame] = frames;
            const request: FrameDiffRequest = {
                id, width, height, primary: primaryFrame, compare: compareFrame,
                options: { ...settingsRef.current, highlight },
            };
            try {
                worker.postMessage(request, frames);
            } catch (e) {
                discard();
                dispatch({ type: "cancelled" });
                throw e;
            }
        };

        // A new revision on either side makes the last diff wrong until the next capture.
        const clear = () => {
            requestId++;
            show(null);
            dispatch({ type: "reset" });
        };

        // From the moment a paused primary moves, the shown diff and any still in the worker belong
        // to the old position; on a slow machine the compare side can take a while to follow.
        const moving = () => {
            if (!primary.paused) return;
            requestId++;
            dispatch({ type: "started" });
        };

        const listeners: [HTMLVideoElement, string, () => void][] = [
            [primary, "pause", () => seekInPlace(primary)],
            // A diff still being worked out would land on a position playback has already left.
            [primary, "play", () => {
                requestId++;
                dispatch({ type: "cancelled" });
            }],
            [primary, "seeking", moving],
            [primary, "seeked", capture],
            [primary, "loadeddata", capture],
            [compare, "pause", capture],
            [compare, "seeked", capture],
            [compare, "loadeddata", capture],
            [primary, "emptied", clear],
            [compare, "emptied", clear],
        ];

        recapture.current = capture;

        // Turned on while paused: the primary may still hold the frame playback stopped on.
        if (primary.paused) seekInPlace(primary);
        for (const [video, event, handler] of listeners) video.addEventListener(event, handler);
        return () => {
            // A capture still awaiting its frames closes them instead of posting to a dead worker.
            requestId++;
            for (const [video, event, handler] of listeners) video.removeEventListener(event, handler);
            worker.terminate();
            shown?.close();
            recapture.current = () => {};
        };
    }, []);

    // New settings redo the diff at the same position; capture itself skips it while playing.
    useEffect(() => { recapture.current(); }, [settings.threshold, settings.baseOpacity]);

    return state;
}
