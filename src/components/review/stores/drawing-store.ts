import { create } from "zustand";
import { api } from "@/lib/api-client";
import { uploadToSession } from "@/lib/upload-transfer";
import { resolveMediaUrl } from "@/lib/media-url";
import { DrawingHistory, commitSnapshot, initialHistory, pushMark, redo, undo } from "@/lib/drawing/history";
import type { Mark } from "@/lib/drawing/types";
import { VideoComment } from "@/lib/db-types";

interface DrawingState {
    canvasRefElement: HTMLCanvasElement | null,
    /** Backing size of the canvas; bumped whenever it is re-fitted so painters can repaint. */
    canvasSize: { width: number; height: number };
    canvasEditing: boolean;
    needSave: boolean;
    /** Snapshots of the current editing session. Reset whenever editing starts or ends. */
    history: DrawingHistory;
    /** Loaded comment drawings by `drawingCacheKey`, ready to drawImage. */
    drawings: Map<string, CanvasImageSource>;
    /** While the eyedropper is pressed: where it is (canvas fractions), what it sees, and the colour before. */
    picking: { x: number; y: number; color: string; previous: string } | null;

    setCanvasRefElement: (canvas: HTMLCanvasElement | null) => void;
    setCanvasSize: (size: { width: number; height: number }) => void;
    setCanvasEditing: (r: boolean) => void;
    canvasSave: (commentId: string) => Promise<VideoComment | null>;
    setNeedSave: (r: boolean) => void;
    commitMark: (mark: Mark) => void;
    undoStroke: () => void;
    redoStroke: () => void;
    /** Wipe the canvas: marks and the saved drawing underneath. Undoable like any other step. */
    clearDrawing: () => void;
    /** Fetch a comment's drawing into `drawings` unless it is there or on its way. */
    loadDrawing: (comment: VideoComment) => Promise<void>;
    setPicking: (picking: DrawingState["picking"]) => void;
}

const loading = new Set<string>();

// The path is fixed per comment, so a redraw is told apart by updatedAt.
export const drawingCacheKey = (comment: Pick<VideoComment, "drawingPath" | "updatedAt">) => `${comment.drawingPath}@${comment.updatedAt}`;

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
    // Saves the canvas as the comment's drawing and returns the comment as the server now has it,
    // or null when nothing was saved.
    canvasSave: async (commentId) => {
        if (!get().needSave) {
            return null;
        }

        const c = get().canvasRefElement;
        if (!c) {
            return null;
        }

        // A wiped canvas means "no drawing": the server drops the file instead of keeping a blank one.
        const { base, marks } = get().history.present;
        if (base === null && marks.length === 0) {
            const res = await api.comments[":id"].drawing.$delete({ param: { id: commentId } });
            return res.status === 200 ? await res.json() : null;
        }

        // Taken before toBlob so the cache holds exactly what gets uploaded.
        const snapshot = copyCanvas(c);
        return new Promise<VideoComment | null>((resolve) => {
            c.toBlob(async (blob) => {
                if (!blob) {
                    return resolve(null);
                }

                // Nothing awaits this callback, so a rejected transfer would never resolve.
                try {
                    const initRes = await api.comments[":id"].drawing.init.$post({ param: { id: commentId } });
                    if (initRes.status !== 200) {
                        return resolve(null);
                    }
                    const init = await initRes.json();
                    await uploadToSession({ url: init.url, session: init.session, file: blob });
                    const finishRes = await api.comments[":id"].drawing.finish.$post({ param: { id: commentId }, query: { session_id: init.session.id } });
                    if (finishRes.status !== 200) {
                        return resolve(null);
                    }

                    // Cached under the new key, so the panel shows what was just saved without a refetch.
                    const saved = await finishRes.json();
                    set((state) => ({ drawings: new Map(state.drawings).set(drawingCacheKey(saved), snapshot) }));
                    resolve(saved);
                } catch {
                    resolve(null);
                }
            }, "image/png");
        });
    },
    setNeedSave: (r) => set({ needSave: r }),
    commitMark: (mark) => set((state) => ({ history: pushMark(state.history, mark), needSave: true })),
    undoStroke: () => set((state) => ({ history: undo(state.history), needSave: true })),
    redoStroke: () => set((state) => ({ history: redo(state.history), needSave: true })),
    clearDrawing: () =>
        set((state) => {
            const { base, marks } = state.history.present;
            // Already empty: nothing to wipe, and no step for Undo to chew through.
            if (base === null && marks.length === 0) return state;
            return { history: commitSnapshot(state.history, { base: null, marks: [] }), needSave: true };
        }),
    setPicking: (picking) => set({ picking }),
    loadDrawing: async (comment) => {
        if (!comment.hasDrawing || !comment.drawingPath) {
            return;
        }

        const key = drawingCacheKey(comment);
        if (get().drawings.has(key) || loading.has(key)) {
            return;
        }

        loading.add(key);
        try {
            const url = await resolveMediaUrl(comment.drawingPath);
            if (!url) {
                return;
            }

            const img = new Image();
            await new Promise<void>((done, fail) => {
                img.onload = () => done();
                img.onerror = () => fail(new Error(`failed to load drawing ${comment.drawingPath}`));
                img.src = url;
            });
            set((state) => ({ drawings: new Map(state.drawings).set(key, img) }));
        } catch (e) {
            console.error(e);
        } finally {
            loading.delete(key);
        }
    },
}));
