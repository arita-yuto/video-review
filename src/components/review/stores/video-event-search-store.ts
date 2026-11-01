import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VideoEventSearchState {
    filterText: string;
    kind: string | undefined;
    hasLink: boolean;

    setFilterText: (x: string) => void;
    setKind: (x: string | undefined) => void;
    setHasLink: (x: boolean) => void;
    clear: () => void;
    isFiltering: () => boolean;
}

const InitVideoEventSearchState = {
    filterText: "",
    kind: "",
    hasLink: false,
};

export const useVideoEventSearchStore = create<VideoEventSearchState>()(
    persist(
        (set, get) => ({
            ...InitVideoEventSearchState,

            setFilterText: (x: string) => set({ filterText: x }),
            setKind: (x: string | undefined) => set({ kind: x }),
            setHasLink: (x: boolean) => set({ hasLink: x }),
            clear: () => set(InitVideoEventSearchState),
            isFiltering: () => {
                const state = get();

                return Object.keys(InitVideoEventSearchState).some((key) => {
                    return state[key as keyof typeof InitVideoEventSearchState]
                        !== InitVideoEventSearchState[key as keyof typeof InitVideoEventSearchState];
                });
            },
        }),
        {
            name: "video-event-search-store",
        },
    ),
);
