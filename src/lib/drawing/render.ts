import { isShape, type DrawingItem, type Shape, type Stroke, type StrokePoint } from "@/lib/drawing/types";

/** Width share at zero pressure; tuned by hand on a pen display. */
export const PRESSURE_MIN_RATIO = 0.15;

/** Line width in canvas pixels at a point of the stroke. */
export const widthAt = (stroke: Stroke, pressure: number, scale: number) => {
    const ratio = stroke.pressure ? PRESSURE_MIN_RATIO + (1 - PRESSURE_MIN_RATIO) * pressure : 1;
    return stroke.width * ratio * scale;
};

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

/**
 * A pressure stroke changes width along its length, and a canvas path has one width,
 * so it is stroked piece by piece: the midpoint curves of tracePath, each with the
 * width of the sample it bends around. Round caps hide the joins.
 */
const tracePressureSegments = (ctx: CanvasRenderingContext2D, stroke: Stroke, scale: number) => {
    const { points } = stroke;
    const px = (p: StrokePoint) => [p.x * ctx.canvas.width, p.y * ctx.canvas.height] as const;
    const mid = (a: StrokePoint, b: StrokePoint) => [(a.x + b.x) / 2 * ctx.canvas.width, (a.y + b.y) / 2 * ctx.canvas.height] as const;
    const piece = (pressure: number, draw: () => void) => {
        ctx.lineWidth = widthAt(stroke, pressure, scale);
        ctx.beginPath();
        draw();
        ctx.stroke();
    };

    if (points.length < 3) {
        const first = points[0], last = points[points.length - 1];
        piece((first.pressure + last.pressure) / 2, () => { ctx.moveTo(...px(first)); ctx.lineTo(...px(last)); });
        return;
    }

    piece(points[0].pressure, () => { ctx.moveTo(...px(points[0])); ctx.lineTo(...mid(points[0], points[1])); });
    for (let i = 1; i < points.length - 1; i++) {
        piece(points[i].pressure, () => {
            ctx.moveTo(...mid(points[i - 1], points[i]));
            ctx.quadraticCurveTo(...px(points[i]), ...mid(points[i], points[i + 1]));
        });
    }
    const last = points[points.length - 1];
    piece(last.pressure, () => { ctx.moveTo(...mid(points[points.length - 2], last)); ctx.lineTo(...px(last)); });
};

/** Stroke the path itself, opaque and with the current composite mode. */
const paintStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke, scale: number) => {
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.pressure) {
        tracePressureSegments(ctx, stroke, scale);
    } else {
        ctx.lineWidth = stroke.width * scale;
        tracePath(ctx, stroke.points, ctx.canvas.width, ctx.canvas.height);
        ctx.stroke();
    }
};

/** Outline the shape, opaque. */
const paintShape = (ctx: CanvasRenderingContext2D, shape: Shape, scale: number) => {
    const { width: cw, height: ch } = ctx.canvas;
    const x0 = shape.from.x * cw, y0 = shape.from.y * ch;
    const x1 = shape.to.x * cw, y1 = shape.to.y * ch;
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.width * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    switch (shape.kind) {
        case "line":
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            break;
        case "arrow": {
            // The head is two strokes back from the tip, sized with the line so it stays legible.
            const angle = Math.atan2(y1 - y0, x1 - x0);
            const head = Math.max(4 * ctx.lineWidth, 12 * scale);
            const spread = Math.PI / 6;
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.moveTo(x1 - head * Math.cos(angle - spread), y1 - head * Math.sin(angle - spread));
            ctx.lineTo(x1, y1);
            ctx.lineTo(x1 - head * Math.cos(angle + spread), y1 - head * Math.sin(angle + spread));
            break;
        }
        case "rect":
            ctx.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
            break;
        case "ellipse":
            ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2);
            break;
    }
    ctx.stroke();
};

const paintItem = (ctx: CanvasRenderingContext2D, item: DrawingItem, scale: number) =>
    isShape(item) ? paintShape(ctx, item, scale) : paintStroke(ctx, item, scale);

// A translucent stroke is painted opaque here first and then composited once, so the
// pieces of a pressure stroke (and a path crossing itself) do not stack up darker.
let scratch: HTMLCanvasElement | null = null;
const scratchFor = (width: number, height: number) => {
    scratch ??= document.createElement("canvas");
    if (scratch.width !== width || scratch.height !== height) {
        scratch.width = width;
        scratch.height = height;
    }
    return scratch;
};

/** `scale` converts the item's CSS-pixel width to canvas pixels (canvas.width / rect.width). */
export const drawItem = (ctx: CanvasRenderingContext2D, item: DrawingItem, scale: number) => {
    if (!isShape(item) && item.points.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = !isShape(item) && item.tool === "eraser" ? "destination-out" : "source-over";

    if (item.opacity >= 1) {
        paintItem(ctx, item, scale);
    } else {
        const layer = scratchFor(ctx.canvas.width, ctx.canvas.height);
        const lctx = layer.getContext("2d")!;
        lctx.clearRect(0, 0, layer.width, layer.height);
        paintItem(lctx, item, scale);
        ctx.globalAlpha = item.opacity;
        ctx.drawImage(layer, 0, 0);
    }
    ctx.restore();
};

/** Repaint the canvas from scratch: the base image (the comment's saved drawing), then every item. */
export const renderLayers = (
    ctx: CanvasRenderingContext2D,
    base: CanvasImageSource | null,
    items: DrawingItem[],
    scale: number,
) => {
    const { width, height } = ctx.canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    if (base) ctx.drawImage(base, 0, 0, width, height);
    ctx.restore();

    for (const item of items) drawItem(ctx, item, scale);
};
