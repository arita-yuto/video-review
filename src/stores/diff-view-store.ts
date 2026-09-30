import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DiffViewMode = "side-by-side" | "wipe";

interface DiffViewStore {
    mode: DiffViewMode;
    showDiffImage: boolean;
    setMode: (mode: DiffViewMode) => void;
    setShowDiffImage: (show: boolean) => void;
}

// The layout a reviewer prefers carries over to the next comparison.
export const useDiffViewStore = create<DiffViewStore>()(
    persist(
        (set) => ({
            mode: "side-by-side",
            showDiffImage: false,
            setMode: (mode) => set({ mode }),
            setShowDiffImage: (show) => set({ showDiffImage: show }),
        }),
        { name: "diff-view-store" },
    ),
);
