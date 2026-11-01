import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RevisionFilter =
    | { mode: "all" }
    | { mode: "playing" }
    | { mode: "range"; videoId: string; from: number; to: number };

// A range picked on another video counts as "all" here.
export function resolveRevisionFilter(filter: RevisionFilter, videoId: string | undefined): RevisionFilter {
    if (filter.mode === "range" && filter.videoId !== videoId) {
        return { mode: "all" };
    }
    return filter;
}

// "playing" needs the revision on screen.
export function revisionQuery(filter: RevisionFilter, playing: { videoId: string; revision: number }) {
    const resolved = resolveRevisionFilter(filter, playing.videoId);
    if (resolved.mode === "playing") {
        return { selectRevision: String(playing.revision) };
    }
    if (resolved.mode === "range") {
        return { revisionFrom: String(resolved.from), revisionTo: String(resolved.to) };
    }
    return {};
}

interface CommentSearchState {
    hasDrawing: boolean;
    hasIssue: boolean;
    revisionFilter: RevisionFilter;
    user: string | undefined;
    filterText: string;

    setHasDrawing: (x: boolean) => void;
    setHasIssue: (x: boolean) => void;
    setRevisionFilter: (x: RevisionFilter) => void;
    setCommentUser: (x: string | undefined) => void;
    setFilterText: (x: string) => void;
    clear: () => void;
    isFiltering: (videoId: string | undefined) => boolean;
}

const InitCommentSearchState = {
    hasDrawing: false,
    hasIssue: false,
    revisionFilter: { mode: "all" } as RevisionFilter,
    user: "",
    filterText: "",
};

export const useCommentSearchStore = create<CommentSearchState>()(
    persist(
        (set, get) => ({
            ...InitCommentSearchState,

            setHasDrawing: (x: boolean) => set({ hasDrawing: x }),
            setHasIssue: (x: boolean) => set({ hasIssue: x }),
            setRevisionFilter: (x: RevisionFilter) => set({ revisionFilter: x }),
            setCommentUser: (x: string | undefined) => set({ user: x ?? "" }),
            setFilterText: (x: string) => set({ filterText: x }),
            clear: () => set(InitCommentSearchState),
            // Filtering is any value the clear button would reset.
            isFiltering: (videoId) => {
                const state = { ...get(), revisionFilter: resolveRevisionFilter(get().revisionFilter, videoId) };

                return Object.entries(InitCommentSearchState).some(([key, init]) => {
                    const value = state[key as keyof typeof InitCommentSearchState];
                    return JSON.stringify(value) !== JSON.stringify(init);
                });
            },
        }),
        {
            name: "comment-search-store",
        },
    ),
);
