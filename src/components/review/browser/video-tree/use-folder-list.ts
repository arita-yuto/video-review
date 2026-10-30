import { useCallback, useEffect, useMemo, useRef } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import {
    buildFlatFolders,
    buildNestedFolders,
    folderAncestors,
    visibleVideos,
} from "@/components/review/browser/video-tree/folder-tree";
import { useVideoListStore } from "@/stores/video-list-store";

export type FolderList = ReturnType<typeof useFolderList>;

type Options = {
    filtering?: boolean;
    // Whether a chain of folders that only hold one folder folds into one node.
    compact?: boolean;
    emptyFolders?: string[];
};

// The folders of a video list and which of them are open. The browsing list shares one with the
// thumbnail panel so both show the same videos.
export function useFolderList(videos: VideoWithRevision[], { filtering = false, compact = true, emptyFolders }: Options = {}) {
    const openPaths = useVideoListStore((s) => s.openPaths);
    const closedWhileFiltering = useVideoListStore((s) => s.closedWhileFiltering);
    const toggleFolder = useVideoListStore((s) => s.toggleFolder);
    const revealFolders = useVideoListStore((s) => s.revealFolders);
    const clearClosedWhileFiltering = useVideoListStore((s) => s.clearClosedWhileFiltering);

    // Only when filtering starts or stops, so a list that never filters leaves the others' alone.
    const wasFiltering = useRef(filtering);
    useEffect(() => {
        if (wasFiltering.current !== filtering) {
            wasFiltering.current = filtering;
            clearClosedWhileFiltering();
        }
    }, [filtering, clearClosedWhileFiltering]);

    // Filter results read best as flat paths; browsing walks the folders one level at a time.
    const root = useMemo(
        () => filtering ? buildFlatFolders(videos) : buildNestedFolders(videos, { compact, emptyFolders }),
        [filtering, compact, emptyFolders, videos],
    );

    const isOpen = useCallback(
        (path: string) => filtering ? !closedWhileFiltering.includes(path) : openPaths.includes(path),
        [filtering, closedWhileFiltering, openPaths],
    );

    const visible = useMemo(() => visibleVideos(root, isOpen), [root, isOpen]);

    const toggle = (path: string) => toggleFolder(path, filtering);

    const reveal = useCallback((folderKey: string) => revealFolders(folderAncestors(folderKey)), [revealFolders]);

    return { root, visible, isOpen, toggle, reveal };
}
