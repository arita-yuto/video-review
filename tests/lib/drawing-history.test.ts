import { describe, expect, it } from "vitest";
import { commitSnapshot, initialHistory, pushMark, redo, undo } from "@/lib/drawing/history";
import type { Stroke } from "@/lib/drawing/types";

const stroke = (color: string): Stroke => ({ kind: "pen", color, width: 10, opacity: 1, pressure: false, points: [{ x: 0.5, y: 0.5, pressure: 0.5 }] });

describe("drawing history", () => {
    it("drops the redo states when a new mark lands", () => {
        const drawn = pushMark(pushMark(initialHistory, stroke("a")), stroke("b"));
        const undone = undo(drawn);
        expect(undone.future).toHaveLength(1);

        const next = pushMark(undone, stroke("c"));
        expect(next.present.marks.map((s) => s.color)).toEqual(["a", "c"]);
        expect(next.future).toHaveLength(0);
    });

    it("restores the state on redo", () => {
        const drawn = pushMark(initialHistory, stroke("a"));
        expect(redo(undo(drawn))).toEqual(drawn);
    });

    it("is a no-op with nothing to undo or redo", () => {
        expect(undo(initialHistory)).toBe(initialHistory);
        expect(redo(initialHistory)).toBe(initialHistory);
    });

    it("brings the saved drawing back when a clear is undone", () => {
        const cleared = commitSnapshot(pushMark(initialHistory, stroke("a")), { base: null, marks: [] });
        expect(cleared.present.base).toBeNull();

        const restored = undo(cleared);
        expect(restored.present.base).toBe("saved");
        expect(restored.present.marks).toHaveLength(1);
    });

    it("keeps the saved drawing gone when drawing after a clear", () => {
        const cleared = commitSnapshot(initialHistory, { base: null, marks: [] });
        expect(pushMark(cleared, stroke("a")).present.base).toBeNull();
    });
});
