"use client";
import type { CSSProperties } from "react";
import { usePlayback } from "@/components/review/stores/playback-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";
import { markerWidth, type MarkerSource, type SeekBarMarker } from "@/components/review/player/timeline/seek-bar/markers";

export function Marker({ source, marker, onMarkerClick }: {
    source: MarkerSource,
    marker: SeekBarMarker,
    onMarkerClick: (time: number) => void,
}) {
    const MAX_LISTED = 5;
    const active = usePlayback((s) => marker.comments.some((comment) => Math.abs(s.currentTime - comment.time) < 0.5));
    const listed = marker.comments.slice(0, MAX_LISTED);
    const unlisted = marker.comments.length - listed.length;

    return (
        <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onMarkerClick(marker.time);
                    }}
                    className={cn("seek-marker", source.below ? "seek-marker-below" : "seek-marker-above", source.className, active && "scale-110")}
                    style={{
                        "--marker-fraction": marker.fraction,
                        "--marker-width": `${markerWidth(source)}px`,
                        "--revision": marker.comments[0].videoRevNum,
                    } as CSSProperties}
                >
                    {!source.compact && marker.comments.length > 1 && <div className="seek-marker-count">{marker.comments.length}</div>}
                </div>
            </TooltipTrigger>

            <TooltipContent side="right" align="start" className="pointer-events-none max-w-sm text-left text-sm">
                {/* The content is portalled out of the element that carries --revision-latest. */}
                <div className="flex flex-col gap-2" style={{ "--revision-latest": source.latestRevision } as CSSProperties}>
                    {listed.map((comment) => (
                        <div key={comment.id}>
                            <div className="flex items-center gap-2">
                                <div className="seek-marker-revision">
                                    <div
                                        className={cn("size-2 rounded-full", source.className)}
                                        style={{ "--revision": comment.videoRevNum } as CSSProperties}
                                    />
                                    Rev.{comment.videoRevNum}
                                </div>

                                <div className="font-semibold">{comment.userName}</div>
                            </div>

                            <div className="line-clamp-3 whitespace-pre-wrap">{comment.comment}</div>
                        </div>
                    ))}

                    {unlisted > 0 && <div className="font-semibold">+{unlisted}</div>}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
