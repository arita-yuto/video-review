import { canvasPointFromClient, pointerSamples, samplePressure } from "@/lib/drawing/pointer";
import type { Stroke } from "@/lib/drawing/types";
import type { PointerTool, ToolContext } from "@/lib/drawing/tools/types";

// Pens report pressure with some jitter; blend each sample with the previous one.
const smoothPressure = (previous: number | undefined, sample: number) =>
    previous === undefined ? sample : (previous + sample) / 2;

/** The pen and the eraser: lays down a stroke while the pointer is held. */
export const createBrushTool = (ctx: ToolContext): PointerTool => {
    let stroke: Stroke | null = null;

    return {
        down: (e, { eraserEnd }) => {
            const settings = ctx.settings();
            const tool = eraserEnd ? "eraser" : settings.brush;
            stroke = {
                tool,
                color: settings.color,
                width: settings.widths[tool],
                opacity: settings.opacities[tool],
                pressure: settings.pressureEnabled && e.pointerType === "pen",
                points: [canvasPointFromClient(ctx.canvas, e.clientX, e.clientY, samplePressure(e))],
            };
            ctx.repaint();
        },
        move: (e) => {
            if (!stroke) return;
            for (const sample of pointerSamples(e)) {
                const previous = stroke.points[stroke.points.length - 1]?.pressure;
                const pressure = smoothPressure(previous, samplePressure(sample));
                stroke.points.push(canvasPointFromClient(ctx.canvas, sample.clientX, sample.clientY, pressure));
            }
            ctx.repaint();
        },
        up: () => {
            if (!stroke) return;
            ctx.commitStroke(stroke);
            if (stroke.tool === "pen") ctx.settings().noteColorUsed(stroke.color);
            stroke = null;
        },
        cancel: () => {
            stroke = null;
            ctx.repaint();
        },
        live: () => stroke,
    };
};
