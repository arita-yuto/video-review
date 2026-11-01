import { FrameDiffOptions, HIGHLIGHT_MIX, LUMA, THRESHOLD_SLACK } from "../types";

const luminance = (px: Uint8ClampedArray, i: number) => LUMA.r * px[i] + LUMA.g * px[i + 1] + LUMA.b * px[i + 2];

// The largest change in any one channel, so a shift in colour counts even when the brightness doesn't move.
const channelChange = (a: Uint8ClampedArray, b: Uint8ClampedArray, i: number) =>
    Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));

// Same-size RGBA frames; changed pixels are tinted over the base frame in dimmed grayscale.
export const frameDiff = (base: Uint8ClampedArray, other: Uint8ClampedArray, options: FrameDiffOptions) => {
    const out = new Uint8ClampedArray(base.length);
    const { threshold, baseOpacity, highlight } = options;

    for (let i = 0; i < base.length; i += 4) {
        const lum = luminance(base, i);
        const gray = lum * baseOpacity;

        if (channelChange(base, other, i) >= threshold - THRESHOLD_SLACK) {
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
