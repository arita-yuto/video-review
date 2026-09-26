import { useCallback, useEffect, useRef } from "react";
import { useDrawingStore } from "@/stores/drawing-store";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import { renderLayers } from "@/lib/drawing/render";
import { canvasPointFromClient, canvasScale, pointerSamples, samplePressure } from "@/lib/drawing/pointer";
import type { Stroke } from "@/lib/drawing/types";

const isTextInput = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || target.matches("input, textarea, select");
};

/**
 * Drives the review canvas while a comment is being edited: pointer input, keyboard
 * shortcuts, the undo/redo history and repainting. The canvas holds three layers,
 * painted back to front on every frame: the base (the drawing the comment already
 * has), the committed strokes, and the stroke under the pen. The committed layer is
 * cached offscreen so a frame costs one drawImage plus the live stroke.
 */
export const useDrawingCanvas = () => {
    const canvas = useDrawingStore((s) => s.canvasRefElement);
    const canvasEditing = useDrawingStore((s) => s.canvasEditing);
    const canvasSize = useDrawingStore((s) => s.canvasSize);
    const history = useDrawingStore((s) => s.history);
    const baseHidden = useDrawingStore((s) => s.baseHidden);
    const { commitStroke, undoStroke, redoStroke, loadDrawing } = useDrawingStore();
    const drawingPath = useCommentEditStore((s) => s.editingComment?.drawingPath ?? null);
    // The comment's saved drawing, from the shared cache so a just-saved one is current.
    const base = useDrawingStore((s) => (canvasEditing && drawingPath ? s.drawings.get(drawingPath) ?? null : null));

    const committedRef = useRef<HTMLCanvasElement | null>(null);
    const liveRef = useRef<Stroke | null>(null);
    const frameRef = useRef<number | null>(null);

    const paint = useCallback(() => {
        frameRef.current = null;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const live = liveRef.current ? [liveRef.current] : [];
        renderLayers(ctx, committedRef.current, live, canvasScale(canvas));
    }, [canvas]);

    const schedulePaint = useCallback(() => {
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(paint);
    }, [paint]);

    useEffect(() => () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    }, []);

    useEffect(() => {
        committedRef.current = null;
        liveRef.current = null;
        if (canvasEditing && drawingPath) void loadDrawing(drawingPath);
    }, [canvasEditing, drawingPath]);

    // Rebuild the committed layer when the strokes or the canvas size change, then repaint.
    // The base is drawn stretched to the current size, so a re-fitted canvas keeps its content.
    useEffect(() => {
        if (!canvas || !canvasEditing) return;

        const committed = document.createElement("canvas");
        committed.width = canvas.width;
        committed.height = canvas.height;
        const ctx = committed.getContext("2d");
        if (ctx) renderLayers(ctx, baseHidden ? null : base, history.items, canvasScale(canvas));

        committedRef.current = committed;
        paint();
    }, [canvas, canvasEditing, history, baseHidden, base, canvasSize, paint]);

    useEffect(() => {
        if (!canvas || !canvasEditing) return;

        let activePointer: number | null = null;

        const onDown = (e: PointerEvent) => {
            if (activePointer !== null || e.button !== 0) return;

            const { tool, color, width } = useDrawingSettingsStore.getState();
            activePointer = e.pointerId;
            canvas.setPointerCapture(e.pointerId);
            liveRef.current = {
                tool,
                color,
                width,
                points: [canvasPointFromClient(canvas, e.clientX, e.clientY, samplePressure(e))],
            };
            schedulePaint();
        };

        const onMove = (e: PointerEvent) => {
            const live = liveRef.current;
            if (e.pointerId !== activePointer || !live) return;

            for (const sample of pointerSamples(e)) {
                live.points.push(canvasPointFromClient(canvas, sample.clientX, sample.clientY, samplePressure(sample)));
            }
            schedulePaint();
        };

        const onUp = (e: PointerEvent) => {
            if (e.pointerId !== activePointer) return;

            const stroke = liveRef.current;
            activePointer = null;
            liveRef.current = null;
            if (!stroke) return;

            commitStroke(stroke);
            if (stroke.tool === "pen") useDrawingSettingsStore.getState().noteColorUsed(stroke.color);
        };

        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);

        return () => {
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            canvas.removeEventListener("pointercancel", onUp);
        };
    }, [canvas, canvasEditing, commitStroke, schedulePaint]);

    // Shortcuts while editing, except inside text fields where typing and the browser's
    // own undo must keep working (the comment body is a textarea).
    useEffect(() => {
        if (!canvasEditing) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.altKey || isTextInput(e.target)) return;

            const key = e.key.toLowerCase();
            const settings = useDrawingSettingsStore.getState();

            if (e.ctrlKey || e.metaKey) {
                if (key === "z") {
                    e.preventDefault();
                    if (e.shiftKey) redoStroke(); else undoStroke();
                } else if (key === "y") {
                    e.preventDefault();
                    redoStroke();
                }
                return;
            }

            if (key === "b") settings.setTool("pen");
            else if (key === "e") settings.setTool("eraser");
            else if (key === "x") settings.swapColors();
            else if (key === "[") settings.stepWidth(-1);
            else if (key === "]") settings.stepWidth(1);
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [canvasEditing, undoStroke, redoStroke]);
};
