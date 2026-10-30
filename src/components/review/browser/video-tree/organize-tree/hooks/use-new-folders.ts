import { useState } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import { useCreators } from "@/components/review/browser/video-tree/organize-tree/hooks/operations/creators";
import { useVideoListStore } from "@/stores/video-list-store";

// Folders made with New folder, until something is moved in.
export function useNewFolders(videos: VideoWithRevision[]) {
    const { newFolderPath } = useCreators(videos);
    const paths = useVideoListStore((s) => s.newFolders);
    const addNewFolder = useVideoListStore((s) => s.addNewFolder);
    const renameFolderPaths = useVideoListStore((s) => s.renameFolderPaths);
    const removeNewFolder = useVideoListStore((s) => s.removeNewFolder);
    // Just made and not yet named.
    const [unnamed, setUnnamed] = useState<string | null>(null);

    const add = (parent: string) => {
        const path = newFolderPath(parent, paths);
        addNewFolder(path);
        setUnnamed(path);
        return path;
    };

    const rename = (from: string, to: string) => {
        renameFolderPaths(from, to);
        setUnnamed(null);
    };

    const remove = (path: string) => {
        removeNewFolder(path);
        setUnnamed(null);
    };

    const isNew = (path: string) => paths.includes(path);

    return { paths, unnamed, isNew, add, rename, remove };
}

export type NewFolders = ReturnType<typeof useNewFolders>;
