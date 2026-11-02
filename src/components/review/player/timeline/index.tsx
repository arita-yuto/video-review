"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useCommentStore } from "@/components/review/stores/comment-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { usePresenterLock } from "@/components/review/sync-session";
import { FILMSTRIP_COLS } from "@/lib/filmstrip";
import { SeekBar, commentMarkers } from "@/components/review/player/timeline/seek-bar";
import { Filmstrip, pointerFraction } from "@/components/review/player/timeline/filmstrip";
import { FramePreview } from "@/components/review/player/timeline/frame-preview";
import { useFilmstripSheets } from "@/components/review/player/timeline/hooks/use-filmstrip-sheets";

export function Timeline() {
    const { displayComments } = useCommentStore();
    // A marker is a jump request like a card click, so the player seeks and the comment list follows.
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const duration = usePlayback((s) => s.duration);
    const locked = usePresenterLock();
    const markers = useMemo(() => commentMarkers(displayComments, "bg-primary"), [displayComments]);
    const sheets = useFilmstripSheets();
    // State rather than a ref: the wrapper mounts only once the sheets are resolved, and the observer must follow it.
    const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);
    const [hoverFraction, setHoverFraction] = useState<number | null>(null);

    useEffect(() => {
        if (!wrapper) {
            return;
        }

        const observer = new ResizeObserver(() => setWidth(wrapper.clientWidth));
        observer.observe(wrapper);
        return () => observer.disconnect();
    }, [wrapper]);

    const seekBar = <SeekBar markers={markers} onMarkerClick={setTimelineTime} />;
    if (!sheets) {
        return seekBar;
    }

    const hoverTime = hoverFraction === null || locked ? null : hoverFraction * duration;

    return (
        <div
            ref={setWrapper}
            className="relative"
            style={{ "--tile-aspect": `${sheets.strip.tileWidth} / ${sheets.strip.tileHeight}`, "--sheet-cols": FILMSTRIP_COLS, "--hover": hoverFraction ?? 0 } as CSSProperties}
            onPointerMove={(e) => setHoverFraction(pointerFraction(e))}
            onPointerLeave={() => setHoverFraction(null)}
        >
            {hoverTime !== null && <FramePreview sheets={sheets} time={hoverTime} />}
            {seekBar}
            <Filmstrip sheets={sheets} width={width} />
        </div>
    );
}
