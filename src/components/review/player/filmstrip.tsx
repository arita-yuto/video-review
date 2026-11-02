"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useVideoStore } from "@/components/stores/video-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { usePresenterLock } from "@/components/review/sync-session";
import { resolveMediaUrl } from "@/lib/media-url";
import { filmstripKey } from "@/lib/storage-key";
import { FILMSTRIP_COLS, FILMSTRIP_TILES_PER_SHEET, filmstripTile, parseFilmstrip } from "@/lib/filmstrip";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/profiler";

// Tiles are drawn at half their stored width, so they stay sharp on a 2x display.
const DISPLAY_TILE_WIDTH = 80;

export function Filmstrip() {
    const selectedRevision = useVideoStore((s) => s.selectedRevision);
    const currentTime = usePlayback((s) => s.currentTime);
    const duration = usePlayback((s) => s.duration);
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const locked = usePresenterLock();
    // State rather than a ref: the row mounts only once the sheets are resolved, and the observer must follow it.
    const [row, setRow] = useState<HTMLDivElement | null>(null);
    const [rowWidth, setRowWidth] = useState(0);
    const [sheetUrls, setSheetUrls] = useState<string[]>([]);

    const strip = useMemo(() => parseFilmstrip(selectedRevision?.filmstrip), [selectedRevision]);

    useEffect(() => {
        if (!row) {
            return;
        }

        const observer = new ResizeObserver(() => setRowWidth(row.clientWidth));
        observer.observe(row);
        return () => observer.disconnect();
    }, [row]);

    useEffect(() => {
        setSheetUrls([]);
        if (!strip || !selectedRevision) {
            return;
        }

        const sheets = Math.ceil(strip.count / FILMSTRIP_TILES_PER_SHEET);
        let cancelled = false;
        Promise.all(Array.from({ length: sheets }, (_, sheet) => resolveMediaUrl(filmstripKey(selectedRevision.filePath, sheet))))
            .then((urls) => {
                if (!cancelled && urls.every((url) => url !== undefined)) {
                    setSheetUrls(urls as string[]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [strip, selectedRevision]);

    if (!strip || sheetUrls.length === 0) {
        return null;
    }

    // As many tiles as fit; slot k shows the frame nearest to the middle of its share of the duration.
    const slots = Math.max(1, Math.floor(rowWidth / DISPLAY_TILE_WIDTH));
    const slotDuration = duration / slots;
    const tiles = Array.from({ length: slots }, (_, slot) => {
        const index = Math.min(strip.count - 1, Math.floor(((slot + 0.5) * slotDuration) / strip.interval));
        const tile = filmstripTile(index);
        return {
            time: index * strip.interval,
            current: currentTime >= slot * slotDuration && currentTime < (slot + 1) * slotDuration,
            style: {
                "--sheet": `url('${sheetUrls[tile.sheet]}')`,
                "--tile-x": `${(tile.col / (FILMSTRIP_COLS - 1)) * 100}%`,
                "--tile-y": `${(tile.row / (FILMSTRIP_COLS - 1)) * 100}%`,
            } as CSSProperties,
        };
    });

    return (
        <div
            ref={setRow}
            className="mobile:hidden flex w-full gap-px overflow-hidden"
            style={{ "--tile-aspect": `${strip.tileWidth} / ${strip.tileHeight}`, "--sheet-cols": FILMSTRIP_COLS } as CSSProperties}
        >
            {tiles.map((tile, slot) => (
                <button
                    key={slot}
                    type="button"
                    disabled={locked}
                    aria-label={formatTime(tile.time)}
                    onClick={() => setTimelineTime(tile.time)}
                    className={cn("filmstrip-tile flex-1 min-w-0", tile.current && "ring-2 ring-inset ring-primary")}
                    style={tile.style}
                />
            ))}
        </div>
    );
}
