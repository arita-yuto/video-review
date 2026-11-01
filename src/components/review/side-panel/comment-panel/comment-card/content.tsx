"use client";

import { VideoComment } from "@/lib/db-types";
import { TimelineCardContent } from "@/components/review/side-panel/timeline-card";
import { TimeBadge } from "@/components/review/side-panel/time-badge";

export default function CommentCardContent(props: { comment: VideoComment }) {
    return (
        <TimelineCardContent>
            <p className="text-sm text-foreground/80 whitespace-pre-line">
                <TimeBadge seconds={props.comment.time} />
                {props.comment.comment}
            </p>
        </TimelineCardContent>
    );
}
