import type { DrawingItem } from "@/lib/drawing/types";

/**
 * What the canvas shows underneath the items: the comment's saved drawing ("saved",
 * resolved from the cache when painting), nothing, or a bitmap produced in the session.
 */
export type BaseLayer = "saved" | CanvasImageSource | null;

export interface DrawingSnapshot {
    base: BaseLayer;
    items: DrawingItem[];
}

/** Undo/redo over whole snapshots, so any operation is one step back or forward. Immutable. */
export interface DrawingHistory {
    past: DrawingSnapshot[];
    present: DrawingSnapshot;
    future: DrawingSnapshot[];
}

export const initialHistory: DrawingHistory = { past: [], present: { base: "saved", items: [] }, future: [] };

/** Make `next` the current snapshot; whatever was undone is no longer reachable. */
export const commitSnapshot = (history: DrawingHistory, next: DrawingSnapshot): DrawingHistory => ({
    past: [...history.past, history.present],
    present: next,
    future: [],
});

export const pushItem = (history: DrawingHistory, item: DrawingItem): DrawingHistory =>
    commitSnapshot(history, { ...history.present, items: [...history.present.items, item] });

export const undo = (history: DrawingHistory): DrawingHistory => {
    if (history.past.length === 0) return history;

    const past = history.past.slice(0, -1);
    const previous = history.past[history.past.length - 1];
    return { past, present: previous, future: [history.present, ...history.future] };
};

export const redo = (history: DrawingHistory): DrawingHistory => {
    if (history.future.length === 0) return history;

    const [next, ...future] = history.future;
    return { past: [...history.past, history.present], present: next, future };
};
