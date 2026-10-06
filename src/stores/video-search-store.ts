import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VideoSearchState {
    hasComment: boolean;
    hasDrawing: boolean;
    hasIssue: boolean;
    filterIssue: string;
    user: string | undefined;
    filterTree: string;
    tags: string[];

    setHasComment: (x: boolean) => void;
    setHasDrawing: (x: boolean) => void;
    setHasIssue: (x: boolean) => void;
    setFilterIssue: (x: string) => void;
    setCommentUser: (x: string | undefined) => void;
    setFilterTree: (x: string) => void;
    setTags: (x: string[]) => void;
    clear: () => void;
    isFiltering: () => boolean;
}

const InitVideoSearchState = {
    hasComment: false,
    hasDrawing: false,
    hasIssue: false,
    filterIssue: "",
    filterTree: "",
    user: "",
    tags: []
};

const isUnset = (value: unknown) =>
    value === undefined || value === "" || value === false || (Array.isArray(value) && value.length === 0);

export const useVideoSearchStore = create<VideoSearchState>()(
    persist(
        (set, get) => ({
            ...InitVideoSearchState,

            setHasComment: (x: boolean) => set({ hasComment: x }),
            setHasDrawing: (x: boolean) => set({ hasDrawing: x }),
            setHasIssue: (x: boolean) => set({ hasIssue: x }),
            setFilterIssue: (x: string) => set({ filterIssue: x }),
            setCommentUser: (x: string | undefined) => set({ user: x }),
            setFilterTree: (x: string) => set({ filterTree: x }),
            setTags: (x: string[]) => set({ tags: x }),
            clear: () => set(InitVideoSearchState),
            isFiltering: () => {
                const state = get();

                return Object.keys(InitVideoSearchState).some((key) => {
                    return !isUnset(state[key as keyof typeof InitVideoSearchState]);
                });
            }
        }),
        {
            name: "video-search-store",
        },
    ),
);
