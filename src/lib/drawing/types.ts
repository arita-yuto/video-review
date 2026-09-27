/** Tools that lay down strokes. */
export type BrushTool = "pen" | "eraser";
export type ShapeKind = "line" | "arrow" | "rect" | "ellipse";
/** Everything the tool panel can select; the eyedropper only picks a colour. */
export type DrawingTool = BrushTool | ShapeKind | "eyedropper";

/** Position as fractions (0..1) of the canvas, so strokes are independent of its pixel size. */
export interface StrokePoint {
    x: number;
    y: number;
    /** 0..1. Pens report real pressure; pointers without it are recorded as 1 (full width). */
    pressure: number;
}

/** One committed stroke. Width is in CSS pixels and scaled to canvas pixels at draw time. */
export interface Stroke {
    tool: BrushTool;
    color: string;
    width: number;
    /** 0..1, applied to the stroke as a whole. */
    opacity: number;
    /** Whether the width follows the recorded pressure along the stroke. */
    pressure: boolean;
    points: StrokePoint[];
}

/** A shape dragged out between two corners, in canvas fractions like stroke points. */
export interface Shape {
    kind: ShapeKind;
    color: string;
    width: number;
    opacity: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
}

/** One entry of the drawing history. */
export type DrawingItem = Stroke | Shape;

export const isShape = (item: DrawingItem): item is Shape => "kind" in item;

/** How the colour palette shows the inside of the hue ring: an HSV square or an HLS triangle. */
export type ColorMode = "hsv" | "hls";
