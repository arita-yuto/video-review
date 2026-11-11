"use client";

import { Tooltip, TooltipTrigger } from "@/ui/tooltip";
import { MarkerComments } from "@/components/review/player/timeline/seek-bar/marker-comments";
import type { SeekBarMarker } from "@/components/review/player/timeline/seek-bar/markers";

// The markers a stack has no room to show as dots, as one count of their comments.
export function MarkerMore({ markers, onMarkerClick }: {
    markers: SeekBarMarker[],
    onMarkerClick: (time: number) => void,
}) {
    const newestFirst = markers.flatMap((marker) => marker.comments).reverse();

    return (
        <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
                <div
                    data-slot="marker-more"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMarkerClick(markers[markers.length - 1].time);
                    }}
                    className="px-0.5 rounded-full bg-muted text-2xs leading-3 text-foreground cursor-pointer"
                >
                    +{newestFirst.length}
                </div>
            </TooltipTrigger>

            <MarkerComments comments={newestFirst} />
        </Tooltip>
    );
}
