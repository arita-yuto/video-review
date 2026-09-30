import { frameDiff, FrameDiffOptions } from "@/lib/frame-diff";

export type FrameDiffRequest = {
    id: number,
    width: number,
    height: number,
    // The compare frame may differ in size; it is scaled to width x height so the pixels line up.
    primary: VideoFrame | ImageBitmap,
    compare: VideoFrame | ImageBitmap,
    options: FrameDiffOptions,
};

export type FrameDiffResponse =
    | { id: number, image: ImageBitmap }
    | { id: number, unreadable: true };

const readPixels = (frame: VideoFrame | ImageBitmap, width: number, height: number) => {
    const ctx = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d context");

    ctx.drawImage(frame, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
};

// Reading the pixels and diffing them takes long enough on a slow machine to freeze the page,
// so both happen here. The result goes back as a bitmap, which the page only has to draw.
addEventListener("message", (e: MessageEvent<FrameDiffRequest>) => {
    const { id, width, height, primary, compare, options } = e.data;

    let response: FrameDiffResponse;
    try {
        const pixels = frameDiff(readPixels(primary, width, height), readPixels(compare, width, height), options);
        const canvas = new OffscreenCanvas(width, height);
        canvas.getContext("2d")?.putImageData(new ImageData(pixels, width, height), 0, 0);
        response = { id, image: canvas.transferToImageBitmap() };
    } catch (err) {
        // Media from another origin taints the frames, and the browser refuses to hand out their pixels.
        if (!(err instanceof DOMException && err.name === "SecurityError")) throw err;
        response = { id, unreadable: true };
    } finally {
        // Frames pin decoder memory until closed, whichever way the work above ended.
        primary.close();
        compare.close();
    }

    postMessage(response, { transfer: "image" in response ? [response.image] : [] });
});
