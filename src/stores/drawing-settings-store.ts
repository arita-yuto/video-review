import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToolId } from "@/lib/drawing/types";
import { defaultParams } from "@/lib/drawing/tools";
import type { ToolParams } from "@/lib/drawing/tools/tool";

/** Widths the [ and ] keys step through, in CSS pixels. */
export const WIDTH_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40];
export const MIN_WIDTH = WIDTH_STEPS[0];
export const MAX_WIDTH = WIDTH_STEPS[WIDTH_STEPS.length - 1];

const HISTORY_SIZE = 32;

interface DrawingSettingsStore {
    tool: ToolId;
    /** The tool in use before the eyedropper, which hands back to it after a pick. */
    lastTool: ToolId;
    /** The color strokes are drawn with. */
    color: string;
    /** A second slot to switch back and forth with, like a paint app's sub color. */
    subColor: string;
    /** Each tool's size and opacity, starting from its class. */
    params: Record<ToolId, ToolParams>;
    /** Pen pressure shapes the width. Pointers without pressure are unaffected. */
    pressureEnabled: boolean;
    /** Colors strokes have used, newest first. */
    colorHistory: string[];
    /** Screenshots carry the drawing shown over the video (see captureView). */
    captureDrawing: boolean;

    setTool: (tool: ToolId) => void;
    setColor: (color: string) => void;
    swapColors: () => void;
    setPressureEnabled: (enabled: boolean) => void;
    setCaptureDrawing: (enabled: boolean) => void;
    /** Set the current tool's width. */
    setWidth: (width: number) => void;
    /** Move the current tool's width to the next (+1) or previous (-1) step. */
    stepWidth: (direction: 1 | -1) => void;
    /** Set the current tool's opacity. */
    setOpacity: (opacity: number) => void;
    /** Remember a color once a stroke has actually used it. */
    noteColorUsed: (color: string) => void;
}

const clampWidth = (width: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));

const updateParams = ({ tool, params }: DrawingSettingsStore, change: Partial<ToolParams>) => ({
    params: { ...params, [tool]: { ...params[tool], ...change } },
});

// Brush settings outlive the editing session and the page: the same pen setup should
// be there on the next comment and after a reload.
export const useDrawingSettingsStore = create<DrawingSettingsStore>()(
    persist(
        (set) => ({
            tool: "pen",
            lastTool: "pen",
            color: "#ff8800",
            subColor: "#ffffff",
            params: defaultParams(),
            pressureEnabled: true,
            colorHistory: [],
            captureDrawing: false,

            setTool: (tool) => set(tool === "eyedropper" ? { tool } : { tool, lastTool: tool }),
            setColor: (color) => set({ color }),
            swapColors: () => set((state) => ({ color: state.subColor, subColor: state.color })),
            setPressureEnabled: (pressureEnabled) => set({ pressureEnabled }),
            setCaptureDrawing: (captureDrawing) => set({ captureDrawing }),
            setWidth: (width) => set((state) => updateParams(state, { width: clampWidth(width) })),
            stepWidth: (direction) =>
                set((state) => {
                    const current = state.params[state.tool].width;
                    const next = direction > 0
                        ? WIDTH_STEPS.find((w) => w > current)
                        : [...WIDTH_STEPS].reverse().find((w) => w < current);
                    return next === undefined ? state : updateParams(state, { width: next });
                }),
            setOpacity: (opacity) => set((state) => updateParams(state, { opacity: Math.min(1, Math.max(0, opacity)) })),
            noteColorUsed: (color) =>
                set((state) => {
                    const rest = state.colorHistory.filter((c) => c !== color);
                    return { colorHistory: [color, ...rest].slice(0, HISTORY_SIZE) };
                }),
        }),
        {
            name: "drawing-settings",
            // Only what the store still has is taken from the saved copy, and a tool that did
            // not exist when it was saved starts from its class.
            merge: (persisted, current) => {
                const saved = (persisted ?? {}) as Partial<DrawingSettingsStore>;
                const merged = { ...current };
                for (const key of Object.keys(current) as (keyof DrawingSettingsStore)[]) {
                    if (key in saved && key !== "params") Object.assign(merged, { [key]: saved[key] });
                }
                for (const tool of Object.keys(current.params) as ToolId[]) {
                    merged.params = { ...merged.params, [tool]: { ...current.params[tool], ...saved.params?.[tool] } };
                }
                return merged;
            },
        },
    ),
);
