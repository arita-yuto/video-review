"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useCommentStore } from "@/components/review/stores/comment-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { latestRevisionNumber, useVideoStore } from "@/components/stores/video-store";
import { usePresenterLock } from "@/components/review/sync-session";
import { FILMSTRIP_COLS } from "@/lib/filmstrip";
import { SeekBar, pointerFraction } from "@/components/review/player/timeline/seek-bar";
import { Filmstrip } from "@/components/review/player/timeline/filmstrip";
import { FramePreview } from "@/components/review/player/timeline/frame-preview";
import { useElementWidth } from "@/components/review/player/timeline/hooks/use-element-width";
import { useFilmstripSheets } from "@/components/review/player/timeline/hooks/use-filmstrip-sheets";

export function Timeline() {
    const { displayComments } = useCommentStore();
    // A marker is a jump request like a card click, so the player seeks and the comment list follows.
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const duration = usePlayback((s) => s.duration);
    const locked = usePresenterLock();
    const latestRevision = useVideoStore(latestRevisionNumber);
    const markerSources = useMemo(
        () => [{ comments: displayComments, className: "revision-marker", latestRevision }],
        [displayComments, latestRevision],
    );
    const sheets = useFilmstripSheets();
    const [wrapper, width] = useElementWidth<HTMLDivElement>();
    const [hoverFraction, setHoverFraction] = useState<number | null>(null);

    const hoverTime = hoverFraction === null || locked ? null : hoverFraction * duration;
    const sheetStyle = sheets
        ? { "--tile-aspect": `${sheets.strip.tileWidth} / ${sheets.strip.tileHeight}`, "--sheet-cols": FILMSTRIP_COLS, "--hover": hoverFraction ?? 0 } as CSSProperties
        : undefined;

    // One tree whether or not sheets exist, so the seek bar is never remounted mid-scrub when they arrive.
    return (
        <div
            ref={wrapper}
            className="relative seek-marker-room"
            style={sheetStyle}
            onPointerMove={sheets ? (e) => setHoverFraction(pointerFraction(e)) : undefined}
            onPointerLeave={sheets ? () => setHoverFraction(null) : undefined}
        >
            {sheets && hoverTime !== null && <FramePreview sheets={sheets} time={hoverTime} />}
            <SeekBar markerSources={markerSources} onMarkerClick={setTimelineTime} />
            {sheets && <Filmstrip sheets={sheets} width={width} />}
        </div>
    );
}
