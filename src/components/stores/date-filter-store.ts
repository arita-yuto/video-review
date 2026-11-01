import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DateRange } from "react-day-picker";
import { toDateRange } from "@/lib/utils/date-helper";

// Relative modes stay relative so they follow the current day; range holds epoch numbers, which persist without reviving Dates.
export type DateFilterState = {
    mode: "none" | "today" | "recent" | "range";
    days?: number;
    from?: number;
    to?: number;
};

interface DateFilterStore extends DateFilterState {
    setToday: () => void;
    setRecent: (days?: number) => void;
    setRange: (from: Date, to: Date) => void;
    clear: () => void;
    resolve: () => DateRange | undefined;
}

// Only relative modes survive a reload; a stale absolute range, or a legacy {from,to} with no mode, collapses to none.
export function reviveDateFilter(persisted: unknown): DateFilterState {
    if (persisted && typeof persisted === "object") {
        const mode = (persisted as { mode?: unknown }).mode;
        if (mode === "today") return { mode: "today" };
        if (mode === "recent") {
            const days = (persisted as { days?: unknown }).days;
            return { mode: "recent", days: typeof days === "number" ? days : 3 };
        }
    }
    return { mode: "none" };
}

// Resolved against the current date, so relative modes mean now, not when they were picked.
export function resolveDateFilter(state: DateFilterState | undefined): DateRange | undefined {
    if (!state || state.mode === "none") return undefined;

    const now = new Date();
    if (state.mode === "today") return toDateRange(now, now);
    if (state.mode === "recent") {
        const from = new Date(now);
        from.setDate(now.getDate() - (state.days ?? 3));
        return toDateRange(from, now);
    }
    return toDateRange(new Date(state.from!), new Date(state.to!));
}

// Factory: every date filter shares this logic but persists under a distinct key.
export const createDateFilterStore = (name: string) =>
    create<DateFilterStore>()(
        persist(
            (set, get) => ({
                mode: "none",

                setToday: () => set({ mode: "today", days: undefined, from: undefined, to: undefined }),
                setRecent: (days = 3) => set({ mode: "recent", days, from: undefined, to: undefined }),
                setRange: (from: Date, to: Date) =>
                    set({ mode: "range", from: from.getTime(), to: to.getTime(), days: undefined }),
                clear: () => set({ mode: "none", days: undefined, from: undefined, to: undefined }),
                resolve: () => resolveDateFilter(get()),
            }),
            {
                name,
                // Overlays only the revived filter fields, so no stale range comes back.
                merge: (persisted, current) => ({ ...current, ...reviveDateFilter(persisted) }),
            },
        ),
    );

export const useVideoDateFilterStore = createDateFilterStore("video-date-filter");
export const useVideoCommentsDateFilterStore = createDateFilterStore("video-comments-date-filter");
