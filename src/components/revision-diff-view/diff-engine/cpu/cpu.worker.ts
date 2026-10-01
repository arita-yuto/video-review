import { frameDiff } from "./frame-diff";
import { DiffFrame } from "../types";
import { serveDiffs } from "../worker-host";

const readPixels = (frame: DiffFrame, width: number, height: number) => {
    const ctx = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d context");

    ctx.drawImage(frame, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
};

serveDiffs(({ width, height, primary, compare, options }) => {
    const pixels = frameDiff(readPixels(primary, width, height), readPixels(compare, width, height), options);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d")?.putImageData(new ImageData(pixels, width, height), 0, 0);
    return canvas.transferToImageBitmap();
});
