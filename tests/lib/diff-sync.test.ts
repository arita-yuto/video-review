import { describe, expect, it } from "vitest";
import { compareTimeFor } from "@/components/revision-diff-view/use-diff-sync";

describe("compareTimeFor", () => {
    it("follows the primary while the compare revision still has footage", () => {
        expect(compareTimeFor(12.5, 30)).toBe(12.5);
    });

    it("holds a shorter compare revision on its last frame", () => {
        expect(compareTimeFor(45, 30)).toBe(30);
    });
});
