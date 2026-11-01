import { useState, type ComponentProps } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import type { FolderNode } from "@/components/review/browser/video-tree/folder-tree";
import { folderName } from "@/lib/folder-path";
import { useCreators } from "@/components/review/browser/video-tree/organize-tree/hooks/operations/creators";
import { isRenameShortcut, useRenamers } from "@/components/review/browser/video-tree/organize-tree/hooks/operations/renamers";
import type { NewFolders } from "@/components/review/browser/video-tree/organize-tree/hooks/use-new-folders";
import { folderNodeKey, itemNodeKey, type NodeKey } from "@/components/review/browser/video-tree/organize-tree/node-keys";

// Which node is being renamed. The field stays until `afterRename` settles, so the old name doesn't flash back.
export function useRenaming(videos: VideoWithRevision[], afterRename: () => Promise<unknown>) {
    const { videoRenamer, folderRenamer } = useRenamers(videos);
    const { newFolderRenamer } = useCreators(videos);
    const [renaming, setRenaming] = useState<NodeKey | null>(null);

    // Closes only the rename it was given: another node's pencil commits the first rename, whose save may end after the second one opened.
    const close = (key: NodeKey) => setRenaming((current) => current === key ? null : current);

    const editing = (key: NodeKey) => renaming === key;

    const start = (key: NodeKey) => setRenaming(key);

    // Props for the node's button: the keyboard shortcut that starts renaming it.
    const renameOn = (key: NodeKey): ComponentProps<"button"> => ({
        onKeyDown: (e) => {
            if (isRenameShortcut(e)) {
                e.preventDefault();
                start(key);
            }
        },
    });

    const ends = (key: NodeKey) => ({
        onRenamed: () => {
            void afterRename().finally(() => close(key));
        },
        onCancelled: () => close(key),
    });

    // Props for the RenameInput that takes the button's place.
    const renameVideo = (video: VideoWithRevision) => ({
        renamer: videoRenamer(video),
        ...ends(itemNodeKey(video.id)),
    });

    const renameFolder = (folder: FolderNode, siblings: FolderNode[]) => ({
        renamer: folderRenamer(folder, siblings),
        ...ends(folderNodeKey(folder.path)),
    });

    // A folder that was just made starts with an empty name, and goes again if it is left empty.
    const renameNewFolder = (folder: FolderNode, siblings: FolderNode[], { unnamed, rename, remove }: NewFolders) => {
        const key = folderNodeKey(folder.path);
        const fresh = unnamed === folder.path;

        return {
            renamer: newFolderRenamer(folder, siblings, fresh ? "" : folderName(folder.path), (to) => rename(folder.path, to)),
            ...ends(key),
            onCancelled: () => {
                if (fresh) {
                    remove(folder.path);
                }
                close(key);
            },
        };
    };

    return { editing, start, renameOn, renameVideo, renameFolder, renameNewFolder };
}
