import type { DrawingItem } from "@/lib/drawing/types";

/** Undo/redo stack for one editing session. Immutable so it can live in a store. */
export interface DrawingHistory {
    items: DrawingItem[];
    undone: DrawingItem[];
}

export const emptyHistory: DrawingHistory = { items: [], undone: [] };

export const pushItem = (history: DrawingHistory, item: DrawingItem): DrawingHistory => ({
    items: [...history.items, item],
    undone: [],
});

export const undo = (history: DrawingHistory): DrawingHistory => {
    if (history.items.length === 0) return history;

    const items = history.items.slice(0, -1);
    const last = history.items[history.items.length - 1];
    return { items, undone: [...history.undone, last] };
};

export const redo = (history: DrawingHistory): DrawingHistory => {
    if (history.undone.length === 0) return history;

    const undone = history.undone.slice(0, -1);
    const next = history.undone[history.undone.length - 1];
    return { items: [...history.items, next], undone };
};
