import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api-client";
import { isInFolder } from "@/lib/folder-path";

interface VideoListState {
    // Folders open while browsing, kept across reloads.
    openPaths: string[];
    // While filtering every folder starts open; these are the ones closed since the filter changed.
    closedWhileFiltering: string[];

    // When this browser first opened the list on the latest recorded day, from Date.toDateString().
    visitDay: string | null;
    firstVisitAt: number | null;
    // The first visit on an earlier day, so reopening the list during the day doesn't move it.
    // Null until a second day is recorded.
    previousVisitAt: number | null;
    // The newest revision this user has opened of each video, from the server.
    seenRevisions: Record<string, number>;
    // The admin's organize mode, which shows the list for moving and renaming instead. Not kept
    // across reloads.
    organizing: boolean;
    // Folders made in the mode that nothing has been moved into yet, so they exist only here.
    newFolders: string[];

    toggleFolder: (path: string, filtering: boolean) => void;
    // Opens every folder on the way to a video's folder, whichever of them are folded into one node.
    revealFolders: (paths: string[]) => void;
    // Follows a renamed folder, so it and the folders under it stay open, new ones included.
    renameFolderPaths: (from: string, to: string) => void;
    addNewFolder: (path: string) => void;
    removeNewFolder: (path: string) => void;
    // Something was moved into `path`, so it and the new folders above it now exist on the server.
    fillNewFolder: (path: string) => void;
    clearClosedWhileFiltering: () => void;
    recordVisit: (now?: Date) => void;
    loadSeen: () => Promise<void>;
    markSeen: (videoId: string, revision: number) => Promise<void>;
    setOrganizing: (organizing: boolean) => void;
}

const toggleIn = (paths: string[], path: string) =>
    paths.includes(path) ? paths.filter((p) => p !== path) : [...paths, path];

// How this browser views the sidebar's video list.
export const useVideoListStore = create<VideoListState>()(
    persist(
        (set, get) => ({
            openPaths: [],
            closedWhileFiltering: [],
            visitDay: null,
            firstVisitAt: null,
            previousVisitAt: null,
            seenRevisions: {},
            organizing: false,
            newFolders: [],

            toggleFolder: (path, filtering) =>
                set((state) => filtering
                    ? { closedWhileFiltering: toggleIn(state.closedWhileFiltering, path) }
                    : { openPaths: toggleIn(state.openPaths, path) }),
            revealFolders: (paths) =>
                set((state) => {
                    const closed = paths.filter((path) => !state.openPaths.includes(path));
                    return closed.length ? { openPaths: [...state.openPaths, ...closed] } : state;
                }),
            renameFolderPaths: (from, to) =>
                set((state) => {
                    const follow = (path: string) => isInFolder(path, from) ? to + path.slice(from.length) : path;
                    return { openPaths: state.openPaths.map(follow), newFolders: state.newFolders.map(follow) };
                }),
            addNewFolder: (path) => set((state) => ({ newFolders: [...state.newFolders, path] })),
            removeNewFolder: (path) =>
                set((state) => ({ newFolders: state.newFolders.filter((folder) => !isInFolder(folder, path)) })),
            fillNewFolder: (path) =>
                set((state) => ({ newFolders: state.newFolders.filter((folder) => !isInFolder(path, folder)) })),
            clearClosedWhileFiltering: () => set({ closedWhileFiltering: [] }),
            recordVisit: (now = new Date()) => {
                const today = now.toDateString();
                if (get().visitDay === today) {
                    return;
                }
                set((state) => ({ visitDay: today, firstVisitAt: now.getTime(), previousVisitAt: state.firstVisitAt }));
            },
            loadSeen: async () => {
                const res = await api.readStatus.seen.$get();
                if (res.status !== 200) {
                    throw new Error("failed to get seen revisions");
                }
                const { seen } = await res.json();
                // A revision marked while this was in flight is newer than what the server sent.
                set((state) => {
                    const merged = { ...seen };
                    for (const [id, revision] of Object.entries(state.seenRevisions)) {
                        merged[id] = Math.max(revision, merged[id] ?? 0);
                    }
                    return { seenRevisions: merged };
                });
            },
            // Shown here at once, so NEW goes without a reload.
            markSeen: async (videoId, revision) => {
                if ((get().seenRevisions[videoId] ?? 0) >= revision) {
                    return;
                }

                set((state) => ({ seenRevisions: { ...state.seenRevisions, [videoId]: revision } }));
                const res = await api.readStatus.seen.$post({ json: { videoId, revision } });
                if (!res.ok) {
                    throw new Error("failed to record the seen revision");
                }
            },
            setOrganizing: (organizing) => set({ organizing, newFolders: [] }),
        }),
        {
            name: "video-list",
            partialize: ({ openPaths, visitDay, firstVisitAt, previousVisitAt }) =>
                ({ openPaths, visitDay, firstVisitAt, previousVisitAt }),
        },
    ),
);
