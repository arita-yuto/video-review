import { describe, expect, it } from "vitest";
import { flowTarget, followStep, FOLLOW_MIN_PX_PER_MS, FOLLOW_HOLD_PX, type FollowState } from "@/lib/list-flow";

const ANCHORS = [
    { time: 10, top: 100 },
    { time: 20, top: 300 },
    { time: 20, top: 400 },
    { time: 30, top: 600 },
];

describe("flowTarget", () => {
    it("approaches the first anchor from the top of the list in step with the time", () => {
        expect(flowTarget(ANCHORS, 0)).toBe(0);
        expect(flowTarget(ANCHORS, 5)).toBe(50);
    });

    it("moves between two anchors in proportion to the time", () => {
        expect(flowTarget(ANCHORS, 10)).toBe(100);
        expect(flowTarget(ANCHORS, 15)).toBe(200);
        expect(flowTarget(ANCHORS, 25)).toBe(500);
    });

    it("stays on the last anchor once the time has passed it", () => {
        expect(flowTarget(ANCHORS, 30)).toBe(600);
        expect(flowTarget(ANCHORS, 99)).toBe(600);
    });

    it("lands on the last of the anchors that share a time", () => {
        expect(flowTarget(ANCHORS, 20)).toBe(400);
    });
});

describe("followStep", () => {
    const still: FollowState = { top: 100, catchingUp: false };
    const FRAME_MS = 16;

    it("holds still until the target is a hold's worth ahead", () => {
        expect(followStep(still, 100 + FOLLOW_HOLD_PX - 1, FRAME_MS)).toBe(still);
    });

    it("once a hold's worth behind, keeps moving until it has caught up", () => {
        let state = followStep(still, 100 + FOLLOW_HOLD_PX, FRAME_MS);
        expect(state.top).toBeGreaterThan(100);
        expect(state.catchingUp).toBe(true);

        for (let i = 0; i < 100 && state.catchingUp; i++) {
            state = followStep(state, 100 + FOLLOW_HOLD_PX, FRAME_MS);
        }
        expect(state.top).toBe(100 + FOLLOW_HOLD_PX);
        expect(state.catchingUp).toBe(false);
    });

    it("never moves slower than the floor speed while catching up", () => {
        const state = followStep({ top: 100, catchingUp: true }, 102, FRAME_MS);
        expect(state.top - 100).toBeCloseTo(Math.min(2, FOLLOW_MIN_PX_PER_MS * FRAME_MS));
    });

    it("never overshoots the target", () => {
        const state = followStep({ top: 100, catchingUp: true }, 100.5, 1000);
        expect(state.top).toBe(100.5);
        expect(state.catchingUp).toBe(false);
    });
});
