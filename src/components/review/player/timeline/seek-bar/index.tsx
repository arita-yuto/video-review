"use client";
import { usePlayback } from "@/components/review/stores/playback-store";
import { Slider } from "@/ui/slider";
import { usePresenterLock } from "@/components/review/sync-session";
import { useElementWidth } from "@/components/review/player/timeline/hooks/use-element-width";
import { MarkerStack } from "@/components/review/player/timeline/seek-bar/marker-stack";
import { markerStacks, type SeekBarMarker } from "@/components/review/player/timeline/seek-bar/markers";
import type { MouseEvent as ReactMouseEvent } from "react";

// Where the pointer is along the element, 0 at its left edge and 1 at its right.
export const pointerFraction = (e: ReactMouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
};

// Markers carry their own colour so a caller can tell sources apart.
export function SeekBar({ markers, onMarkerClick, onStackHeightChange }: {
    markers: SeekBarMarker[],
    onMarkerClick: (time: number) => void,
    onStackHeightChange?: (height: number) => void,
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
    const stacks = markerStacks(markers, duration, width);

    return (
        <div ref={bar} className="relative h-6 w-full cursor-pointer select-none">
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

            {stacks.map((stack) => (
                <MarkerStack
                    key={`${stack[0].className}-${stack[0].revision}-${stack[0].time}`}
                    stack={stack}
                    onMarkerClick={onMarkerClick}
                    onStackHeightChange={onStackHeightChange}
                />
            ))}
        </div>
    );
}
