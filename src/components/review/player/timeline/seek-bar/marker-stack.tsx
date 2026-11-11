"use client";
import { useState, type CSSProperties } from "react";
import { usePlayback } from "@/components/review/stores/playback-store";
import { MarkerMore } from "@/components/review/player/timeline/seek-bar/marker-more";
import { MarkerDot } from "@/components/review/player/timeline/seek-bar/marker-dot";
import { MARKER_DOT_SIZE, type SeekBarMarker } from "@/components/review/player/timeline/seek-bar/markers";

export function MarkerStack({ stack, onMarkerClick, onStackHeightChange }: {
    stack: SeekBarMarker[],
    onMarkerClick: (time: number) => void,
    onStackHeightChange?: (height: number) => void,
}) {
    const HOVERED_DOTS = 5;
    const DOT_GAP = 1;
    const MORE_HEIGHT = 14;
    const duration = usePlayback((s) => s.duration);
    const [hovered, setHovered] = useState(false);
    const earliest = Math.min(...stack.map((marker) => marker.time));
    const hoveredHeight = Math.min(stack.length, HOVERED_DOTS) * (MARKER_DOT_SIZE + DOT_GAP) + (stack.length > HOVERED_DOTS ? MORE_HEIGHT : 0);
    // The newest revision is last in the stack, so it is the dot shown alone and the one nearest the bar.
    const dots = stack.slice(hovered ? -HOVERED_DOTS : -1);
    const more = stack.slice(0, -dots.length);

    return (
        <div
            data-slot="marker-stack"
            onPointerEnter={() => {
                setHovered(true);
                onStackHeightChange?.(hoveredHeight);
            }}
            onPointerLeave={() => {
                setHovered(false);
                onStackHeightChange?.(0);
            }}
            className="absolute left-(--marker-left) bottom-full mb-0.5 -translate-x-1/2 flex flex-col items-center gap-px"
            style={{
                "--marker-left": `${(earliest / duration) * 100}%`,
                "--dot-size": `${MARKER_DOT_SIZE}px`,
            } as CSSProperties}
        >
            {more.length > 0 && <MarkerMore markers={more} onMarkerClick={onMarkerClick} />}

            {dots.map((marker) => (
                <MarkerDot
                    key={`${marker.className}-${marker.revision}-${marker.time}`}
                    marker={marker}
                    onMarkerClick={onMarkerClick}
                />
            ))}
        </div>
    );
}
