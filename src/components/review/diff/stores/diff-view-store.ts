import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DiffViewMode = "side-by-side" | "wipe";

interface DiffViewStore {
    mode: DiffViewMode;
    showDiffImage: boolean;
    // Luminance differences below this (0-255) count as unchanged.
    diffThreshold: number;
    // How strongly the grayscale picture shows under the highlight, 0 to 1.
    diffBaseOpacity: number;
    setMode: (mode: DiffViewMode) => void;
    setShowDiffImage: (show: boolean) => void;
    setDiffThreshold: (threshold: number) => void;
    setDiffBaseOpacity: (opacity: number) => void;
}

// The layout a reviewer prefers carries over to the next comparison.
export const useDiffViewStore = create<DiffViewStore>()(
    persist(
        (set) => ({
            mode: "side-by-side",
            showDiffImage: false,
            diffThreshold: 24,
            diffBaseOpacity: 0.4,
            setMode: (mode) => set({ mode }),
            setShowDiffImage: (show) => set({ showDiffImage: show }),
            setDiffThreshold: (threshold) => set({ diffThreshold: threshold }),
            setDiffBaseOpacity: (opacity) => set({ diffBaseOpacity: opacity }),
        }),
        { name: "diff-view-store" },
    ),
);
