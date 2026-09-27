import { canvasPointFromClient } from "@/lib/drawing/pointer";
import { ArrowIcon, EllipseIcon, LineIcon, RectIcon } from "@/lib/drawing/icon";
import type { Shape, ShapeKind } from "@/lib/drawing/types";
import { Tool, type ToolParams } from "@/lib/drawing/tools/tool";

/** Snap the far corner so the shape is square (or the line runs at a multiple of 45°). */
const constrain = (shape: Shape, canvas: HTMLCanvasElement): Shape => {
    // Work in CSS pixels: the canvas is not square, so equal fractions are not equal lengths.
    const rect = canvas.getBoundingClientRect();
    const dx = (shape.to.x - shape.from.x) * rect.width;
    const dy = (shape.to.y - shape.from.y) * rect.height;
    let cx = dx, cy = dy;

    if (shape.kind === "line" || shape.kind === "arrow") {
        const length = Math.hypot(dx, dy);
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        cx = length * Math.cos(angle);
        cy = length * Math.sin(angle);
    } else {
        // A drag straight along an axis still gets a full side, in the positive direction.
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        cx = (Math.sign(dx) || 1) * side;
        cy = (Math.sign(dy) || 1) * side;
    }
    return { ...shape, to: { x: shape.from.x + cx / rect.width, y: shape.from.y + cy / rect.height } };
};

const moved = (shape: Shape) => shape.from.x !== shape.to.x || shape.from.y !== shape.to.y;

/** Drags a shape out from where the pointer went down; Shift keeps it regular. */
export abstract class ShapeTool extends Tool {
    static readonly group = "shape";
    static readonly defaults: ToolParams = { width: 6, opacity: 1 };

    private shape: Shape | null = null;

    down(e: PointerEvent) {
        const settings = this.ctx.settings();
        const kind = this.id as ShapeKind;
        const point = canvasPointFromClient(this.ctx.canvas, e.clientX, e.clientY, 1);
        this.shape = {
            kind,
            color: settings.color,
            ...settings.params[kind],
            from: { x: point.x, y: point.y },
            to: { x: point.x, y: point.y },
        };
        this.ctx.repaint();
    }

    move(e: PointerEvent) {
        if (!this.shape) return;
        const point = canvasPointFromClient(this.ctx.canvas, e.clientX, e.clientY, 1);
        this.shape = { ...this.shape, to: { x: point.x, y: point.y } };
        if (e.shiftKey) this.shape = constrain(this.shape, this.ctx.canvas);
        this.ctx.repaint();
    }

    up() {
        if (!this.shape) return;
        // A click without a drag leaves nothing behind.
        if (moved(this.shape)) {
            this.ctx.commitMark(this.shape);
            this.ctx.settings().noteColorUsed(this.shape.color);
        }
        this.shape = null;
    }

    cancel() {
        this.shape = null;
        this.ctx.repaint();
    }

    live() {
        return this.shape && moved(this.shape) ? this.shape : null;
    }
}

export class LineTool extends ShapeTool {
    static readonly id = "line";
    static readonly icon = LineIcon;
    static readonly shortcut = "L";
}

export class ArrowTool extends ShapeTool {
    static readonly id = "arrow";
    static readonly icon = ArrowIcon;
    static readonly shortcut = "A";
}

export class RectTool extends ShapeTool {
    static readonly id = "rect";
    static readonly icon = RectIcon;
    static readonly shortcut = "R";
}

export class EllipseTool extends ShapeTool {
    static readonly id = "ellipse";
    static readonly icon = EllipseIcon;
    static readonly shortcut = "O";
}
