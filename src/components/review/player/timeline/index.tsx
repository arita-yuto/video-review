"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useCommentStore } from "@/components/review/stores/comment-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { usePresenterLock } from "@/components/review/sync-session";
import { FILMSTRIP_COLS } from "@/lib/filmstrip";
import { SeekBar, commentMarkers, pointerFraction } from "@/components/review/player/timeline/seek-bar";
import { Filmstrip } from "@/components/review/player/timeline/filmstrip";
import { FramePreview } from "@/components/review/player/timeline/frame-preview";
import { useFilmstripSheets } from "@/components/review/player/timeline/hooks/use-filmstrip-sheets";

export function Timeline() {
    const { displayComments } = useCommentStore();
    // A marker is a jump request like a card click, so the player seeks and the comment list follows.
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const duration = usePlayback((s) => s.duration);
    const locked = usePresenterLock();
    const markers = useMemo(() => commentMarkers(displayComments, "revision-marker"), [displayComments]);
    const sheets = useFilmstripSheets();
    const wrapper = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [hoverFraction, setHoverFraction] = useState<number | null>(null);

    useEffect(() => {
        const element = wrapper.current;
        if (!element) {
            return;
        }

        const observer = new ResizeObserver(() => setWidth(element.clientWidth));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const hoverTime = hoverFraction === null || locked ? null : hoverFraction * duration;
    const sheetStyle = sheets
        ? { "--tile-aspect": `${sheets.strip.tileWidth} / ${sheets.strip.tileHeight}`, "--sheet-cols": FILMSTRIP_COLS, "--hover": hoverFraction ?? 0 } as CSSProperties
        : undefined;

    // One tree whether or not sheets exist, so the seek bar is never remounted mid-scrub when they arrive.
    return (
        <div
            ref={wrapper}
            className="relative"
            style={sheetStyle}
            onPointerMove={sheets ? (e) => setHoverFraction(pointerFraction(e)) : undefined}
            onPointerLeave={sheets ? () => setHoverFraction(null) : undefined}
        >
            {sheets && hoverTime !== null && <FramePreview sheets={sheets} time={hoverTime} />}
            <SeekBar markers={markers} onMarkerClick={setTimelineTime} />
            {sheets && <Filmstrip sheets={sheets} width={width} />}
        </div>
    );
}
