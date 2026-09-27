import { canvasPointFromClient, pointerSamples, samplePressure } from "@/lib/drawing/pointer";
import { brushCursor, EraserIcon, PenIcon } from "@/lib/drawing/icon";
import type { BrushKind, Stroke } from "@/lib/drawing/types";
import { Tool, type ToolParams } from "@/lib/drawing/tools/tool";

// Pens report pressure with some jitter; blend each sample with the previous one.
const smoothPressure = (previous: number | undefined, sample: number) =>
    previous === undefined ? sample : (previous + sample) / 2;

/** Lays down a stroke while the pointer is held. */
export abstract class BrushTool extends Tool {
    static cursor(params: ToolParams) {
        return brushCursor(params.width);
    }

    private stroke: Stroke | null = null;

    down(e: PointerEvent) {
        const settings = this.ctx.settings();
        const kind = this.id as BrushKind;
        this.stroke = {
            kind,
            color: settings.color,
            ...settings.params[kind],
            pressure: settings.pressureEnabled && e.pointerType === "pen",
            points: [canvasPointFromClient(this.ctx.canvas, e.clientX, e.clientY, samplePressure(e))],
        };
        this.ctx.repaint();
    }

    move(e: PointerEvent) {
        const stroke = this.stroke;
        if (!stroke) return;
        for (const sample of pointerSamples(e)) {
            const previous = stroke.points[stroke.points.length - 1]?.pressure;
            const pressure = smoothPressure(previous, samplePressure(sample));
            stroke.points.push(canvasPointFromClient(this.ctx.canvas, sample.clientX, sample.clientY, pressure));
        }
        this.ctx.repaint();
    }

    up() {
        if (!this.stroke) return;
        this.ctx.commitMark(this.stroke);
        if (this.stroke.kind === "pen") this.ctx.settings().noteColorUsed(this.stroke.color);
        this.stroke = null;
    }

    cancel() {
        this.stroke = null;
        this.ctx.repaint();
    }

    live() {
        return this.stroke;
    }
}

export class PenTool extends BrushTool {
    static readonly id = "pen";
    static readonly icon = PenIcon;
    static readonly shortcut = "B";
    static readonly defaults: ToolParams = { width: 10, opacity: 1 };
}

export class EraserTool extends BrushTool {
    static readonly id = "eraser";
    static readonly icon = EraserIcon;
    static readonly shortcut = "E";
    static readonly defaults: ToolParams = { width: 20, opacity: 1 };
}
