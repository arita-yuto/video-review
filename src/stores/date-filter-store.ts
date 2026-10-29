import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DateRange } from "react-day-picker";
import { toDateRange } from "@/lib/utils/date-helper";

// Plain, JSON-serializable filter state. Relative modes ("today"/"recent") stay
// relative so they follow the current day; "range" holds explicit epoch bounds
// (numbers, so no Date persistence/revive is needed).
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

/**
 * Revives persisted filter state.
 *
 * Only relative modes survive a reload/day-change; everything else collapses to
 * "none". This drops stale absolute ranges AND legacy persisted `{from,to}`
 * objects (written before this store existed) that carry no known mode.
 */
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

/**
 * Resolves filter state into concrete dates using the CURRENT date, so relative
 * modes always reflect "now" instead of when the option was selected.
 */
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
                // Resolve the current filter to concrete dates so callers don't
                // reach for the pure helper themselves.
                resolve: () => resolveDateFilter(get()),
            }),
            {
                name,
                // Keep the live actions from currentState; overlay only the revived
                // (relative-or-none) filter fields so no stale range is restored.
                merge: (persisted, current) => ({ ...current, ...reviveDateFilter(persisted) }),
            },
        ),
    );

export const useVideoDateFilterStore = createDateFilterStore("video-date-filter");
export const useVideoCommentsDateFilterStore = createDateFilterStore("video-comments-date-filter");
