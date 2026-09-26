import type { Stroke, StrokePoint } from "@/lib/drawing/types";

/**
 * Trace the stroke as quadratic curves through the midpoints between samples,
 * so fast pen movement stays smooth instead of showing the polyline corners.
 */
const tracePath = (ctx: CanvasRenderingContext2D, points: StrokePoint[], width: number, height: number) => {
    const px = (p: StrokePoint) => [p.x * width, p.y * height] as const;

    ctx.beginPath();
    ctx.moveTo(...px(points[0]));

    if (points.length < 3) {
        // A dot or a two-sample flick: draw the straight segment (a dot gets its round cap).
        ctx.lineTo(...px(points[points.length - 1]));
        return;
    }

    for (let i = 1; i < points.length - 1; i++) {
        const [cx, cy] = px(points[i]);
        const [nx, ny] = px(points[i + 1]);
        ctx.quadraticCurveTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
    }

    ctx.lineTo(...px(points[points.length - 1]));
};

/** `scale` converts the stroke's CSS-pixel width to canvas pixels (canvas.width / rect.width). */
export const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke, scale: number) => {
    if (stroke.points.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    tracePath(ctx, stroke.points, ctx.canvas.width, ctx.canvas.height);
    ctx.stroke();
    ctx.restore();
};

/** Repaint the canvas from scratch: the base image (the comment's saved drawing), then every stroke. */
export const renderLayers = (
    ctx: CanvasRenderingContext2D,
    base: CanvasImageSource | null,
    strokes: Stroke[],
    scale: number,
) => {
    const { width, height } = ctx.canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    if (base) ctx.drawImage(base, 0, 0, width, height);
    ctx.restore();

    for (const stroke of strokes) drawStroke(ctx, stroke, scale);
};
