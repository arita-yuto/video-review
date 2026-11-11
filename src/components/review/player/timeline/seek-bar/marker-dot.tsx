"use client";
import type { CSSProperties } from "react";
import { usePlayback } from "@/components/review/stores/playback-store";
import { Tooltip, TooltipTrigger } from "@/ui/tooltip";
import { MarkerComments } from "@/components/review/player/timeline/seek-bar/marker-comments";
import { cn } from "@/lib/utils";
import type { SeekBarMarker } from "@/components/review/player/timeline/seek-bar/markers";

// One marker as a dot: hovering shows its comments, clicking jumps to its time.
export function MarkerDot({ marker, onMarkerClick }: {
    marker: SeekBarMarker,
    onMarkerClick: (time: number) => void,
}) {
    const currentTime = usePlayback((s) => s.currentTime);
    const active = Math.abs(currentTime - marker.time) < 0.5;

    return (
        <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
                <div
                    data-slot="marker-dot"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMarkerClick(marker.time);
                    }}
                    className={cn(
                        "size-(--dot-size) rounded-full ring-1 ring-foreground cursor-pointer transition-all",
                        marker.className,
                        active && "scale-125 ring-primary",
                    )}
                    style={{ "--revision": marker.revision } as CSSProperties}
                />
            </TooltipTrigger>

            <MarkerComments comments={marker.comments} />
        </Tooltip>
    );
}
