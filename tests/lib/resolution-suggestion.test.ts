import { describe, expect, it } from "vitest";
import { chooseNextLowerWidth, chooseWidthBySize, type DownscaledFile } from "@/components/review/player/hooks/use-resolution-suggestion";

const megabyte = 1_000_000;
const originalSize = 319 * megabyte;
const lowerFiles: DownscaledFile[] = [
    { width: 1080, size: 76 * megabyte },
    { width: 720, size: 43 * megabyte },
    { width: 480, size: 25 * megabyte },
];

describe("chooseWidthBySize", () => {
    it("chooses the heaviest lower-resolution file the connection could carry", () => {
        expect(chooseWidthBySize(lowerFiles, originalSize, 0.15)).toBe(720);
    });

    it("does not choose a file whose size is unknown", () => {
        const filesWithUnknownSize: DownscaledFile[] = [
            { width: 1080, size: 76 * megabyte },
            { width: 720, size: 43 * megabyte },
            { width: 480, size: null },
        ];

        expect(chooseWidthBySize(filesWithUnknownSize, originalSize, 0.05)).toBeNull();
    });

    it("gives no answer when even the lightest file is more than the connection carried", () => {
        expect(chooseWidthBySize(lowerFiles, originalSize, 0.05)).toBeNull();
    });
});

describe("chooseNextLowerWidth", () => {
    it("chooses the next resolution below the playing one", () => {
        expect(chooseNextLowerWidth(lowerFiles, 3840)).toBe(1080);
    });

    it("skips a file nearly as wide as the original being played", () => {
        expect(chooseNextLowerWidth(lowerFiles, 1152)).toBe(720);
    });

    it("keeps the next resolution down while a downscaled file is playing", () => {
        const filesBelow1080: DownscaledFile[] = [
            { width: 720, size: 43 * megabyte },
            { width: 480, size: 25 * megabyte },
        ];

        expect(chooseNextLowerWidth(filesBelow1080, null)).toBe(720);
    });

    it("gives no answer when the only lower file is nearly as wide as the original", () => {
        expect(chooseNextLowerWidth([{ width: 1080, size: 76 * megabyte }], 1152)).toBeNull();
    });
});
