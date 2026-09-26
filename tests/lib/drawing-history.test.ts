import { describe, expect, it } from "vitest";
import { emptyHistory, pushStroke, redo, undo } from "@/lib/drawing/history";
import type { Stroke } from "@/lib/drawing/types";

const stroke = (color: string): Stroke => ({ tool: "pen", color, width: 10, points: [{ x: 0.5, y: 0.5, pressure: 0.5 }] });

describe("drawing history", () => {
    it("drops the redo stack when a new stroke lands", () => {
        const drawn = pushStroke(pushStroke(emptyHistory, stroke("a")), stroke("b"));
        const undone = undo(drawn);
        expect(undone.undone).toHaveLength(1);

        const next = pushStroke(undone, stroke("c"));
        expect(next.items.map((s) => s.color)).toEqual(["a", "c"]);
        expect(next.undone).toHaveLength(0);
    });

    it("restores the stroke on redo", () => {
        const drawn = pushStroke(emptyHistory, stroke("a"));
        expect(redo(undo(drawn))).toEqual(drawn);
    });

    it("is a no-op with nothing to undo or redo", () => {
        expect(undo(emptyHistory)).toBe(emptyHistory);
        expect(redo(emptyHistory)).toBe(emptyHistory);
    });
});
