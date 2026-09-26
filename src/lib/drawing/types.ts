export type DrawingTool = "pen" | "eraser";

/** Position as fractions (0..1) of the canvas, so strokes are independent of its pixel size. */
export interface StrokePoint {
    x: number;
    y: number;
    /** 0..1. Pens report real pressure; other pointers are recorded as 0.5. */
    pressure: number;
}

/** One committed stroke. Width is in CSS pixels and scaled to canvas pixels at draw time. */
export interface Stroke {
    tool: DrawingTool;
    color: string;
    width: number;
    points: StrokePoint[];
}
