export type Rgb = { r: number, g: number, b: number };

export type FrameDiffOptions = {
    // Luminance difference (0-255) below which a pixel counts as unchanged.
    threshold: number,
    // 0 (black) to 1 (full grayscale).
    baseOpacity: number,
    highlight: Rgb,
};

// Less than 1 so the changed shapes stay visible under the highlight.
export const HIGHLIGHT_MIX = 0.6;

// Rec. 601; the GPU engine's shader gets the same weights.
export const LUMA = { r: 0.299, g: 0.587, b: 0.114 };

// Half a luminance step (0.001), so a difference exactly at the threshold counts as changed on
// both the CPU (double) and the GPU (float32).
export const THRESHOLD_SLACK = 5e-4;

export type DiffFrame = VideoFrame | ImageBitmap;

export type DiffRequest = {
    width: number,
    height: number,
    // The compare frame may differ in size; it is scaled to width x height so the pixels line up.
    primary: DiffFrame,
    compare: DiffFrame,
    options: FrameDiffOptions,
};

// Works out a diff image from two frames. The engine takes ownership of the frames and closes
// them; the caller owns the returned bitmap. A SecurityError rejection means the browser
// refused to hand out the frames' pixels.
export type DiffEngine = {
    // Shown in the console, e.g. "cpu" or "gpu (<renderer>)".
    name: string,
    diff: (request: DiffRequest) => Promise<ImageBitmap>,
    dispose: () => void,
};

export const isSecurityError = (e: unknown) => e instanceof DOMException && e.name === "SecurityError";
