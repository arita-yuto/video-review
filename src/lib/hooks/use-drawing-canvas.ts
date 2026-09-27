import { useCallback, useEffect, useRef } from "react";
import { useDrawingStore } from "@/stores/drawing-store";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { renderLayers } from "@/lib/drawing/render";
import { canvasScale, isEraserButton } from "@/lib/drawing/pointer";
import { createBrushTool } from "@/lib/drawing/tools/brush";
import { createEyedropperTool } from "@/lib/drawing/tools/eyedropper";
import { createShapeTool } from "@/lib/drawing/tools/shape";
import type { PointerTool, ToolContext } from "@/lib/drawing/tools/types";
import type { DrawingTool } from "@/lib/drawing/types";

const isTextInput = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || target.matches("input, textarea, select");
};

// A touch that lands while the pen is in use, or right after it lifted, is the hand
// resting on the display.
const PALM_WINDOW_MS = 1000;

/**
 * Manages the review canvas while a comment is being edited: hands each pointer to a
 * tool, keeps palms and the pen's eraser end straight, runs the keyboard shortcuts and
 * repaints. The canvas holds three layers, painted back to front on every frame: the
 * base (the drawing the comment already has), the committed strokes, and what the
 * active tool is doing. The committed layer is cached offscreen.
 */
export const useDrawingCanvas = () => {
    const canvas = useDrawingStore((s) => s.canvasRefElement);
    const canvasEditing = useDrawingStore((s) => s.canvasEditing);
    const canvasSize = useDrawingStore((s) => s.canvasSize);
    const history = useDrawingStore((s) => s.history);
    const baseHidden = useDrawingStore((s) => s.baseHidden);
    const { commitItem, undoStroke, redoStroke, loadDrawing, setPicking } = useDrawingStore();
    const drawingPath = useCommentEditStore((s) => s.editingComment?.drawingPath ?? null);
    // The comment's saved drawing, from the shared cache so a just-saved one is current.
    const base = useDrawingStore((s) => (canvasEditing && drawingPath ? s.drawings.get(drawingPath) ?? null : null));

    const committedRef = useRef<HTMLCanvasElement | null>(null);
    const activeToolRef = useRef<PointerTool | null>(null);
    const frameRef = useRef<number | null>(null);

    const paint = useCallback(() => {
        frameRef.current = null;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const live = activeToolRef.current?.live();
        renderLayers(ctx, committedRef.current, live ? [live] : [], canvasScale(canvas));
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

        const context: ToolContext = {
            canvas,
            settings: () => useDrawingSettingsStore.getState(),
            committedLayer: () => committedRef.current,
            video: () => useVideoReviewStore.getState().videoRefElement,
            repaint: schedulePaint,
            commitItem,
            setPicking,
        };
        const brush = createBrushTool(context);
        const eyedropper = createEyedropperTool(context);
        // The pen and the eraser are both the brush; everything else has its own tool.
        const tools: Partial<Record<DrawingTool, PointerTool>> = {
            eyedropper,
            line: createShapeTool(context, "line"),
            arrow: createShapeTool(context, "arrow"),
            rect: createShapeTool(context, "rect"),
            ellipse: createShapeTool(context, "ellipse"),
        };

        let activePointer: number | null = null;
        let activeType: string | null = null;
        let lastPenAt = -Infinity;
        const isPalm = (e: PointerEvent) => e.pointerType === "touch" && performance.now() - lastPenAt < PALM_WINDOW_MS;
        const notePen = (e: PointerEvent) => { if (e.pointerType === "pen") lastPenAt = performance.now(); };

        const release = () => {
            activePointer = null;
            activeType = null;
            activeToolRef.current = null;
        };

        const onDown = (e: PointerEvent) => {
            notePen(e);
            const eraserEnd = isEraserButton(e);
            if (isPalm(e) || (e.button !== 0 && !eraserEnd)) return;
            if (activePointer !== null) {
                // A hand that landed first yields to the pen.
                if (!(e.pointerType === "pen" && activeType === "touch")) return;
                activeToolRef.current?.cancel();
                release();
            }

            const settings = useDrawingSettingsStore.getState();
            const selected = e.altKey ? eyedropper : tools[settings.tool] ?? brush;
            // The eraser end is a physical gesture; it wins over a selected tool.
            const tool = eraserEnd ? brush : selected;
            activePointer = e.pointerId;
            activeType = e.pointerType;
            activeToolRef.current = tool;
            // Capture can fail for a pointer that is already gone; the tool works without it.
            try { canvas.setPointerCapture(e.pointerId); } catch {}
            tool.down(e, { eraserEnd });
        };

        const onMove = (e: PointerEvent) => {
            notePen(e);
            if (e.pointerId === activePointer) activeToolRef.current?.move(e);
        };

        const onUp = (e: PointerEvent) => {
            notePen(e);
            if (e.pointerId !== activePointer) return;
            activeToolRef.current?.up(e);
            release();
            schedulePaint();
        };

        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        // A pointer the browser takes away still commits what it drew.
        canvas.addEventListener("pointercancel", onUp);

        return () => {
            activeToolRef.current?.cancel();
            release();
            // A frame still pending would paint over what the layer shows once editing ends.
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            canvas.removeEventListener("pointercancel", onUp);
        };
    }, [canvas, canvasEditing, commitItem, setPicking, schedulePaint]);

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
            else if (key === "i") settings.setTool("eyedropper");
            else if (key === "l") settings.setTool("line");
            else if (key === "a") settings.setTool("arrow");
            else if (key === "r") settings.setTool("rect");
            else if (key === "o") settings.setTool("ellipse");
            else if (key === "x") settings.swapColors();
            else if (key === "[") settings.stepWidth(-1);
            else if (key === "]") settings.stepWidth(1);
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [canvasEditing, undoStroke, redoStroke]);
};
