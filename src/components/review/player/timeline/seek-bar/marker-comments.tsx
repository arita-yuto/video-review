"use client";

import { TooltipContent } from "@/ui/tooltip";
import type { SeekBarMarker } from "@/components/review/player/timeline/seek-bar/markers";

export function MarkerComments({ comments }: { comments: SeekBarMarker["comments"] }) {
    const MAX_COMMENTS = 5;
    const shown = comments.slice(0, MAX_COMMENTS);

    return (
        <TooltipContent side="right" align="start" className="pointer-events-none max-w-xs text-left">
            <div className="flex flex-col gap-2">
                {shown.map((comment) => (
                    <div key={comment.id}>
                        <div className="font-semibold">{comment.userName} · Rev.{comment.videoRevNum}</div>
                        <div className="line-clamp-3 whitespace-pre-wrap">{comment.comment}</div>
                    </div>
                ))}

                {comments.length > shown.length && (
                    <div className="font-semibold">+{comments.length - shown.length}</div>
                )}
            </div>
        </TooltipContent>
    );
}
