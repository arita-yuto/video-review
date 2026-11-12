"use client";
import { usePlayback } from "@/components/review/stores/playback-store";
import { Slider } from "@/ui/slider";
import { usePresenterLock } from "@/components/review/sync-session";
import { useElementWidth } from "@/components/review/player/timeline/hooks/use-element-width";
import { Marker } from "@/components/review/player/timeline/seek-bar/marker";
import { sourceMarkers, type MarkerSource } from "@/components/review/player/timeline/seek-bar/markers";
import { useMemo, type MouseEvent as ReactMouseEvent } from "react";

// Where the pointer is along the element, 0 at its left edge and 1 at its right.
export const pointerFraction = (e: ReactMouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
};

// Each source carries its own colour, and its comments never share a marker with another source's.
export function SeekBar({ markerSources, onMarkerClick }: {
    markerSources: MarkerSource[],
    onMarkerClick: (time: number) => void,
}) {
    const timelineTime = usePlayback((s) => s.timelineTime);
    const currentTime = usePlayback((s) => s.currentTime);
    const duration = usePlayback((s) => s.duration);
    const setCurrentTime = usePlayback((s) => s.setCurrentTime);
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const setScrubbing = usePlayback((s) => s.setScrubbing);
    const locked = usePresenterLock();
    const [bar, width] = useElementWidth<HTMLDivElement>();

    // Slider API expects an array even for a single thumb.
    const value = [timelineTime ?? currentTime];
    const markerLists = useMemo(
        () => markerSources.map((source) => sourceMarkers(source, duration, width)),
        [markerSources, duration, width],
    );

    return (
        <div ref={bar} className="relative h-6 w-full cursor-pointer select-none">
            {/* Before the slider, so the thumb stays on top of a marker's tip. */}
            {markerSources.map((source, index) => markerLists[index].map((marker) => (
                <Marker key={`${index}-${marker.time}`} source={source} marker={marker} onMarkerClick={onMarkerClick} />
            )))}

            <Slider
                min={0}
                max={duration}
                step={0.01}
                value={value}
                disabled={locked}
                onValueChange={(v) => {
                    setScrubbing(true);
                    setTimelineTime(v[0]);
                }}
                onValueCommit={(v) => {
                    setCurrentTime(v[0]);
                    setTimelineTime(null);
                    setScrubbing(false);
                }}
                className="w-full"
            />
        </div>
    );
}
