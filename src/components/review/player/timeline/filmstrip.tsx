"use client";

import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { usePlayback } from "@/components/review/stores/playback-store";
import { usePresenterLock } from "@/components/review/sync-session";
import { FILMSTRIP_COLS, filmstripIndexAt, filmstripTile } from "@/lib/filmstrip";
import { cn } from "@/lib/utils";
import type { FilmstripSheets } from "@/components/review/player/timeline/hooks/use-filmstrip-sheets";

// Tiles are drawn at half their stored width, so they stay sharp on a 2x display.
const DISPLAY_TILE_WIDTH = 80;

export const pointerFraction = (e: ReactMouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
};

export function Filmstrip({ sheets: { strip, sheetUrls }, width }: { sheets: FilmstripSheets; width: number }) {
    const currentTime = usePlayback((s) => s.currentTime);
    const duration = usePlayback((s) => s.duration);
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const locked = usePresenterLock();

    // Shrink tiles to 48px before showing fewer than 12.
    const tileWidth = Math.min(DISPLAY_TILE_WIDTH, Math.max(48, width / 12));
    const slots = Math.max(1, Math.floor(width / tileWidth));
    const slotDuration = duration / slots;
    // Each tile shows the frame at the middle of its share of the duration.
    const tiles = Array.from({ length: slots }, (_, slot) => ({
        index: filmstripIndexAt(strip, (slot + 0.5) * slotDuration),
        current: currentTime >= slot * slotDuration && currentTime < (slot + 1) * slotDuration,
    }));

    return (
        <div
            className={cn("mobile:hidden flex w-full gap-px overflow-hidden", !locked && "cursor-pointer")}
            onClick={(e) => {
                if (!locked) {
                    setTimelineTime(pointerFraction(e) * duration);
                }
            }}
        >
            {tiles.map((tile, slot) => (
                <FilmstripTile
                    key={slot}
                    sheetUrls={sheetUrls}
                    index={tile.index}
                    className={cn("flex-1 min-w-0", tile.current && "ring-2 ring-inset ring-primary")}
                />
            ))}
        </div>
    );
}

export function FilmstripTile({ sheetUrls, index, className }: { sheetUrls: string[]; index: number; className?: string }) {
    const tile = filmstripTile(index);

    return (
        <div
            className={cn("filmstrip-tile", className)}
            style={{
                "--sheet": `url('${sheetUrls[tile.sheet]}')`,
                "--tile-x": `${(tile.col / (FILMSTRIP_COLS - 1)) * 100}%`,
                "--tile-y": `${(tile.row / (FILMSTRIP_COLS - 1)) * 100}%`,
            } as CSSProperties}
        />
    );
}
