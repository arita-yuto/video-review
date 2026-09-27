import { canvasPointFromClient } from "@/lib/drawing/pointer";
import type { Shape, ShapeKind } from "@/lib/drawing/types";
import type { PointerTool, ToolContext } from "@/lib/drawing/tools/types";

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
export const createShapeTool = (ctx: ToolContext, kind: ShapeKind): PointerTool => {
    let shape: Shape | null = null;

    return {
        down: (e) => {
            const settings = ctx.settings();
            const point = canvasPointFromClient(ctx.canvas, e.clientX, e.clientY, 1);
            shape = {
                kind,
                color: settings.color,
                width: settings.widths[settings.brush],
                opacity: settings.opacities[settings.brush],
                from: { x: point.x, y: point.y },
                to: { x: point.x, y: point.y },
            };
            ctx.repaint();
        },
        move: (e) => {
            if (!shape) return;
            const point = canvasPointFromClient(ctx.canvas, e.clientX, e.clientY, 1);
            shape = { ...shape, to: { x: point.x, y: point.y } };
            if (e.shiftKey) shape = constrain(shape, ctx.canvas);
            ctx.repaint();
        },
        up: () => {
            if (!shape) return;
            // A click without a drag leaves nothing behind.
            if (moved(shape)) {
                ctx.commitItem(shape);
                ctx.settings().noteColorUsed(shape.color);
            }
            shape = null;
        },
        cancel: () => {
            shape = null;
            ctx.repaint();
        },
        live: () => (shape && moved(shape) ? shape : null),
    };
};
