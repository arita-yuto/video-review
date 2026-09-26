import { rgbaToHex } from "@uiw/color-convert";
import type { StrokePoint } from "@/lib/drawing/types";

const sourceSize = (source: CanvasImageSource) => {
    if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
    if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
    if ("width" in source && "height" in source) return { width: Number(source.width), height: Number(source.height) };
    return { width: 0, height: 0 };
};

// One pixel is enough: each source is drawn scaled so the sampled point lands on it.
let probe: HTMLCanvasElement | null = null;
const probeContext = () => {
    probe ??= document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    return probe.getContext("2d", { willReadFrequently: true });
};

const drawPoint = (ctx: CanvasRenderingContext2D, source: CanvasImageSource, point: StrokePoint) => {
    const { width, height } = sourceSize(source);
    if (width === 0 || height === 0) return;
    const sx = Math.min(width - 1, Math.max(0, Math.floor(point.x * width)));
    const sy = Math.min(height - 1, Math.max(0, Math.floor(point.y * height)));
    ctx.drawImage(source, sx, sy, 1, 1, 0, 0, 1, 1);
};

/**
 * The colour under a point as the viewer sees it: the video frame with the drawing on
 * top. Transparent over nothing (no frame yet) yields null. A frame from another origin
 * taints the canvas; then only the drawing is sampled.
 */
export const sampleColor = (
    video: HTMLVideoElement | null,
    drawing: CanvasImageSource | null,
    point: StrokePoint,
): string | null => {
    const ctx = probeContext();
    if (!ctx) return null;

    const read = () => {
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return a === 0 ? null : rgbaToHex({ r, g, b, a: 1 });
    };

    ctx.clearRect(0, 0, 1, 1);
    try {
        if (video) drawPoint(ctx, video, point);
        if (drawing) drawPoint(ctx, drawing, point);
        return read();
    } catch {
        ctx.clearRect(0, 0, 1, 1);
        if (drawing) drawPoint(ctx, drawing, point);
        return read();
    }
};
