"use client";

import { useEffect, useMemo, useState } from "react";
import { useVideoStore } from "@/components/stores/video-store";
import { resolveMediaUrl } from "@/lib/media-url";
import { filmstripKey } from "@/lib/storage-key";
import { FILMSTRIP_TILES_PER_SHEET, parseFilmstrip, type Filmstrip } from "@/lib/filmstrip";

export type FilmstripSheets = { strip: Filmstrip; sheetUrls: string[] };

// The selected revision's filmstrip with every sheet resolved to a URL; null until then.
export function useFilmstripSheets(): FilmstripSheets | null {
    const selectedRevision = useVideoStore((s) => s.selectedRevision);
    const strip = useMemo(() => parseFilmstrip(selectedRevision?.filmstrip), [selectedRevision]);
    const [sheetUrls, setSheetUrls] = useState<string[]>([]);

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

    return { strip, sheetUrls };
}
