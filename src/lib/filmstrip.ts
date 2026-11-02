// A filmstrip is the set of evenly spaced frames of one revision, packed into JPEG sheets of
// FILMSTRIP_COLS × FILMSTRIP_COLS tiles; VideoRevision.filmstrip holds what is needed to address a tile.
export const FILMSTRIP_COLS = 10;
export const FILMSTRIP_TILES_PER_SHEET = FILMSTRIP_COLS * FILMSTRIP_COLS;
export const FILMSTRIP_TILE_WIDTH = 160;

export type Filmstrip = {
    interval: number;
    tileWidth: number;
    tileHeight: number;
    count: number;
};

// Whole seconds, so tile i sits at i × interval and ffmpeg's fps filter can take 1/interval as is.
export function filmstripInterval(duration: number): number {
    const targetTiles = 150;
    return Math.max(1, Math.ceil(duration / targetTiles));
}

// The column also records a failed attempt as { error }, which reads as "no filmstrip".
export function parseFilmstrip(value: unknown): Filmstrip | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const { interval, tileWidth, tileHeight, count } = value as Record<string, unknown>;
    const fields = [interval, tileWidth, tileHeight, count];
    if (!fields.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)) {
        return null;
    }

    return { interval, tileWidth, tileHeight, count } as Filmstrip;
}

export function filmstripTile(strip: Filmstrip, index: number): { sheet: number; x: number; y: number } {
    const sheet = Math.floor(index / FILMSTRIP_TILES_PER_SHEET);
    const inSheet = index % FILMSTRIP_TILES_PER_SHEET;

    return {
        sheet,
        x: (inSheet % FILMSTRIP_COLS) * strip.tileWidth,
        y: Math.floor(inSheet / FILMSTRIP_COLS) * strip.tileHeight,
    };
}
