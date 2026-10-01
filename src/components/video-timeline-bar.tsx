"use client";
import { useCommentStore } from "@/stores/comment-store";
import { usePlayback } from "@/stores/playback-store";
import { useMemo } from "react";
import { Slider } from "@/ui/slider";
import { cn } from "@/lib/utils";

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

    // Slider API expects an array even for a single thumb.
    const value = [timelineTime ?? currentTime];

    return (
        <div className="relative h-6 w-full cursor-pointer select-none">
            <Slider
                min={0}
                max={duration}
                step={0.01}
                value={value}
                onValueChange={(v) => {
                    setTimelineTime(v[0]);
                }}
                onValueCommit={(v) => {
                    setCurrentTime(v[0]);
                    setTimelineTime(null);
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

// Comment times are quantized to 0.01s to avoid near-duplicate markers.
export const commentMarkers = (comments: { time: number }[], className: string): SeekBarMarker[] =>
    [...new Set(comments.map((c) => Number(c.time.toFixed(2))))].map((time) => ({ time, className }));

export default function VideoTimelineBar() {
    const { displayComments } = useCommentStore();
    const setCurrentTime = usePlayback((s) => s.setCurrentTime);
    const markers = useMemo(() => commentMarkers(displayComments, "bg-primary"), [displayComments]);

    return <SeekBar markers={markers} onMarkerClick={setCurrentTime} />;
}
