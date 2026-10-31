import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import type { VideoWithRevision } from "@/lib/db-types";
import { childPath, folderName, parentPath } from "@/lib/folder-path";
import { isMac } from "@/lib/platform";
import type { Renamer } from "@/components/controls/rename-input";
import type { FolderNode } from "@/components/review/browser/video-tree/folder-tree";
import { useVideoListStore } from "@/components/review/browser/stores/video-list-store";

// The key that starts renaming the focused node: F2 as in Explorer, or Return on a Mac as in Finder.
export function isRenameShortcut(e: { key: string }): boolean {
    return e.key === "F2" || (e.key === "Enter" && isMac());
}

// How organize mode renames videos and folders: what a name may not be, where it is saved, and
// how a refusal reads.
export function useRenamers(videos: VideoWithRevision[]) {
    const t = useTranslations("video-list-panel.organize.rename");
    const renameFolderPaths = useVideoListStore((s) => s.renameFolderPaths);

    // The server refuses with 409 when another video already has the title in that folder.
    const save = async (res: Promise<{ status: number; json: () => Promise<unknown> }>, taken: string) => {
        try {
            const done = await res;
            if (done.status === 409) {
                return taken;
            }
            if (done.status !== 200) {
                return `${t("failed")}: ${await readError(done)}`;
            }
            return null;
        } catch (e) {
            return `${t("failed")}: ${e instanceof Error ? e.message : String(e)}`;
        }
    };

    const videoRenamer = (video: VideoWithRevision): Renamer => ({
        name: video.title,
        check: (name) => videos.some((v) => v.id !== video.id && v.folderKey === video.folderKey && v.title === name)
            ? t("videoTaken")
            : null,
        commit: (name) => save(api.videos[":id"].$patch({ param: { id: video.id }, json: { title: name } }), t("videoTaken")),
    });

    // Only the folder's own name changes; a "/" would move it.
    const checkFolderName = (folder: FolderNode, siblings: FolderNode[]) => (name: string) => {
        if (name.includes("/")) {
            return t("slash");
        }
        return siblings.some((f) => f !== folder && folderName(f.path) === name) ? t("folderTaken") : null;
    };

    const folderRenamer = (folder: FolderNode, siblings: FolderNode[]): Renamer => {
        return {
            name: folderName(folder.path),
            check: checkFolderName(folder, siblings),
            commit: async (name) => {
                const to = childPath(parentPath(folder.path), name);
                // Sibling folders are checked as the name is typed, so a 409 here means a video
                // already in the destination, deleted ones included, has the same title.
                const refused = await save(api.videos.folders.$patch({ json: { from: folder.path, to } }), t("videoClash"));
                if (!refused) {
                    renameFolderPaths(folder.path, to);
                }
                return refused;
            },
        };
    };

    return { videoRenamer, folderRenamer, checkFolderName };
}
