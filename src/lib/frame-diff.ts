export type Rgb = { r: number, g: number, b: number };

export type FrameDiffOptions = {
    // Luminance differences below this (0-255) are treated as unchanged, which hides compression noise.
    threshold: number,
    // How strongly the unchanged picture shows through, from 0 (black) to 1 (full grayscale).
    baseOpacity: number,
    highlight: Rgb,
};

// How much of the highlight colour a changed pixel takes; the rest is the dimmed base, so the
// shapes that changed stay recognisable instead of turning into flat blocks.
const HIGHLIGHT_MIX = 0.6;

const luminance = (px: Uint8ClampedArray, i: number) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];

// Both frames are RGBA pixels of the same size. The base frame is shown dimmed in grayscale so a
// change can be placed in the picture, and the pixels that changed are tinted with the highlight.
export const frameDiff = (base: Uint8ClampedArray, other: Uint8ClampedArray, options: FrameDiffOptions) => {
    const out = new Uint8ClampedArray(base.length);
    const { threshold, baseOpacity, highlight } = options;

    for (let i = 0; i < base.length; i += 4) {
        const lum = luminance(base, i);
        const gray = lum * baseOpacity;

        if (Math.abs(lum - luminance(other, i)) >= threshold) {
            out[i] = gray * (1 - HIGHLIGHT_MIX) + highlight.r * HIGHLIGHT_MIX;
            out[i + 1] = gray * (1 - HIGHLIGHT_MIX) + highlight.g * HIGHLIGHT_MIX;
            out[i + 2] = gray * (1 - HIGHLIGHT_MIX) + highlight.b * HIGHLIGHT_MIX;
        } else {
            out[i] = out[i + 1] = out[i + 2] = gray;
        }
        out[i + 3] = 255;
    }

    return out;
};
