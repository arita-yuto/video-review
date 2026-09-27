export type BrushKind = "pen" | "eraser";
export type ShapeKind = "line" | "arrow" | "rect" | "ellipse";
/** Every tool's id; the panel, the shortcuts and the saved settings speak in these. */
export type ToolId = BrushKind | ShapeKind | "eyedropper";

/** Position as fractions (0..1) of the canvas, so strokes are independent of its pixel size. */
export interface StrokePoint {
    x: number;
    y: number;
    /** 0..1. Pens report real pressure; pointers without it are recorded as 1 (full width). */
    pressure: number;
}

/** One committed stroke. Width is in CSS pixels and scaled to canvas pixels at draw time. */
export interface Stroke {
    kind: BrushKind;
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

/** What a tool leaves on the canvas; the history is a list of these. */
export type Mark = Stroke | Shape;

export const isShape = (mark: Mark): mark is Shape => "from" in mark;
