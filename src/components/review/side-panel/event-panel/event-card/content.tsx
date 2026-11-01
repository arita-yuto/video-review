"use client";

import { VideoEventWithKind } from "@/lib/db-types";
import { TimelineCardContent } from "@/components/review/side-panel/timeline-card";

export default function EventCardContent(props: { event: VideoEventWithKind }) {
    return (
        <TimelineCardContent>
            <p className="text-sm text-foreground/80 whitespace-pre-line">
                {props.event.data}
            </p>
        </TimelineCardContent>
    );
}
