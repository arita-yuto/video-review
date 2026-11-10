"use client";
import { usePlayback } from "@/components/review/stores/playback-store";
import { Slider } from "@/ui/slider";
import { cn } from "@/lib/utils";
import { usePresenterLock } from "@/components/review/sync-session";
import type { MouseEvent as ReactMouseEvent } from "react";

// Where the pointer is along the element, 0 at its left edge and 1 at its right.
export const pointerFraction = (e: ReactMouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
};

export type SeekBarMarker = { time: number; className: string; revision?: number };

// Markers carry their own colour so a caller can tell sources apart.
export function SeekBar({ markers, onMarkerClick }: {
    markers: SeekBarMarker[],
    onMarkerClick: (time: number) => void,
}) {
    const timelineTime = usePlayback((s) => s.timelineTime);
    const currentTime = usePlayback((s) => s.currentTime);
    const duration = usePlayback((s) => s.duration);
    const setCurrentTime = usePlayback((s) => s.setCurrentTime);
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const setScrubbing = usePlayback((s) => s.setScrubbing);
    const locked = usePresenterLock();

    // Slider API expects an array even for a single thumb.
    const value = [timelineTime ?? currentTime];

    return (
        <div className="relative h-6 w-full cursor-pointer select-none">
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

            {
                markers.map((m) => (
                    <div
                        key={`${m.className}-${m.revision}-${m.time}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkerClick(m.time);
                        }}
                        className={cn(
                            "absolute left-(--marker-left) -top-2.5 -translate-x-1/2 w-1.25 h-6.25 rounded-xs cursor-pointer",
                            Math.abs(currentTime - m.time) < 0.5 ? "bg-foreground" : m.className,
                        )}
                        style={{ "--marker-left": `${(m.time / duration) * 100}%`, "--revision": m.revision } as React.CSSProperties}
                    />
                ))}
        </div>
    );
}

// Comments of one revision within 0.01s share one marker, which carries the first comment's exact time so a click lands on it.
export const commentMarkers = (comments: { time: number; videoRevNum: number }[], className: string): SeekBarMarker[] => {
    const markers = new Map<string, SeekBarMarker>();
    for (const { time, videoRevNum } of comments) {
        const key = `${videoRevNum}-${time.toFixed(2)}`;
        if (!markers.has(key)) {
            markers.set(key, { time, className, revision: videoRevNum });
        }
    }

    return [...markers.values()];
};
