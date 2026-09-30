import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DiffViewMode = "side-by-side" | "wipe";

interface DiffViewStore {
    mode: DiffViewMode;
    setMode: (mode: DiffViewMode) => void;
}

// The layout a reviewer prefers carries over to the next comparison.
export const useDiffViewStore = create<DiffViewStore>()(
    persist(
        (set) => ({
            mode: "side-by-side",
            setMode: (mode) => set({ mode }),
        }),
        { name: "diff-view-store" },
    ),
);
