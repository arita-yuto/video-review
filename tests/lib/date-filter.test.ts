import { describe, expect, it } from "vitest";
import { toDateRange } from "@/lib/utils/date-helper";
import { createDateFilterStore, resolveDateFilter, reviveDateFilter } from "@/components/stores/date-filter-store";

// Expected values are derived from a fresh `new Date()` so the assertions stay
// date-independent and mirror the resolver's own "current date" behavior.
describe("resolveDateFilter", () => {
    it("returns undefined for none / undefined", () => {
        expect(resolveDateFilter({ mode: "none" })).toBeUndefined();
        expect(resolveDateFilter(undefined)).toBeUndefined();
    });

    it("resolves today to the start/end of the current day", () => {
        const now = new Date();
        const range = resolveDateFilter({ mode: "today" });

        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start.setHours(0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end.setHours(23, 59, 59, 999);

        expect(range?.from?.getTime()).toBe(start.getTime());
        expect(range?.to?.getTime()).toBe(end.getTime());
    });

    it("resolves recent to start of (today - days) through end of today", () => {
        const now = new Date();
        const range = resolveDateFilter({ mode: "recent", days: 3 });

        const from = new Date(now);
        from.setDate(now.getDate() - 3);
        const expectedFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        expectedFrom.setHours(0, 0, 0, 0);
        const expectedTo = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        expectedTo.setHours(23, 59, 59, 999);

        expect(range?.from?.getTime()).toBe(expectedFrom.getTime());
        expect(range?.to?.getTime()).toBe(expectedTo.getTime());
    });

    it("resolves an explicit range from its epoch bounds via toDateRange", () => {
        const from = new Date(2026, 0, 10, 8, 30);
        const to = new Date(2026, 0, 15, 20, 45);
        const range = resolveDateFilter({ mode: "range", from: from.getTime(), to: to.getTime() });
        const expected = toDateRange(from, to);

        expect(range?.from?.getTime()).toBe(expected.from?.getTime());
        expect(range?.to?.getTime()).toBe(expected.to?.getTime());
    });
});

describe("reviveDateFilter", () => {
    it("keeps today", () => {
        expect(reviveDateFilter({ mode: "today" })).toEqual({ mode: "today" });
    });

    it("keeps recent with its days, defaulting to 3", () => {
        expect(reviveDateFilter({ mode: "recent", days: 7 })).toEqual({ mode: "recent", days: 7 });
        expect(reviveDateFilter({ mode: "recent" })).toEqual({ mode: "recent", days: 3 });
    });

    it("collapses an explicit range to none so no stale range is restored", () => {
        expect(reviveDateFilter({ mode: "range", from: 1, to: 2 })).toEqual({ mode: "none" });
    });

    it("collapses the legacy no-mode {from,to} shape to none", () => {
        const legacy = { from: "2026-01-10T00:00:00.000Z", to: "2026-01-12T00:00:00.000Z" };
        expect(reviveDateFilter(legacy)).toEqual({ mode: "none" });
    });

    it("collapses unexpected/garbage input to none", () => {
        expect(reviveDateFilter(undefined)).toEqual({ mode: "none" });
        expect(reviveDateFilter(null)).toEqual({ mode: "none" });
        expect(reviveDateFilter("nonsense")).toEqual({ mode: "none" });
        expect(reviveDateFilter(42)).toEqual({ mode: "none" });
        expect(reviveDateFilter({ mode: "weird" })).toEqual({ mode: "none" });
    });
});

describe("store resolve() method", () => {
    it("wires the store state through the resolver", () => {
        const useStore = createDateFilterStore("test");

        useStore.getState().setToday();
        const range = useStore.getState().resolve();

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start.setHours(0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end.setHours(23, 59, 59, 999);

        expect(range?.from?.getTime()).toBe(start.getTime());
        expect(range?.to?.getTime()).toBe(end.getTime());

        useStore.getState().clear();
        expect(useStore.getState().resolve()).toBeUndefined();
    });
});
