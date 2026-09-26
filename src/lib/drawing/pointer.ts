import type { StrokePoint } from "@/lib/drawing/types";

/**
 * Map a client-space position onto the canvas as fractions of its on-screen box.
 * Strokes are stored this way so they survive the canvas being re-fitted when the
 * window is resized or moved to a display with another pixel ratio.
 */
export const canvasPointFromClient = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
    pressure: number,
): StrokePoint => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
        pressure,
    };
};

/** Canvas pixels per CSS pixel, used to keep line widths in CSS pixels on any display. */
export const canvasScale = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 ? canvas.width / rect.width : 1;
};

/** Every sample the browser coalesced into this event, oldest first, falling back to the event itself. */
export const pointerSamples = (e: PointerEvent): PointerEvent[] => {
    const coalesced = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    return coalesced.length > 0 ? coalesced : [e];
};

/** Pressure to record for a sample: pens give real values, everything else draws at full width. */
export const samplePressure = (e: PointerEvent) => (e.pointerType === "pen" ? e.pressure : 1);

/** The pen's eraser end (or eraser button) is down. */
export const isEraserButton = (e: PointerEvent) => e.button === 5 || (e.buttons & 32) !== 0;
