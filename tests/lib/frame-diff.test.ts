import { describe, expect, it } from "vitest";
import { frameDiff } from "@/components/review/diff/diff-engine/cpu/frame-diff";

const highlight = { r: 255, g: 0, b: 0 };
const options = { threshold: 24, baseOpacity: 0.5, highlight };

// One RGBA pixel per gray level.
const frame = (...grays: number[]) => new Uint8ClampedArray(grays.flatMap((g) => [g, g, g, 255]));
const pixel = (px: Uint8ClampedArray, n: number) => Array.from(px.slice(n * 4, n * 4 + 4));

describe("frameDiff", () => {
    it("highlights nothing when the frames are the same", () => {
        const out = frameDiff(frame(0, 128, 255), frame(0, 128, 255), options);

        expect(pixel(out, 0)).toEqual([0, 0, 0, 255]);
        expect(pixel(out, 1)).toEqual([64, 64, 64, 255]);
        expect(pixel(out, 2)).toEqual([128, 128, 128, 255]);
    });

    it("tints only the pixels that changed past the threshold", () => {
        const out = frameDiff(frame(100, 100), frame(110, 200), options);

        expect(pixel(out, 0)).toEqual([50, 50, 50, 255]);
        // 60% highlight over the dimmed base.
        expect(pixel(out, 1)).toEqual([173, 20, 20, 255]);
    });

    it("tints a change of colour even when the brightness stays the same", () => {
        // A pinkish and a greenish pixel of nearly the same luminance, 60 apart in red.
        const base = new Uint8ClampedArray([180, 120, 120, 255]);
        const other = new Uint8ClampedArray([120, 150, 128, 255]);

        expect(pixel(frameDiff(base, other, options), 0)).toEqual([181, 28, 28, 255]);
    });

    it("counts a difference exactly at the threshold as changed", () => {
        // Gray 100 vs 124 differ by exactly 24 in every channel.
        const out = frameDiff(frame(100), frame(124), options);

        expect(pixel(out, 0)).toEqual([173, 20, 20, 255]);
    });
});
