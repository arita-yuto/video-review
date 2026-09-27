import type { DrawingItem } from "@/lib/drawing/types";
import type { useDrawingSettingsStore } from "@/stores/drawing-settings-store";

export type DrawingSettings = ReturnType<typeof useDrawingSettingsStore.getState>;

/** What a tool may reach: the canvas, the current settings, and the ways to affect the session. */
export interface ToolContext {
    canvas: HTMLCanvasElement;
    settings: () => DrawingSettings;
    /** The base plus the committed strokes, as currently painted. */
    committedLayer: () => HTMLCanvasElement | null;
    video: () => HTMLVideoElement | null;
    /** Ask for the live layer to be painted on the next frame. */
    repaint: () => void;
    commitItem: (item: DrawingItem) => void;
    setPicking: (picking: { x: number; y: number; color: string; previous: string } | null) => void;
}

/**
 * One pointer's interaction with the canvas, from press to release. The hook decides
 * which tool a pointer goes to and hands it every event of that pointer.
 */
export interface PointerTool {
    down: (e: PointerEvent, options: { eraserEnd: boolean }) => void;
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
    /** Drop the interaction without a result (the session ending). */
    cancel: () => void;
    /** What to paint over the committed layer this frame. */
    live: () => DrawingItem | null;
}
