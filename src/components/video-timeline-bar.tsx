"use client";
import { useCommentStore } from "@/stores/comment-store";
import { usePlayback } from "@/stores/playback-store";
import { useMemo } from "react";
import { Slider } from "@/ui/slider";
import { cn } from "@/lib/utils";
import { usePresenterLock } from "@/lib/sync-session";

export type SeekBarMarker = { time: number; className: string };

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

            {/* Clicking a marker jumps playback to that timestamp.
                The active marker is highlighted when close to current playback time. */}
            {
                markers.map((m) => (
                    <div
                        key={`${m.className}-${m.time}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkerClick(m.time);
                        }}
                        className={cn(
                            "absolute left-(--marker-left) -top-2.5 -translate-x-1/2 w-1.25 h-6.25 rounded-xs cursor-pointer",
                            Math.abs(currentTime - m.time) < 0.5 ? "bg-foreground" : m.className,
                        )}
                        style={{ "--marker-left": `${(m.time / duration) * 100}%` } as React.CSSProperties}
                    />
                ))}
        </div>
    );
}

// Comments within 0.01s share one marker, which carries the first comment's exact time so a click lands on it.
export const commentMarkers = (comments: { time: number }[], className: string): SeekBarMarker[] => {
    const byHundredth = new Map<string, number>();
    for (const { time } of comments) {
        const key = time.toFixed(2);
        if (!byHundredth.has(key)) {
            byHundredth.set(key, time);
        }
    }

    return [...byHundredth.values()].map((time) => ({ time, className }));
};

export default function VideoTimelineBar() {
    const { displayComments } = useCommentStore();
    // A marker is a jump request like a card click, so the player seeks and the comment list follows.
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const markers = useMemo(() => commentMarkers(displayComments, "bg-primary"), [displayComments]);

    return <SeekBar markers={markers} onMarkerClick={setTimelineTime} />;
}
