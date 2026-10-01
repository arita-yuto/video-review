import { FrameDiffOptions } from "@/lib/frame-diff";

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
