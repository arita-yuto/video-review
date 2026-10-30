import type { VideoWithRevision } from "@/lib/db-types";
import { childPath, isInFolder, parentPath } from "@/lib/folder-path";
import type { Renamer } from "@/components/controls/rename-input";
import type { FolderNode } from "@/components/review/browser/video-tree/folder-tree";
import { useRenamers } from "@/components/review/browser/video-tree/organize-tree/hooks/operations/renamers";

// How organize mode makes folders. Nothing is sent: a folder exists on the server once a video is in it.
export function useCreators(videos: VideoWithRevision[]) {
    const { checkFolderName } = useRenamers(videos);

    // Under a stand-in name that no folder there has, until it is named.
    const newFolderPath = (parent: string, newFolders: string[]) => {
        const taken = (path: string) => [...videos.map((v) => v.folderKey), ...newFolders].some((key) => isInFolder(key, path));

        let path = childPath(parent, "New folder");
        for (let n = 2; taken(path); n++) {
            path = childPath(parent, `New folder ${n}`);
        }

        return path;
    };

    const newFolderRenamer = (folder: FolderNode, siblings: FolderNode[], name: string, onNamed: (to: string) => void): Renamer => ({
        name,
        check: checkFolderName(folder, siblings),
        commit: async (next) => {
            onNamed(childPath(parentPath(folder.path), next));
            return null;
        },
    });

    return { newFolderPath, newFolderRenamer };
}
