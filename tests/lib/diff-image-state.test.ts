import { describe, expect, it } from "vitest";
import { DiffImageEvent, diffImageReducer, initialDiffImageState } from "@/components/revision-diff-view/diff-image-state";

// The reducer only passes bitmaps along, so any object stands in for one.
const imageA = { name: "A" } as unknown as ImageBitmap;
const imageB = { name: "B" } as unknown as ImageBitmap;

const received = (image: ImageBitmap): DiffImageEvent => ({ type: "received", image });
const started: DiffImageEvent = { type: "started" };
const cancelled: DiffImageEvent = { type: "cancelled" };

// Events in the order they happen, folded the way the hook dispatches them.
const run = (...events: DiffImageEvent[]) => events.reduce(diffImageReducer, initialDiffImageState);

describe("diffImageReducer", () => {
    it("drops the dimmed image when playback starts before the new diff arrives", () => {
        expect(run(received(imageA), started, cancelled)).toEqual({ status: "waiting" });
    });

    it("keeps the image from before the first move through further moves, then shows the latest diff", () => {
        expect(run(received(imageA), started, started)).toEqual({ status: "computing", previous: imageA });
        expect(run(received(imageA), started, started, received(imageB))).toEqual({ status: "ready", image: imageB });
    });

    it("keeps the diff when playback starts from the position it was taken at", () => {
        expect(run(received(imageA), cancelled)).toEqual({ status: "ready", image: imageA });
    });

    it("stays unreadable when a move starts a computation", () => {
        expect(run({ type: "refused" }, started)).toEqual({ status: "unreadable" });
    });

    it("starts over when a revision changes during a computation", () => {
        expect(run(received(imageA), started, { type: "reset" })).toEqual({ status: "waiting" });
    });
});
