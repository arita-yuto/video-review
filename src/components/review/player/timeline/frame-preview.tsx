"use client";

import { filmstripIndexAt } from "@/lib/filmstrip";
import { formatTime } from "@/lib/utils/profiler";
import { FilmstripTile } from "@/components/review/player/timeline/filmstrip";
import type { FilmstripSheets } from "@/components/review/player/timeline/hooks/use-filmstrip-sheets";

export function FramePreview({ sheets: { strip, sheetUrls }, time }: { sheets: FilmstripSheets; time: number }) {
    return (
        <div className="frame-preview mobile:hidden absolute bottom-full mb-3 pointer-events-none rounded-sm overflow-hidden ring-2 ring-foreground shadow-lg">
            <FilmstripTile sheetUrls={sheetUrls} index={filmstripIndexAt(strip, time)} />
            <div className="bg-background/80 text-center text-xs tabular-nums">{formatTime(time)}</div>
        </div>
    );
}
