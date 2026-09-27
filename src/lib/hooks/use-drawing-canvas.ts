import { useCallback, useEffect, useRef } from "react";
import { useDrawingStore } from "@/stores/drawing-store";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { renderLayers } from "@/lib/drawing/render";
import { canvasScale, isEraserButton } from "@/lib/drawing/pointer";
import { TOOLS } from "@/lib/drawing/tools";
import type { Tool, ToolContext } from "@/lib/drawing/tools/tool";
import type { ToolId } from "@/lib/drawing/types";

const isTextInput = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || target.matches("input, textarea, select");
};

/**
 * Runs the canvas while a comment is being edited: routes each pointer to the active
 * tool, handles the keyboard shortcuts, and repaints the base, the committed marks and
 * the tool's live mark, in that order. The committed layer is cached offscreen.
 */
export const useDrawingCanvas = () => {
    const canvas = useDrawingStore((s) => s.canvasRefElement);
    const canvasEditing = useDrawingStore((s) => s.canvasEditing);
    const canvasSize = useDrawingStore((s) => s.canvasSize);
    const state = useDrawingStore((s) => s.history.present);
    const { commitMark, undoStroke, redoStroke, loadDrawing, setPicking } = useDrawingStore();
    const drawingPath = useCommentEditStore((s) => s.editingComment?.drawingPath ?? null);
    // The comment's saved drawing, from the shared cache so a just-saved one is current.
    const saved = useDrawingStore((s) => (canvasEditing && drawingPath ? s.drawings.get(drawingPath) ?? null : null));
    const base = state.base === "saved" ? saved : state.base;

    const committedRef = useRef<HTMLCanvasElement | null>(null);
    const activeToolRef = useRef<Tool | null>(null);
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

    // Rebuild the committed layer when the state or the canvas size change, then repaint.
    // The base is drawn stretched to the current size, so a re-fitted canvas keeps its content.
    useEffect(() => {
        if (!canvas || !canvasEditing) return;

        const committed = document.createElement("canvas");
        committed.width = canvas.width;
        committed.height = canvas.height;
        const ctx = committed.getContext("2d");
        if (ctx) renderLayers(ctx, base, state.marks, canvasScale(canvas));

        committedRef.current = committed;
        paint();
    }, [canvas, canvasEditing, state, base, canvasSize, paint]);

    useEffect(() => {
        if (!canvas || !canvasEditing) return;

        const context: ToolContext = {
            canvas,
            settings: () => useDrawingSettingsStore.getState(),
            committedLayer: () => committedRef.current,
            video: () => useVideoReviewStore.getState().videoRefElement,
            repaint: schedulePaint,
            commitMark,
            setPicking,
        };
        const tools = Object.fromEntries(TOOLS.map((T) => [T.id, new T(context)])) as Record<ToolId, Tool>;

        // Which tool a press goes to: the pen's eraser end and Alt override the selected tool.
        const toolFor = (e: PointerEvent) => {
            if (isEraserButton(e)) return tools.eraser;
            if (e.altKey) return tools.eyedropper;
            return tools[useDrawingSettingsStore.getState().tool];
        };

        let activePointer: number | null = null;

        const release = () => {
            activePointer = null;
            activeToolRef.current = null;
        };

        const onDown = (e: PointerEvent) => {
            const eraserEnd = isEraserButton(e);
            // Touch is not a drawing input here; only the main button or the pen's eraser end starts a tool.
            if (e.pointerType === "touch" || activePointer !== null || (e.button !== 0 && !eraserEnd)) return;

            const tool = toolFor(e);
            activePointer = e.pointerId;
            activeToolRef.current = tool;
            // Capture can fail for a pointer that is already gone; the tool works without it.
            try { canvas.setPointerCapture(e.pointerId); } catch {}
            tool.down(e);
        };

        const onMove = (e: PointerEvent) => {
            if (e.pointerId === activePointer) activeToolRef.current?.move(e);
        };

        const onUp = (e: PointerEvent) => {
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
    }, [canvas, canvasEditing, commitMark, setPicking, schedulePaint]);

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

            const picked = TOOLS.find((T) => T.shortcut.toLowerCase() === key);
            if (picked) settings.setTool(picked.id);
            else if (key === "x") settings.swapColors();
            else if (key === "[") settings.stepWidth(-1);
            else if (key === "]") settings.stepWidth(1);
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [canvasEditing, undoStroke, redoStroke]);
};
