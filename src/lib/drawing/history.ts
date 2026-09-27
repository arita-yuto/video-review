import type { Mark } from "@/lib/drawing/types";

/**
 * What the canvas shows underneath the marks: the comment's saved drawing ("saved",
 * resolved from the cache when painting), nothing, or a bitmap produced in the session.
 */
export type BaseLayer = "saved" | CanvasImageSource | null;

export interface DrawingSnapshot {
    base: BaseLayer;
    marks: Mark[];
}

/** Undo/redo over whole snapshots, so any operation is one step back or forward. Immutable. */
export interface DrawingHistory {
    past: DrawingSnapshot[];
    present: DrawingSnapshot;
    future: DrawingSnapshot[];
}

export const initialHistory: DrawingHistory = { past: [], present: { base: "saved", marks: [] }, future: [] };

/** Make `next` the current snapshot; whatever was undone is no longer reachable. */
export const commitSnapshot = (history: DrawingHistory, next: DrawingSnapshot): DrawingHistory => ({
    past: [...history.past, history.present],
    present: next,
    future: [],
});

export const pushMark = (history: DrawingHistory, mark: Mark): DrawingHistory =>
    commitSnapshot(history, { ...history.present, marks: [...history.present.marks, mark] });

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
