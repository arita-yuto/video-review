import { create } from "zustand";
import { api } from "@/lib/api-client";
import { uploadToSession } from "@/lib/upload-transfer";
import { resolveMediaUrl } from "@/lib/media-url";
import { DrawingHistory, commitSnapshot, initialHistory, pushItem, redo, undo } from "@/lib/drawing/history";
import type { DrawingItem } from "@/lib/drawing/types";

interface DrawingState {
    canvasRefElement: HTMLCanvasElement | null,
    /** Backing size of the canvas; bumped whenever it is re-fitted so painters can repaint. */
    canvasSize: { width: number; height: number };
    canvasEditing: boolean;
    needSave: boolean;
    /** Snapshots of the current editing session. Reset whenever editing starts or ends. */
    history: DrawingHistory;
    /** Loaded comment drawings by storage path, ready to drawImage. */
    drawings: Map<string, CanvasImageSource>;
    /** While the eyedropper is pressed: where it is (canvas fractions), what it sees, and the colour before. */
    picking: { x: number; y: number; color: string; previous: string } | null;

    setCanvasRefElement: (canvas: HTMLCanvasElement | null) => void;
    setCanvasSize: (size: { width: number; height: number }) => void;
    setCanvasEditing: (r: boolean) => void;
    canvasSave: (drawingPath: string | null) => Promise<string | null>;
    setNeedSave: (r: boolean) => void;
    commitItem: (item: DrawingItem) => void;
    undoStroke: () => void;
    redoStroke: () => void;
    /** Wipe the canvas: items and the saved drawing underneath. Undoable like any other step. */
    clearDrawing: () => void;
    /** Fetch a comment's drawing into `drawings` unless it is there or on its way. */
    loadDrawing: (path: string) => Promise<void>;
    setPicking: (picking: DrawingState["picking"]) => void;
}

const loading = new Set<string>();

const copyCanvas = (source: HTMLCanvasElement) => {
    const copy = document.createElement("canvas");
    copy.width = source.width;
    copy.height = source.height;
    copy.getContext("2d")?.drawImage(source, 0, 0);
    return copy;
};

export const useDrawingStore = create<DrawingState>((set, get) => ({
    canvasRefElement: null,
    canvasSize: { width: 0, height: 0 },
    canvasEditing: false,
    needSave: false,
    history: initialHistory,
    drawings: new Map(),
    picking: null,

    // A session starts clean: nothing to save until a stroke lands.
    setCanvasEditing: (r) => set({ canvasEditing: r, history: initialHistory, needSave: false }),
    setCanvasRefElement: (canvas) => set({ canvasRefElement: canvas }),
    setCanvasSize: (size) => set({ canvasSize: size }),
    // Resolves to the path the comment should keep: the upload's when something was
    // drawn, otherwise the one it already had. A text-only edit or a failed upload
    // must not drop it, since the server keeps the old drawing either way.
    canvasSave: async (path) => {
        if (!get().needSave) return path;
        
        const c = get().canvasRefElement;
        if (!c) return path;

        // Taken before toBlob so the cache holds exactly what gets uploaded.
        const snapshot = copyCanvas(c);
        return new Promise<string | null>((resolve) => {
            c.toBlob(async (blob) => {
                if (!blob) return resolve(path);

                // Nothing awaits this callback, so a rejected transfer would never resolve.
                try {
                    const initRes = await api.drawing.upload.init.$post({ form: { path: path ?? "" } });
                    if (initRes.status !== 200) return resolve(path);
                    const init = await initRes.json();
                    await uploadToSession({ url: init.url, session: init.session, file: blob });
                    const finishRes = await api.drawing.upload.finish.$post({ query: { session_id: init.session.id } });
                    if (finishRes.status !== 200) return resolve(path);

                    // The upload overwrites the same storage key, so neither this cache nor the
                    // browser's would notice a refetch: what was just saved is what to show.
                    const { filePath } = await finishRes.json();
                    set((state) => ({ drawings: new Map(state.drawings).set(filePath, snapshot) }));
                    resolve(filePath);
                } catch {
                    resolve(path);
                }
            }, "image/png");
        });
    },
    setNeedSave: (r) => set({ needSave: r }),
    commitItem: (item) => set((state) => ({ history: pushItem(state.history, item), needSave: true })),
    undoStroke: () => set((state) => ({ history: undo(state.history), needSave: true })),
    redoStroke: () => set((state) => ({ history: redo(state.history), needSave: true })),
    clearDrawing: () =>
        set((state) => {
            const { base, items } = state.history.present;
            // Already empty: nothing to wipe, and no step for Undo to chew through.
            if (base === null && items.length === 0) return state;
            return { history: commitSnapshot(state.history, { base: null, items: [] }), needSave: true };
        }),
    setPicking: (picking) => set({ picking }),
    loadDrawing: async (path) => {
        if (get().drawings.has(path) || loading.has(path)) return;

        loading.add(path);
        try {
            const url = await resolveMediaUrl(path);
            if (!url) return;

            const img = new Image();
            await new Promise<void>((done, fail) => {
                img.onload = () => done();
                img.onerror = () => fail(new Error(`failed to load drawing ${path}`));
                img.src = url;
            });
            set((state) => ({ drawings: new Map(state.drawings).set(path, img) }));
        } catch (e) {
            console.error(e);
        } finally {
            loading.delete(path);
        }
    },
}));
