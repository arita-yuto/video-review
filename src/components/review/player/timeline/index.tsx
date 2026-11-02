"use client";
import { useMemo } from "react";
import { useCommentStore } from "@/components/review/stores/comment-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { SeekBar, commentMarkers } from "@/components/review/player/timeline/seek-bar";

export function Timeline() {
    const { displayComments } = useCommentStore();
    // A marker is a jump request like a card click, so the player seeks and the comment list follows.
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const markers = useMemo(() => commentMarkers(displayComments, "bg-primary"), [displayComments]);

    return <SeekBar markers={markers} onMarkerClick={setTimelineTime} />;
}
