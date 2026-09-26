import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DrawingTool } from "@/lib/drawing/types";

/** How the colour circle shows the inside of the hue ring: a saturation/value square or an HLS triangle. */
export type ColorMode = "hsv" | "hls";

/** Widths the [ and ] keys step through, in CSS pixels. */
export const WIDTH_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40];
export const MIN_WIDTH = WIDTH_STEPS[0];
export const MAX_WIDTH = WIDTH_STEPS[WIDTH_STEPS.length - 1];

const HISTORY_SIZE = 32;

interface DrawingSettingsStore {
    tool: DrawingTool;
    /** The color strokes are drawn with. */
    color: string;
    /** A second slot to switch back and forth with, like a paint app's sub color. */
    subColor: string;
    /** Line width per tool: people tend to keep a thin pen and a wide eraser. */
    widths: Record<DrawingTool, number>;
    /** Pen pressure shapes the width. Pointers without pressure are unaffected. */
    pressureEnabled: boolean;
    /** Colors strokes have used, newest first. */
    colorHistory: string[];
    colorMode: ColorMode;

    setTool: (tool: DrawingTool) => void;
    setColor: (color: string) => void;
    swapColors: () => void;
    setColorMode: (mode: ColorMode) => void;
    setPressureEnabled: (enabled: boolean) => void;
    /** Set the current tool's width. */
    setWidth: (width: number) => void;
    /** Move the current tool's width to the next (+1) or previous (-1) step. */
    stepWidth: (direction: 1 | -1) => void;
    /** Remember a color once a stroke has actually used it. */
    noteColorUsed: (color: string) => void;
}

const clampWidth = (width: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));

// Brush settings outlive the editing session and the page: the same pen setup should
// be there on the next comment and after a reload.
export const useDrawingSettingsStore = create<DrawingSettingsStore>()(
    persist(
        (set) => ({
            tool: "pen",
            color: "#ff8800",
            subColor: "#ffffff",
            widths: { pen: 10, eraser: 20 },
            pressureEnabled: true,
            colorHistory: [],
            colorMode: "hsv",

            setTool: (tool) => set({ tool }),
            setColor: (color) => set({ color }),
            swapColors: () => set((state) => ({ color: state.subColor, subColor: state.color })),
            setColorMode: (colorMode) => set({ colorMode }),
            setPressureEnabled: (pressureEnabled) => set({ pressureEnabled }),
            setWidth: (width) => set((state) => ({ widths: { ...state.widths, [state.tool]: clampWidth(width) } })),
            stepWidth: (direction) =>
                set((state) => {
                    const current = state.widths[state.tool];
                    const next = direction > 0
                        ? WIDTH_STEPS.find((w) => w > current)
                        : [...WIDTH_STEPS].reverse().find((w) => w < current);
                    return next === undefined ? state : { widths: { ...state.widths, [state.tool]: next } };
                }),
            noteColorUsed: (color) =>
                set((state) => {
                    const rest = state.colorHistory.filter((c) => c !== color);
                    return { colorHistory: [color, ...rest].slice(0, HISTORY_SIZE) };
                }),
        }),
        { name: "drawing-settings" },
    ),
);
