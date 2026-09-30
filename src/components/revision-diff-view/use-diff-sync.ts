"use client"
import { RefObject, useEffect } from "react";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoReviewStore } from "@/stores/video-review-store";

// Past this gap the compare side is sought back to the primary. Smaller gaps are left alone
// because every forced seek makes the compare side stutter.
const DRIFT_TOLERANCE_SEC = 0.15;

// Where the compare side should be for a primary position. A shorter compare revision holds
// its last frame instead of looping or erroring.
export const compareTimeFor = (primaryTime: number, compareDuration: number) =>
    Number.isFinite(compareDuration) ? Math.min(primaryTime, compareDuration) : primaryTime;

// The primary video is the only clock: it drives the shared player stores the controls read,
// and the compare video just follows it, muted.
export function useDiffSync(
    primaryRef: RefObject<HTMLVideoElement | null>,
    compareRef: RefObject<HTMLVideoElement | null>,
) {
    const isPlaying = useVideoPlayerStore((s) => s.isPlaying);
    const setIsPlaying = useVideoPlayerStore((s) => s.setIsPlaying);
    const playbackRate = useVideoPlayerStore((s) => s.playbackRate);
    const volume = useVideoPlayerStore((s) => s.volume);
    const volumeEnabled = useVideoPlayerStore((s) => s.volumeEnabled);
    const timelineTime = useVideoReviewStore((s) => s.timelineTime);

    const followPrimary = (force: boolean) => {
        const primary = primaryRef.current;
        const compare = compareRef.current;
        if (!primary || !compare) return;

        const target = compareTimeFor(primary.currentTime, compare.duration);
        if (force || Math.abs(compare.currentTime - target) > DRIFT_TOLERANCE_SEC) {
            compare.currentTime = target;
        }

        // play() on an ended video restarts it from 0, so a finished compare side stays paused.
        const compareShouldPlay = !primary.paused && !compare.ended && primary.currentTime < compare.duration;
        if (compareShouldPlay && compare.paused) compare.play().catch(() => {});
        if (!compareShouldPlay && !compare.paused) compare.pause();
    };

    // The shared stores may still hold the review page's state, and the review page reads
    // them again once this page is left.
    useEffect(() => {
        const reset = () => {
            setIsPlaying(false);
            const { setCurrentTime, setTimelineTime, setDuration } = useVideoReviewStore.getState();
            setCurrentTime(0);
            setTimelineTime(null);
            setDuration(0);
        };
        reset();
        return reset;
    }, []);

    useEffect(() => {
        const primary = primaryRef.current;
        const compare = compareRef.current;
        if (!primary || !compare) return;

        compare.muted = true;

        const { setCurrentTime, setDuration } = useVideoReviewStore.getState();
        // Loading a new src resets playbackRate to 1, so both sides take the chosen rate again.
        const applyRate = (v: HTMLVideoElement) => { v.playbackRate = useVideoPlayerStore.getState().playbackRate; };
        const onMeta = () => { setDuration(primary.duration); applyRate(primary); };
        const onPlay = () => { setIsPlaying(true); followPrimary(false); };
        const onPause = () => { setIsPlaying(false); followPrimary(true); };
        const onSeeked = () => followPrimary(true);
        // A newly picked compare revision starts at 0.
        const onCompareMeta = () => { applyRate(compare); followPrimary(true); };
        // Swapping the primary's src stops it without a pause event.
        const onEmptied = () => setIsPlaying(false);
        const onTimeUpdate = () => {
            // While the seek bar is being dragged it owns the displayed time.
            if (useVideoReviewStore.getState().timelineTime === null) {
                setCurrentTime(primary.currentTime);
            }
            followPrimary(false);
        };

        if (primary.readyState >= HTMLMediaElement.HAVE_METADATA) onMeta();
        primary.addEventListener("loadedmetadata", onMeta);
        primary.addEventListener("play", onPlay);
        primary.addEventListener("pause", onPause);
        primary.addEventListener("seeked", onSeeked);
        primary.addEventListener("timeupdate", onTimeUpdate);
        primary.addEventListener("emptied", onEmptied);
        compare.addEventListener("loadedmetadata", onCompareMeta);

        return () => {
            primary.removeEventListener("loadedmetadata", onMeta);
            primary.removeEventListener("play", onPlay);
            primary.removeEventListener("pause", onPause);
            primary.removeEventListener("seeked", onSeeked);
            primary.removeEventListener("timeupdate", onTimeUpdate);
            primary.removeEventListener("emptied", onEmptied);
            compare.removeEventListener("loadedmetadata", onCompareMeta);
            primary.pause();
            compare.pause();
        };
    }, []);

    useEffect(() => {
        const primary = primaryRef.current;
        if (!primary) return;

        if (isPlaying) primary.play().catch(() => {});
        else primary.pause();
        useVideoReviewStore.getState().setTimelineTime(null);
    }, [isPlaying]);

    useEffect(() => {
        for (const v of [primaryRef.current, compareRef.current]) {
            if (v) v.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        const primary = primaryRef.current;
        if (primary) primary.volume = volumeEnabled ? volume : 0.0;
    }, [volume, volumeEnabled]);

    useEffect(() => {
        const primary = primaryRef.current;
        if (primary && timelineTime !== null) primary.currentTime = timelineTime;
    }, [timelineTime]);
}
